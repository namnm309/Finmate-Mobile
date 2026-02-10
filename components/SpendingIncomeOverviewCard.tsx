import React, { useMemo } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { PieChart } from '@/components/PieChart';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { OverviewReportDto } from '@/lib/types/report';
import { styles } from '@/styles/index.styles';

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

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.barChart}>
              <View style={[styles.bar, styles.incomeBar, { height: incomeHeight }]} />
              <View style={[styles.bar, styles.expenseBar, { height: expenseHeight }]} />
            </View>
          </View>

          {/* Pie Chart + Legend */}
          <View style={styles.pieChartSection}>
            <View style={styles.pieChartPlaceholder}>
              {decoratedCategories.length > 0 ? (
                <PieChart
                  data={decoratedCategories.map((cat) => ({
                    percentage: cat.percentage,
                    color: cat.displayColor,
                  }))}
                  size={130}
                  strokeWidth={26}
                  innerRadiusRatio={0.55}
                />
              ) : (
                <View style={styles.pieChartCircle} />
              )}
            </View>
            <View style={styles.legend}>
              {decoratedCategories.length > 0 ? (
                decoratedCategories.map((category, index) => (
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
                ))
              ) : (
                <Text style={{ color: themeColors.textSecondary, fontSize: 12 }}>Chưa có dữ liệu</Text>
              )}
            </View>
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

