import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { loadDebtEntries } from '@/lib/storage/debtStorage';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useReportService } from '@/lib/services/reportService';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const BAR_MAX_HEIGHT = 120;

const ReportBarChart = React.memo(function ReportBarChart({
  data,
  hasAnyData,
  loading,
  textColor,
  tintColor,
}: {
  data: { month: number; income: number; expense: number }[];
  hasAnyData: boolean;
  loading: boolean;
  textColor: string;
  tintColor: string;
}) {
  const barHeights = useMemo(() => {
    const maxVal = hasAnyData ? Math.max(1, ...data.flatMap((m) => [m.income, m.expense])) : 1;
    const h = hasAnyData ? (v: number) => (v / maxVal) * BAR_MAX_HEIGHT : () => BAR_MAX_HEIGHT * 0.5;
    return data.map((d) => ({
      month: d.month,
      income: Math.max(4, h(d.income)),
      expense: Math.max(4, h(d.expense)),
    }));
  }, [data, hasAnyData]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 48, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={tintColor} />
      </View>
    );
  }

  return (
    <View style={styles.reportBarChart}>
      {barHeights.map((item, index) => (
        <View key={`${item.month}-${index}`} style={styles.reportBarChartMonth}>
          <View style={styles.reportBarChartBars}>
            <View
              style={[
                styles.reportBar,
                styles.reportIncomeBar,
                { height: item.income },
              ]}
            />
            <View
              style={[
                styles.reportBar,
                styles.reportExpenseBar,
                { height: item.expense },
              ]}
            />
          </View>
          <Text style={[styles.reportBarChartMonthLabel, { color: textColor }]}>
            {['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
              'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'][item.month] ?? `Tháng ${item.month + 1}`}
          </Text>
        </View>
      ))}
    </View>
  );
});

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/styles/index.styles';

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

// Lấy start/end của tháng (offset: 0 = tháng hiện tại, -1 = tháng trước, ...)
const getMonthRange = (offset: number): { start: Date; end: Date } => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

export default function ReportScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isLight = resolvedTheme === 'light';
  const { getGroupedMoneySources } = useMoneySourceService();
  const { getOverview } = useReportService();
  const getGroupedMoneySourcesRef = useRef(getGroupedMoneySources);
  getGroupedMoneySourcesRef.current = getGroupedMoneySources;

  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [totalDebt, setTotalDebt] = useState<number>(0);
  const [financeLoading, setFinanceLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ month: number; income: number; expense: number }[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);
  const overviewLoadedOnceRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const lastOverviewFetchRef = useRef(0);
  const THROTTLE_MS = 2000;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const now = Date.now();
      const shouldShowLoading = !hasLoadedOnceRef.current;
      if (shouldShowLoading) setFinanceLoading(true);

      if (now - lastFetchTimeRef.current < THROTTLE_MS && hasLoadedOnceRef.current) {
        setFinanceLoading(false);
        return;
      }
      lastFetchTimeRef.current = now;

      const fetchFn = getGroupedMoneySourcesRef.current;
      Promise.all([
        fetchFn().then((r) => (cancelled ? 0 : r.totalBalance ?? 0)),
        loadDebtEntries().then((entries) =>
          cancelled ? 0 : entries.reduce((sum, e) => sum + e.amount, 0)
        ),
      ])
        .then(([assets, debt]) => {
          if (!cancelled) {
            setTotalAssets(assets);
            setTotalDebt(debt);
            hasLoadedOnceRef.current = true;
          }
        })
        .catch(() => {
          if (!cancelled) {
            setTotalAssets(0);
            setTotalDebt(0);
            hasLoadedOnceRef.current = true;
          }
        })
        .finally(() => {
          if (!cancelled) setFinanceLoading(false);
        });
      return () => { cancelled = true; };
    }, [])
  );

  // Sync 5 tháng gần nhất từ API (throttle để giảm lag)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const now = Date.now();
      if (now - lastOverviewFetchRef.current < THROTTLE_MS && overviewLoadedOnceRef.current) {
        setOverviewLoading(false);
        return;
      }
      lastOverviewFetchRef.current = now;
      setOverviewLoading(true);
      const ranges = [-4, -3, -2, -1, 0].map((offset) => {
        const { start, end } = getMonthRange(offset);
        return { start, end, monthIndex: new Date(start).getMonth(), year: new Date(start).getFullYear() };
      });
      Promise.all(
        ranges.map((r) =>
          getOverview(r.start, r.end).then((ov) =>
            cancelled ? null : { month: r.monthIndex, income: ov.totalIncome ?? 0, expense: ov.totalExpense ?? 0 }
          )
        )
      )
        .then((results) => {
          if (!cancelled && results.every((r) => r !== null)) {
            setMonthlyData(results as { month: number; income: number; expense: number }[]);
            overviewLoadedOnceRef.current = true;
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMonthlyData([]);
            overviewLoadedOnceRef.current = true;
          }
        })
        .finally(() => {
          if (!cancelled) setOverviewLoading(false);
        });
      return () => { cancelled = true; };
    }, [getOverview])
  );

  const currentBalance = totalAssets - totalDebt;

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

  // Dữ liệu 5 tháng từ state (sync API) - memo để tránh re-render chart
  const displayData = useMemo(() => {
    if (monthlyData.length === 5) return monthlyData;
    const indices = [-4, -3, -2, -1, 0].map((o) => {
      const d = new Date();
      d.setMonth(d.getMonth() + o);
      return d.getMonth();
    });
    return indices.map((month) => ({ month, income: 0, expense: 0 }));
  }, [monthlyData]);
  const hasAnyData = useMemo(
    () => displayData.some((m) => m.income > 0 || m.expense > 0),
    [displayData]
  );
  // 6 chức năng phân tích
  const functions = [
    { id: 1, icon: 'show-chart', label: 'Phân tích chi tiêu', color: '#51A2FF' },
    { id: 2, icon: 'trending-up', label: 'Phân tích thu', color: '#51A2FF' },
    { id: 3, icon: 'swap-horiz', label: 'Theo dõi vay nợ', color: '#51A2FF' },
    { id: 4, icon: 'people', label: 'Đối tượng thu/chi', color: '#51A2FF' },
    { id: 5, icon: 'event', label: 'Chuyến đi/Sự kiện', color: '#51A2FF' },
    { id: 6, icon: 'assessment', label: 'Phân tích tài chính', color: '#51A2FF' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent', flex: 1, width: SCREEN_WIDTH, minWidth: SCREEN_WIDTH }]} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.reportHeader}>
          <Text style={[styles.reportHeaderTitle, { color: themeColors.text }]}>Báo cáo</Text>
        </View>

        {/* Card Tài chính hiện tại - sync Tài khoản & Vay nợ */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#009966', '#008236']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reportCurrentFinanceCard}>
            <Text style={[styles.reportCurrentFinanceTitle, { color: '#d0fae5' }]}>Tài chính hiện tại</Text>
            {financeLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginVertical: 8 }} />
            ) : (
              <Text style={styles.reportCurrentBalance}>{formatCurrency(currentBalance)}</Text>
            )}
            
            <View style={styles.reportFinanceBoxes}>
              <TouchableOpacity
                style={styles.reportFinanceBox}
                onPress={() => router.push('/(protected)/(tabs)/account')}
                activeOpacity={0.8}>
                <View style={styles.reportFinanceBoxContent}>
                  <Text style={styles.reportFinanceBoxLabel}>Tổng có</Text>
                  {financeLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.reportFinanceBoxValue}>{formatCurrency(totalAssets)}</Text>
                  )}
                </View>
                <MaterialIcons name="keyboard-arrow-up" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportFinanceBox}
                onPress={() => router.push('/(protected)/(other-pages)/debt-tracking')}
                activeOpacity={0.8}>
                <View style={styles.reportFinanceBoxContent}>
                  <Text style={styles.reportFinanceBoxLabel}>Tổng nợ</Text>
                  {financeLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.reportFinanceBoxValue}>{formatCurrency(totalDebt)}</Text>
                  )}
                </View>
                <MaterialIcons name="keyboard-arrow-up" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Card Tình hình thu chi */}
        <View style={[styles.card, styles.darkCard, { backgroundColor: themeColors.card }, lightCardSurface]}>
          <View style={styles.reportIncomeExpenseHeader}>
            <View>
              <Text style={[styles.reportIncomeExpenseTitle, { color: themeColors.text }]}>Tình hình thu chi</Text>
              <Text style={[styles.reportIncomeExpenseSubtitle, { color: themeColors.textSecondary }]}>5 tháng gần nhất</Text>
            </View>
            <TouchableOpacity
              style={styles.reportViewDetailButton}
              onPress={() => router.push('/(protected)/(other-pages)/expense-analysis')}
              activeOpacity={0.7}>
              <Text style={[styles.reportViewDetailText, { color: themeColors.tint }]}>Xem chi tiết</Text>
            </TouchableOpacity>
          </View>

          {/* Biểu đồ cột 5 tháng - dùng pixel height để tránh lag */}
          <View style={styles.reportBarChartContainer}>
            <ReportBarChart
              data={displayData}
              hasAnyData={hasAnyData}
              loading={overviewLoading}
              textColor={themeColors.textSecondary}
              tintColor={themeColors.tint}
            />
          </View>

          {/* Thông báo trạng thái - sync theo dữ liệu */}
          <View
            style={[
              styles.reportStatusMessage,
              isLight && {
                backgroundColor: themeColors.card,
                borderWidth: 1,
                borderColor: themeColors.border,
              },
            ]}>
            <Text style={[styles.reportStatusMessageText, { color: themeColors.textSecondary }]}>
              {!hasAnyData
                ? 'Chưa có dữ liệu thu chi để hiển thị'
                : displayData.length >= 2 && displayData[displayData.length - 2].expense === 0
                  ? 'Chi tiêu tháng trước bằng 0, chưa có dữ liệu so sánh'
                  : 'Dữ liệu đồng bộ từ giao dịch của bạn'}
            </Text>
          </View>
        </View>

        {/* Lưới 6 ô chức năng */}
        <View style={styles.reportFunctionsGrid}>
          {functions.map((func) => {
            const handlePress = () => {
              if (func.id === 1) router.push('/(protected)/(other-pages)/expense-analysis');
              else if (func.id === 2) router.push('/(protected)/(other-pages)/income-analysis');
              else if (func.id === 3) router.push('/(protected)/(other-pages)/debt-tracking');
              else if (func.id === 4) router.push('/(protected)/(other-pages)/counterparty-analysis');
              else if (func.id === 5) router.push('/(protected)/(other-pages)/trip-event');
              else if (func.id === 6) router.push('/(protected)/(other-pages)/financial-analysis');
            };
            
            return (
              <TouchableOpacity 
                key={func.id} 
                style={[styles.reportFunctionCard, { backgroundColor: themeColors.card }, lightCardSurface]}
                onPress={handlePress}>
                <View style={[styles.reportFunctionIconContainer, { backgroundColor: func.color + '20' }]}>
                  <MaterialIcons name={func.icon as any} size={24} color={func.color} />
                </View>
                <Text style={[styles.reportFunctionLabel, { color: isLight ? '#364153' : themeColors.text }]}>{func.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
