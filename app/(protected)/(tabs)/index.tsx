import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '@/styles/index.styles';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useReportService } from '@/lib/services/reportService';
import { OverviewReportDto } from '@/lib/types/report';
import { SpendingIncomeOverviewCard } from '@/components/SpendingIncomeOverviewCard';
import { useAppAlert } from '@/contexts/app-alert-context';
import { useAIChatbot } from '@/contexts/ai-chatbot-context';
import { useVoiceInput } from '@/lib/hooks/useVoiceInput';
import { useNotificationBadge } from '@/contexts/notification-badge-context';
import { useSavingGoal } from '@/contexts/saving-goal-context';
import { useTransactionRefresh } from '@/contexts/transaction-refresh-context';
import { useSync } from '@/contexts/sync-context';
import { computeGoalMetrics } from '@/lib/utils/goalMetrics';
import type { SavingGoalData } from '@/lib/types/saving-goal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_ITEM_WIDTH = SCREEN_WIDTH - 48 - 40;
const logoFinmate = require('@/assets/images/logo finmate.png');

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

// Format ngày tháng
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
};

type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';

export default function HomeScreen() {
  const { user } = useUser();
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const insets = useSafeAreaInsets();
  const isLight = resolvedTheme === 'light';
  const lightOutlinedCircle = isLight
    ? {
        backgroundColor: 'rgba(34, 197, 94, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.36)',
      }
    : { backgroundColor: themeColors.card };
  const lightCardSurface = isLight
    ? {
        borderWidth: 1,
        borderColor: themeColors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
      }
    : null;
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [aiInput, setAiInput] = useState('');
  const { openChatbot } = useAIChatbot();
  const { hasUnreadAlerts, hasMissingFieldsMessage, setHasMissingFieldsMessage } = useNotificationBadge();
  const { goals } = useSavingGoal();
  const { transactionRefreshTrigger } = useTransactionRefresh();
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const { isListening, error: voiceError, toggleListening } = useVoiceInput((text) => {
    setAiInput((prev) => (prev ? `${prev} ${text}` : text));
  });
  const { syncStatus, isConnected, pendingChangesCount, forceSync } = useSync();
  const { showAlert } = useAppAlert();
  useEffect(() => {
    if (voiceError) showAlert({ title: 'Giọng nói', message: voiceError, icon: 'error' });
  }, [voiceError, showAlert]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(true);
  const { getGroupedMoneySources } = useMoneySourceService();
  const { getOverview } = useReportService();

  // Overview data state
  const [overviewData, setOverviewData] = useState<OverviewReportDto | null>(null);
  const [overviewLoading, setOverviewLoading] = useState<boolean>(true);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);
  const fetchOverviewRef = useRef<(period: TimePeriod, forceRefresh?: boolean, silent?: boolean) => Promise<void>>(() => Promise.resolve());
  const selectedPeriodRef = useRef<TimePeriod>(selectedPeriod);
  const isFocusedRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const OVERVIEW_FETCH_THROTTLE_MS = 3000;

  const today = new Date();
  const activeGoal = goals[activeGoalIndex];
  const goalMetrics = activeGoal ? computeGoalMetrics(activeGoal) : null;

  const totalSpent = overviewData?.totalExpense ?? 0;
  const avgDaily =
    selectedPeriod === 'month'
      ? Math.round((totalSpent || 0) / Math.max(1, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()))
      : selectedPeriod === 'year'
        ? Math.round((totalSpent || 0) / 365)
        : totalSpent > 0
          ? Math.round(totalSpent / 30)
          : 0;

  // Hạn mức chi tiêu - sync với mục tiêu tiết kiệm (lương từ goal - tổng tiết kiệm tháng)
  const totalMonthlySaving =
    goals.length > 0
      ? goals.reduce((sum, g) => sum + computeGoalMetrics(g).dailyAmount * 30, 0)
      : 0;
  const primaryGoalSalary = activeGoal?.salary ?? 0;
  const spendingLimit = Math.max(0, primaryGoalSalary - totalMonthlySaving);
  const spendingUsed = totalSpent;
  const tips = goals.length > 0
    ? goals.map((g) => {
        const m = computeGoalMetrics(g);
        return `Tiết kiệm ${formatCurrency(m.dailyAmount)} cho ${g.title}`;
      })
    : ['Đặt mục tiêu để bắt đầu tiết kiệm có kế hoạch!', 'Nấu ăn tại nhà thay vì ăn ngoài'];

  // Calculate date range based on period - memoize để tránh tạo mới mỗi lần
  const getDateRange = useCallback((period: TimePeriod): { startDate: Date; endDate: Date } => {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        // Lấy thứ 2 của tuần hiện tại
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate.setMonth(quarter * 3, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    return { startDate, endDate };
  }, []);


  // Fetch overview function - dùng ref để tránh dependency issues
  const fetchOverviewData = useCallback(async (period: TimePeriod, forceRefresh = false, silent = false) => {
    if (isFetchingRef.current) return;
    // Throttle: tránh gọi lại trong vòng OVERVIEW_FETCH_THROTTLE_MS trừ khi forceRefresh (đổi kỳ)
    if (!forceRefresh && lastFetchTimeRef.current && Date.now() - lastFetchTimeRef.current < OVERVIEW_FETCH_THROTTLE_MS) {
      return;
    }

    isFetchingRef.current = true;
    if (!silent) setOverviewLoading(true);
    try {
      const { startDate, endDate } = getDateRange(period);
      const overviewResponse = await getOverview(startDate, endDate);
      if (!isFocusedRef.current) return;
      lastFetchTimeRef.current = Date.now();
      setOverviewData(overviewResponse);
    } catch (err) {
      if (!isFocusedRef.current) return;
      console.error('Error fetching overview:', err);
      setOverviewData({
        totalIncome: 0,
        totalExpense: 0,
        difference: 0,
        categoryStats: [],
      });
    } finally {
      if (isFocusedRef.current && !silent) setOverviewLoading(false);
      isFetchingRef.current = false;
    }
  }, [getOverview, getDateRange]);

  // Fetch balance - chỉ gọi 1 lần khi mount để tránh gọi API liên tục (giật số tiền)
  useEffect(() => {
    setBalanceLoading(true);
    getGroupedMoneySources()
      .then((response) => {
        setTotalBalance(response.totalBalance ?? 0);
      })
      .catch((err) => {
        console.error('Error fetching total balance:', err);
      })
      .finally(() => {
        setBalanceLoading(false);
      });
  }, []);

  // Refs luôn trỏ tới giá trị mới nhất (không đưa vào deps của useFocusEffect)
  selectedPeriodRef.current = selectedPeriod;
  fetchOverviewRef.current = fetchOverviewData;

  // Chỉ fetch overview khi màn hình được focus (dependency rỗng → không chạy theo từng re-render)
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      fetchOverviewRef.current(selectedPeriodRef.current, false);
      return () => {
        isFocusedRef.current = false;
      };
    }, [])
  );

  // Refetch khi có thay đổi (giao dịch / nguồn tiền) - silent, throttle overview nhưng luôn cập nhật balance
  useEffect(() => {
    if (transactionRefreshTrigger === 0) return;
    const now = Date.now();
    const skipOverview = now - lastFetchTimeRef.current < OVERVIEW_FETCH_THROTTLE_MS;
    if (!skipOverview) {
      lastFetchTimeRef.current = now;
      fetchOverviewRef.current(selectedPeriodRef.current, true, true);
    }
    getGroupedMoneySources().then((r) => setTotalBalance(r.totalBalance ?? 0)).catch(() => {});
  }, [transactionRefreshTrigger, getGroupedMoneySources]);

  // Get period display text
  const getPeriodText = (period: TimePeriod): string => {
    switch (period) {
      case 'today':
        return 'Hôm nay';
      case 'week':
        return 'Tuần này';
      case 'month':
        return 'Tháng này';
      case 'quarter':
        return 'Quý này';
      case 'year':
        return 'Năm nay';
      default:
        return 'Tháng này';
    }
  };

  // Period options
  const periodOptions: { value: TimePeriod; label: string }[] = [
    { value: 'today', label: 'Hôm nay' },
    { value: 'week', label: 'Tuần này' },
    { value: 'month', label: 'Tháng này' },
    { value: 'quarter', label: 'Quý này' },
    { value: 'year', label: 'Năm nay' },
  ];

  // Handle period change - fetch ngay với kỳ mới (forceRefresh để bỏ qua throttle)
  const handlePeriodChange = (period: TimePeriod) => {
    if (period === selectedPeriod) {
      setShowPeriodModal(false);
      return;
    }
    setSelectedPeriod(period);
    setShowPeriodModal(false);
    fetchOverviewData(period, true);
  };

  const getUserInitial = () => {
    if (user?.firstName) return user.firstName[0].toUpperCase();
    if (user?.emailAddresses?.[0]?.emailAddress) {
      return user.emailAddresses[0].emailAddress[0].toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (user?.firstName) return user.firstName;
    if (user?.emailAddresses?.[0]?.emailAddress) {
      return user.emailAddresses[0].emailAddress.split('@')[0];
    }
    return 'User';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent', flex: 1, width: SCREEN_WIDTH, minWidth: SCREEN_WIDTH }]} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        {/* Header với logo FinMate - đồng bộ với trang login */}
        <View style={[styles.appHeader, { marginBottom: 8 }]}>
          <Image source={logoFinmate} style={styles.appLogo} contentFit="contain" />
          <Text style={[styles.appTitle, { color: themeColors.tint }]}>FinMate</Text>
        </View>
        {/* Top Status Bar with User Info */}
        <View style={[styles.statusBar, { marginBottom: 14 }]}>
          {/* User Info Section - Left */}
          <View style={styles.userSection}>
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarBorder, { borderColor: 'rgba(34, 197, 94, 0.25)', backgroundColor: 'rgba(34, 197, 94, 0.08)' }]}>
                <View style={[styles.avatarGradient, { backgroundColor: 'transparent' }]}>
                  <Text style={[styles.avatarText, { color: themeColors.tint }]}>{getUserInitial()}</Text>
                </View>
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.greetingText, { color: themeColors.textSecondary }]}>Xin chào!</Text>
              <Text style={[styles.userNameText, { color: themeColors.text }]}>{getUserName()}</Text>
            </View>
          </View>
          
          
          {/* Status Bar Icons - Right */}
          <View style={[styles.statusBarIcons, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            {/* Sync Status Button */}
            <TouchableOpacity
              style={[styles.statusIconButton, lightOutlinedCircle, { backgroundColor: (!isConnected || syncStatus === 'offline') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' }]}
              onPress={() => {
                if (!isConnected || syncStatus === 'offline') {
                  showAlert({ title: 'Đang Offline', message: 'Hệ thống đang hoạt động ngoại tuyến. Dữ liệu sẽ đồng bộ khi có mạng.', icon: 'warning' });
                } else if (pendingChangesCount > 0) {
                  showAlert({ title: 'Đang đồng bộ', message: `Còn ${pendingChangesCount} thay đổi chưa đồng bộ.`, icon: 'info' });
                  forceSync();
                } else {
                  forceSync();
                  showAlert({ title: 'Đã đồng bộ', message: 'Tất cả dữ liệu đã được cập nhật mới nhất.', icon: 'check-circle' });
                }
              }}
              activeOpacity={0.8}>
              <View>
                <Ionicons 
                  name={(!isConnected || syncStatus === 'offline') ? "cloud-offline-outline" : syncStatus === 'syncing' ? "sync" : pendingChangesCount > 0 ? "cloud-upload-outline" : "cloud-done-outline"} 
                  size={20} 
                  color={(!isConnected || syncStatus === 'offline') ? "#EF4444" : themeColors.tint} 
                />
                {pendingChangesCount > 0 && <View style={[styles.notificationDot, { backgroundColor: '#F59E0B' }]} />}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.statusIconButton, lightOutlinedCircle]}
              onPress={() => router.push('/(protected)/(other-pages)/notifications')}
              activeOpacity={0.8}>
              <View>
                <Ionicons name="notifications-outline" size={20} color={themeColors.icon} />
                {hasUnreadAlerts && <View style={styles.notificationDot} />}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceLabel, { color: themeColors.textSecondary }]}>Tổng số dư</Text>
          <View style={styles.balanceRow}>
            <Text style={[styles.balanceAmount, { color: themeColors.text }]}>
              {balanceVisible
                ? balanceLoading && totalBalance === 0
                  ? '...'
                  : formatCurrency(totalBalance)
                : '•••••••'}
            </Text>
            <TouchableOpacity
              onPress={() => setBalanceVisible(!balanceVisible)}
              style={styles.eyeButton}>
              <MaterialIcons
                name={balanceVisible ? 'visibility' : 'visibility-off'}
                size={20}
                color={themeColors.icon}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Assistant Card */}
        <View style={[styles.card, { backgroundColor: 'rgba(34, 197, 94, 0.06)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.12)' }]}>
          <View style={[styles.aiCardGradient, { padding: 16 }]}>
            <View style={styles.aiCardHeader}>
              <View style={[styles.aiIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                <MaterialIcons name="auto-awesome" size={22} color={themeColors.tint} />
              </View>
              <View style={styles.aiHeaderText}>
                <Text style={[styles.aiTitle, { color: themeColors.text }]}>AI Assistant</Text>
                <Text style={[styles.aiSubtitle, { color: themeColors.textSecondary }]}>Nhập liệu tự động</Text>
              </View>
            </View>
            <View style={styles.aiInputContainer}>
              <TouchableOpacity
                style={[styles.aiInputButton, { backgroundColor: 'rgba(34, 197, 94, 0.08)' }, isListening && { backgroundColor: 'rgba(34, 197, 94, 0.25)' }]}
                onPress={toggleListening}
                activeOpacity={0.8}>
                <MaterialIcons name={isListening ? 'stop' : 'mic'} size={16} color={themeColors.tint} />
              </TouchableOpacity>
              <TextInput
                style={[styles.aiInput, { backgroundColor: 'rgba(34, 197, 94, 0.06)', color: themeColors.text }]}
                placeholder="VD: Hôm nay đi chợ hết 100k..."
                placeholderTextColor={themeColors.textSecondary}
                value={aiInput}
                onChangeText={setAiInput}
                multiline={false}
              />
              <TouchableOpacity
                style={[styles.aiInputButton, { backgroundColor: themeColors.tint }]}
                onPress={() => {
                  const text = aiInput.trim();
                  if (text) {
                    openChatbot({ initialMessage: text, autoSend: true });
                    setAiInput('');
                  }
                }}
                activeOpacity={0.8}>
                <MaterialIcons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Today's Suggestions Card */}
        <View style={[styles.card, { backgroundColor: 'rgba(34, 197, 94, 0.06)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.12)' }]}>
          <View style={[styles.suggestionsCardGradient, { padding: 16, minHeight: undefined }]}>
            <View style={[styles.suggestionsHeader, { marginBottom: 14 }]}>
              <View style={[styles.suggestionsIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                <MaterialIcons name="lightbulb-outline" size={20} color={themeColors.tint} />
              </View>
              <View style={styles.suggestionsHeaderText}>
                <Text style={[styles.suggestionsTitle, { color: themeColors.text }]}>Gợi ý hôm nay</Text>
                <Text style={[styles.suggestionsDate, { color: themeColors.textSecondary }]}>{formatDate(today)}</Text>
              </View>
            </View>

            {/* Goal section: Motivational UI (no goals) hoặc Carousel (có goals) */}
            {goals.length === 0 ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/(protected)/(other-pages)/create-saving-goal')}
                style={[styles.goalBox, { backgroundColor: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.12)' }]}>
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <MaterialIcons name="track-changes" size={40} color={themeColors.tint} />
                  <Text style={[styles.goalText, { marginTop: 10, textAlign: 'center', fontSize: 14, color: themeColors.text }]}>
                    Đặt mục tiêu để bắt đầu tiết kiệm có kế hoạch!
                  </Text>
                  <Text style={[styles.suggestionsDate, { marginTop: 6, textAlign: 'center', color: themeColors.textSecondary }]}>
                    Mục tiêu giúp bạn biết cần tiết kiệm bao nhiêu mỗi ngày
                  </Text>
                  <View
                    style={{
                      marginTop: 12,
                      backgroundColor: 'rgba(34, 197, 94, 0.08)',
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      borderRadius: 10,
                    }}>
                    <Text style={{ color: themeColors.text, fontWeight: '600', fontSize: 14 }}>Tạo mục tiêu</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const offset = e.nativeEvent.contentOffset.x;
                    const index = Math.round(offset / CAROUSEL_ITEM_WIDTH);
                    setActiveGoalIndex(Math.min(Math.max(0, index), goals.length - 1));
                  }}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingHorizontal: 0 }}
                  style={{ width: CAROUSEL_ITEM_WIDTH }}>
                  {goals.map((goal) => {
                    const m = computeGoalMetrics(goal);
                    return (
                      <View
                        key={goal.id}
                        style={{ width: CAROUSEL_ITEM_WIDTH, paddingHorizontal: 24 }}>
                        <View style={[styles.goalBox, { backgroundColor: 'rgba(34, 197, 94, 0.05)', borderColor: 'rgba(34, 197, 94, 0.12)' }]}>
                          <View style={styles.goalHeader}>
                            <Text style={[styles.goalText, { color: themeColors.text }]}>Mục tiêu đang theo đuổi: {goal.title}</Text>
                          </View>
                          <View style={styles.goalStats}>
                            <View style={styles.goalStatBox}>
                              <Text style={[styles.goalStatLabel, { color: themeColors.textSecondary }]}>Cần tiết kiệm/ngày</Text>
                              <Text style={[styles.goalStatValue, { color: themeColors.text }]}>{formatCurrency(m.dailyAmount)}</Text>
                            </View>
                            <View style={[styles.goalStatBox, { backgroundColor: 'rgba(34, 197, 94, 0.05)' }]}>
                              <Text style={[styles.goalStatLabel, { color: themeColors.textSecondary }]}>Còn lại</Text>
                              <Text style={[styles.goalStatValue, { color: themeColors.text }]}>{m.daysRemaining} ngày</Text>
                            </View>
                          </View>
                          <Text style={[styles.goalDescription, { color: themeColors.textSecondary }]}>
                            Để mua được {goal.title}, bạn cần tiết kiệm {formatCurrency(m.dailyAmount)}/ngày trong {m.daysRemaining} ngày tới.
                            {m.todaySuggestion > 0 && ` Hôm nay nên chi tối đa ${formatCurrency(m.todaySuggestion)}!`}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                {goals.length > 1 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
                    {goals.map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: i === activeGoalIndex ? 10 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: i === activeGoalIndex ? themeColors.tint : themeColors.textSecondary + '80',
                        }}
                      />
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Stats Boxes - ẩn khi chưa có mục tiêu */}
            {goals.length > 0 && goalMetrics && (
              <View style={[styles.statsRow, { marginBottom: 14 }]}>
                <View style={[styles.statBox, { backgroundColor: 'rgba(34, 197, 94, 0.05)' }]}>
                  <MaterialIcons name="show-chart" size={12} color={themeColors.textSecondary} />
                  <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Gợi ý</Text>
                  <Text style={[styles.statValue, { color: themeColors.text }]}>{formatCurrency(goalMetrics.todaySuggestion)}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: 'rgba(34, 197, 94, 0.05)' }]}>
                  <MaterialIcons name="calendar-today" size={12} color={themeColors.textSecondary} />
                  <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>TB/ngày</Text>
                  <Text style={[styles.statValue, { color: themeColors.text }]}>{formatCurrency(avgDaily)}</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: 'rgba(34, 197, 94, 0.05)' }]}>
                  <MaterialIcons name="fiber-manual-record" size={12} color={themeColors.textSecondary} />
                  <Text style={[styles.statLabel, { color: themeColors.textSecondary }]}>Đã chi</Text>
                  <Text style={[styles.statValue, { color: themeColors.text }]}>{formatCurrency(totalSpent)}</Text>
                </View>
              </View>
            )}

            {/* Tips Section */}
            <View style={[styles.tipsSection, { marginTop: 12 }]}>
              <Text style={[styles.tipsTitle, { color: themeColors.textSecondary }]}>💡 Mẹo tiết kiệm:</Text>
              {tips.map((tip, index) => (
                <View key={index} style={[styles.tipBox, { backgroundColor: 'rgba(34, 197, 94, 0.05)', marginBottom: 6 }]}>
                  <Text style={[styles.tipBullet, { color: themeColors.textSecondary }]}>•</Text>
                  <Text style={[styles.tipText, { color: themeColors.text }]}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Income/Expense Overview Card */}
        <SpendingIncomeOverviewCard
          overviewData={overviewData}
          overviewLoading={overviewLoading}
          periodLabel={getPeriodText(selectedPeriod)}
          onOpenPeriodModal={() => setShowPeriodModal(true)}
          onPressHistory={() => router.push('/(protected)/(other-pages)/transaction-history')}
          formatCurrency={formatCurrency}
        />

          {/* Spending Limit Card - sync với mục tiêu tiết kiệm */}
          <View style={[styles.card, styles.darkCard, { backgroundColor: 'rgba(34, 197, 94, 0.06)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.12)' }, lightCardSurface]}>
          <View style={styles.limitHeader}>
            <Text style={[styles.limitTitle, { color: themeColors.text }]}>Hạn mức chi tiêu</Text>
            <View style={styles.limitActions}>
              <TouchableOpacity
                style={[
                  styles.limitButton,
                  isLight && {
                    backgroundColor: themeColors.card,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                  },
                ]}>
                <MaterialIcons name="settings" size={16} color={themeColors.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/(protected)/(other-pages)/saving-goals')} activeOpacity={0.7}>
                <Text style={[styles.limitLink, { color: themeColors.tint }]}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
          </View>

          {goals.length > 0 && spendingLimit > 0 ? (
            <>
              <View style={[styles.limitContent, { overflow: 'hidden' }]}>
                <View style={[styles.limitIcon, { backgroundColor: 'rgba(34, 197, 94, 0.08)' }]}>
                  <Text style={styles.limitEmoji}>🎯</Text>
                </View>
                <View style={[styles.limitInfo, { flex: 1, minWidth: 0 }]}>
                  <Text style={[styles.limitLabel, { color: themeColors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                    Chi mỗi tháng {activeGoal ? `(${activeGoal.title})` : ''}
                  </Text>
                  <Text style={[styles.limitDate, { color: themeColors.textSecondary }]} numberOfLines={1}>
                    {(() => {
                      const { startDate, endDate } = getDateRange(selectedPeriod);
                      const fmt = (d: Date) =>
                        `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                      return `${fmt(startDate)} - ${fmt(endDate)}`;
                    })()}
                  </Text>
                  <Text style={[styles.limitAmount, { color: themeColors.text }]} numberOfLines={1} ellipsizeMode="tail">{formatCurrency(spendingLimit)}</Text>
                </View>
              </View>

              <View style={styles.progressContainer}>
                <View
                  style={[
                    styles.progressBar,
                    isLight ? { backgroundColor: themeColors.border } : { backgroundColor: 'rgba(34, 197, 94, 0.08)' },
                  ]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, spendingLimit > 0 ? (spendingUsed / spendingLimit) * 100 : 0)}%`,
                        backgroundColor: themeColors.tint,
                      },
                    ]}
                  />
                </View>
              </View>

              <View
                style={[
                  styles.todayBox,
                  isLight && {
                    backgroundColor: themeColors.card,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                  },
                ]}>
                <Text style={[styles.todayText, { color: themeColors.textSecondary }]}>Hôm nay</Text>
              </View>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/(protected)/(other-pages)/create-saving-goal')}
              activeOpacity={0.8}
              style={{ paddingVertical: 20, alignItems: 'center' }}>
              <MaterialIcons name="track-changes" size={40} color={themeColors.textSecondary} />
              <Text style={[styles.emptyStateText, { color: themeColors.textSecondary, marginTop: 12, textAlign: 'center' }]}>
                Chưa có hạn mức. Đặt mục tiêu tiết kiệm để thiết lập hạn mức chi tiêu.
              </Text>
              <Text style={[styles.limitLink, { marginTop: 8, color: themeColors.tint }]}>Tạo mục tiêu</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Period Filter Modal */}
      <Modal
        visible={showPeriodModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPeriodModal(false)}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-start',
            paddingTop: 100,
          }}
          activeOpacity={1}
          onPress={() => setShowPeriodModal(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: themeColors.card,
              marginHorizontal: 20,
              borderRadius: 20,
              paddingVertical: 8,
              borderWidth: 2,
              borderColor: resolvedTheme === 'dark' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(22, 163, 74, 0.25)',
            }}>
            {periodOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: index < periodOptions.length - 1 ? 1 : 0,
                  borderBottomColor: themeColors.border,
                  backgroundColor: selectedPeriod === option.value ? (resolvedTheme === 'dark' ? '#1E3A8A' : 'rgba(22, 163, 74, 0.15)') : 'transparent',
                }}
                onPress={() => handlePeriodChange(option.value)}
                activeOpacity={0.7}>
                <Text
                  style={{
                    color: selectedPeriod === option.value ? themeColors.tint : themeColors.text,
                    fontSize: 16,
                    fontWeight: selectedPeriod === option.value ? '600' : '400',
                  }}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
