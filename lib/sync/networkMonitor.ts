/**
 * Network Monitor
 * Tracks online/offline status using NetInfo
 * Falls back to a simple fetch-based check if NetInfo is unavailable
 */
import { useEffect, useState, useCallback, useRef } from 'react';

type NetworkListener = (isConnected: boolean) => void;

// ============================================================
// Core network state
// ============================================================

let _isConnected = true; // optimistic default
let _listeners: Set<NetworkListener> = new Set();
let _initialized = false;
let _netInfoUnsubscribe: (() => void) | null = null;

/**
 * Initialize the network monitor (call once at app start)
 */
export async function initNetworkMonitor(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  try {
    // Dynamic import to avoid crash if not installed
    const NetInfo = await import('@react-native-community/netinfo');

    // Get initial state
    const state = await NetInfo.default.fetch();
    _isConnected = !!(state.isConnected && state.isInternetReachable !== false);

    // Subscribe to changes
    _netInfoUnsubscribe = NetInfo.default.addEventListener((state) => {
      const newConnected = !!(state.isConnected && state.isInternetReachable !== false);
      if (newConnected !== _isConnected) {
        _isConnected = newConnected;
        if (__DEV__) console.log('[Network]', _isConnected ? '🟢 Online' : '🔴 Offline');
        _listeners.forEach((fn) => fn(_isConnected));
      }
    });
  } catch {
    // NetInfo not available — fallback to periodic fetch check
    if (__DEV__) console.warn('[Network] NetInfo not available, using fallback');
    await checkConnectionFallback();
    setInterval(checkConnectionFallback, 15000);
  }
}

/**
 * Fallback connectivity check
 */
async function checkConnectionFallback(): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    updateConnectionState(true);
  } catch {
    updateConnectionState(false);
  }
}

function updateConnectionState(connected: boolean): void {
  if (connected !== _isConnected) {
    _isConnected = connected;
    if (__DEV__) console.log('[Network]', _isConnected ? '🟢 Online' : '🔴 Offline');
    _listeners.forEach((fn) => fn(_isConnected));
  }
}

/**
 * Get current connection status
 */
export function isOnline(): boolean {
  return _isConnected;
}

/**
 * Subscribe to network changes
 */
export function onNetworkChange(listener: NetworkListener): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

/**
 * Cleanup
 */
export function destroyNetworkMonitor(): void {
  if (_netInfoUnsubscribe) {
    _netInfoUnsubscribe();
    _netInfoUnsubscribe = null;
  }
  _listeners.clear();
  _initialized = false;
}

// ============================================================
// React Hook
// ============================================================

export function useNetworkStatus(): {
  isConnected: boolean;
  checkNow: () => Promise<boolean>;
} {
  const [connected, setConnected] = useState(_isConnected);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = onNetworkChange((isConn) => {
      if (mountedRef.current) setConnected(isConn);
    });

    // Sync initial
    setConnected(_isConnected);

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const checkNow = useCallback(async (): Promise<boolean> => {
    await checkConnectionFallback();
    return _isConnected;
  }, []);

  return { isConnected: connected, checkNow };
}
