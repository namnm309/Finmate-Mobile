import React, { createContext, useCallback, useContext, useState } from 'react';

interface NotificationBadgeContextValue {
  /** Có thông báo chi tiêu quá mức / giao dịch bất thường (hiện chấm đỏ nút chuông) */
  hasUnreadAlerts: boolean;
  /** Có tin nhắn thiếu field từ AI sau quét hóa đơn (hiện chấm đỏ nút chat) */
  hasMissingFieldsMessage: boolean;
  setHasMissingFieldsMessage: (v: boolean) => void;
  markAlertsRead: () => void;
}

const NotificationBadgeContext = createContext<NotificationBadgeContextValue | null>(null);

export function NotificationBadgeProvider({ children }: { children: React.ReactNode }) {
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(true); // mock: có sẵn thông báo
  const [hasMissingFieldsMessage, setHasMissingFieldsMessage] = useState(false);

  const markAlertsRead = useCallback(() => setHasUnreadAlerts(false), []);

  return (
    <NotificationBadgeContext.Provider
      value={{
        hasUnreadAlerts,
        hasMissingFieldsMessage,
        setHasMissingFieldsMessage,
        markAlertsRead,
      }}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadge() {
  const ctx = useContext(NotificationBadgeContext);
  if (!ctx) {
    return {
      hasUnreadAlerts: false,
      hasMissingFieldsMessage: false,
      setHasMissingFieldsMessage: () => {},
      markAlertsRead: () => {},
    };
  }
  return ctx;
}
