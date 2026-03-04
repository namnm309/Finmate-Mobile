import { AIChatbotModal } from '@/components/ai-chatbot-modal';
import React, { createContext, useCallback, useContext, useState } from 'react';

interface AIModalContextValue {
  openAIModal: (message: string, autoSend?: boolean) => void;
}

const AIModalContext = createContext<AIModalContextValue | null>(null);

export function AIModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [initialMessage, setInitialMessage] = useState('');
  const [autoSend, setAutoSend] = useState(false);

  const openAIModal = useCallback((message: string, shouldAutoSend = false) => {
    setInitialMessage(message);
    setAutoSend(shouldAutoSend);
    setVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setVisible(false);
    setInitialMessage('');
  }, []);

  return (
    <AIModalContext.Provider value={{ openAIModal }}>
      {children}
      <AIChatbotModal
        visible={visible}
        onClose={closeModal}
        initialMessage={initialMessage}
        autoSend={autoSend}
      />
    </AIModalContext.Provider>
  );
}

export function useAIModal() {
  const ctx = useContext(AIModalContext);
  if (!ctx) {
    return { openAIModal: () => {} };
  }
  return ctx;
}
