import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTransactionHub } from '@/lib/realtime/useTransactionHub';

const REFRESH_DEBOUNCE_MS = 500;

interface TransactionRefreshContextValue {
  /** Tăng khi có giao dịch mới/cập nhật - dùng trong deps của useEffect để refetch */
  transactionRefreshTrigger: number;
  /** Gọi sau khi tạo/sửa/xóa giao dịch hoặc thay đổi nguồn tiền - chỉ trigger 1 lần trong REFRESH_DEBOUNCE_MS */
  refreshTransactions: () => void;
}

const TransactionRefreshContext = createContext<TransactionRefreshContextValue | null>(null);

export function TransactionRefreshProvider({ children }: { children: React.ReactNode }) {
  const [trigger, setTrigger] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshTransactions = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setTrigger((prev) => prev + 1);
    }, REFRESH_DEBOUNCE_MS);
  }, []);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const hubCallback = useCallback(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  useTransactionHub(hubCallback);

  return (
    <TransactionRefreshContext.Provider
      value={{
        transactionRefreshTrigger: trigger,
        refreshTransactions,
      }}
    >
      {children}
    </TransactionRefreshContext.Provider>
  );
}

export function useTransactionRefresh() {
  const ctx = useContext(TransactionRefreshContext);
  if (!ctx) {
    return {
      transactionRefreshTrigger: 0,
      refreshTransactions: () => {},
    };
  }
  return ctx;
}
