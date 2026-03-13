import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

export interface OpenChatbotOptions {
  initialMessage?: string;
  autoSend?: boolean;
}

export interface FabPosition {
  x: number;
  y: number;
}

interface AIChatbotContextValue {
  visible: boolean;
  initialMessage: string;
  autoSend: boolean;
  fabPosition: FabPosition;
  setFabPosition: (pos: FabPosition) => void;
  openChatbot: (opts?: OpenChatbotOptions) => void;
  closeChatbot: () => void;
}

const AIChatbotContext = createContext<AIChatbotContextValue | null>(null);

const DEFAULT_FAB_POS = { x: 0, y: 0 };

export function AIChatbotProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const [autoSend, setAutoSend] = useState(false);
  const [fabPosition, setFabPositionState] = useState<FabPosition>(DEFAULT_FAB_POS);
  const fabPosRef = useRef<FabPosition>(DEFAULT_FAB_POS);

  const setFabPosition = useCallback((pos: FabPosition) => {
    fabPosRef.current = pos;
    setFabPositionState(pos);
  }, []);

  const openChatbot = useCallback((opts?: OpenChatbotOptions) => {
    setInitialMessage(opts?.initialMessage ?? '');
    setAutoSend(opts?.autoSend ?? false);
    setVisible(true);
  }, []);

  const closeChatbot = useCallback(() => {
    setVisible(false);
    setInitialMessage('');
    setAutoSend(false);
  }, []);

  return (
    <AIChatbotContext.Provider
      value={{
        visible,
        initialMessage,
        autoSend,
        fabPosition,
        setFabPosition,
        openChatbot,
        closeChatbot,
      }}>
      {children}
    </AIChatbotContext.Provider>
  );
}

export function useAIChatbot() {
  const ctx = useContext(AIChatbotContext);
  if (!ctx) {
    return {
      visible: false,
      initialMessage: '',
      autoSend: false,
      fabPosition: { x: 0, y: 0 },
      setFabPosition: () => {},
      openChatbot: () => {},
      closeChatbot: () => {},
    };
  }
  return ctx;
}
