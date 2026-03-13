import { AIActionButton } from '@/components/AIActionButton';
import { useAIChatbot } from '@/contexts/ai-chatbot-context';
import { useNotificationBadge } from '@/contexts/notification-badge-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/styles/index.styles';

// Mẹo tiết kiệm chung - không dùng dữ liệu giả của user
const SAVING_TIPS = [
  {
    id: '1',
    title: 'Theo dõi chi tiêu định kỳ',
    message: 'Xem lại chi tiêu hàng tuần giúp bạn nhận ra các khoản có thể cắt giảm và điều chỉnh kịp thời.',
    icon: 'trending-down' as const,
    color: '#16a34a',
  },
  {
    id: '2',
    title: 'Đặt ngân sách từng danh mục',
    message: 'Chia ngân sách theo nhóm (ăn uống, mua sắm, giải trí...) và tuân thủ để tránh chi vượt mức.',
    icon: 'pie-chart' as const,
    color: '#2563eb',
  },
  {
    id: '3',
    title: 'Quy tắc 50/30/20',
    message: '50% thu nhập cho nhu cầu thiết yếu, 30% cho mong muốn, 20% để tiết kiệm và đầu tư.',
    icon: 'lightbulb-outline' as const,
    color: '#16a34a',
  },
  {
    id: '4',
    title: 'Trì hoãn mua sắm bốc đồng',
    message: 'Chờ 24–48 giờ trước khi mua món không cần gấp để tránh mua theo cảm xúc.',
    icon: 'schedule' as const,
    color: '#16a34a',
  },
  {
    id: '5',
    title: 'Ưu tiên trả nợ lãi cao',
    message: 'Trả dứt các khoản nợ lãi suất cao trước để giảm gánh nặng và tiết kiệm lâu dài.',
    icon: 'account-balance' as const,
    color: '#2563eb',
  },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const { markAlertsRead } = useNotificationBadge();
  useEffect(() => { markAlertsRead(); }, [markAlertsRead]);
  const themeColors = Colors[resolvedTheme];
  const { openChatbot } = useAIChatbot();
  const isLight = resolvedTheme === 'light';

  const handleBack = () => {
    router.back();
  };

  const handleAskAI = (tip: (typeof SAVING_TIPS)[0]) => {
    const prompt = `Mẹo tiết kiệm: "${tip.title}" - ${tip.message}. Hãy giải thích chi tiết hơn và đưa ra ví dụ thực tế.`;
    openChatbot({ initialMessage: prompt, autoSend: true });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background, flex: 1 }]} edges={['top', 'bottom']}>
      <View style={localStyles.header}>
        <TouchableOpacity onPress={handleBack} style={localStyles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[localStyles.headerTitle, { color: themeColors.text }]}>Thông báo</Text>
      </View>

      <ScrollView
        style={localStyles.scroll}
        contentContainerStyle={localStyles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={[localStyles.sectionTitle, { color: themeColors.text }]}>
          Mẹo hay để tiết kiệm
        </Text>

        {SAVING_TIPS.map((tip) => (
          <View
            key={tip.id}
            style={[
              localStyles.tipCard,
              {
                backgroundColor: isLight ? '#FFFFFF' : '#1e293b',
                borderLeftColor: tip.color,
                borderColor: isLight ? themeColors.border : 'rgba(255,255,255,0.12)',
              },
            ]}>
            <View style={[localStyles.tipIcon, { backgroundColor: tip.color + '25' }]}>
              <MaterialIcons name={tip.icon as any} size={24} color={tip.color} />
            </View>
            <View style={localStyles.tipContent}>
              <Text style={[localStyles.tipTitle, { color: themeColors.text }]}>{tip.title}</Text>
              <Text style={[localStyles.tipMessage, { color: isLight ? '#475569' : '#cbd5e1' }]}>
                {tip.message}
              </Text>
              <AIActionButton
                label="Hỏi AI"
                variant="chip"
                onPress={() => handleAskAI(tip)}
              />
            </View>
          </View>
        ))}

        <View style={[localStyles.aiCtaCard, { backgroundColor: isLight ? '#f0fdf4' : '#134e4a' }]}>
          <MaterialIcons name="auto-awesome" size={36} color="#16a34a" />
          <Text style={[localStyles.aiCtaTitle, { color: isLight ? '#166534' : '#ffffff' }]}>
            Phân tích chi tiêu với AI
          </Text>
          <Text style={[localStyles.aiCtaDesc, { color: isLight ? '#15803d' : '#99f6e4' }]}>
            AI sẽ phân tích giao dịch thật của bạn và đưa ra nhận xét chi tiết.
          </Text>
          <AIActionButton
            label="Kiểm tra chi tiêu với AI"
            onPress={() => openChatbot({
              initialMessage: 'Phân tích các giao dịch gần đây của tôi và cho biết có chi tiêu nào khả nghi hoặc bất hợp lý không.',
              autoSend: true,
            })}
            style={localStyles.aiCta}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 16 },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderWidth: 1,
  },
  tipIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  tipMessage: { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  aiCtaCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  aiCtaTitle: { fontSize: 17, fontWeight: '700', marginTop: 12 },
  aiCtaDesc: { fontSize: 14, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  aiCta: { marginTop: 16 },
});
