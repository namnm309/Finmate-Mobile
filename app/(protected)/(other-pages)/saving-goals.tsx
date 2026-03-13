import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, GlassCardColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppAlert } from '@/contexts/app-alert-context';
import { useSavingGoal } from '@/contexts/saving-goal-context';
import { computeGoalMetrics } from '@/lib/utils/goalMetrics';
import { styles } from '@/styles/index.styles';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

function formatAmountDisplay(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (!cleaned) return '';
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseAmount(display: string): number {
  return parseInt(display.replace(/\D/g, ''), 10) || 0;
}

export default function SavingGoalsScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const { goals, isLoading, error, refetch, addContribution, deleteGoal } = useSavingGoal();
  const { showAlert } = useAppAlert();
  const [addAmount, setAddAmount] = useState<Record<string, string>>({});
  const [contributingId, setContributingId] = useState<string | null>(null);

  const totalGoals = goals.length;
  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount).length;

  const handleBack = () => {
    router.push('/(protected)/(tabs)/other');
  };

  const handleAddGoal = () => {
    router.push('/(protected)/(other-pages)/create-saving-goal');
  };

  const handleViewPlan = (id: string) => {
    router.push({ pathname: '/(protected)/(other-pages)/saving-plan', params: { id } });
  };

  const handleAddToFund = async (id: string) => {
    const g = goals.find((x) => x.id === id);
    const raw = addAmount[id] || '';
    if (!g || !raw.trim()) return;
    const amount = parseAmount(raw);
    if (amount <= 0) {
      showAlert({ title: 'Lỗi', message: 'Vui lòng nhập số tiền hợp lệ.', icon: 'warning' });
      return;
    }
    setContributingId(id);
    try {
      await addContribution(id, amount);
      setAddAmount((prev) => ({ ...prev, [id]: '' }));
    } catch (err) {
      showAlert({
        title: 'Lỗi',
        message: err instanceof Error ? err.message : 'Không thể thêm tiền. Vui lòng thử lại.',
        icon: 'error',
      });
    } finally {
      setContributingId(null);
    }
  };

  const handleDelete = (id: string) => {
    const g = goals.find((x) => x.id === id);
    if (!g) return;
    showAlert({
      title: 'Xóa mục tiêu',
      message: `Bạn có chắc muốn xóa "${g.title}"?`,
      icon: 'warning',
      buttons: [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'danger',
          onPress: async () => {
            try {
              await deleteGoal(id);
            } catch (err) {
              showAlert({
                title: 'Lỗi',
                message: err instanceof Error ? err.message : 'Không thể xóa mục tiêu. Vui lòng thử lại.',
                icon: 'error',
              });
            }
          },
        },
      ],
    });
  };

  if (isLoading && goals.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <View style={styles.savingGoalsHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.savingGoalsBackButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={styles.savingGoalsHeaderCenter}>
            <Text style={[styles.savingGoalsTitle, { color: themeColors.text }]}>Mục tiêu tiết kiệm</Text>
            <Text style={[styles.savingGoalsSubtitle, { color: themeColors.textSecondary }]}>Theo dõi & đạt được mục tiêu</Text>
          </View>
          <View style={styles.savingGoalsAddButton} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color="#155DFC" />
          <Text style={[styles.savingGoalCardTitle, { color: themeColors.textSecondary, marginTop: 16 }]}>
            Đang tải...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && goals.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <View style={styles.savingGoalsHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.savingGoalsBackButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={styles.savingGoalsHeaderCenter}>
            <Text style={[styles.savingGoalsTitle, { color: themeColors.text }]}>Mục tiêu tiết kiệm</Text>
            <Text style={[styles.savingGoalsSubtitle, { color: themeColors.textSecondary }]}>Theo dõi & đạt được mục tiêu</Text>
          </View>
          <View style={styles.savingGoalsAddButton} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={[styles.savingGoalCardTitle, { color: themeColors.textSecondary, marginBottom: 16 }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#155DFC', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 }}
            onPress={() => refetch()}
            activeOpacity={0.8}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (goals.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <View style={styles.savingGoalsHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.savingGoalsBackButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={styles.savingGoalsHeaderCenter}>
            <Text style={[styles.savingGoalsTitle, { color: themeColors.text }]}>Mục tiêu tiết kiệm</Text>
            <Text style={[styles.savingGoalsSubtitle, { color: themeColors.textSecondary }]}>Theo dõi & đạt được mục tiêu</Text>
          </View>
          <TouchableOpacity style={styles.savingGoalsAddButton} onPress={handleAddGoal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={[styles.savingGoalCardTitle, { color: themeColors.textSecondary, marginBottom: 16 }]}>
            Chưa có mục tiêu
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#16a34a', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 }}
            onPress={handleAddGoal}
            activeOpacity={0.8}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Tạo mục tiêu mới</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.savingGoalsHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.savingGoalsBackButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={styles.savingGoalsHeaderCenter}>
            <View style={styles.savingGoalsHeaderIcon}>
              <MaterialIcons name="track-changes" size={24} color={themeColors.text} />
            </View>
            <Text style={[styles.savingGoalsTitle, { color: themeColors.text }]}>Mục tiêu tiết kiệm</Text>
            <Text style={[styles.savingGoalsSubtitle, { color: themeColors.textSecondary }]}>Theo dõi & đạt được mục tiêu</Text>
          </View>
          <TouchableOpacity style={styles.savingGoalsAddButton} onPress={handleAddGoal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} activeOpacity={0.7}>
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.savingGoalsSummaryStats}>
          <View style={[styles.savingGoalsSummaryCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
            <Text style={styles.savingGoalsSummaryLabel}>Tổng mục tiêu</Text>
            <Text style={styles.savingGoalsSummaryValue}>{totalGoals}</Text>
          </View>
          <View style={[styles.savingGoalsSummaryCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
            <Text style={styles.savingGoalsSummaryLabel}>Đang theo đuổi</Text>
            <Text style={styles.savingGoalsSummaryValue}>{activeGoals}</Text>
          </View>
        </View>

        {goals.map((goal) => {
          const { dailyAmount, daysRemaining, remaining } = computeGoalMetrics(goal);
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

          return (
            <View key={goal.id}>
              <View style={[styles.savingGoalCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
                <View style={styles.savingGoalCardHeader}>
                  <View style={styles.savingGoalCardHeaderLeft}>
                    <Text style={styles.savingGoalCardTitle}>{goal.title}</Text>
                    <Text style={styles.savingGoalCardCategory}>{goal.category}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.savingGoalCardDelete}
                    onPress={() => handleDelete(goal.id)}>
                    <MaterialIcons name="delete-outline" size={20} color="#99A1AF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.savingGoalProgressSection}>
                  <View style={styles.savingGoalProgressHeader}>
                    <Text style={styles.savingGoalProgressLabel}>Tiến độ</Text>
                    <Text style={styles.savingGoalProgressPercentage}>{progress.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.savingGoalProgressBar}>
                    <View style={styles.savingGoalProgressBarTrack}>
                      <LinearGradient
                        colors={['#16a34a', '#22c55e']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.savingGoalProgressBarFill, { width: `${progress}%` }]}
                      />
                    </View>
                  </View>
                  <View style={styles.savingGoalAmountRow}>
                    <Text style={styles.savingGoalCurrentAmount}>{formatCurrency(goal.currentAmount)}</Text>
                    <Text style={styles.savingGoalTargetAmount}>{formatCurrency(goal.targetAmount)}</Text>
                  </View>
                </View>

                <View style={styles.savingGoalMetrics}>
                  <View style={[styles.savingGoalMetricCard, { backgroundColor: GlassCardColors.inner }]}>
                    <MaterialIcons name="calendar-today" size={20} color="#51A2FF" />
                    <Text style={styles.savingGoalMetricLabel}>Còn lại</Text>
                    <Text style={styles.savingGoalMetricValue}>{daysRemaining} ngày</Text>
                  </View>
                  <View style={[styles.savingGoalMetricCard, { backgroundColor: GlassCardColors.inner }]}>
                    <MaterialIcons name="trending-up" size={20} color="#00D492" />
                    <Text style={styles.savingGoalMetricLabel}>Mỗi ngày</Text>
                    <Text style={styles.savingGoalMetricValue}>{formatCurrency(dailyAmount)}</Text>
                  </View>
                </View>

                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.savingGoalMetricLabel, { marginBottom: 8 }]}>Thêm vào quỹ</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      style={{
                        flex: 1,
                        backgroundColor: GlassCardColors.inner,
                        color: themeColors.text,
                        fontSize: 16,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderRadius: 8,
                      }}
                      placeholder="VD: 350.000"
                      placeholderTextColor={themeColors.textSecondary}
                      value={addAmount[goal.id] || ''}
                      onChangeText={(v) => setAddAmount((prev) => ({ ...prev, [goal.id]: formatAmountDisplay(v) }))}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={{
                        backgroundColor: contributingId === goal.id ? '#99A1AF' : themeColors.tint,
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 8,
                        minWidth: 72,
                        alignItems: 'center',
                      }}
                      onPress={() => handleAddToFund(goal.id)}
                      disabled={contributingId === goal.id}
                      activeOpacity={0.8}>
                      {contributingId === goal.id ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Thêm</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Nút Xem plan AI */}
              <TouchableOpacity
                style={{
                  backgroundColor: GlassCardColors.bg,
                  paddingVertical: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 12,
                  marginBottom: 24,
                  borderWidth: 1,
                  borderColor: GlassCardColors.border,
                }}
                onPress={() => handleViewPlan(goal.id)}
                activeOpacity={0.8}>
                <MaterialIcons name="auto-awesome" size={20} color={themeColors.tint} />
                <Text style={{ color: themeColors.tint, fontWeight: '600', fontSize: 15 }}>Xem plan AI</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
