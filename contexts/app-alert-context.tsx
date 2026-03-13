import React, { createContext, useCallback, useContext, useState } from 'react';
import { ThemedConfirmDialog } from '@/components/ThemedConfirmDialog';

export interface ConfirmButton {
  text: string;
  onPress: () => void;
  style?: 'cancel' | 'confirm' | 'danger';
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  icon?: 'check-circle' | 'error' | 'info' | 'warning';
  buttons: ConfirmButton[];
}

interface AppAlertContextValue {
  showAlert: (opts: {
    title: string;
    message: string;
    icon?: 'check-circle' | 'error' | 'info' | 'warning';
    buttons?: { text: string; onPress?: () => void; style?: 'cancel' | 'confirm' | 'danger' }[];
  }) => void;
}

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    icon: 'info',
    buttons: [],
  });

  const hide = useCallback(() => {
    setState((s) => ({ ...s, visible: false }));
  }, []);

  const showAlert = useCallback(
    (opts: {
      title: string;
      message: string;
      icon?: 'check-circle' | 'error' | 'info' | 'warning';
      buttons?: { text: string; onPress?: () => void; style?: 'cancel' | 'confirm' | 'danger' }[];
    }) => {
      const defaultButtons = opts.buttons ?? [{ text: 'OK', style: 'confirm' as const }];
      const buttons: ConfirmButton[] = defaultButtons.map((b) => ({
        ...b,
        style: (b.style ?? 'cancel') as 'cancel' | 'confirm' | 'danger',
        onPress: () => {
          b.onPress?.();
          hide();
        },
      }));
      setState({
        visible: true,
        title: opts.title,
        message: opts.message,
        icon: opts.icon ?? 'info',
        buttons,
      });
    },
    [hide]
  );

  return (
    <AppAlertContext.Provider value={{ showAlert }}>
      {children}
      <ThemedConfirmDialog
        visible={state.visible}
        title={state.title}
        message={state.message}
        icon={state.icon}
        buttons={state.buttons}
        onRequestClose={hide}
      />
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    return {
      showAlert: (opts: { title: string; message: string }) => {
        const { Alert } = require('react-native');
        Alert.alert(opts.title, opts.message);
      },
    };
  }
  return ctx;
}
