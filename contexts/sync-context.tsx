/**
 * Sync Context — React Provider
 * Wraps the app to provide sync state, auto-sync on reconnect, and periodic sync.
 * Handles user switching: resets DB when userId changes (logout → login another account).
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, AppState, type AppStateStatus, View, Text } from 'react-native';
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
import { getDb, resetDb } from '@/lib/db/database';
import { runDataMigration } from '@/lib/db/dataMigration';
import { runInitialSync, isInitialSyncDone, resetInitialSync } from '@/lib/sync/initialSync';

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
  /** Whether initial sync has completed (or been skipped) */
  initialSyncReady: boolean;
}

const SyncContext = createContext<SyncContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

const PERIODIC_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { getToken, userId, isSignedIn } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncState>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [initialSyncReady, setInitialSyncReady] = useState(false);
  const periodicRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevConnectedRef = useRef(isConnected);
  const prevUserIdRef = useRef<string | null | undefined>(undefined); // undefined = not yet initialized
  const initializingRef = useRef(false);

  /**
   * Core initialization logic:
   * - Init network, database, data migration
   * - Run initial sync if needed
   * - Run regular sync if online
   */
  const initializeSync = useCallback(async (isUserSwitch: boolean) => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    try {
      setInitialSyncReady(false);

      // Init network monitor (idempotent)
      await initNetworkMonitor();

      if (isUserSwitch) {
        // User switched accounts — wipe old data completely
        if (__DEV__) console.log('[SyncProvider] User changed — resetting database...');
        await resetDb();
      }

      // Init database (creates fresh if wiped, or reuses existing)
      await getDb();
      // Run file→SQLite data migration (once)
      await runDataMigration();
      // Configure sync engine with auth token getter
      configureSyncEngine(getToken);

      // Run initial sync if first time on this device (or after reset)
      const initialDone = await isInitialSyncDone();
      if (!initialDone && isOnline()) {
        if (__DEV__) console.log('[SyncProvider] Running initial sync...');
        await runInitialSync(getToken);
      }

      // Mark initial sync as ready — data is now available in SQLite
      setInitialSyncReady(true);

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
      // Even on error, mark as ready so app doesn't stay stuck on loading
      setInitialSyncReady(true);
    } finally {
      initializingRef.current = false;
    }
  }, [getToken]);

  // ---- Main effect: react to userId changes ----
  useEffect(() => {
    // Not signed in — don't init, but mark ready so auth screens can render
    if (!isSignedIn || !userId) {
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== null) {
        // User just logged out — reset DB in background
        if (__DEV__) console.log('[SyncProvider] User logged out — resetting database...');
        resetDb().catch((e) => console.error('[SyncProvider] Reset on logout error:', e));
      }
      prevUserIdRef.current = null;
      setInitialSyncReady(true); // Let auth screens render
      return;
    }

    const isFirstInit = prevUserIdRef.current === undefined;
    const isUserSwitch = !isFirstInit && prevUserIdRef.current !== null && prevUserIdRef.current !== userId;

    prevUserIdRef.current = userId;

    if (isFirstInit || isUserSwitch) {
      if (__DEV__) console.log(`[SyncProvider] Init for user: ${userId} (switch: ${isUserSwitch})`);
      initializeSync(isUserSwitch);
    }
  }, [userId, isSignedIn, initializeSync]);

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
    if (isConnected && !prevConnectedRef.current && isSignedIn) {
      if (__DEV__) console.log('[SyncProvider] Network reconnected — triggering sync');
      fullSync().then(async () => {
        setLastSyncTime(await getLastSyncTime());
        setPendingCount(await getPendingChangesCount());
      });
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected, isSignedIn]);

  // Periodic sync
  useEffect(() => {
    periodicRef.current = setInterval(async () => {
      if (isOnline() && isSignedIn) {
        if (__DEV__) console.log('[SyncProvider] Periodic sync');
        await fullSync();
        setLastSyncTime(await getLastSyncTime());
        setPendingCount(await getPendingChangesCount());
      }
    }, PERIODIC_SYNC_INTERVAL);

    return () => {
      if (periodicRef.current) clearInterval(periodicRef.current);
    };
  }, [isSignedIn]);

  // Sync on app foreground
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active' && isOnline() && isSignedIn) {
        if (__DEV__) console.log('[SyncProvider] App foregrounded — syncing');
        await fullSync();
        setLastSyncTime(await getLastSyncTime());
        setPendingCount(await getPendingChangesCount());
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isSignedIn]);

  // Force sync handler
  const forceSync = useCallback(async (): Promise<SyncResult> => {
    const result = await fullSync();
    setLastSyncTime(await getLastSyncTime());
    setPendingCount(await getPendingChangesCount());
    return result;
  }, []);

  // Show loading screen while initial sync is running (only when signed in)
  if (!initialSyncReady && isSignedIn) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' }}>
        <ActivityIndicator size="large" color="#51A2FF" />
        <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 14 }}>Đang đồng bộ dữ liệu...</Text>
      </View>
    );
  }

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
        initialSyncReady,
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
      initialSyncReady: true,
    };
  }
  return ctx;
}
