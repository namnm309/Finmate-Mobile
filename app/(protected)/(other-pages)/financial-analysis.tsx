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

type InsightTab = 'smart' | 'recommendations';

interface HealthScoreFactor {
  name: string;
  score: number;
  maxScore: number;
  color: string;
}

interface AIInsight {
  id: number;
  type: 'excellent' | 'improve' | 'potential' | 'growth';
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
  const [activeTab, setActiveTab] = useState<InsightTab>('smart');

  // Mock data
  const healthScore = 72;
  const healthScoreFactors: HealthScoreFactor[] = [
    { name: 'Tỷ lệ tiết kiệm', score: 80, maxScore: 100, color: '#10B981' },
    { name: 'Quản lý nợ', score: 70, maxScore: 100, color: '#51A2FF' },
    { name: 'Duy trì chi tiêu', score: 60, maxScore: 100, color: '#FF6900' },
    { name: 'Dự phòng', score: 95, maxScore: 100, color: '#A78BFA' }
  ];

  const aiInsights: AIInsight[] = [
    {
      id: 1,
      type: 'excellent',
      title: 'Tuyệt vời',
      description: 'Tỷ lệ tiết kiệm 35.4% của bạn cao hơn 75% người dùng khác.',
      icon: 'trending-up',
      color: '#10B981'
    },
    {
      id: 2,
      type: 'improve',
      title: 'Cần cải thiện',
      description: 'Quỹ khẩn cấp chỉ đủ chi tiêu 3 tháng. Mục tiêu cần đạt là 6 tháng.',
      icon: 'trending-up',
      color: '#FF6900'
    },
    {
      id: 3,
      type: 'potential',
      title: 'Tiềm năng',
      description: 'Nếu giảm 15% chi tiêu không cần thiết, bạn có thể tiết kiệm thêm 1.5M triệu/tháng.',
      icon: 'star',
      color: '#FBBF24'
    },
    {
      id: 4,
      type: 'growth',
      title: 'Tăng trưởng tốt',
      description: 'Tài sản ròng tăng 8.9% so với tháng trước, vượt mục tiêu 5%.',
      icon: 'trending-up',
      color: '#10B981'
    }
  ];

  const financialMetrics: FinancialMetric[] = [
    {
      id: 1,
      label: 'Tỷ lệ tiết kiệm',
      value: '35.4%',
      change: '+2.5% so với tháng trước',
      changeColor: '#10B981',
      icon: 'account-balance-wallet',
      iconColor: '#10B981'
    },
    {
      id: 2,
      label: 'Tài sản ròng',
      value: formatCurrency(24815000),
      change: '+4.7%',
      changeColor: '#10B981',
      icon: 'attach-money',
      iconColor: '#51A2FF'
    },
    {
      id: 3,
      label: 'Thu nhập ròng',
      value: formatCurrency(19200000),
      icon: 'trending-up',
      iconColor: '#FF6900'
    },
    {
      id: 4,
      label: 'Chi tiêu ròng',
      value: formatCurrency(18000000),
      subtitle: '5 tháng chi phí',
      icon: 'trending-down',
      iconColor: '#EF4444'
    }
  ];

  const growthData = [18500000, 20000000, 21500000, 23000000, 24000000, 24815000];
  const growthLabels = ['1s', '16', '17', '18', '19', 'T10'];
  const maxGrowthValue = Math.max(...growthData);
  const growthChange = 24.1;
  const growthAmount = 6315000;

  const goalProgresses: GoalProgress[] = [
    { id: 1, name: 'Quỹ khẩn cấp', current: 15000000, target: 20000000, progress: 80, color: '#51A2FF' },
    { id: 2, name: 'Mua nhà (giao dịch)', current: 50000000, target: 200000000, progress: 24, color: '#51A2FF' },
    { id: 3, name: 'Dự trữ năm sau', current: 10000000, target: 10000000, progress: 100, color: '#10B981' }
  ];

  const aiRecommendations: AIRecommendation[] = [
    {
      id: 1,
      title: 'Tăng quỹ khẩn cấp',
      description: 'Quỹ khẩn cấp hiện tại chỉ đủ 3 tháng. Khuyến nghị tăng lên 6 tháng để đảm bảo an toàn tài chính.',
      action: 'Tiết kiệm thêm 5 triệu trong 3 tháng tới',
      icon: 'error',
      iconColor: '#EF4444',
      buttonText: 'Tìm hiểu thêm',
      buttonColor: '#FF6900'
    },
    {
      id: 2,
      title: 'Bắt đầu đầu tư',
      description: 'Với tỷ lệ tiết kiệm 35.4%, bạn có thể bắt đầu đầu tư để tăng trưởng tài sản.',
      action: 'Xem các kênh đầu tư phù hợp',
      icon: 'attach-money',
      iconColor: '#FBBF24',
      buttonText: 'Tìm hiểu thêm',
      buttonColor: '#FF6900'
    },
    {
      id: 3,
      title: 'Tiết chế chi tiêu',
      description: 'Chi tiêu shopping tăng 28% so với tháng trước. Cần kiểm soát tốt hơn.',
      action: 'Áp dụng quy tắc 24 giờ trước khi mua',
      icon: 'shopping-cart',
      iconColor: '#FF6900',
      buttonText: 'Tìm hiểu thêm',
      buttonColor: '#FF6900'
    },
    {
      id: 4,
      title: 'Tự động hóa tiết kiệm',
      description: 'Thiết lập chuyển tiền tự động vào tài khoản tiết kiệm mỗi tháng.',
      action: 'Thiết lập ngay',
      icon: 'schedule',
      iconColor: '#10B981',
      buttonText: 'Thiết lập',
      buttonColor: '#10B981'
    }
  ];

  const aiPredictions: AIPrediction[] = [
    {
      id: 1,
      label: 'Tài sản ròng sau 6 tháng',
      value: formatCurrency(28500000),
      change: '+8%',
      confidence: 95
    },
    {
      id: 2,
      label: 'Tổng tiết kiệm sau 1 năm',
      value: formatCurrency(81600000),
      change: '+12%',
      confidence: 70
    },
    {
      id: 3,
      label: 'Thời gian đạt quỹ khẩn cấp',
      value: '6 tháng',
      confidence: 90
    }
  ];

  const handleBack = () => {
    router.replace({
      pathname: '/(protected)/(tabs)/report',
      params: { __replace: 'pop' },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.financialAnalysisHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.financialAnalysisBackButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.financialAnalysisHeaderCenter}>
            <Text style={styles.financialAnalysisTitle}>Phân tích tài chính</Text>
            <Text style={styles.financialAnalysisSubtitle}>AI-Powered Analysis</Text>
          </View>
          <TouchableOpacity style={styles.financialAnalysisSettingsButton}>
            <MaterialIcons name="settings" size={24} color="#FFFFFF" />
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
                <Text style={styles.financialAnalysisHealthScoreTitle}>Điểm sức khỏe tài chính</Text>
              </View>
              <TouchableOpacity style={styles.financialAnalysisRestoreButton}>
                <Text style={styles.financialAnalysisRestoreButtonText}>Khôi phục</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.financialAnalysisHealthScoreSubtitle}>Dựa trên 4 yếu tố chính</Text>
            
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
                    <Text style={styles.financialAnalysisHealthScoreFactorName}>{factor.name}</Text>
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
        <View style={[styles.card, styles.darkCard]}>
          <View style={styles.financialAnalysisSectionHeader}>
            <View style={styles.financialAnalysisSectionTitleRow}>
              <MaterialIcons name="bolt" size={20} color="#51A2FF" />
              <Text style={styles.financialAnalysisSectionTitle}>AI Insights</Text>
            </View>
            <View style={styles.financialAnalysisInsightTabs}>
              <TouchableOpacity
                style={[styles.financialAnalysisInsightTab, activeTab === 'smart' && styles.financialAnalysisInsightTabActive]}
                onPress={() => setActiveTab('smart')}>
                <Text style={[styles.financialAnalysisInsightTabText, activeTab === 'smart' && styles.financialAnalysisInsightTabTextActive]}>
                  Smart Analysis
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.financialAnalysisInsightTab, activeTab === 'recommendations' && styles.financialAnalysisInsightTabActive]}
                onPress={() => setActiveTab('recommendations')}>
                <Text style={[styles.financialAnalysisInsightTabText, activeTab === 'recommendations' && styles.financialAnalysisInsightTabTextActive]}>
                  Recommendations
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {aiInsights.map((insight) => (
            <View key={insight.id} style={styles.financialAnalysisInsightCard}>
              <View style={[styles.financialAnalysisInsightIcon, { backgroundColor: insight.color + '20' }]}>
                <MaterialIcons name={insight.icon as any} size={20} color={insight.color} />
              </View>
              <View style={styles.financialAnalysisInsightContent}>
                <Text style={styles.financialAnalysisInsightTitle}>{insight.title}</Text>
                <Text style={styles.financialAnalysisInsightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Số liệu tổng quan */}
        <View style={styles.financialAnalysisMetricsGrid}>
          {financialMetrics.map((metric) => (
            <View key={metric.id} style={styles.financialAnalysisMetricCard}>
              <View style={[styles.financialAnalysisMetricIcon, { backgroundColor: metric.iconColor + '20' }]}>
                <MaterialIcons name={metric.icon as any} size={24} color={metric.iconColor} />
              </View>
              <Text style={styles.financialAnalysisMetricValue}>{metric.value}</Text>
              <Text style={styles.financialAnalysisMetricLabel}>{metric.label}</Text>
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

        {/* Tăng trưởng tài sản ròng */}
        <View style={[styles.card, styles.darkCard]}>
          <Text style={styles.financialAnalysisSectionTitle}>Tăng trưởng tài sản ròng</Text>
          <View style={styles.financialAnalysisGrowthChartContainer}>
            <View style={styles.financialAnalysisGrowthChart}>
              {growthData.map((value, index) => {
                const height = (value / maxGrowthValue) * 100;
                return (
                  <View key={index} style={styles.financialAnalysisGrowthChartPoint}>
                    <View style={[styles.financialAnalysisGrowthChartBar, { height: `${height}%` }]} />
                    <Text style={styles.financialAnalysisGrowthChartLabel}>{growthLabels[index]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.financialAnalysisGrowthSummary}>
            <Text style={styles.financialAnalysisGrowthSummaryText}>
              Tăng trưởng: <Text style={styles.financialAnalysisGrowthSummaryValue}>+{growthChange}%</Text>
            </Text>
            <Text style={[styles.financialAnalysisGrowthSummaryAmount, { color: '#10B981' }]}>
              +{formatCurrency(growthAmount)}
            </Text>
          </View>
        </View>

        {/* Tiến độ mục tiêu */}
        <View style={[styles.card, styles.darkCard]}>
          <Text style={styles.financialAnalysisSectionTitle}>Tiến độ mục tiêu</Text>
          {goalProgresses.map((goal) => (
            <View key={goal.id} style={styles.financialAnalysisGoalProgressCard}>
              <View style={styles.financialAnalysisGoalProgressHeader}>
                <Text style={styles.financialAnalysisGoalProgressName}>{goal.name}</Text>
                <Text style={styles.financialAnalysisGoalProgressPercentage}>{goal.progress}%</Text>
              </View>
              <View style={styles.financialAnalysisGoalProgressBarContainer}>
                <View style={styles.financialAnalysisGoalProgressBarTrack}>
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
              <Text style={styles.financialAnalysisGoalProgressAmount}>
                {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
              </Text>
            </View>
          ))}
        </View>

        {/* Khuyến nghị từ AI */}
        <View style={[styles.card, styles.darkCard]}>
          <View style={styles.financialAnalysisSectionTitleRow}>
            <MaterialIcons name="bolt" size={20} color="#51A2FF" />
            <Text style={styles.financialAnalysisSectionTitle}>Khuyến nghị từ AI</Text>
          </View>
          {aiRecommendations.map((recommendation) => (
            <View key={recommendation.id} style={styles.financialAnalysisRecommendationCard}>
              <View style={[styles.financialAnalysisRecommendationIcon, { backgroundColor: recommendation.iconColor + '20' }]}>
                <MaterialIcons name={recommendation.icon as any} size={24} color={recommendation.iconColor} />
              </View>
              <View style={styles.financialAnalysisRecommendationContent}>
                <Text style={styles.financialAnalysisRecommendationTitle}>{recommendation.title}</Text>
                <Text style={styles.financialAnalysisRecommendationDescription}>{recommendation.description}</Text>
                <Text style={styles.financialAnalysisRecommendationAction}>{recommendation.action}</Text>
              </View>
              <TouchableOpacity 
                style={[styles.financialAnalysisRecommendationButton, { backgroundColor: recommendation.buttonColor }]}>
                <Text style={styles.financialAnalysisRecommendationButtonText}>{recommendation.buttonText}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Dự đoán AI */}
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

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
