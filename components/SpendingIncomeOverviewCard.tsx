import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';

import { PieChart } from '@/components/PieChart';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { OverviewReportDto } from '@/lib/types/report';
import { styles } from '@/styles/index.styles';

const BAR_CHART_HEIGHT = 96;

interface SpendingIncomeOverviewCardProps {
  overviewData: OverviewReportDto | null;
  overviewLoading: boolean;
  periodLabel: string;
  onOpenPeriodModal: () => void;
  onPressHistory: () => void;
  formatCurrency: (amount: number) => string;
}

export const SpendingIncomeOverviewCard: React.FC<SpendingIncomeOverviewCardProps> = ({
  overviewData,
  overviewLoading,
  periodLabel,
  onOpenPeriodModal,
  onPressHistory,
  formatCurrency,
}) => {
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isLight = resolvedTheme === 'light';
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
  const lightSmallButton = isLight
    ? {
        backgroundColor: themeColors.background,
        borderWidth: 1,
        borderColor: themeColors.border,
      }
    : { backgroundColor: themeColors.background };

  const { incomeHeight, expenseHeight } = useMemo(() => {
    if (!overviewData || (overviewData.totalIncome === 0 && overviewData.totalExpense === 0)) {
      return { incomeHeight: '0%', expenseHeight: '0%' };
    }

    const maxValue = Math.max(overviewData.totalIncome, overviewData.totalExpense) || 1;
    const incomeHeightPct = `${(overviewData.totalIncome / maxValue) * 100}%`;
    const expenseHeightPct = `${(overviewData.totalExpense / maxValue) * 100}%`;

    return { incomeHeight: incomeHeightPct, expenseHeight: expenseHeightPct };
  }, [overviewData]);

  const categoryStats = useMemo(() => {
    return overviewData?.categoryStats || [];
  }, [overviewData?.categoryStats]);

  // Bảng màu mặc định cho donut & legend nếu API không cung cấp màu rõ ràng
  const colorPalette = ['#FACC15', '#FB7185', '#22C55E', '#38BDF8', '#A855F7', '#F97316'];

  // Gán màu theo index, bỏ qua màu trả về từ API để đảm bảo mỗi danh mục có 1 màu riêng
  const decoratedCategories = useMemo(
    () =>
      categoryStats.map((cat, index) => ({
        ...cat,
        displayColor: colorPalette[index % colorPalette.length],
      })),
    [categoryStats]
  );

  const totalIncome = overviewData?.totalIncome ?? 0;
  const totalExpense = overviewData?.totalExpense ?? 0;
  const difference = overviewData?.difference ?? 0;
  const hasData = totalIncome > 0 || totalExpense > 0;
  const hasCategories = decoratedCategories.length > 0;

  // Pixel heights for bar animation (0 when no data)
  const { incomePixel, expensePixel } = useMemo(() => {
    if (!hasData) return { incomePixel: 0, expensePixel: 0 };
    const incomePct = parseFloat(incomeHeight) || 0;
    const expensePct = parseFloat(expenseHeight) || 0;
    return {
      incomePixel: (BAR_CHART_HEIGHT * incomePct) / 100,
      expensePixel: (BAR_CHART_HEIGHT * expensePct) / 100,
    };
  }, [hasData, incomeHeight, expenseHeight]);

  // Bar animation: from bottom up
  const barIncomeProgress = useSharedValue(0);
  const barExpenseProgress = useSharedValue(0);
  const incomeTargetHeight = useSharedValue(0);
  const expenseTargetHeight = useSharedValue(0);

  useEffect(() => {
    incomeTargetHeight.value = incomePixel;
    expenseTargetHeight.value = expensePixel;
    if (hasData) {
      barIncomeProgress.value = 0;
      barExpenseProgress.value = 0;
      barIncomeProgress.value = withSpring(1, { damping: 14, stiffness: 120 });
      barExpenseProgress.value = withDelay(
        100,
        withSpring(1, { damping: 14, stiffness: 120 })
      );
    } else {
      barIncomeProgress.value = withTiming(0);
      barExpenseProgress.value = withTiming(0);
    }
  }, [hasData, incomePixel, expensePixel]);

  const animatedIncomeBarStyle = useAnimatedStyle(() => ({
    height: incomeTargetHeight.value * barIncomeProgress.value,
  }));

  const animatedExpenseBarStyle = useAnimatedStyle(() => ({
    height: expenseTargetHeight.value * barExpenseProgress.value,
  }));

  // Donut animation: scale + rotate when categories appear
  const pieScale = useSharedValue(0);
  const pieRotation = useSharedValue(0);

  useEffect(() => {
    if (hasCategories) {
      pieScale.value = 0;
      pieRotation.value = 0;
      pieScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      pieRotation.value = withTiming(2 * Math.PI, { duration: 450 });
    } else {
      pieScale.value = withTiming(0);
      pieRotation.value = withTiming(0);
    }
  }, [hasCategories]);

  const animatedPieStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: pieScale.value },
      { rotate: `${pieRotation.value}rad` },
    ],
  }));

  return (
    <View style={[styles.card, styles.darkCard, { backgroundColor: themeColors.card }, lightCardSurface]}>
      <View style={styles.overviewHeader}>
        <Text style={[styles.overviewTitle, { color: themeColors.text }]}>Tình hình thu chi</Text>
        <View style={styles.overviewActions}>
          <TouchableOpacity style={[styles.overviewButton, lightSmallButton]}>
            <MaterialIcons name="settings" size={16} color={themeColors.icon} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.overviewDropdown, lightSmallButton]} onPress={onOpenPeriodModal}>
            <Text style={[styles.overviewDropdownText, { color: themeColors.textSecondary }]}>{periodLabel}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color={themeColors.icon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Nội dung chính của card */}
      <View style={{ position: 'relative' }}>
        <>
          {/* Summary Stats */}
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Thu</Text>
              <Text style={[styles.summaryValue, styles.incomeValue]}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={[styles.summaryStat, { alignItems: 'center' }]}>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Chi</Text>
              <Text style={[styles.summaryValue, styles.expenseValue]}>
                {formatCurrency(totalExpense)}
              </Text>
            </View>
            <View style={[styles.summaryStat, { alignItems: 'flex-end' }]}>
              <Text style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Chênh lệch</Text>
              <Text style={[styles.summaryValue, styles.differenceValue, { color: themeColors.text }]}>
                {difference >= 0 ? '+' : ''}
                {formatCurrency(difference)}
              </Text>
            </View>
          </View>

          {/* Bar Chart - ẩn khi chưa có data */}
          {hasData && (
            <View style={styles.chartContainer}>
              <View style={styles.barChart}>
                <Animated.View
                  style={[
                    styles.bar,
                    styles.incomeBar,
                    animatedIncomeBarStyle,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.bar,
                    styles.expenseBar,
                    animatedExpenseBarStyle,
                  ]}
                />
              </View>
            </View>
          )}

          {/* Pie Chart + Legend / Empty state */}
          <View style={styles.pieChartSection}>
            {hasCategories ? (
              <>
                <View style={styles.pieChartPlaceholder}>
                  <Animated.View style={animatedPieStyle}>
                    <PieChart
                      data={decoratedCategories.map((cat) => ({
                        percentage: cat.percentage,
                        color: cat.displayColor,
                      }))}
                      size={130}
                      strokeWidth={26}
                      innerRadiusRatio={0.55}
                    />
                  </Animated.View>
                </View>
                <View style={styles.legend}>
                  {decoratedCategories.map((category, index) => (
                    <View key={category.categoryId || index} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: category.displayColor },
                        ]}
                      />
                      <Text numberOfLines={1} style={[styles.legendName, { color: themeColors.text }]}>
                        {category.categoryName}
                      </Text>
                      <Text style={[styles.legendPercentage, { color: themeColors.textSecondary }]}>
                        {category.percentage.toFixed(2).replace('.', ',')}%
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={[styles.emptyStateContainer, { flex: 1 }]}>
                <View style={styles.emptyStateContent}>
                  <View style={styles.emptyStateIcon}>
                    <MaterialIcons
                      name="pie-chart"
                      size={44}
                      color={themeColors.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      styles.emptyStateText,
                      { color: themeColors.textSecondary },
                    ]}
                  >
                    Chưa có giao dịch trong kỳ này
                  </Text>
                </View>
              </View>
            )}
          </View>
        </>

        {overviewLoading && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.12)',
              borderRadius: 12,
            }}>
            <ActivityIndicator size="small" color={themeColors.tint} />
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.historyButton} onPress={onPressHistory}>
        <Text style={[styles.historyButtonText, { color: themeColors.tint }]}>Lịch sử ghi chép</Text>
      </TouchableOpacity>
    </View>
  );
};

