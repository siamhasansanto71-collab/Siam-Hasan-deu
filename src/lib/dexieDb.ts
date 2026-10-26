import Dexie, { type Table } from 'dexie';
import type { Customer, Transaction, PharmacyProfile, DailySale, Expense } from '../types/ledger';

export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

export interface DexieCustomer extends Customer {
  _syncStatus?: SyncStatus;
  _lastModified?: number;
}

export interface DexieTransaction extends Transaction {
  _syncStatus?: SyncStatus;
  _lastModified?: number;
}

export interface DexiePharmacyProfile extends PharmacyProfile {
  id: string; // Document ID (usually 'pharmacy' or ownerId)
  _syncStatus?: SyncStatus;
  _lastModified?: number;
}

export interface DexieDailySale extends DailySale {
  _syncStatus?: SyncStatus;
  _lastModified?: number;
}

export interface DexieExpense extends Expense {
  _syncStatus?: SyncStatus;
  _lastModified?: number;
}

export interface SyncQueueItem {
  id?: number;
  entity: 'customer' | 'transaction' | 'profile' | 'dailySale' | 'expense';
  operation: 'create' | 'update' | 'delete';
  documentId: string;
  ownerId: string;
  path: string;
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  errorMessage?: string;
}

export interface AppMetadataItem {
  key: string;
  value: any;
  updatedAt: number;
}

/**
 * SiamPharmaDexieDB
 * High-performance client-side IndexedDB database for Siam Pharma Due Management.
 * Provides instant offline caching, rich indexing, and outbox synchronization queue for Firebase Firestore.
 */
export class SiamPharmaDexieDB extends Dexie {
  customers!: Table<DexieCustomer, string>;
  transactions!: Table<DexieTransaction, string>;
  pharmacyProfiles!: Table<DexiePharmacyProfile, string>;
  dailySales!: Table<DexieDailySale, string>;
  expenses!: Table<DexieExpense, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  appMetadata!: Table<AppMetadataItem, string>;

  constructor() {
    super('SiamPharmaLedgerDB');

    // Schema definition for Dexie IndexedDB
    // Syntax: '&id' = primary key, 'indexName' = indexed field, '++id' = auto-increment
    this.version(1).stores({
      customers: '&id, ownerId, serialNumber, name, phone, totalDue, updatedAt, _syncStatus, _lastModified',
      transactions: '&id, customerId, ownerId, type, date, createdAt, _syncStatus, _lastModified',
      pharmacyProfiles: '&id, ownerId, updatedAt, _syncStatus, _lastModified',
      syncQueue: '++id, entity, operation, documentId, ownerId, status, timestamp, retryCount',
      appMetadata: '&key, updatedAt'
    });

    this.version(2).stores({
      dailySales: '&id, ownerId, date, createdAt, _syncStatus, _lastModified',
      expenses: '&id, ownerId, category, date, createdAt, _syncStatus, _lastModified'
    });
  }

  /**
   * Clear all cached data belonging to a specific user (or demo user)
   */
  async clearUserData(ownerId: string): Promise<void> {
    if (!ownerId) return;
    await this.transaction('rw', [this.customers, this.transactions, this.pharmacyProfiles, this.dailySales, this.expenses, this.syncQueue], async () => {
      await this.customers.where('ownerId').equals(ownerId).delete();
      await this.transactions.where('ownerId').equals(ownerId).delete();
      await this.pharmacyProfiles.where('ownerId').equals(ownerId).delete();
      await this.dailySales.where('ownerId').equals(ownerId).delete();
      await this.expenses.where('ownerId').equals(ownerId).delete();
      await this.syncQueue.where('ownerId').equals(ownerId).delete();
    });
  }

  /**
   * Clear all local demo data
   */
  async clearDemoData(): Promise<void> {
    await this.clearUserData('demo_user');
  }

  /**
   * Get pending synchronization operations count for a specific owner
   */
  async getPendingCount(ownerId?: string): Promise<number> {
    if (!ownerId) return 0;
    return await this.syncQueue
      .where('ownerId')
      .equals(ownerId)
      .and(item => item.status === 'pending' || item.status === 'failed')
      .count();
  }

  /**
   * Retrieve storage stats strictly scoped by ownerId
   */
  async getStorageStats(ownerId?: string): Promise<{
    customerCount: number;
    transactionCount: number;
    pendingQueueCount: number;
  }> {
    if (!ownerId) {
      return { customerCount: 0, transactionCount: 0, pendingQueueCount: 0 };
    }
    const [customerCount, transactionCount, pendingQueueCount] = await Promise.all([
      this.customers.where('ownerId').equals(ownerId).count(),
      this.transactions.where('ownerId').equals(ownerId).count(),
      this.getPendingCount(ownerId)
    ]);
    return { customerCount, transactionCount, pendingQueueCount };
  }

  async getDailySales(ownerId?: string): Promise<DailySale[]> {
    try {
      if (!ownerId) return [];
      return await this.dailySales.where('ownerId').equals(ownerId).toArray();
    } catch {
      return [];
    }
  }

  async saveDailySale(sale: DailySale): Promise<void> {
    try {
      await this.dailySales.put({
        ...sale,
        _syncStatus: 'synced',
        _lastModified: Date.now()
      });
    } catch (e) {
      console.warn('Dexie saveDailySale error:', e);
    }
  }

  async deleteDailySale(saleId: string): Promise<void> {
    try {
      await this.dailySales.delete(saleId);
    } catch (e) {
      console.warn('Dexie deleteDailySale error:', e);
    }
  }

  async getExpenses(ownerId?: string): Promise<Expense[]> {
    try {
      if (!ownerId) return [];
      return await this.expenses.where('ownerId').equals(ownerId).toArray();
    } catch {
      return [];
    }
  }

  async saveExpense(expense: Expense): Promise<void> {
    try {
      await this.expenses.put({
        ...expense,
        _syncStatus: 'synced',
        _lastModified: Date.now()
      });
    } catch (e) {
      console.warn('Dexie saveExpense error:', e);
    }
  }

  async deleteExpense(expenseId: string): Promise<void> {
    try {
      await this.expenses.delete(expenseId);
    } catch (e) {
      console.warn('Dexie deleteExpense error:', e);
    }
  }
}

// Singleton database instance
export const dexieDb = new SiamPharmaDexieDB();
