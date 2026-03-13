import { AIActionButton } from '@/components/AIActionButton';
import { useAIChatbot } from '@/contexts/ai-chatbot-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReportService } from '@/lib/services/reportService';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useTransactionRefresh } from '@/contexts/transaction-refresh-context';
import { useSavingGoal } from '@/contexts/saving-goal-context';
import { styles } from '@/styles/index.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

const CHART_W = 280;
const CHART_H = 100;
const PAD = { top: 8, right: 8, bottom: 20, left: 4 };

const localGrowthStyles = StyleSheet.create({
  chartWrap: { height: CHART_H + 24, marginBottom: 12 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end' },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  label: { fontSize: 10 },
  summary: { gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap' },
  summaryLabel: { fontSize: 12, flexShrink: 0 },
  summaryValue: { fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 8 },
});

type InsightTab = 'smart' | 'recommendations';

interface HealthScoreFactor {
  name: string;
  score: number;
  maxScore: number;
  color: string;
}

interface AIInsight {
  id: number;
  type: 'excellent' | 'improve' | 'potential' | 'growth' | 'info';
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface FinancialMetric {
  id: number;
  label: string;
  value: string;
  change?: string;
  changeColor?: string;
  subtitle?: string;
  icon: string;
  iconColor: string;
}

interface GoalProgress {
  id: number;
  name: string;
  current: number;
  target: number;
  progress: number;
  color: string;
}

interface AIRecommendation {
  id: number;
  title: string;
  description: string;
  action: string;
  icon: string;
  iconColor: string;
  buttonText: string;
  buttonColor: string;
}

interface AIPrediction {
  id: number;
  label: string;
  value: string;
  change?: string;
  confidence: number;
}

export default function FinancialAnalysisScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isLight = resolvedTheme === 'light';
  const [activeTab, setActiveTab] = useState<InsightTab>('smart');
  const { openChatbot } = useAIChatbot();
  const { getOverview } = useReportService();
  const { getGroupedMoneySources } = useMoneySourceService();
  const { transactionRefreshTrigger } = useTransactionRefresh();
  const { goals } = useSavingGoal();

  const [loading, setLoading] = useState(true);
  const [currentOverview, setCurrentOverview] = useState<{
    totalIncome: number;
    totalExpense: number;
    difference: number;
    categoryStats: { categoryName: string; amount: number; percentage: number; color: string }[];
  } | null>(null);
  const [previousOverview, setPreviousOverview] = useState<{
    totalIncome: number;
    totalExpense: number;
  } | null>(null);
  const [monthlyDiffs, setMonthlyDiffs] = useState<number[]>([]); // 6 tháng: [tháng cũ nhất .. tháng mới nhất]
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const loadedOnceRef = useRef(false);
  const lastFetchRef = useRef(0);
  const THROTTLE_MS = 2000;

  const getMonthRange = (offset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const now = Date.now();
      if (now - lastFetchRef.current < THROTTLE_MS && loadedOnceRef.current) {
        setLoading(false);
        return;
      }
      lastFetchRef.current = now;
      setLoading(true);
      const curr = getMonthRange(0);
      const prev = getMonthRange(-1);
      const monthRanges = [0, -1, -2, -3, -4, -5].map((off) => getMonthRange(off));
      const overviewPromises = monthRanges.map((r) => getOverview(r.start, r.end));
      Promise.all([
        ...overviewPromises,
        getGroupedMoneySources(),
      ])
        .then((results) => {
          if (cancelled) return;
          const overviews = results.slice(0, 6) as { difference?: number }[];
          const balanceRes = results[6] as { totalBalance?: number };
          const currOv = overviews[0] as { totalIncome?: number; totalExpense?: number; difference?: number; categoryStats?: { categoryName: string; amount?: number; percentage?: number; color?: string }[] };
          const prevOv = overviews[1] as { totalIncome?: number; totalExpense?: number };
          const diffs = overviews.map((o) => o?.difference ?? 0);
          setCurrentOverview({
            totalIncome: currOv?.totalIncome ?? 0,
            totalExpense: currOv?.totalExpense ?? 0,
            difference: currOv?.difference ?? 0,
            categoryStats: (currOv?.categoryStats ?? []).map((s) => ({
              categoryName: s.categoryName,
              amount: s.amount ?? 0,
              percentage: s.percentage ?? 0,
              color: s.color ?? '#51A2FF',
            })),
          });
          setPreviousOverview({
            totalIncome: prevOv?.totalIncome ?? 0,
            totalExpense: prevOv?.totalExpense ?? 0,
          });
          setMonthlyDiffs(diffs);
          setTotalBalance(balanceRes?.totalBalance ?? 0);
          loadedOnceRef.current = true;
        })
        .catch(() => {
          if (!cancelled) {
            setCurrentOverview(null);
            setPreviousOverview(null);
            setMonthlyDiffs([]);
            setTotalBalance(0);
            loadedOnceRef.current = true;
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }, [getOverview, getGroupedMoneySources])
  );

  useEffect(() => {
    if (transactionRefreshTrigger <= 0) return;
    lastFetchRef.current = 0;
    loadedOnceRef.current = false;
    const monthRanges = [0, -1, -2, -3, -4, -5].map((off) => getMonthRange(off));
    Promise.all([
      ...monthRanges.map((r) => getOverview(r.start, r.end)),
      getGroupedMoneySources(),
    ])
      .then((results) => {
        const overviews = results.slice(0, 6) as { totalIncome?: number; totalExpense?: number; difference?: number; categoryStats?: { categoryName: string; amount?: number; percentage?: number; color?: string }[] }[];
        const currOv = overviews[0];
        const prevOv = overviews[1];
        const balanceRes = results[6] as { totalBalance?: number };
        const diffs = overviews.map((o) => o?.difference ?? 0);
        setCurrentOverview({
          totalIncome: currOv?.totalIncome ?? 0,
          totalExpense: currOv?.totalExpense ?? 0,
          difference: currOv?.difference ?? 0,
          categoryStats: (currOv?.categoryStats ?? []).map((s: { categoryName: string; amount?: number; percentage?: number; color?: string }) => ({
            categoryName: s.categoryName,
            amount: s.amount ?? 0,
            percentage: s.percentage ?? 0,
            color: s.color ?? '#51A2FF',
          })),
        });
        setPreviousOverview({
          totalIncome: prevOv?.totalIncome ?? 0,
          totalExpense: prevOv?.totalExpense ?? 0,
        });
        setMonthlyDiffs(diffs);
        setTotalBalance(balanceRes?.totalBalance ?? 0);
      })
      .catch(() => {});
  }, [transactionRefreshTrigger, getOverview, getGroupedMoneySources]);

  const totalIncome = currentOverview?.totalIncome ?? 0;
  const totalExpense = currentOverview?.totalExpense ?? 0;
  const prevIncome = previousOverview?.totalIncome ?? 0;
  const prevExpense = previousOverview?.totalExpense ?? 0;
  const diff = currentOverview?.difference ?? 0;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 1000) / 10 : 0;
  const prevSavingsRate = prevIncome > 0 ? Math.round(((prevIncome - prevExpense) / prevIncome) * 1000) / 10 : 0;
  const expenseChange = prevExpense > 0 ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100) : 0;
  const avgMonthlyExpense = totalExpense > 0 ? totalExpense : Math.max(1, prevExpense);
  const emergencyMonths = avgMonthlyExpense > 0 ? Math.floor(totalBalance / avgMonthlyExpense) : 0;

  const savingsScore = Math.min(100, Math.max(0, Math.round(savingsRate)));
  const expenseScore = expenseChange <= 0 ? 80 : expenseChange <= 20 ? 60 : Math.max(20, 80 - expenseChange);
  const emergencyScore = emergencyMonths >= 6 ? 95 : emergencyMonths >= 3 ? 70 : Math.min(60, emergencyMonths * 20);

  const healthScore = Math.round(
    (savingsScore + 70 + expenseScore + emergencyScore) / 4
  );
  const healthScoreFactors: HealthScoreFactor[] = [
    { name: 'Tỷ lệ tiết kiệm', score: savingsScore, maxScore: 100, color: '#10B981' },
    { name: 'Quản lý nợ', score: 70, maxScore: 100, color: '#51A2FF' },
    { name: 'Duy trì chi tiêu', score: expenseScore, maxScore: 100, color: '#FF6900' },
    { name: 'Dự phòng', score: emergencyScore, maxScore: 100, color: '#A78BFA' },
  ];

  const aiInsights: AIInsight[] = useMemo(() => {
    const list: AIInsight[] = [];
    let id = 1;
    if (savingsRate >= 20) {
      list.push({
        id: id++,
        type: 'excellent',
        title: 'Tuyệt vời',
        description: `Tỷ lệ tiết kiệm ${savingsRate}% của bạn ở mức tốt. Tiếp tục duy trì!`,
        icon: 'trending-up',
        color: '#10B981',
      });
    } else if (totalIncome > 0) {
      list.push({
        id: id++,
        type: 'improve',
        title: 'Cần cải thiện',
        description: `Tỷ lệ tiết kiệm hiện tại ${savingsRate}%. Nên đặt mục tiêu ít nhất 20%.`,
        icon: 'trending-up',
        color: '#FF6900',
      });
    }
    if (emergencyMonths < 6 && avgMonthlyExpense > 0) {
      list.push({
        id: id++,
        type: 'improve',
        title: 'Quỹ khẩn cấp',
        description: `Quỹ khẩn cấp đủ chi tiêu khoảng ${emergencyMonths} tháng. Mục tiêu nên đạt 6 tháng.`,
        icon: 'warning',
        color: '#FF6900',
      });
    }
    if (expenseChange > 10 && prevExpense > 0) {
      list.push({
        id: id++,
        type: 'potential',
        title: 'Tiết chế chi tiêu',
        description: `Chi tiêu tăng ${expenseChange}% so với tháng trước. Cân nhắc cắt giảm chi tiêu không cần thiết.`,
        icon: 'shopping-cart',
        color: '#FBBF24',
      });
    }
    if (diff > 0 && prevIncome > 0) {
      list.push({
        id: id++,
        type: 'growth',
        title: 'Thu nhập dương',
        description: `Thu nhập vượt chi tiêu ${formatCurrency(diff)} tháng này. Tiếp tục phát huy!`,
        icon: 'trending-up',
        color: '#10B981',
      });
    }
    if (list.length === 0) {
      list.push({
        id: 1,
        type: 'info',
        title: 'Chưa có dữ liệu',
        description: 'Thêm giao dịch thu/chi để AI đưa ra nhận xét và khuyến nghị.',
        icon: 'info',
        color: '#51A2FF',
      });
    }
    return list;
  }, [savingsRate, emergencyMonths, avgMonthlyExpense, expenseChange, prevExpense, diff, prevIncome]);

  const financialMetrics: FinancialMetric[] = useMemo(() => {
    const changeStr =
      prevSavingsRate > 0
        ? `${savingsRate >= prevSavingsRate ? '+' : ''}${(savingsRate - prevSavingsRate).toFixed(1)}% so với tháng trước`
        : undefined;
    return [
      {
        id: 1,
        label: 'Tỷ lệ tiết kiệm',
        value: `${savingsRate}%`,
        change: changeStr,
        changeColor: savingsRate >= prevSavingsRate ? '#10B981' : '#EF4444',
        icon: 'account-balance-wallet',
        iconColor: '#10B981',
      },
      {
        id: 2,
        label: 'Tài sản',
        value: formatCurrency(totalBalance),
        icon: 'attach-money',
        iconColor: '#51A2FF',
      },
      {
        id: 3,
        label: 'Thu nhập tháng',
        value: formatCurrency(totalIncome),
        icon: 'trending-up',
        iconColor: '#FF6900',
      },
      {
        id: 4,
        label: 'Chi tiêu tháng',
        value: formatCurrency(totalExpense),
        subtitle: emergencyMonths > 0 ? `Quỹ đủ ~${emergencyMonths} tháng` : undefined,
        icon: 'trending-down',
        iconColor: '#EF4444',
      },
    ];
  }, [savingsRate, prevSavingsRate, totalBalance, totalIncome, totalExpense, emergencyMonths]);

  const growthData = useMemo(() => {
    if (monthlyDiffs.length !== 6) return totalBalance > 0 ? [totalBalance] : [0];
    let balance = totalBalance;
    const out: number[] = [];
    for (let i = 5; i >= 0; i--) {
      out.unshift(Math.max(0, Math.round(balance)));
      if (i > 0) balance -= monthlyDiffs[5 - i];
    }
    return out;
  }, [totalBalance, monthlyDiffs]);
  const growthLabels = useMemo(() => {
    const d = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const m = new Date(d.getFullYear(), d.getMonth() - 5 + i, 1);
      return 'T' + (m.getMonth() + 1);
    });
  }, []);
  const maxGrowthValue = Math.max(...growthData, 1);
  const growthChange = prevExpense > 0 && totalExpense > 0
    ? Math.round(((totalExpense - prevExpense) / prevExpense) * 100)
    : 0;
  const growthAmount = Math.abs(diff);

  const goalProgresses: GoalProgress[] = useMemo(
    () =>
      goals.map((g, i) => {
        const pct = g.targetAmount > 0
          ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
          : 0;
        const colors = ['#51A2FF', '#10B981', '#A78BFA'];
        return {
          id: i + 1,
          name: g.title,
          current: g.currentAmount,
          target: g.targetAmount,
          progress: pct,
          color: colors[i % colors.length],
        };
      }),
    [goals]
  );

  const aiRecommendations: AIRecommendation[] = useMemo(() => {
    const list: AIRecommendation[] = [];
    if (emergencyMonths < 6 && avgMonthlyExpense > 0) {
      list.push({
        id: 1,
        title: 'Tăng quỹ khẩn cấp',
        description: `Quỹ khẩn cấp hiện đủ ~${emergencyMonths} tháng. Khuyến nghị đạt 6 tháng để an toàn tài chính.`,
        action: `Tiết kiệm thêm để đạt ~${formatCurrency(avgMonthlyExpense * Math.max(0, 6 - emergencyMonths))}`,
        icon: 'error',
        iconColor: '#EF4444',
        buttonText: 'Tìm hiểu thêm',
        buttonColor: '#FF6900',
      });
    }
    if (savingsRate >= 20) {
      list.push({
        id: 2,
        title: 'Bắt đầu đầu tư',
        description: `Với tỷ lệ tiết kiệm ${savingsRate}%, bạn có thể cân nhắc đầu tư để tăng trưởng.`,
        action: 'Xem các kênh đầu tư phù hợp',
        icon: 'attach-money',
        iconColor: '#FBBF24',
        buttonText: 'Tìm hiểu thêm',
        buttonColor: '#FF6900',
      });
    }
    if (expenseChange > 15 && prevExpense > 0) {
      list.push({
        id: 3,
        title: 'Tiết chế chi tiêu',
        description: `Chi tiêu tăng ${expenseChange}% so tháng trước. Cân nhắc áp dụng quy tắc 24h trước khi mua.`,
        action: 'Áp dụng quy tắc 24 giờ trước khi mua',
        icon: 'shopping-cart',
        iconColor: '#FF6900',
        buttonText: 'Tìm hiểu thêm',
        buttonColor: '#FF6900',
      });
    }
    list.push({
      id: 4,
      title: 'Tự động hóa tiết kiệm',
      description: 'Thiết lập chuyển tiền tự động vào tài khoản tiết kiệm mỗi tháng.',
      action: 'Thiết lập ngay',
      icon: 'schedule',
      iconColor: '#10B981',
      buttonText: 'Thiết lập',
      buttonColor: '#10B981',
    });
    return list;
  }, [emergencyMonths, avgMonthlyExpense, savingsRate, expenseChange, prevExpense]);

  const aiPredictions: AIPrediction[] = useMemo(() => {
    const projected6m = totalBalance + Math.max(0, diff) * 6;
    const emergencyMonthsGoal = 6;
    const monthsToEmergency = avgMonthlyExpense > 0 && totalBalance < avgMonthlyExpense * 6
      ? Math.ceil((avgMonthlyExpense * emergencyMonthsGoal - totalBalance) / Math.max(1, Math.max(0, diff)))
      : 0;
    return [
      {
        id: 1,
        label: 'Tài sản ước tính sau 6 tháng',
        value: formatCurrency(Math.round(projected6m)),
        change: diff > 0 ? `+${formatCurrency(diff)}/tháng` : undefined,
        confidence: 70,
      },
      {
        id: 2,
        label: 'Tổng tài sản hiện tại',
        value: formatCurrency(totalBalance),
        confidence: 95,
      },
      {
        id: 3,
        label: emergencyMonths >= 6 ? 'Đã đạt quỹ khẩn cấp 6 tháng' : 'Thời gian đạt quỹ 6 tháng',
        value: emergencyMonths >= 6 ? 'Đạt' : monthsToEmergency > 0 ? `~${monthsToEmergency} tháng` : 'Hỏi AI',
        confidence: emergencyMonths >= 6 ? 100 : 75,
      },
    ];
  }, [totalBalance, diff, avgMonthlyExpense, emergencyMonths]);

  const handleLearnMore = (rec: AIRecommendation) => {
    const prompt = `Hãy giải thích chi tiết về "${rec.title}". Mô tả: ${rec.description}. Hành động đề xuất: ${rec.action}.`;
    openChatbot({ initialMessage: prompt, autoSend: true });
  };

  const handleBack = () => {
    router.replace({
      pathname: '/(protected)/(tabs)/report',
      params: { __replace: 'pop' },
    } as any);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.financialAnalysisHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.financialAnalysisBackButton}>
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={isLight ? themeColors.text : '#FFFFFF'}
            />
          </TouchableOpacity>
          <View style={styles.financialAnalysisHeaderCenter}>
            <Text
              style={[
                styles.financialAnalysisTitle,
                { color: themeColors.text },
              ]}>
              Phân tích tài chính
            </Text>
            <Text
              style={[
                styles.financialAnalysisSubtitle,
                { color: themeColors.textSecondary },
              ]}>
              AI-Powered Analysis
            </Text>
          </View>
          <TouchableOpacity style={styles.financialAnalysisSettingsButton}>
            <MaterialIcons
              name="settings"
              size={24}
              color={isLight ? themeColors.text : '#FFFFFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Card Điểm sức khỏe tài chính */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#8B4513', '#FF6900']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.financialAnalysisHealthScoreCard}>
            <View style={styles.financialAnalysisHealthScoreHeader}>
            <View style={styles.financialAnalysisHealthScoreTitleRow}>
                <MaterialIcons name="bolt" size={20} color="#FFFFFF" />
              <Text
                style={[
                  styles.financialAnalysisHealthScoreTitle,
                  { color: '#FFFFFF' },
                ]}>
                Điểm sức khỏe tài chính
              </Text>
              </View>
              <TouchableOpacity style={styles.financialAnalysisRestoreButton}>
                <Text style={styles.financialAnalysisRestoreButtonText}>Khôi phục</Text>
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.financialAnalysisHealthScoreSubtitle,
                { color: 'rgba(255, 255, 255, 0.9)' },
              ]}>
              Dựa trên 4 yếu tố chính
            </Text>
            
            <View style={styles.financialAnalysisHealthScoreContent}>
              <View style={styles.financialAnalysisHealthScoreCircleContainer}>
                <View style={styles.financialAnalysisHealthScoreCircle}>
                  <Text style={styles.financialAnalysisHealthScoreValue}>{healthScore}</Text>
                  <Text style={styles.financialAnalysisHealthScoreMax}>trên 100</Text>
                </View>
              </View>
              <View style={styles.financialAnalysisHealthScoreFactors}>
                {healthScoreFactors.map((factor, index) => (
                  <View key={index} style={styles.financialAnalysisHealthScoreFactor}>
                    <Text
                      style={[
                        styles.financialAnalysisHealthScoreFactorName,
                        { color: '#FFFFFF' },
                      ]}>
                      {factor.name}
                    </Text>
                    <View style={styles.financialAnalysisHealthScoreBarContainer}>
                      <View style={[styles.financialAnalysisHealthScoreBarTrack]}>
                        <View 
                          style={[
                            styles.financialAnalysisHealthScoreBarFill, 
                            { 
                              width: `${(factor.score / factor.maxScore) * 100}%`,
                              backgroundColor: factor.color
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.financialAnalysisHealthScoreFactorValue}>
                        {factor.score}/{factor.maxScore}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* AI Insights */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.financialAnalysisSectionHeader}>
            <View style={styles.financialAnalysisPredictionTitleRow}>
              <MaterialIcons name="bolt" size={20} color="#51A2FF" />
              <Text
                style={[
                  styles.financialAnalysisPredictionTitle,
                  { color: themeColors.text },
                ]}>
                AI Insights
              </Text>
            </View>
            <View style={styles.financialAnalysisInsightTabs}>
              <TouchableOpacity
                style={[
                  styles.financialAnalysisInsightTab,
                  activeTab === 'smart' && styles.financialAnalysisInsightTabActive,
                  isLight && {
                    backgroundColor:
                      activeTab === 'smart' ? themeColors.primaryButtonBg : 'transparent',
                    borderWidth: 1,
                    borderColor:
                      activeTab === 'smart' ? themeColors.primaryButtonBg : themeColors.border,
                  },
                ]}
                onPress={() => setActiveTab('smart')}>
                <Text
                  style={[
                    styles.financialAnalysisInsightTabText,
                    activeTab === 'smart' &&
                      styles.financialAnalysisInsightTabTextActive,
                    isLight && {
                      color:
                        activeTab === 'smart'
                          ? '#FFFFFF'
                          : themeColors.textSecondary,
                    },
                  ]}>
                  Smart Analysis
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.financialAnalysisInsightTab,
                  activeTab === 'recommendations' &&
                    styles.financialAnalysisInsightTabActive,
                  isLight && {
                    backgroundColor:
                      activeTab === 'recommendations'
                        ? themeColors.primaryButtonBg
                        : 'transparent',
                    borderWidth: 1,
                    borderColor:
                      activeTab === 'recommendations'
                        ? themeColors.primaryButtonBg
                        : themeColors.border,
                  },
                ]}
                onPress={() => setActiveTab('recommendations')}>
                <Text
                  style={[
                    styles.financialAnalysisInsightTabText,
                    activeTab === 'recommendations' &&
                      styles.financialAnalysisInsightTabTextActive,
                    isLight && {
                      color:
                        activeTab === 'recommendations'
                          ? '#FFFFFF'
                          : themeColors.textSecondary,
                    },
                  ]}>
                  Recommendations
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {aiInsights.map((insight) => (
            <View
              key={insight.id}
              style={[
                styles.financialAnalysisInsightCard,
                isLight && {
                  backgroundColor: themeColors.background,
                  borderWidth: 1,
                  borderColor: themeColors.border,
                },
              ]}>
              <View style={[styles.financialAnalysisInsightIcon, { backgroundColor: insight.color + '20' }]}>
                <MaterialIcons name={insight.icon as any} size={20} color={insight.color} />
              </View>
              <View style={styles.financialAnalysisInsightContent}>
                <Text
                  style={[
                    styles.financialAnalysisInsightTitle,
                    { color: themeColors.text },
                  ]}>
                  {insight.title}
                </Text>
                <Text
                  style={[
                    styles.financialAnalysisInsightDescription,
                    { color: themeColors.textSecondary },
                  ]}>
                  {insight.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Số liệu tổng quan */}
        <View style={styles.financialAnalysisMetricsGrid}>
          {financialMetrics.map((metric) => (
            <View
              key={metric.id}
              style={[
                styles.financialAnalysisMetricCard,
                isLight && {
                  backgroundColor: themeColors.card,
                  borderWidth: 1,
                  borderColor: themeColors.border,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}>
              <View style={[styles.financialAnalysisMetricIcon, { backgroundColor: metric.iconColor + '20' }]}>
                <MaterialIcons name={metric.icon as any} size={24} color={metric.iconColor} />
              </View>
              <Text
                style={[
                  styles.financialAnalysisMetricValue,
                  { color: themeColors.text },
                ]}>
                {metric.value}
              </Text>
              <Text
                style={[
                  styles.financialAnalysisMetricLabel,
                  { color: themeColors.textSecondary },
                ]}>
                {metric.label}
              </Text>
              {metric.change && (
                <Text style={[styles.financialAnalysisMetricChange, { color: metric.changeColor }]}>
                  {metric.change}
                </Text>
              )}
              {metric.subtitle && (
                <Text style={styles.financialAnalysisMetricSubtitle}>{metric.subtitle}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Tăng trưởng tài sản ròng - đường biểu diễn với chấm */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: themeColors.card, overflow: 'hidden' }]}>
          <Text
            style={[
              styles.financialAnalysisPredictionTitle,
              { color: themeColors.text, marginBottom: 12 },
            ]}
            numberOfLines={1}>
            Tăng trưởng tài sản ròng
          </Text>
          <View style={localGrowthStyles.chartWrap}>
            {growthData.length > 0 && maxGrowthValue > 0 ? (() => {
              const w = CHART_W - PAD.left - PAD.right;
              const h = CHART_H - PAD.top - PAD.bottom;
              const points = growthData.map((v, i) => {
                const x = PAD.left + (growthData.length > 1 ? (i / (growthData.length - 1)) * w : w / 2);
                const y = PAD.top + h * (1 - v / maxGrowthValue);
                return { x, y };
              });
              const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
              return (
                <>
                  <Svg width={CHART_W} height={CHART_H}>
                    <Path
                      d={pathD}
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {points.map((p, i) => (
                      <Circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={4}
                        fill={i === points.length - 1 ? '#16a34a' : '#22c55e'}
                        stroke="#16a34a"
                        strokeWidth={1}
                      />
                    ))}
                  </Svg>
                  <View style={localGrowthStyles.labelRow}>
                    {growthLabels.slice(0, growthData.length).map((lb, i) => (
                      <Text key={i} style={[localGrowthStyles.label, { color: themeColors.textSecondary }]} numberOfLines={1}>
                        {lb}
                      </Text>
                    ))}
                  </View>
                </>
              );
            })() : (
              <Text style={[localGrowthStyles.label, { color: themeColors.textSecondary, textAlign: 'center', paddingVertical: 20 }]}>
                Chưa có dữ liệu
              </Text>
            )}
          </View>
          <View style={localGrowthStyles.summary}>
            <View style={localGrowthStyles.summaryRow}>
              <Text style={[localGrowthStyles.summaryLabel, { color: themeColors.textSecondary }]}>
                Thu vượt chi tháng này
              </Text>
              <Text
                style={[localGrowthStyles.summaryValue, { color: diff >= 0 ? '#10B981' : '#EF4444' }]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
              </Text>
            </View>
            <View style={localGrowthStyles.summaryRow}>
              <Text style={[localGrowthStyles.summaryLabel, { color: themeColors.textSecondary }]}>
                Tài sản hiện tại
              </Text>
              <Text
                style={[localGrowthStyles.summaryValue, { color: themeColors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail">
                {formatCurrency(totalBalance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tiến độ mục tiêu */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: themeColors.card }]}>
          <Text
            style={[
              styles.financialAnalysisPredictionTitle,
              { color: themeColors.text },
            ]}>
            Tiến độ mục tiêu
          </Text>
          {goalProgresses.length > 0 ? goalProgresses.map((goal) => (
            <View
              key={goal.id}
              style={[
                styles.financialAnalysisGoalProgressCard,
                isLight && {
                  backgroundColor: themeColors.background,
                  borderWidth: 1,
                  borderColor: themeColors.border,
                },
              ]}>
              <View style={styles.financialAnalysisGoalProgressHeader}>
                <Text
                  style={[
                    styles.financialAnalysisGoalProgressName,
                    { color: themeColors.text },
                  ]}>
                  {goal.name}
                </Text>
                <Text
                  style={[
                    styles.financialAnalysisGoalProgressPercentage,
                    { color: themeColors.text },
                  ]}>
                  {goal.progress}%
                </Text>
              </View>
              <View style={styles.financialAnalysisGoalProgressBarContainer}>
                <View
                  style={[
                    styles.financialAnalysisGoalProgressBarTrack,
                    isLight && { backgroundColor: themeColors.border },
                  ]}>
                  <View 
                    style={[
                      styles.financialAnalysisGoalProgressBarFill,
                      { 
                        width: `${goal.progress}%`,
                        backgroundColor: goal.color
                      }
                    ]} 
                  />
                </View>
              </View>
              <Text
                style={[
                  styles.financialAnalysisGoalProgressAmount,
                  { color: themeColors.textSecondary },
                ]}>
                {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
              </Text>
            </View>
          )) : (
            <Text style={{ color: themeColors.textSecondary, textAlign: 'center', paddingVertical: 16 }}>
              Chưa có mục tiêu. Tạo mục tiêu để theo dõi tiến độ.
            </Text>
          )}
        </View>

        {/* Khuyến nghị từ AI */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.financialAnalysisPredictionTitleRow}>
            <MaterialIcons name="bolt" size={20} color="#51A2FF" />
            <Text
              style={[
                styles.financialAnalysisPredictionTitle,
                { color: themeColors.text },
              ]}>
              Khuyến nghị từ AI
            </Text>
          </View>
          {aiRecommendations.map((recommendation) => (
            <View
              key={recommendation.id}
              style={[
                styles.financialAnalysisRecommendationCard,
                isLight && {
                  backgroundColor: themeColors.background,
                  borderWidth: 1,
                  borderColor: themeColors.border,
                },
              ]}>
              <View style={[styles.financialAnalysisRecommendationIcon, { backgroundColor: recommendation.iconColor + '20' }]}>
                <MaterialIcons name={recommendation.icon as any} size={24} color={recommendation.iconColor} />
              </View>
              <View style={styles.financialAnalysisRecommendationContent}>
                <Text
                  style={[
                    styles.financialAnalysisRecommendationTitle,
                    { color: themeColors.text },
                  ]}>
                  {recommendation.title}
                </Text>
                <Text
                  style={[
                    styles.financialAnalysisRecommendationDescription,
                    { color: themeColors.textSecondary },
                  ]}>
                  {recommendation.description}
                </Text>
                <Text style={styles.financialAnalysisRecommendationAction}>
                  {recommendation.action}
                </Text>
              </View>
              <AIActionButton
                label={recommendation.buttonText}
                variant="chip"
                style={{ marginLeft: 8, marginTop: 4 }}
                onPress={() => {
                  if (recommendation.buttonText === 'Tìm hiểu thêm') {
                    handleLearnMore(recommendation);
                  }
                }}
              />
            </View>
          ))}
        </View>

        {/* Dự đoán AI - AI Smart: mở chatbot mới để hỏi AI về dự đoán thu chi */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            openChatbot({
              initialMessage: 'Dựa trên dữ liệu tài chính của tôi, hãy dự đoán thu chi 6 tháng tới và đưa ra các khuyến nghị tiết kiệm. Phân tích tài sản ròng, tổng tiết kiệm sau 1 năm, thời gian đạt quỹ khẩn cấp.',
              autoSend: true,
            });
          }}>
        <View style={styles.card}>
          <LinearGradient
            colors={['#9810FA', '#51A2FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.financialAnalysisPredictionCard}>
            <View style={styles.financialAnalysisPredictionHeader}>
              <View style={styles.financialAnalysisPredictionTitleRow}>
                <MaterialIcons name="bolt" size={20} color="#FFFFFF" />
                <Text style={styles.financialAnalysisPredictionTitle}>Dự đoán AI</Text>
              </View>
              <View style={styles.financialAnalysisPredictionBadge}>
                <Text style={styles.financialAnalysisPredictionBadgeText}>Predictive</Text>
              </View>
            </View>

            {aiPredictions.map((prediction) => (
              <View key={prediction.id} style={styles.financialAnalysisPredictionItem}>
                <Text style={styles.financialAnalysisPredictionLabel}>{prediction.label}</Text>
                <View style={styles.financialAnalysisPredictionValueRow}>
                  <Text style={styles.financialAnalysisPredictionValue}>{prediction.value}</Text>
                  {prediction.change && (
                    <Text style={styles.financialAnalysisPredictionChange}>{prediction.change}</Text>
                  )}
                  <View style={styles.financialAnalysisPredictionConfidence}>
                    <Text style={styles.financialAnalysisPredictionConfidenceText}>
                      {prediction.confidence}% chắc chắn
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            <Text style={styles.financialAnalysisPredictionDisclaimer}>
              Các phân tích dựa trên dữ liệu lịch sử và mô hình AI, có thể không chính xác. 
              Khuyến nghị tham khảo ý kiến chuyên gia tài chính.
            </Text>
          </LinearGradient>
        </View>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
