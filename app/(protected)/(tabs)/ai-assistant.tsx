import { useRouter } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AIChatbotModal } from '@/components/ai-chatbot-modal';
import { useNotificationBadge } from '@/contexts/notification-badge-context';

/** Màn AI Assistant: chat nhúng trực tiếp, không mở modal khi gửi tin */
export default function AIAssistantScreen() {
  const router = useRouter();
  const { setHasMissingFieldsMessage } = useNotificationBadge();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <AIChatbotModal
        visible
        embedded
        onClose={() => router.back()}
        onMissingFieldsShown={() => setHasMissingFieldsMessage(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
