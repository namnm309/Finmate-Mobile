import { Colors, GlassCardColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReportService } from '@/lib/services/reportService';
import { useTransactionService } from '@/lib/services/transactionService';
import { useTransactionRefresh } from '@/contexts/transaction-refresh-context';
import { CategoryStatDto } from '@/lib/types/report';
import { styles } from '@/styles/index.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const WEEKLY_CHART_BAR_MAX = 100;
const DAYS_LABELS = ['T3', 'T4', 'T5', 'T6', 'T7', 'CN', 'T2'];

/** Biểu đồ tròn có màu theo từng danh mục */
const PieChart = React.memo(function PieChart({
  data,
  size = 100,
}: {
  data: { percentage: number; color: string }[];
  size?: number;
}) {
  if (data.length === 0) return null;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 2;
  const paths = useMemo(() => {
    const total = data.reduce((s, d) => s + Math.max(0, d.percentage), 0);
    const scale = total > 0 ? 100 / total : 0;
    let cumulative = 0;
    return data.map(({ percentage, color }) => {
      const p = Math.min(100 - cumulative, Math.max(0, percentage * scale));
      if (p <= 0) return { d: '', color };
      const startAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
      cumulative += p;
      const endAngle = (cumulative / 100) * 2 * Math.PI - Math.PI / 2;
      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return { d, color };
    });
  }, [data, cx, cy, r]);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.filter((p) => p.d).map(({ d, color }, i) => (
        <Path key={i} d={d} fill={color} strokeWidth={0} />
      ))}
    </Svg>
  );
});

const WeeklyTrendChart = React.memo(function WeeklyTrendChart({
  values,
  textColor,
}: {
  values: number[];
  textColor: string;
}) {
  const barHeights = useMemo(() => {
    const data = values.length === 7 ? values : [0, 0, 0, 0, 0, 0, 0];
    const hasData = data.some((v) => v > 0);
    const max = Math.max(...data, 1);
    return data.map((v) =>
      hasData ? Math.max(4, (v / max) * WEEKLY_CHART_BAR_MAX) : 50
    );
  }, [values]);
  return (
    <View style={styles.expenseAnalysisLineChart}>
      {barHeights.map((h, i) => (
        <View key={i} style={styles.expenseAnalysisLineChartPoint}>
          <View
            style={[
              styles.expenseAnalysisLineChartBar,
              { height: h },
            ]}
          />
          <Text style={[styles.expenseAnalysisLineChartLabel, { color: textColor }]}>
            {DAYS_LABELS[i]}
          </Text>
        </View>
      ))}
    </View>
  );
});

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

type TimePeriod = 'week' | 'month' | 'year';

// Lấy start/end cho tuần (offset 0 = tuần này, -1 = tuần trước)
function getWeekRange(offset: number): { start: Date; end: Date } {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Thứ 2 là đầu tuần
  const start = new Date(d.getFullYear(), d.getMonth(), diff, 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Lấy start/end cho tháng (offset 0 = tháng này, -1 = tháng trước)
function getMonthRange(offset: number): { start: Date; end: Date } {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Lấy start/end cho năm (offset 0 = năm nay, -1 = năm trước)
function getYearRange(offset: number): { start: Date; end: Date } {
  const y = new Date().getFullYear() + offset;
  const start = new Date(y, 0, 1, 0, 0, 0, 0);
  const end = new Date(y, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function getPeriodRange(period: TimePeriod, offset: number): { start: Date; end: Date } {
  if (period === 'week') return getWeekRange(offset);
  if (period === 'month') return getMonthRange(offset);
  return getYearRange(offset);
}

interface AIInsight {
  id: number;
  type: 'warning' | 'success' | 'info';
  title: string;
  description: string;
  tip: string;
  color: string;
}

interface ExpenseCategory {
  name: string;
  percentage: number;
  amount: number;
  color: string;
}

interface ComparisonItem {
  category: string;
  current: number;
  previous: number;
  change: number;
  color: string;
}

interface SavingTip {
  id: number;
  title: string;
  description: string;
  savings: number;
}

interface UnusualTransaction {
  id: number;
  name: string;
  amount: number;
  time: string;
  description: string;
}

const CATEGORY_COLORS = ['#EF4444', '#FF6900', '#51A2FF', '#22D3EE', '#F6339A', '#A78BFA', '#10B981'];

export default function ExpenseAnalysisScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isLight = resolvedTheme === 'light';
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('month');
  const { getOverview } = useReportService();
  const { getTransactions } = useTransactionService();
  const { transactionRefreshTrigger } = useTransactionRefresh();

  const [loading, setLoading] = useState(true);
  const [currentOverview, setCurrentOverview] = useState<{
    totalExpense: number;
    categoryStats: CategoryStatDto[];
  } | null>(null);
  const [previousOverview, setPreviousOverview] = useState<{
    totalExpense: number;
    categoryStats: CategoryStatDto[];
  } | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<number[]>([]);
  const loadedOnceRef = useRef(false);
  const lastFetchRef = useRef(0);
  const THROTTLE_MS = 2000;

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
      const curr = getPeriodRange(activePeriod, 0);
      const prev = getPeriodRange(activePeriod, -1);

      Promise.all([
        getOverview(curr.start, curr.end),
        getOverview(prev.start, prev.end),
      ])
        .then(([currOv, prevOv]) => {
          if (cancelled) return;
          setCurrentOverview({
            totalExpense: currOv?.totalExpense ?? 0,
            categoryStats: currOv?.categoryStats ?? [],
          });
          setPreviousOverview({
            totalExpense: prevOv?.totalExpense ?? 0,
            categoryStats: prevOv?.categoryStats ?? [],
          });
          loadedOnceRef.current = true;
        })
        .catch(() => {
          if (!cancelled) {
            setCurrentOverview({ totalExpense: 0, categoryStats: [] });
            setPreviousOverview({ totalExpense: 0, categoryStats: [] });
            loadedOnceRef.current = true;
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      // Xu hướng 7 ngày qua: lấy 7 ngày gần nhất
      const weekEnd = new Date();
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(23, 59, 59, 999);
      getTransactions({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        pageSize: 500,
      })
        .then((res) => {
          if (cancelled) return;
          const byDay: Record<string, number> = {};
          for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            byDay[d.toISOString().slice(0, 10)] = 0;
          }
          (res?.transactions ?? []).forEach((t) => {
            if (!t.isIncome) {
              const key = t.transactionDate.slice(0, 10);
              if (byDay[key] !== undefined) byDay[key] += t.amount;
            }
          });
          const days = ['T3', 'T4', 'T5', 'T6', 'T7', 'CN', 'T2'];
          const vals: number[] = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            vals.push(byDay[d.toISOString().slice(0, 10)] ?? 0);
          }
          setWeeklyTrend(vals);
        })
        .catch(() => {
          if (!cancelled) setWeeklyTrend([0, 0, 0, 0, 0, 0, 0]);
        });

      return () => { cancelled = true; };
    }, [activePeriod, getOverview, getTransactions])
  );

  useEffect(() => {
    if (transactionRefreshTrigger > 0) {
      lastFetchRef.current = 0;
      loadedOnceRef.current = false;
      const curr = getPeriodRange(activePeriod, 0);
      const prev = getPeriodRange(activePeriod, -1);
      const weekEnd = new Date();
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      weekEnd.setHours(23, 59, 59, 999);
      Promise.all([
        getOverview(curr.start, curr.end),
        getOverview(prev.start, prev.end),
      ])
        .then(([currOv, prevOv]) => {
          setCurrentOverview({
            totalExpense: currOv?.totalExpense ?? 0,
            categoryStats: currOv?.categoryStats ?? [],
          });
          setPreviousOverview({
            totalExpense: prevOv?.totalExpense ?? 0,
            categoryStats: prevOv?.categoryStats ?? [],
          });
        })
        .catch(() => {
          setCurrentOverview({ totalExpense: 0, categoryStats: [] });
          setPreviousOverview({ totalExpense: 0, categoryStats: [] });
        })
        .finally(() => {});
      getTransactions({
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        pageSize: 500,
      })
        .then((res) => {
          const byDay: Record<string, number> = {};
          for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            byDay[d.toISOString().slice(0, 10)] = 0;
          }
          (res?.transactions ?? []).forEach((t) => {
            if (!t.isIncome) {
              const key = t.transactionDate.slice(0, 10);
              if (byDay[key] !== undefined) byDay[key] += t.amount;
            }
          });
          const vals: number[] = [];
          for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            vals.push(byDay[d.toISOString().slice(0, 10)] ?? 0);
          }
          setWeeklyTrend(vals);
        })
        .catch(() => setWeeklyTrend([0, 0, 0, 0, 0, 0, 0]));
    }
  }, [transactionRefreshTrigger, activePeriod, getOverview, getTransactions]);

  const totalExpense = currentOverview?.totalExpense ?? 0;
  const prevTotal = previousOverview?.totalExpense ?? 0;
  const expenseChangeAmount = totalExpense - prevTotal;
  const expenseChange = prevTotal > 0
    ? Math.round((expenseChangeAmount / prevTotal) * 100)
    : totalExpense > 0 ? 100 : 0;

  const expenseCategories: ExpenseCategory[] = useMemo(() => {
    const stats = currentOverview?.categoryStats ?? [];
    if (stats.length === 0) return [];
    return stats.map((s, i) => ({
      name: s.categoryName,
      percentage: Math.round(s.percentage ?? 0),
      amount: s.amount ?? 0,
      color: s.color ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));
  }, [currentOverview?.categoryStats]);

  const comparisons: ComparisonItem[] = useMemo(() => {
    const curr = currentOverview?.categoryStats ?? [];
    const prevMap = new Map((previousOverview?.categoryStats ?? []).map((s) => [s.categoryId, s]));
    return curr.map((c, i) => {
      const prev = prevMap.get(c.categoryId);
      const currAmt = c.amount ?? 0;
      const prevAmt = prev?.amount ?? 0;
      const change = prevAmt > 0 ? Math.round(((currAmt - prevAmt) / prevAmt) * 100) : currAmt > 0 ? 100 : 0;
      return {
        category: c.categoryName,
        current: currAmt,
        previous: prevAmt,
        change,
        color: c.color ?? CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      };
    });
  }, [currentOverview?.categoryStats, previousOverview?.categoryStats]);

  const displayWeeklyTrend = useMemo(
    () => (weeklyTrend.length === 7 ? weeklyTrend : [0, 0, 0, 0, 0, 0, 0]),
    [weeklyTrend]
  );
  const hasAnyData = useMemo(
    () =>
      totalExpense > 0 ||
      displayWeeklyTrend.some((v) => v > 0) ||
      expenseCategories.length > 0,
    [totalExpense, displayWeeklyTrend, expenseCategories.length]
  );
  const avgDaily = useMemo(
    () => displayWeeklyTrend.reduce((a, b) => a + b, 0) / 7,
    [displayWeeklyTrend]
  );

  const aiInsights: AIInsight[] = useMemo(() => {
    if (!hasAnyData || expenseCategories.length === 0) return [];
    return comparisons
      .filter((c) => c.previous > 0)
      .slice(0, 3)
      .map((c, i) => ({
        id: i + 1,
        type: c.change > 0 ? ('warning' as const) : ('success' as const),
        title: c.change > 0
          ? `${c.category} tăng ${c.change}%`
          : `${c.category} giảm ${Math.abs(c.change)}%`,
        description:
          c.change > 0
            ? `Bạn đã chi ${formatCurrency(c.current)} cho ${c.category}${c.previous > 0 ? `, tăng so với kỳ trước (${formatCurrency(c.previous)})` : ''}.`
            : `Bạn đã tiết kiệm chi phí ${c.category} so với kỳ trước.`,
        tip: c.change > 0 ? 'Xem xét cắt giảm chi tiêu không cần thiết.' : 'Tiếp tục duy trì thói quen tốt.',
        color: c.color,
      }));
  }, [hasAnyData, expenseCategories.length, comparisons]);

  const savingTips = useMemo<SavingTip[]>(
    () =>
      hasAnyData
        ? [
            {
              id: 1,
              title: 'Cắt giảm ăn uống ngoài',
              description: 'Nấu 3-4 bữa ăn ở nhà mỗi tuần có thể tiết kiệm 500.000đ/tháng',
              savings: 500000,
            },
            {
              id: 2,
              title: 'Giảm shopping không cần thiết',
              description: 'Áp dụng "luật 24 giờ" trước khi mua để tiết kiệm 350.000đ/tháng',
              savings: 350000,
            },
            {
              id: 3,
              title: 'Pha cà phê tại nhà',
              description: 'Thay vì mua cà phê ngoài, tự pha tại nhà tiết kiệm 280.000đ/tháng',
              savings: 280000,
            },
          ]
        : [],
    [hasAnyData]
  );
  const unusualTransactions: UnusualTransaction[] = [];

  const handleBack = () => {
    router.replace({
      pathname: '/(protected)/(tabs)/report',
      params: { __replace: 'pop' },
    } as any);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.expenseAnalysisHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.expenseAnalysisBackButton}>
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={isLight ? themeColors.text : '#FFFFFF'}
            />
          </TouchableOpacity>
          <View style={styles.expenseAnalysisHeaderCenter}>
            <Text
              style={[
                styles.expenseAnalysisTitle,
                { color: themeColors.text },
              ]}>
              Phân tích chi tiêu
            </Text>
            <Text
              style={[
                styles.expenseAnalysisSubtitle,
                { color: themeColors.textSecondary },
              ]}>
              Powered by AI
            </Text>
          </View>
          <View style={styles.expenseAnalysisTabs}>
            <TouchableOpacity
              style={[
                styles.expenseAnalysisTab,
                activePeriod === 'week' && styles.expenseAnalysisTabActive,
                isLight && {
                  backgroundColor:
                    activePeriod === 'week' ? themeColors.primaryButtonBg : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    activePeriod === 'week' ? themeColors.primaryButtonBg : themeColors.border,
                },
              ]}
              onPress={() => setActivePeriod('week')}>
              <Text
                style={[
                  styles.expenseAnalysisTabText,
                  activePeriod === 'week' && styles.expenseAnalysisTabTextActive,
                  isLight && {
                    color:
                      activePeriod === 'week'
                        ? '#FFFFFF'
                        : themeColors.textSecondary,
                  },
                ]}>
                Tuần này
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.expenseAnalysisTab,
                activePeriod === 'month' && styles.expenseAnalysisTabActive,
                isLight && {
                  backgroundColor:
                    activePeriod === 'month' ? themeColors.primaryButtonBg : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    activePeriod === 'month' ? themeColors.primaryButtonBg : themeColors.border,
                },
              ]}
              onPress={() => setActivePeriod('month')}>
              <Text
                style={[
                  styles.expenseAnalysisTabText,
                  activePeriod === 'month' && styles.expenseAnalysisTabTextActive,
                  isLight && {
                    color:
                      activePeriod === 'month'
                        ? '#FFFFFF'
                        : themeColors.textSecondary,
                  },
                ]}>
                Tháng này
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.expenseAnalysisTab,
                activePeriod === 'year' && styles.expenseAnalysisTabActive,
                isLight && {
                  backgroundColor:
                    activePeriod === 'year' ? themeColors.primaryButtonBg : 'transparent',
                  borderWidth: 1,
                  borderColor:
                    activePeriod === 'year' ? themeColors.primaryButtonBg : themeColors.border,
                },
              ]}
              onPress={() => setActivePeriod('year')}>
              <Text
                style={[
                  styles.expenseAnalysisTabText,
                  activePeriod === 'year' && styles.expenseAnalysisTabTextActive,
                  isLight && {
                    color:
                      activePeriod === 'year'
                        ? '#FFFFFF'
                        : themeColors.textSecondary,
                  },
                ]}>
                Năm nay
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Tổng chi tiêu - sync dữ liệu user */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#F6339A', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.expenseAnalysisTotalCard}>
            {loading ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <>
                <View style={styles.expenseAnalysisTotalCardHeader}>
                  <View style={styles.expenseAnalysisTotalCardLeft}>
                    <MaterialIcons name="show-chart" size={20} color="#FFFFFF" />
                    <Text style={styles.expenseAnalysisTotalCardLabel}>Tổng chi tiêu</Text>
                  </View>
                  {prevTotal > 0 && (
                    <View style={styles.expenseAnalysisBadge}>
                      <Text style={styles.expenseAnalysisBadgeText}>
                        {expenseChange >= 0 ? '+' : ''}{expenseChange}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.expenseAnalysisTotalAmount}>
                  {totalExpense > 0 ? formatCurrency(totalExpense) : 'Chưa có dữ liệu'}
                </Text>
                <Text style={styles.expenseAnalysisTotalSubtitle}>
                  {prevTotal > 0
                    ? `So với kỳ trước: ${expenseChangeAmount >= 0 ? '+' : ''}${formatCurrency(expenseChangeAmount)}`
                    : 'Chưa có dữ liệu so sánh'}
                </Text>
              </>
            )}
          </LinearGradient>
        </View>

        {/* AI Insights */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
          <View style={styles.expenseAnalysisSectionHeader}>
            <View style={styles.expenseAnalysisSectionTitleRow}>
              <MaterialIcons name="bolt" size={20} color="#51A2FF" />
              <Text
                style={[
                  styles.expenseAnalysisSectionTitle,
                  { color: themeColors.text },
                ]}>
                AI Insights
              </Text>
            </View>
            <TouchableOpacity style={styles.expenseAnalysisSmartButton}>
              <Text style={styles.expenseAnalysisSmartButtonText}>Smart</Text>
            </TouchableOpacity>
          </View>

          {aiInsights.length > 0 ? (
            aiInsights.map((insight) => (
              <View
                key={insight.id}
                style={[
                  styles.expenseAnalysisInsightCard,
                  { borderLeftColor: insight.color },
                  isLight && {
                    backgroundColor: GlassCardColors.inner,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                  },
                ]}>
                <View style={[styles.expenseAnalysisInsightIcon, { backgroundColor: insight.color + '20' }]}>
                  <MaterialIcons
                    name={insight.type === 'success' ? 'trending-down' : 'trending-up'}
                    size={20}
                    color={insight.color}
                  />
                </View>
                <View style={styles.expenseAnalysisInsightContent}>
                  <Text
                    style={[
                      styles.expenseAnalysisInsightTitle,
                      { color: themeColors.text },
                    ]}>
                    {insight.title}
                  </Text>
                  <Text
                    style={[
                      styles.expenseAnalysisInsightDescription,
                      { color: themeColors.textSecondary },
                    ]}>
                    {insight.description}
                  </Text>
                  <View style={styles.expenseAnalysisInsightTip}>
                    <MaterialIcons name="push-pin" size={14} color={insight.color} />
                    <Text style={[styles.expenseAnalysisInsightTipText, { color: insight.color }]}>
                      {insight.tip}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={[styles.expenseAnalysisInsightDescription, { color: themeColors.textSecondary, textAlign: 'center', paddingVertical: 16 }]}>
              Chưa có dữ liệu
            </Text>
          )}
        </View>

        {/* Phân bố chi tiêu - sync categoryStats */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
          <Text
            style={[
              styles.expenseAnalysisSectionTitle,
              { color: themeColors.text },
            ]}>
            Phân bố chi tiêu
          </Text>
          {expenseCategories.length > 0 ? (
            <View style={styles.expenseAnalysisPieChartContainer}>
              <View style={styles.expenseAnalysisPieChartPlaceholder}>
                <PieChart
                  data={expenseCategories.map((c) => ({ percentage: c.percentage, color: c.color }))}
                  size={100}
                />
              </View>
              <View style={styles.expenseAnalysisLegend}>
                {expenseCategories.map((category, index) => (
                  <View key={index} style={styles.expenseAnalysisLegendItem}>
                    <View
                      style={[
                        styles.expenseAnalysisLegendDot,
                        { backgroundColor: category.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.expenseAnalysisLegendName,
                        { color: themeColors.text },
                      ]}>
                      {category.name}
                    </Text>
                    <Text
                      style={[
                        styles.expenseAnalysisLegendPercentage,
                        { color: themeColors.textSecondary },
                      ]}>
                      {category.percentage}%
                    </Text>
                    <Text
                      style={[
                        styles.expenseAnalysisLegendAmount,
                        { color: themeColors.text },
                      ]}>
                      {formatCurrency(category.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={{ color: themeColors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
              Chưa có dữ liệu
            </Text>
          )}
        </View>

        {/* Xu hướng 7 ngày qua - dùng pixel height để tránh lag */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
          <Text
            style={[
              styles.expenseAnalysisSectionTitle,
              { color: themeColors.text },
            ]}>
            Xu hướng 7 ngày qua
          </Text>
          <View style={styles.expenseAnalysisLineChartContainer}>
            <WeeklyTrendChart
              values={displayWeeklyTrend}
              textColor={themeColors.textSecondary}
            />
          </View>
          <Text
            style={[
              styles.expenseAnalysisLineChartSubtitle,
              { color: themeColors.textSecondary },
            ]}>
            {displayWeeklyTrend.some((v) => v > 0)
              ? `Tổng chi tiêu: ${formatCurrency(Math.round(avgDaily))} trung bình/ngày`
              : 'Chưa có dữ liệu chi tiêu 7 ngày qua'}
          </Text>
        </View>

        {/* So sánh kỳ trước - sync từ categoryStats */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
          <Text
            style={[
              styles.expenseAnalysisSectionTitle,
              { color: themeColors.text },
            ]}>
            So sánh kỳ trước
          </Text>
          {comparisons.length > 0 ? (
          comparisons.map((item, index) => {
            const maxValue = Math.max(item.current, item.previous, 1);
            const currentWidth = maxValue > 0 ? (item.current / maxValue) * 100 : 50;
            const previousWidth = maxValue > 0 ? (item.previous / maxValue) * 100 : 50;
            const changeColor = item.change > 0 ? '#EF4444' : item.change < 0 ? '#10B981' : '#99A1AF';
            
            return (
              <View key={index} style={styles.expenseAnalysisComparisonItem}>
                <Text
                  style={[
                    styles.expenseAnalysisComparisonCategory,
                    { color: themeColors.text },
                  ]}>
                  {item.category}
                </Text>
                <View style={styles.expenseAnalysisComparisonBars}>
                  <View style={styles.expenseAnalysisComparisonBarContainer}>
                    <View
                      style={[
                        styles.expenseAnalysisComparisonBar,
                        { width: `${currentWidth}%`, backgroundColor: item.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.expenseAnalysisComparisonValue,
                        { color: themeColors.textSecondary },
                      ]}>
                      {formatCurrency(item.current)}
                    </Text>
                  </View>
                  <View style={styles.expenseAnalysisComparisonBarContainer}>
                    <View
                      style={[
                        styles.expenseAnalysisComparisonBar,
                        {
                          width: `${previousWidth}%`,
                          backgroundColor: item.color + '60',
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.expenseAnalysisComparisonValue,
                        { color: themeColors.textSecondary },
                      ]}>
                      {formatCurrency(item.previous)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.expenseAnalysisComparisonChange, { color: changeColor }]}>
                  {item.change > 0 ? '+' : ''}{item.change}%
                </Text>
              </View>
            );
          })
          ) : (
            <Text style={{ color: themeColors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
              Chưa có dữ liệu
            </Text>
          )}
        </View>

        {/* Gợi ý tiết kiệm */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
          <View style={styles.expenseAnalysisSectionTitleRow}>
            <MaterialIcons name="bolt" size={20} color="#51A2FF" />
            <Text
              style={[
                styles.expenseAnalysisSectionTitle,
                { color: themeColors.text },
              ]}>
              Gợi ý tiết kiệm
            </Text>
          </View>
          {savingTips.length > 0 ? (
            savingTips.map((tip) => (
              <View
                key={tip.id}
                style={[
                  styles.expenseAnalysisSavingTipCard,
                  isLight && {
                    backgroundColor: GlassCardColors.inner,
                    borderWidth: 1,
                    borderColor: themeColors.border,
                  },
                ]}>
                <View style={styles.expenseAnalysisSavingTipIcon}>
                  <Text style={styles.expenseAnalysisSavingTipEmoji}>💡</Text>
                </View>
                <View style={styles.expenseAnalysisSavingTipContent}>
                  <Text
                    style={[
                      styles.expenseAnalysisSavingTipTitle,
                      { color: themeColors.text },
                    ]}>
                    {tip.title}
                  </Text>
                  <Text
                    style={[
                      styles.expenseAnalysisSavingTipDescription,
                      { color: themeColors.textSecondary },
                    ]}>
                    {tip.description}
                  </Text>
                </View>
                <TouchableOpacity style={styles.expenseAnalysisSavingTipButton}>
                  <Text style={styles.expenseAnalysisSavingTipButtonText}>Đã Khắc Phục</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={{ color: themeColors.textSecondary, textAlign: 'center', paddingVertical: 16 }}>
              Chưa có dữ liệu
            </Text>
          )}
        </View>

        {/* Giao dịch bất thường */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
          <View style={styles.expenseAnalysisSectionTitleRow}>
            <MaterialIcons name="warning" size={20} color="#EF4444" />
            <Text
              style={[
                styles.expenseAnalysisSectionTitle,
                { color: themeColors.text },
              ]}>
              Giao dịch bất thường
            </Text>
          </View>
          <View style={styles.expenseAnalysisUnusualTransactionsContainer}>
            {unusualTransactions.length > 0 ? unusualTransactions.map((transaction) => (
              <View
                key={transaction.id}
                style={[
                  styles.expenseAnalysisUnusualTransactionCard,
                  isLight && {
                    backgroundColor: GlassCardColors.inner,
                  },
                ]}>
                <View style={styles.expenseAnalysisUnusualTransactionContent}>
                  <Text
                    style={[
                      styles.expenseAnalysisUnusualTransactionName,
                      { color: themeColors.text },
                    ]}>
                    {transaction.name}
                  </Text>
                  <Text style={styles.expenseAnalysisUnusualTransactionAmount}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <Text
                    style={[
                      styles.expenseAnalysisUnusualTransactionTime,
                      { color: themeColors.textSecondary },
                    ]}>
                    {transaction.time}
                  </Text>
                  <Text
                    style={[
                      styles.expenseAnalysisUnusualTransactionDescription,
                      { color: themeColors.textSecondary },
                    ]}>
                    {transaction.description}
                  </Text>
                </View>
              </View>
            )) : (
              <Text style={{ color: themeColors.textSecondary, textAlign: 'center', paddingVertical: 24 }}>
                Chưa có dữ liệu
              </Text>
            )}
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
