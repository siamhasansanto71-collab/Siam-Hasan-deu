import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import { 
  dexieDb, 
  type DexieCustomer, 
  type DexieTransaction, 
  type DexiePharmacyProfile, 
  type DexieDailySale,
  type SyncQueueItem,
  type SyncStatus
} from './dexieDb';
import type { Customer, Transaction, PharmacyProfile, DailySale } from '../types/ledger';

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncStats {
  state: SyncState;
  pendingCount: number;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  isOnline: boolean;
}

type SyncListener = (stats: SyncStats) => void;

class DexieFirestoreSyncManager {
  private listeners: Set<SyncListener> = new Set();
  private isProcessingQueue = false;
  private syncStats: SyncStats = {
    state: 'idle',
    pendingCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };
  private activeUser: User | null = null;
  private syncIntervalTimer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncStats.isOnline = true;
        this.notifyListeners();
        if (this.activeUser) {
          this.processSyncQueue(this.activeUser).catch(() => {});
        }
      });

      window.addEventListener('offline', () => {
        this.syncStats.isOnline = false;
        this.syncStats.state = 'offline';
        this.notifyListeners();
      });

      // Periodic queue check every 45 seconds if online
      this.syncIntervalTimer = setInterval(() => {
        if (this.activeUser && navigator.onLine && !this.isProcessingQueue) {
          this.processSyncQueue(this.activeUser).catch(() => {});
        }
      }, 45000);
    }
  }

  public setActiveUser(user: User | null) {
    this.activeUser = user;
    this.updatePendingCount(user?.uid);
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.syncStats });
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const clone = { ...this.syncStats };
    this.listeners.forEach((l) => l(clone));
  }

  public async updatePendingCount(ownerId?: string) {
    try {
      const count = await dexieDb.getPendingCount(ownerId);
      this.syncStats.pendingCount = count;
      if (count === 0 && this.syncStats.state !== 'syncing' && this.syncStats.isOnline) {
        this.syncStats.state = 'synced';
      }
      this.notifyListeners();
    } catch {
      // ignore
    }
  }

  /* =====================================================================
     LOCAL DEXIE CACHE OPERATIONS (Write-Through & Fast Reads)
     ===================================================================== */

  /**
   * Retrieve cached customers from Dexie IndexedDB
   */
  async getCachedCustomers(ownerId: string): Promise<Customer[]> {
    try {
      const dexieCustomers = await dexieDb.customers
        .where('ownerId')
        .equals(ownerId)
        .sortBy('serialNumber');
      return dexieCustomers.map(({ _syncStatus, _lastModified, ...cust }) => cust as Customer);
    } catch (e) {
      console.warn('Dexie read customers failed:', e);
      return [];
    }
  }

  /**
   * Retrieve cached transactions from Dexie IndexedDB
   */
  async getCachedTransactions(ownerId: string, customerId?: string): Promise<Transaction[]> {
    try {
      let dexieTxs: DexieTransaction[];
      if (customerId) {
        dexieTxs = await dexieDb.transactions
          .where('customerId')
          .equals(customerId)
          .and((t) => t.ownerId === ownerId)
          .reverse()
          .sortBy('createdAt');
      } else {
        dexieTxs = await dexieDb.transactions
          .where('ownerId')
          .equals(ownerId)
          .reverse()
          .sortBy('createdAt');
      }
      return dexieTxs.map(({ _syncStatus, _lastModified, ...tx }) => tx as Transaction);
    } catch (e) {
      console.warn('Dexie read transactions failed:', e);
      return [];
    }
  }

  /**
   * Retrieve cached pharmacy profile from Dexie IndexedDB
   */
  async getCachedProfile(ownerId: string): Promise<PharmacyProfile | null> {
    try {
      const cached = await dexieDb.pharmacyProfiles.get(ownerId);
      if (cached) {
        const { _syncStatus, _lastModified, id, ...profile } = cached;
        return profile as PharmacyProfile;
      }
      return null;
    } catch (e) {
      console.warn('Dexie read profile failed:', e);
      return null;
    }
  }

  /**
   * Write customer to local Dexie cache and enqueue to syncQueue if authenticated
   */
  async writeCustomer(customer: Customer, operation: 'create' | 'update'): Promise<void> {
    const now = Date.now();
    const isSynced = !this.activeUser; // Demo mode is always considered local-only
    const status: SyncStatus = isSynced ? 'synced' : (operation === 'create' ? 'pending_create' : 'pending_update');

    await dexieDb.customers.put({
      ...customer,
      _syncStatus: status,
      _lastModified: now
    });

    if (this.activeUser) {
      await dexieDb.syncQueue.add({
        entity: 'customer',
        operation,
        documentId: customer.id,
        ownerId: this.activeUser.uid,
        path: `users/${this.activeUser.uid}/customers/${customer.id}`,
        payload: customer,
        timestamp: now,
        status: 'pending',
        retryCount: 0
      });

      await this.updatePendingCount(this.activeUser.uid);

      // Attempt immediate sync in background
      if (navigator.onLine) {
        this.processSyncQueue(this.activeUser).catch(() => {});
      }
    }
  }

  /**
   * Mark customer for deletion locally and enqueue deletion to Firestore
   */
  async deleteCustomer(customerId: string, ownerId: string): Promise<void> {
    const now = Date.now();
    // Delete customer from Dexie
    await dexieDb.customers.delete(customerId);
    // Delete associated transactions from Dexie
    await dexieDb.transactions.where('customerId').equals(customerId).delete();

    if (this.activeUser) {
      await dexieDb.syncQueue.add({
        entity: 'customer',
        operation: 'delete',
        documentId: customerId,
        ownerId: this.activeUser.uid,
        path: `users/${this.activeUser.uid}/customers/${customerId}`,
        payload: null,
        timestamp: now,
        status: 'pending',
        retryCount: 0
      });

      await this.updatePendingCount(this.activeUser.uid);

      if (navigator.onLine) {
        this.processSyncQueue(this.activeUser).catch(() => {});
      }
    }
  }

  /**
   * Write transaction to local Dexie cache and enqueue for sync
   */
  async writeTransaction(tx: Transaction): Promise<void> {
    const now = Date.now();
    const isSynced = !this.activeUser;
    const status: SyncStatus = isSynced ? 'synced' : 'pending_create';

    await dexieDb.transactions.put({
      ...tx,
      _syncStatus: status,
      _lastModified: now
    });

    if (this.activeUser) {
      await dexieDb.syncQueue.add({
        entity: 'transaction',
        operation: 'create',
        documentId: tx.id,
        ownerId: this.activeUser.uid,
        path: `users/${this.activeUser.uid}/transactions/${tx.id}`,
        payload: tx,
        timestamp: now,
        status: 'pending',
        retryCount: 0
      });

      await this.updatePendingCount(this.activeUser.uid);

      if (navigator.onLine) {
        this.processSyncQueue(this.activeUser).catch(() => {});
      }
    }
  }

  /**
   * Delete transaction locally and enqueue delete to Firestore
   */
  async deleteTransaction(txId: string, customerId: string, ownerId: string): Promise<void> {
    const now = Date.now();
    await dexieDb.transactions.delete(txId);

    if (this.activeUser) {
      await dexieDb.syncQueue.add({
        entity: 'transaction',
        operation: 'delete',
        documentId: txId,
        ownerId: this.activeUser.uid,
        path: `users/${this.activeUser.uid}/transactions/${txId}`,
        payload: { customerId },
        timestamp: now,
        status: 'pending',
        retryCount: 0
      });

      await this.updatePendingCount(this.activeUser.uid);

      if (navigator.onLine) {
        this.processSyncQueue(this.activeUser).catch(() => {});
      }
    }
  }

  /**
   * Write pharmacy profile to local Dexie and enqueue to Firestore
   */
  async writeProfile(profile: PharmacyProfile, ownerId: string): Promise<void> {
    const now = Date.now();
    const isSynced = !this.activeUser;
    const status: SyncStatus = isSynced ? 'synced' : 'pending_update';

    await dexieDb.pharmacyProfiles.put({
      ...profile,
      id: ownerId,
      ownerId,
      _syncStatus: status,
      _lastModified: now
    });

    if (this.activeUser) {
      await dexieDb.syncQueue.add({
        entity: 'profile',
        operation: 'update',
        documentId: ownerId,
        ownerId: this.activeUser.uid,
        path: `users/${this.activeUser.uid}/profile/pharmacy`,
        payload: profile,
        timestamp: now,
        status: 'pending',
        retryCount: 0
      });

      await this.updatePendingCount(this.activeUser.uid);

      if (navigator.onLine) {
        this.processSyncQueue(this.activeUser).catch(() => {});
      }
    }
  }

  /**
   * Write daily sale to local Dexie cache and enqueue to syncQueue if authenticated
   */
  async writeDailySale(sale: DailySale): Promise<void> {
    const now = Date.now();
    const isSynced = !this.activeUser;
    const status: SyncStatus = isSynced ? 'synced' : 'pending_create';

    await dexieDb.dailySales.put({
      ...sale,
      _syncStatus: status,
      _lastModified: now
    });

    if (this.activeUser) {
      const { _syncStatus, _lastModified, ...cleanPayload } = sale as any;
      await dexieDb.syncQueue.add({
        entity: 'dailySale',
        operation: 'create',
        documentId: sale.id,
        ownerId: this.activeUser.uid,
        path: `users/${this.activeUser.uid}/dailySales/${sale.id}`,
        payload: cleanPayload,
        timestamp: now,
        status: 'pending',
        retryCount: 0
      });

      await this.updatePendingCount(this.activeUser.uid);

      if (navigator.onLine) {
        this.processSyncQueue(this.activeUser).catch(() => {});
      }
    }
  }

  /**
   * Delete daily sale locally and enqueue delete to Firestore
   */
  async deleteDailySale(saleId: string): Promise<void> {
    const now = Date.now();
    await dexieDb.dailySales.delete(saleId);

    if (this.activeUser) {
      await dexieDb.syncQueue.add({
        entity: 'dailySale',
        operation: 'delete',
        documentId: saleId,
        ownerId: this.activeUser.uid,
        path: `users/${this.activeUser.uid}/dailySales/${saleId}`,
        payload: null,
        timestamp: now,
        status: 'pending',
        retryCount: 0
      });

      await this.updatePendingCount(this.activeUser.uid);

      if (navigator.onLine) {
        this.processSyncQueue(this.activeUser).catch(() => {});
      }
    }
  }

  /* =====================================================================
     REHYDRATION / INBOUND SYNC FROM FIRESTORE TO DEXIE
     ===================================================================== */

  /**
   * Upsert documents fetched from Firestore into Dexie IndexedDB cache.
   * If a document has local pending edits, local changes take precedence until pushed.
   */
  async rehydrateCustomers(ownerId: string, remoteCustomers: Customer[]): Promise<void> {
    const remoteMap = new Map<string, Customer>();
    remoteCustomers.forEach((c) => remoteMap.set(c.id, c));

    await dexieDb.transaction('rw', [dexieDb.customers], async () => {
      // Find existing cached customers to check for pending local edits
      const existing = await dexieDb.customers.where('ownerId').equals(ownerId).toArray();
      const existingMap = new Map(existing.map((c) => [c.id, c]));

      const itemsToPut: DexieCustomer[] = [];

      for (const remote of remoteCustomers) {
        const local = existingMap.get(remote.id);
        // If locally modified and pending, keep local version
        if (local && local._syncStatus && local._syncStatus !== 'synced') {
          continue;
        }
        itemsToPut.push({
          ...remote,
          _syncStatus: 'synced',
          _lastModified: Date.now()
        });
      }

      if (itemsToPut.length > 0) {
        await dexieDb.customers.bulkPut(itemsToPut);
      }

      // Check for records deleted in the remote cloud ONLY when remote returned verified records
      if (remoteCustomers.length > 0) {
        const toDeleteIds: string[] = [];
        for (const local of existing) {
          if (!remoteMap.has(local.id) && local._syncStatus === 'synced') {
            toDeleteIds.push(local.id);
          }
        }
        if (toDeleteIds.length > 0) {
          await dexieDb.customers.bulkDelete(toDeleteIds);
        }
      }
    });

    await this.updatePendingCount(ownerId);
  }

  /**
   * Upsert remote transactions into Dexie IndexedDB cache
   */
  async rehydrateTransactions(ownerId: string, remoteTxs: Transaction[]): Promise<void> {
    const remoteMap = new Map<string, Transaction>();
    remoteTxs.forEach((t) => remoteMap.set(t.id, t));

    await dexieDb.transaction('rw', [dexieDb.transactions], async () => {
      const existing = await dexieDb.transactions.where('ownerId').equals(ownerId).toArray();
      const existingMap = new Map(existing.map((t) => [t.id, t]));

      const itemsToPut: DexieTransaction[] = [];

      for (const remote of remoteTxs) {
        const local = existingMap.get(remote.id);
        if (local && local._syncStatus && local._syncStatus !== 'synced') {
          continue;
        }
        itemsToPut.push({
          ...remote,
          _syncStatus: 'synced',
          _lastModified: Date.now()
        });
      }

      if (itemsToPut.length > 0) {
        await dexieDb.transactions.bulkPut(itemsToPut);
      }

      // Only delete if remote returned non-empty confirmed records
      if (remoteTxs.length > 0) {
        const toDeleteIds: string[] = [];
        for (const local of existing) {
          if (!remoteMap.has(local.id) && local._syncStatus === 'synced') {
            toDeleteIds.push(local.id);
          }
        }
        if (toDeleteIds.length > 0) {
          await dexieDb.transactions.bulkDelete(toDeleteIds);
        }
      }
    });

    await this.updatePendingCount(ownerId);
  }

  /**
   * Rehydrate daily sales from remote Firestore into Dexie cache
   */
  async rehydrateDailySales(ownerId: string, remoteSales: DailySale[]): Promise<void> {
    const remoteMap = new Map<string, DailySale>();
    remoteSales.forEach((s) => remoteMap.set(s.id, s));

    await dexieDb.transaction('rw', [dexieDb.dailySales], async () => {
      const existing = await dexieDb.dailySales.where('ownerId').equals(ownerId).toArray();
      const existingMap = new Map(existing.map((s) => [s.id, s]));

      const itemsToPut: DexieDailySale[] = [];

      for (const remote of remoteSales) {
        const local = existingMap.get(remote.id);
        if (local && local._syncStatus && local._syncStatus !== 'synced') {
          continue;
        }
        itemsToPut.push({
          ...remote,
          _syncStatus: 'synced',
          _lastModified: Date.now()
        });
      }

      if (itemsToPut.length > 0) {
        await dexieDb.dailySales.bulkPut(itemsToPut);
      }
    });

    await this.updatePendingCount(ownerId);
  }

  /**
   * Rehydrate pharmacy profile from remote Firestore
   */
  async rehydrateProfile(ownerId: string, remoteProfile: PharmacyProfile): Promise<void> {
    const local = await dexieDb.pharmacyProfiles.get(ownerId);
    if (local && local._syncStatus && local._syncStatus !== 'synced') {
      return;
    }

    await dexieDb.pharmacyProfiles.put({
      ...remoteProfile,
      id: ownerId,
      ownerId,
      _syncStatus: 'synced',
      _lastModified: Date.now()
    });

    await this.updatePendingCount(ownerId);
  }

  /* =====================================================================
     SYNC QUEUE FLUSHER (Outbox Pattern to Firebase Firestore)
     ===================================================================== */

  /**
   * Process all pending mutations in the Dexie sync queue and push to Firestore
   */
  async processSyncQueue(user: User): Promise<void> {
    if (this.isProcessingQueue) return;
    if (!navigator.onLine) {
      this.syncStats.state = 'offline';
      this.notifyListeners();
      return;
    }

    this.isProcessingQueue = true;
    this.syncStats.state = 'syncing';
    this.syncStats.errorMessage = null;
    this.notifyListeners();

    try {
      const pendingItems = await dexieDb.syncQueue
        .where('ownerId')
        .equals(user.uid)
        .and((item) => item.status === 'pending' || item.status === 'failed')
        .sortBy('timestamp');

      if (pendingItems.length === 0) {
        this.syncStats.state = 'synced';
        this.syncStats.pendingCount = 0;
        this.syncStats.lastSyncedAt = new Date();
        this.notifyListeners();
        this.isProcessingQueue = false;
        return;
      }

      for (const item of pendingItems) {
        if (!item.id) continue;

        try {
          // Execute corresponding Firestore operation
          if (item.operation === 'create' || item.operation === 'update') {
            const docRef = doc(db, item.path);
            const { _syncStatus, _lastModified, ...cleanPayload } = (item.payload && typeof item.payload === 'object') ? item.payload : {};
            await setDoc(docRef, cleanPayload, { merge: true });

            // If it's a customer creation with initial due or a customer transaction, also mirror if needed
            if (item.entity === 'transaction' && cleanPayload?.customerId) {
              const custTxPath = `users/${user.uid}/customers/${cleanPayload.customerId}/transactions/${item.documentId}`;
              try {
                await setDoc(doc(db, custTxPath), cleanPayload, { merge: true });
              } catch {
                // Secondary mirror write failure is non-fatal
              }
            }

            // Mark entity as synced in Dexie
            if (item.entity === 'customer') {
              await dexieDb.customers.update(item.documentId, { _syncStatus: 'synced' });
            } else if (item.entity === 'transaction') {
              await dexieDb.transactions.update(item.documentId, { _syncStatus: 'synced' });
            } else if (item.entity === 'profile') {
              await dexieDb.pharmacyProfiles.update(item.documentId, { _syncStatus: 'synced' });
            } else if (item.entity === 'dailySale') {
              await dexieDb.dailySales.update(item.documentId, { _syncStatus: 'synced' });
            }
          } else if (item.operation === 'delete') {
            const docRef = doc(db, item.path);
            await deleteDoc(docRef);

            if (item.entity === 'transaction' && item.payload?.customerId) {
              const custTxPath = `users/${user.uid}/customers/${item.payload.customerId}/transactions/${item.documentId}`;
              try {
                await deleteDoc(doc(db, custTxPath));
              } catch {
                // Ignore
              }
            }
          }

          // Operation succeeded: Remove from sync queue
          await dexieDb.syncQueue.delete(item.id);
        } catch (itemError: any) {
          console.warn(`Sync queue item ${item.id} error:`, itemError);

          // Update retry count
          const nextRetry = (item.retryCount || 0) + 1;
          await dexieDb.syncQueue.update(item.id, {
            status: nextRetry > 5 ? 'failed' : 'pending',
            retryCount: nextRetry,
            errorMessage: itemError?.message || String(itemError)
          });

          // If permission error, log properly with standard error handler
          if (String(itemError?.message).includes('permission') || String(itemError?.code).includes('permission-denied')) {
            handleFirestoreError(itemError, OperationType.WRITE, item.path);
          }

          // If offline or network drop during execution, break queue loop
          if (!navigator.onLine) {
            this.syncStats.state = 'offline';
            break;
          }
        }
      }

      await this.updatePendingCount(user.uid);
      const remainingCount = await dexieDb.getPendingCount(user.uid);

      if (remainingCount === 0) {
        this.syncStats.state = 'synced';
        this.syncStats.lastSyncedAt = new Date();

        // Broadcast sync success event for UI indicator & Service Worker
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sw-sync-success', {
            detail: { 
              timestamp: Date.now(), 
              count: pendingItems.length,
              source: 'dexie-cloud-sync'
            }
          }));
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            try {
              navigator.serviceWorker.controller.postMessage({
                type: 'DATA_PUSHED',
                timestamp: Date.now(),
                count: pendingItems.length
              });
            } catch {
              // Ignore if controller is busy
            }
          }
        }
      } else {
        this.syncStats.state = 'idle';
      }
    } catch (err: any) {
      console.error('Dexie sync queue error:', err);
      this.syncStats.state = 'error';
      this.syncStats.errorMessage = err?.message || 'Sync failed';
    } finally {
      this.isProcessingQueue = false;
      this.notifyListeners();
    }
  }

  /**
   * Pull latest data from Firestore and store into Dexie cache
   */
  async fullPullFromFirestore(user: User): Promise<{ customersCount: number; txCount: number }> {
    this.syncStats.state = 'syncing';
    this.notifyListeners();

    try {
      // Fetch customers
      const customersRef = collection(db, `users/${user.uid}/customers`);
      const custQuery = query(customersRef, orderBy('serialNumber', 'asc'));
      const custSnap = await getDocs(custQuery);
      const customers: Customer[] = [];
      custSnap.forEach((d) => customers.push(d.data() as Customer));
      await this.rehydrateCustomers(user.uid, customers);

      // Fetch transactions
      const txRef = collection(db, `users/${user.uid}/transactions`);
      const txQuery = query(txRef, orderBy('createdAt', 'desc'));
      const txSnap = await getDocs(txQuery);
      const transactions: Transaction[] = [];
      txSnap.forEach((d) => transactions.push(d.data() as Transaction));
      await this.rehydrateTransactions(user.uid, transactions);

      this.syncStats.state = 'synced';
      this.syncStats.lastSyncedAt = new Date();
      this.notifyListeners();

      return {
        customersCount: customers.length,
        txCount: transactions.length
      };
    } catch (error) {
      console.error('fullPullFromFirestore error:', error);
      this.syncStats.state = 'error';
      this.syncStats.errorMessage = error instanceof Error ? error.message : String(error);
      this.notifyListeners();
      throw error;
    }
  }
}

// Singleton sync manager
export const dexieSyncManager = new DexieFirestoreSyncManager();
