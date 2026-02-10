import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '@/lib/api';

export interface TransactionsUpdatedPayload {
  transactionId?: string;
  action?: 'created' | 'updated' | 'deleted' | string;
}

/**
 * Hook kết nối tới TransactionHub và lắng nghe sự kiện TransactionsUpdated.
 * Khi có event mới, sẽ gọi callback onTransactionsUpdated.
 */
export const useTransactionHub = (
  onTransactionsUpdated: (payload: TransactionsUpdatedPayload) => void
) => {
  const { getToken, isSignedIn } = useAuth();
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    let isMounted = true;

    const startConnection = async () => {
      if (!isMounted || !isSignedIn) return;
      if (connectionRef.current) return;

      try {
        const baseUrl = API_BASE_URL.replace(/\/api\/?$/, '');

        const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${baseUrl}/hubs/transactions`, {
            accessTokenFactory: async () => {
              try {
                const token = await getToken();
                return token ?? '';
              } catch (error) {
                console.error('[SignalR] Failed to get auth token:', error);
                return '';
              }
            },
          })
          .withAutomaticReconnect()
          .build();

        connection.on('TransactionsUpdated', (payload: TransactionsUpdatedPayload) => {
          if (!isMounted) return;
          try {
            onTransactionsUpdated(payload);
          } catch (error) {
            console.error('[SignalR] Error in onTransactionsUpdated handler:', error);
          }
        });

        await connection.start();
        await connection.invoke('JoinUserGroup');

        if (!isMounted) {
          await connection.stop();
          return;
        }

        connectionRef.current = connection;
        if (__DEV__) {
          console.log('[SignalR] TransactionHub connected');
        }
      } catch (error) {
        console.error('[SignalR] Error connecting to TransactionHub:', error);
      }
    };

    startConnection();

    return () => {
      isMounted = false;
      if (connectionRef.current) {
        connectionRef.current
          .stop()
          .catch(err => console.error('[SignalR] Error stopping connection:', err));
        connectionRef.current = null;
      }
    };
  }, [getToken, isSignedIn, onTransactionsUpdated]);
};

