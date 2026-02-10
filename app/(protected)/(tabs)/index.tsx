import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUser } from '@clerk/clerk-expo';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Modal
} from 'react-native';
import { styles } from '@/styles/index.styles';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useReportService } from '@/lib/services/reportService';
import { OverviewReportDto } from '@/lib/types/report';
import { SpendingIncomeOverviewCard } from '@/components/SpendingIncomeOverviewCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const isLight = resolvedTheme === 'light';
  const lightOutlinedCircle = isLight
    ? {
        backgroundColor: themeColors.card,
        borderWidth: 1,
        borderColor: themeColors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
        elevation: 2,
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
  const fetchOverviewRef = useRef<(period: TimePeriod, forceRefresh?: boolean) => Promise<void>>(() => Promise.resolve());
  const selectedPeriodRef = useRef<TimePeriod>(selectedPeriod);
  const isFocusedRef = useRef<boolean>(false);
  const lastFetchTimeRef = useRef<number>(0);
  const OVERVIEW_FETCH_THROTTLE_MS = 3000;

  // Mock data for other sections
  const today = new Date();
  const spendingLimit = 15000000;
  const spendingUsed = 12340000; // 82%
  const dailySaving = 173000;
  const daysRemaining = 182;
  const todaySuggestion = 369000;
  const avgDaily = 472000;
  const totalSpent = 8500000;

  const tips = [
    'Tiết kiệm 173k cho iPhone 17 Pro Max',
    'Nấu ăn tại nhà thay vì ăn ngoài',
  ];

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
  const fetchOverviewData = useCallback(async (period: TimePeriod, forceRefresh = false) => {
    if (isFetchingRef.current) return;
    // Throttle: tránh gọi lại trong vòng OVERVIEW_FETCH_THROTTLE_MS trừ khi forceRefresh (đổi kỳ)
    if (!forceRefresh && lastFetchTimeRef.current && Date.now() - lastFetchTimeRef.current < OVERVIEW_FETCH_THROTTLE_MS) {
      return;
    }

    isFetchingRef.current = true;
    setOverviewLoading(true);
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
      if (isFocusedRef.current) setOverviewLoading(false);
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Top Status Bar with User Info */}
        <View style={styles.statusBar}>
          {/* User Info Section - Left */}
          <View style={styles.userSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                <LinearGradient
                  colors={['#51A2FF', '#AD46FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradient}>
                  <Text style={styles.avatarText}>{getUserInitial()}</Text>
                </LinearGradient>
              </View>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.greetingText, { color: themeColors.textSecondary }]}>Xin chào!</Text>
              <Text style={[styles.userNameText, { color: themeColors.text }]}>{getUserName()}</Text>
            </View>
          </View>
          
          {/* Status Bar Icons - Right */}
          <View style={styles.statusBarIcons}>
            <TouchableOpacity style={styles.statusIconButton}>
              <LinearGradient
                colors={[themeColors.tint, themeColors.success2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.statusIconGradient}>
                <MaterialIcons name="grid-view" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statusIconButton, lightOutlinedCircle]}>
              <MaterialIcons name="chat-bubble-outline" size={16} color={themeColors.icon} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statusIconButton, lightOutlinedCircle]}>
              <MaterialIcons name="notifications-none" size={16} color={themeColors.icon} />
              <View style={styles.notificationDot} />
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
        <View style={styles.card}>
          <LinearGradient
            colors={['#9810FA', '#155DFC', '#0092B8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCardGradient}>
            <View style={styles.aiCardHeader}>
              <View style={styles.aiIconContainer}>
                <MaterialIcons name="grid-view" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.aiHeaderText}>
                <Text style={styles.aiTitle}>AI Assistant</Text>
                <Text style={styles.aiSubtitle}>Nhập liệu tự động</Text>
              </View>
            </View>
            <View style={styles.aiInputContainer}>
              <TouchableOpacity style={styles.aiInputButton}>
                <MaterialIcons name="mic" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TextInput
                style={styles.aiInput}
                placeholder="VD: Hôm nay đi chợ hết 100k..."
                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                value={aiInput}
                onChangeText={setAiInput}
                multiline={false}
              />
              <TouchableOpacity style={[styles.aiInputButton, styles.aiSendButton]}>
                <MaterialIcons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Today's Suggestions Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#FF6900', '#F6339A', '#9810FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.suggestionsCardGradient}>
            <View style={styles.suggestionsHeader}>
              <View style={styles.suggestionsIconContainer}>
                <MaterialIcons name="lightbulb-outline" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.suggestionsHeaderText}>
                <Text style={styles.suggestionsTitle}>Gợi ý hôm nay</Text>
                <Text style={styles.suggestionsDate}>{formatDate(today)}</Text>
              </View>
            </View>

            {/* Goal Box */}
            <BlurView intensity={4} style={styles.goalBox}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalText}>
                  Mục tiêu đang theo đuổi : iPhone 17 Pro Max
                </Text>
              </View>
              <View style={styles.goalStats}>
                <View style={styles.goalStatBox}>
                  <Text style={styles.goalStatLabel}>Cần tiết kiệm/ngày</Text>
                  <Text style={styles.goalStatValue}>{formatCurrency(dailySaving)}</Text>
                </View>
                <View style={styles.goalStatBox}>
                  <Text style={styles.goalStatLabel}>Còn lại</Text>
                  <Text style={styles.goalStatValue}>{daysRemaining} ngày</Text>
                </View>
              </View>
              <Text style={styles.goalDescription}>
                Để mua được iPhone 17 Pro Max, bạn cần tiết kiệm {formatCurrency(dailySaving)}/ngày trong {daysRemaining} ngày tới. Hôm nay nên chi tối đa {formatCurrency(todaySuggestion)}!
              </Text>
            </BlurView>

            {/* Stats Boxes */}
            <View style={styles.statsRow}>
              <BlurView intensity={4} style={styles.statBox}>
                <MaterialIcons name="show-chart" size={12} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.statLabel}>Gợi ý</Text>
                <Text style={styles.statValue}>{formatCurrency(todaySuggestion)}</Text>
              </BlurView>
              <BlurView intensity={4} style={styles.statBox}>
                <MaterialIcons name="calendar-today" size={12} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.statLabel}>TB/ngày</Text>
                <Text style={styles.statValue}>{formatCurrency(avgDaily)}</Text>
              </BlurView>
              <BlurView intensity={4} style={styles.statBox}>
                <MaterialIcons name="fiber-manual-record" size={12} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.statLabel}>Đã chi</Text>
                <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
              </BlurView>
            </View>

            {/* Tips Section */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Mẹo tiết kiệm:</Text>
              {tips.map((tip, index) => (
                <BlurView key={index} intensity={4} style={styles.tipBox}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </BlurView>
              ))}
            </View>
          </LinearGradient>
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

          {/* Spending Limit Card */}
          <View style={[styles.card, styles.darkCard, { backgroundColor: themeColors.card }, lightCardSurface]}>
          <View style={styles.limitHeader}>
            <Text style={[styles.limitTitle, { color: themeColors.text }]}>Hạn mức chi</Text>
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
              <TouchableOpacity>
                <Text style={[styles.limitLink, { color: themeColors.tint }]}>Xem tất cả →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.limitContent}>
            <LinearGradient
              colors={['#FF8904', '#F6339A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.limitIcon}>
              <Text style={styles.limitEmoji}>🎯</Text>
            </LinearGradient>
            <View style={styles.limitInfo}>
              <Text style={[styles.limitLabel, { color: themeColors.textSecondary }]}>Chi mỗi month</Text>
              <Text style={[styles.limitDate, { color: themeColors.textSecondary }]}>01/10 - 31/10</Text>
              <Text style={[styles.limitAmount, { color: themeColors.text }]}>{formatCurrency(spendingLimit)}</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                isLight && { backgroundColor: themeColors.border },
              ]}>
              <LinearGradient
                colors={['#FF8904', '#FB2C36']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${(spendingUsed / spendingLimit) * 100}%` }]}
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
              borderRadius: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: themeColors.border,
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
