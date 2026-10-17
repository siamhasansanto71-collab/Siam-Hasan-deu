import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { dexieSyncManager, type SyncStats } from '../lib/dexieSync';
import { dexieDb } from '../lib/dexieDb';

export interface UseDexieSyncReturn {
  syncStats: SyncStats;
  storageStats: {
    customerCount: number;
    transactionCount: number;
    pendingQueueCount: number;
  };
  triggerSyncNow: () => Promise<void>;
  refreshStorageStats: () => Promise<void>;
  pullLatestFromCloud: () => Promise<void>;
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
}

export function useDexieSync(): UseDexieSyncReturn {
  const { user } = useAuth();
  const [syncStats, setSyncStats] = useState<SyncStats>({
    state: 'idle',
    pendingCount: 0,
    lastSyncedAt: null,
    errorMessage: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });

  const [storageStats, setStorageStats] = useState({
    customerCount: 0,
    transactionCount: 0,
    pendingQueueCount: 0,
  });

  const refreshStorageStats = useCallback(async () => {
    try {
      const stats = await dexieDb.getStorageStats(user ? user.uid : 'demo_user');
      setStorageStats(stats);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    dexieSyncManager.setActiveUser(user);
    const unsubscribe = dexieSyncManager.subscribe((stats) => {
      setSyncStats(stats);
      refreshStorageStats();
    });

    refreshStorageStats();
    return () => unsubscribe();
  }, [user, refreshStorageStats]);

  const triggerSyncNow = useCallback(async () => {
    if (!user) return;
    await dexieSyncManager.processSyncQueue(user);
    await refreshStorageStats();
  }, [user, refreshStorageStats]);

  const pullLatestFromCloud = useCallback(async () => {
    if (!user) return;
    await dexieSyncManager.fullPullFromFirestore(user);
    await refreshStorageStats();
  }, [user, refreshStorageStats]);

  return {
    syncStats,
    storageStats,
    triggerSyncNow,
    refreshStorageStats,
    pullLatestFromCloud,
    isSyncing: syncStats.state === 'syncing',
    isOnline: syncStats.isOnline,
    pendingCount: syncStats.pendingCount,
  };
}
