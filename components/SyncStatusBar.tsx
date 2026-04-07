/**
 * Sync Status Bar
 * Compact bar showing sync/connection status at the top of the screen.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useSync } from '@/contexts/sync-context';
import { useTheme } from '@/contexts/theme-context';

export function SyncStatusBar() {
  const { syncStatus, isConnected, pendingChangesCount, isSyncing, forceSync, lastSyncTime } = useSync();
  const { resolvedTheme: theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  // Determine if bar should be shown
  useEffect(() => {
    const shouldShow = !isConnected || isSyncing || syncStatus === 'error' || pendingChangesCount > 0;

    if (shouldShow) {
      setVisible(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Auto-hide after sync completes
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setVisible(false));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, isSyncing, syncStatus, pendingChangesCount]);

  if (!visible) return null;

  // Determine display
  let icon = '✅';
  let message = 'Đã đồng bộ';
  let bgColor = theme === 'dark' ? '#1a3a1a' : '#e6f7e6';
  let textColor = theme === 'dark' ? '#6bd66b' : '#2d7d2d';
  let showRetry = false;

  if (!isConnected) {
    icon = '🔴';
    message = 'Đang offline';
    if (pendingChangesCount > 0) {
      message += ` · ${pendingChangesCount} thay đổi chờ đồng bộ`;
    }
    bgColor = theme === 'dark' ? '#3a2a1a' : '#fff3e0';
    textColor = theme === 'dark' ? '#ffb74d' : '#e65100';
  } else if (isSyncing) {
    icon = '🔄';
    message = 'Đang đồng bộ...';
    if (pendingChangesCount > 0) {
      message += ` (${pendingChangesCount} thay đổi)`;
    }
    bgColor = theme === 'dark' ? '#1a2a3a' : '#e3f2fd';
    textColor = theme === 'dark' ? '#64b5f6' : '#1565c0';
  } else if (syncStatus === 'error') {
    icon = '⚠️';
    message = 'Lỗi đồng bộ';
    bgColor = theme === 'dark' ? '#3a1a1a' : '#ffebee';
    textColor = theme === 'dark' ? '#ef5350' : '#c62828';
    showRetry = true;
  } else if (pendingChangesCount > 0) {
    icon = '📤';
    message = `${pendingChangesCount} thay đổi chờ đồng bộ`;
    bgColor = theme === 'dark' ? '#1a2a3a' : '#e3f2fd';
    textColor = theme === 'dark' ? '#64b5f6' : '#1565c0';
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor, opacity }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={[styles.message, { color: textColor }]} numberOfLines={1}>
          {message}
        </Text>
        {showRetry && (
          <TouchableOpacity
            onPress={() => forceSync()}
            style={[styles.retryButton, { borderColor: textColor }]}
          >
            <Text style={[styles.retryText, { color: textColor }]}>Thử lại</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  retryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 8,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
