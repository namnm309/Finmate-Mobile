import { AIActionButton } from '@/components/AIActionButton';
import { useAIChatbot } from '@/contexts/ai-chatbot-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/styles/index.styles';

export default function IncomeAnalysisScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { openChatbot } = useAIChatbot();

  const handleBack = () => {
    router.replace({ pathname: '/(protected)/(tabs)/report', params: { __replace: 'pop' } } as any);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background, flex: 1 }]} edges={['top', 'bottom']}>
      <View style={localStyles.container}>
        <TouchableOpacity onPress={handleBack} style={localStyles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <MaterialIcons name="trending-up" size={64} color={themeColors.tint} />
        <Text style={[localStyles.title, { color: themeColors.text }]}>Phân tích thu</Text>
        <Text style={[localStyles.subtitle, { color: themeColors.textSecondary }]}>
          AI Smart • Đang phát triển
        </Text>
        <Text style={[localStyles.desc, { color: themeColors.textSecondary }]}>
          Tính năng phân tích nguồn thu, xu hướng thu nhập sẽ được AI hỗ trợ.
        </Text>
        <AIActionButton
          label="Hỏi AI"
          onPress={() => openChatbot({
            initialMessage: 'Phân tích nguồn thu và xu hướng thu nhập của tôi. Đưa ra khuyến nghị tăng thu.',
            autoSend: true,
          })}
          style={{ marginTop: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', top: 12, left: 16, zIndex: 1, padding: 8 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 16 },
  subtitle: { fontSize: 14, marginTop: 8 },
  desc: { fontSize: 15, textAlign: 'center', marginTop: 16, lineHeight: 22 },
});
