import { Slot } from 'expo-router';
import { View } from 'react-native';
import { AIChatbotProvider } from '@/contexts/ai-chatbot-context';
import { AIChatbotFab } from '@/components/ai-chatbot-fab';

export default function ProtectedLayout() {
  return (
    <AIChatbotProvider>
      <View style={{ flex: 1 }}>
        <Slot />
        <AIChatbotFab />
      </View>
    </AIChatbotProvider>
  );
}
