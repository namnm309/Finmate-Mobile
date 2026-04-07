/**
 * Sync Context — React Provider
 * Wraps the app to provide sync state, auto-sync on reconnect, and periodic sync.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { initNetworkMonitor, onNetworkChange, isOnline, useNetworkStatus } from '@/lib/sync/networkMonitor';
import {
  fullSync,
  configureSyncEngine,
  getLastSyncTime,
  getPendingChangesCount,
  getSyncState,
  onSyncStateChange,
  type SyncState,
  type SyncResult,
} from '@/lib/sync/syncEngine';
import { getDb } from '@/lib/db/database';
import { runDataMigration } from '@/lib/db/dataMigration';
import { runInitialSync, isInitialSyncDone } from '@/lib/sync/initialSync';

// ============================================================
// Context Type
// ============================================================

interface SyncContextValue {
  /** Current sync state */
  syncStatus: SyncState;
  /** Is device online? */
  isConnected: boolean;
  /** Last successful sync timestamp */
  lastSyncTime: string | null;
  /** Number of pending (unsynced) changes */
  pendingChangesCount: number;
  /** Is currently syncing? */
  isSyncing: boolean;
  /** Trigger a manual sync */
  forceSync: () => Promise<SyncResult>;
  /** Last sync result (if any) */
  lastResult: SyncResult | null;
}

const SyncContext = createContext<SyncContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

const PERIODIC_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncState>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const periodicRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevConnectedRef = useRef(isConnected);
  const initializedRef = useRef(false);

  // Initialize
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      try {
        // Init network monitor
        await initNetworkMonitor();
        // Init database
        await getDb();
        // Run file→SQLite data migration (once)
        await runDataMigration();
        // Configure sync engine with auth token getter
        configureSyncEngine(getToken);

        // Run initial sync if first time on this device
        const initialDone = await isInitialSyncDone();
        if (!initialDone && isOnline()) {
          if (__DEV__) console.log('[SyncProvider] Running initial sync...');
          await runInitialSync(getToken);
        }

        // Load cached sync info
        const time = await getLastSyncTime();
        setLastSyncTime(time);
        const count = await getPendingChangesCount();
        setPendingCount(count);

        // Regular sync if online
        if (isOnline()) {
          const result = await fullSync();
          setLastResult(result);
          setLastSyncTime(await getLastSyncTime());
          setPendingCount(await getPendingChangesCount());
        }
      } catch (error) {
        console.error('[SyncProvider] Init error:', error);
      }
    })();
  }, [getToken]);

  // Listen to sync state changes
  useEffect(() => {
    const unsubscribe = onSyncStateChange((state, result) => {
      setSyncStatus(state);
      if (result) setLastResult(result);
    });
    return unsubscribe;
  }, []);

  // Auto-sync when network reconnects
  useEffect(() => {
    if (isConnected && !prevConnectedRef.current) {
      if (__DEV__) console.log('[SyncProvider] Network reconnected — triggering sync');
      fullSync().then(async () => {
        setLastSyncTime(await getLastSyncTime());
        setPendingCount(await getPendingChangesCount());
      });
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  // Periodic sync
  useEffect(() => {
    periodicRef.current = setInterval(async () => {
      if (isOnline()) {
        if (__DEV__) console.log('[SyncProvider] Periodic sync');
        await fullSync();
        setLastSyncTime(await getLastSyncTime());
        setPendingCount(await getPendingChangesCount());
      }
    }, PERIODIC_SYNC_INTERVAL);

    return () => {
      if (periodicRef.current) clearInterval(periodicRef.current);
    };
  }, []);

  // Sync on app foreground
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active' && isOnline()) {
        if (__DEV__) console.log('[SyncProvider] App foregrounded — syncing');
        await fullSync();
        setLastSyncTime(await getLastSyncTime());
        setPendingCount(await getPendingChangesCount());
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // Force sync handler
  const forceSync = useCallback(async (): Promise<SyncResult> => {
    const result = await fullSync();
    setLastSyncTime(await getLastSyncTime());
    setPendingCount(await getPendingChangesCount());
    return result;
  }, []);

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        isConnected,
        lastSyncTime,
        pendingChangesCount: pendingCount,
        isSyncing: syncStatus === 'syncing',
        forceSync,
        lastResult,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    // Fallback if used outside provider
    return {
      syncStatus: 'idle',
      isConnected: true,
      lastSyncTime: null,
      pendingChangesCount: 0,
      isSyncing: false,
      forceSync: async () => ({ success: false, pushed: 0, pulled: 0, errors: ['SyncProvider not found'] }),
      lastResult: null,
    };
  }
  return ctx;
}
