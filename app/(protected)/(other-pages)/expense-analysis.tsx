import { styles } from '@/styles/index.styles';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

type TimePeriod = 'week' | 'month' | 'year';

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

export default function ExpenseAnalysisScreen() {
  const router = useRouter();
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('month');

  // Mock data
  const totalExpense = 12300000;
  const expenseChange = 18;
  const expenseChangeAmount = 1200000;

  const aiInsights: AIInsight[] = [
    {
      id: 1,
      type: 'warning',
      title: 'Chỉ tiêu ăn uống tăng 18%',
      description: 'Bạn đã chi 4.5 triệu cho ăn uống tháng này, tăng 700k so với tháng trước. Điều này là do sinh nhật người thân.',
      tip: 'Nếu thử tại nhà cưới tiệm đồ tốt kiệm -500k/tháng',
      color: '#FF6900'
    },
    {
      id: 2,
      type: 'warning',
      title: 'Shopping vượt ngân sách 28%',
      description: 'Chi tiêu mua sắm cao bất thường, chủ yếu là quần áo và mỹ phẩm.',
      tip: 'Áp dụng duy trì 24k: Chờ 24 tiếng trước khi mua để tránh mua impulsive',
      color: '#EF4444'
    },
    {
      id: 3,
      type: 'success',
      title: 'Tiết kiệm được chi phí di chuyển',
      description: 'Giảm 8% chi phí đi lại nhờ sử dụng xe bus thay vì Grab.',
      tip: 'Tiếp tục duy trì bạn đã tiết kiệm được 200k tháng này.',
      color: '#10B981'
    }
  ];

  const expenseCategories: ExpenseCategory[] = [
    { name: 'Ăn uống', percentage: 36, amount: 4500000, color: '#EF4444' },
    { name: 'Shopping', percentage: 26, amount: 3290000, color: '#FF6900' },
    { name: 'Di chuyển', percentage: 17, amount: 2100000, color: '#51A2FF' },
    { name: 'Nhà cửa', percentage: 12, amount: 1500000, color: '#22D3EE' },
    { name: 'Giải trí', percentage: 6, amount: 800000, color: '#F6339A' },
    { name: 'Khác', percentage: 3, amount: 200000, color: '#A78BFA' }
  ];

  const weeklyTrend = [120000, 150000, 180000, 140000, 160000, 130000, 110000];
  const avgDaily = 574000;

  const comparisons: ComparisonItem[] = [
    { category: 'Ăn uống', current: 3800000, previous: 4500000, change: 18, color: '#EF4444' },
    { category: 'Shopping', current: 2100000, previous: 3290000, change: 28, color: '#FF6900' },
    { category: 'Di chuyển', current: 2300000, previous: 2100000, change: -9, color: '#51A2FF' },
    { category: 'Nhà cửa', current: 1500000, previous: 1500000, change: 0, color: '#22D3EE' }
  ];

  const savingTips: SavingTip[] = [
    {
      id: 1,
      title: 'Cắt giảm ăn uống ngoài',
      description: 'Nấu 3-4 bữa ăn ở nhà mỗi tuần có thể tiết kiệm 500.000đ/tháng',
      savings: 500000
    },
    {
      id: 2,
      title: 'Giảm shopping không cần thiết',
      description: 'Áp dụng "luật 24 giờ" trước khi mua để tiết kiệm 350.000đ/tháng',
      savings: 350000
    },
    {
      id: 3,
      title: 'Pha cà phê tại nhà',
      description: 'Thay vì mua cà phê ngoài, tự pha tại nhà tiết kiệm 280.000đ/tháng',
      savings: 280000
    }
  ];

  const unusualTransactions: UnusualTransaction[] = [
    {
      id: 1,
      name: 'Nhà hàng ABC',
      amount: 890000,
      time: '17:25PM',
      description: 'Cao hơn 3x so với mức chi tiêu trung bình'
    },
    {
      id: 2,
      name: 'Mua giày Nike',
      amount: 1200000,
      time: '14:32PM',
      description: 'Giao dịch lớn bất thường'
    }
  ];

  const maxTrendValue = Math.max(...weeklyTrend);

  const handleBack = () => {
    router.replace('/(protected)/(tabs)/report');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.expenseAnalysisHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.expenseAnalysisBackButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.expenseAnalysisHeaderCenter}>
            <Text style={styles.expenseAnalysisTitle}>Phân tích chi tiêu</Text>
            <Text style={styles.expenseAnalysisSubtitle}>Powered by AI</Text>
          </View>
          <View style={styles.expenseAnalysisTabs}>
            <TouchableOpacity
              style={[styles.expenseAnalysisTab, activePeriod === 'week' && styles.expenseAnalysisTabActive]}
              onPress={() => setActivePeriod('week')}>
              <Text style={[styles.expenseAnalysisTabText, activePeriod === 'week' && styles.expenseAnalysisTabTextActive]}>
                Tuần này
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.expenseAnalysisTab, activePeriod === 'month' && styles.expenseAnalysisTabActive]}
              onPress={() => setActivePeriod('month')}>
              <Text style={[styles.expenseAnalysisTabText, activePeriod === 'month' && styles.expenseAnalysisTabTextActive]}>
                Tháng này
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.expenseAnalysisTab, activePeriod === 'year' && styles.expenseAnalysisTabActive]}
              onPress={() => setActivePeriod('year')}>
              <Text style={[styles.expenseAnalysisTabText, activePeriod === 'year' && styles.expenseAnalysisTabTextActive]}>
                Năm nay
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Tổng chi tiêu */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#F6339A', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.expenseAnalysisTotalCard}>
            <View style={styles.expenseAnalysisTotalCardHeader}>
              <View style={styles.expenseAnalysisTotalCardLeft}>
                <MaterialIcons name="show-chart" size={20} color="#FFFFFF" />
                <Text style={styles.expenseAnalysisTotalCardLabel}>Tổng chi tiêu</Text>
              </View>
              <View style={styles.expenseAnalysisBadge}>
                <Text style={styles.expenseAnalysisBadgeText}>+{expenseChange}%</Text>
              </View>
            </View>
            <Text style={styles.expenseAnalysisTotalAmount}>{formatCurrency(totalExpense)}</Text>
            <Text style={styles.expenseAnalysisTotalSubtitle}>
              So với tháng trước: +{formatCurrency(expenseChangeAmount)}
            </Text>
          </LinearGradient>
        </View>

        {/* AI Insights */}
        <View style={[styles.card, styles.darkCard]}>
          <View style={styles.expenseAnalysisSectionHeader}>
            <View style={styles.expenseAnalysisSectionTitleRow}>
              <MaterialIcons name="bolt" size={20} color="#51A2FF" />
              <Text style={styles.expenseAnalysisSectionTitle}>AI Insights</Text>
            </View>
            <TouchableOpacity style={styles.expenseAnalysisSmartButton}>
              <Text style={styles.expenseAnalysisSmartButtonText}>Smart</Text>
            </TouchableOpacity>
          </View>

          {aiInsights.map((insight) => (
            <View key={insight.id} style={[styles.expenseAnalysisInsightCard, { borderLeftColor: insight.color }]}>
              <View style={[styles.expenseAnalysisInsightIcon, { backgroundColor: insight.color + '20' }]}>
                <MaterialIcons 
                  name={insight.type === 'success' ? 'trending-down' : 'trending-up'} 
                  size={20} 
                  color={insight.color} 
                />
              </View>
              <View style={styles.expenseAnalysisInsightContent}>
                <Text style={styles.expenseAnalysisInsightTitle}>{insight.title}</Text>
                <Text style={styles.expenseAnalysisInsightDescription}>{insight.description}</Text>
                <View style={styles.expenseAnalysisInsightTip}>
                  <MaterialIcons name="push-pin" size={14} color={insight.color} />
                  <Text style={[styles.expenseAnalysisInsightTipText, { color: insight.color }]}>
                    {insight.tip}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Phân bố chi tiêu */}
        <View style={[styles.card, styles.darkCard]}>
          <Text style={styles.expenseAnalysisSectionTitle}>Phân bố chi tiêu</Text>
          <View style={styles.expenseAnalysisPieChartContainer}>
            <View style={styles.expenseAnalysisPieChartPlaceholder}>
              {/* Placeholder for pie chart */}
              <View style={styles.expenseAnalysisPieChartCircle} />
            </View>
            <View style={styles.expenseAnalysisLegend}>
              {expenseCategories.map((category, index) => (
                <View key={index} style={styles.expenseAnalysisLegendItem}>
                  <View style={[styles.expenseAnalysisLegendDot, { backgroundColor: category.color }]} />
                  <Text style={styles.expenseAnalysisLegendName}>{category.name}</Text>
                  <Text style={styles.expenseAnalysisLegendPercentage}>{category.percentage}%</Text>
                  <Text style={styles.expenseAnalysisLegendAmount}>{formatCurrency(category.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Xu hướng 7 ngày qua */}
        <View style={[styles.card, styles.darkCard]}>
          <Text style={styles.expenseAnalysisSectionTitle}>Xu hướng 7 ngày qua</Text>
          <View style={styles.expenseAnalysisLineChartContainer}>
            <View style={styles.expenseAnalysisLineChart}>
              {weeklyTrend.map((value, index) => {
                const height = (value / maxTrendValue) * 100;
                const days = ['T3', 'T4', 'T5', 'T6', 'T7', 'CN', 'T2'];
                return (
                  <View key={index} style={styles.expenseAnalysisLineChartPoint}>
                    <View style={[styles.expenseAnalysisLineChartBar, { height: `${height}%` }]} />
                    <Text style={styles.expenseAnalysisLineChartLabel}>{days[index]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <Text style={styles.expenseAnalysisLineChartSubtitle}>
            Tổng chi tiêu: {formatCurrency(avgDaily)} trung bình
          </Text>
        </View>

        {/* So sánh tháng trước */}
        <View style={[styles.card, styles.darkCard]}>
          <Text style={styles.expenseAnalysisSectionTitle}>So sánh tháng trước</Text>
          {comparisons.map((item, index) => {
            const maxValue = Math.max(item.current, item.previous);
            const currentWidth = (item.current / maxValue) * 100;
            const previousWidth = (item.previous / maxValue) * 100;
            const changeColor = item.change > 0 ? '#EF4444' : item.change < 0 ? '#10B981' : '#99A1AF';
            
            return (
              <View key={index} style={styles.expenseAnalysisComparisonItem}>
                <Text style={styles.expenseAnalysisComparisonCategory}>{item.category}</Text>
                <View style={styles.expenseAnalysisComparisonBars}>
                  <View style={styles.expenseAnalysisComparisonBarContainer}>
                    <View style={[styles.expenseAnalysisComparisonBar, { width: `${currentWidth}%`, backgroundColor: item.color }]} />
                    <Text style={styles.expenseAnalysisComparisonValue}>{formatCurrency(item.current)}</Text>
                  </View>
                  <View style={styles.expenseAnalysisComparisonBarContainer}>
                    <View style={[styles.expenseAnalysisComparisonBar, { width: `${previousWidth}%`, backgroundColor: item.color + '60' }]} />
                    <Text style={styles.expenseAnalysisComparisonValue}>{formatCurrency(item.previous)}</Text>
                  </View>
                </View>
                <Text style={[styles.expenseAnalysisComparisonChange, { color: changeColor }]}>
                  {item.change > 0 ? '+' : ''}{item.change}%
                </Text>
              </View>
            );
          })}
        </View>

        {/* Gợi ý tiết kiệm */}
        <View style={[styles.card, styles.darkCard]}>
          <View style={styles.expenseAnalysisSectionTitleRow}>
            <MaterialIcons name="bolt" size={20} color="#51A2FF" />
            <Text style={styles.expenseAnalysisSectionTitle}>Gợi ý tiết kiệm</Text>
          </View>
          {savingTips.map((tip) => (
            <View key={tip.id} style={styles.expenseAnalysisSavingTipCard}>
              <View style={styles.expenseAnalysisSavingTipIcon}>
                <Text style={styles.expenseAnalysisSavingTipEmoji}>💡</Text>
              </View>
              <View style={styles.expenseAnalysisSavingTipContent}>
                <Text style={styles.expenseAnalysisSavingTipTitle}>{tip.title}</Text>
                <Text style={styles.expenseAnalysisSavingTipDescription}>{tip.description}</Text>
              </View>
              <TouchableOpacity style={styles.expenseAnalysisSavingTipButton}>
                <Text style={styles.expenseAnalysisSavingTipButtonText}>Đã Khắc Phục</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Giao dịch bất thường */}
        <View style={[styles.card, styles.darkCard]}>
          <View style={styles.expenseAnalysisSectionTitleRow}>
            <MaterialIcons name="warning" size={20} color="#EF4444" />
            <Text style={styles.expenseAnalysisSectionTitle}>Giao dịch bất thường</Text>
          </View>
          <View style={styles.expenseAnalysisUnusualTransactionsContainer}>
            {unusualTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.expenseAnalysisUnusualTransactionCard}>
                <View style={styles.expenseAnalysisUnusualTransactionContent}>
                  <Text style={styles.expenseAnalysisUnusualTransactionName}>{transaction.name}</Text>
                  <Text style={styles.expenseAnalysisUnusualTransactionAmount}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <Text style={styles.expenseAnalysisUnusualTransactionTime}>{transaction.time}</Text>
                  <Text style={styles.expenseAnalysisUnusualTransactionDescription}>
                    {transaction.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
