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
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { styles } from '@/styles/index.styles';

interface SavingGoal {
  id: string;
  title: string;
  category: string;
  currentAmount: number;
  targetAmount: number;
  progress: number; // percentage
  daysRemaining: number;
  dailyAmount: number;
}

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

// Mock data
const mockGoal: SavingGoal = {
  id: '1',
  title: 'iPhone 17 Pro Max',
  category: 'Điện tử',
  currentAmount: 8500000,
  targetAmount: 40000000,
  progress: 21.3,
  daysRemaining: 53,
  dailyAmount: 594340,
};

export default function SavingGoalsScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const [goal, setGoal] = useState<SavingGoal>(mockGoal);
  const totalGoals = 1;
  const activeGoals = 1;

  const handleBack = () => {
    router.push('/(protected)/(tabs)/other');
  };

  const handleQuickAdd = (amount: number) => {
    setGoal({
      ...goal,
      currentAmount: Math.min(goal.currentAmount + amount, goal.targetAmount),
      progress: Math.min(
        ((goal.currentAmount + amount) / goal.targetAmount) * 100,
        100
      ),
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.savingGoalsHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.savingGoalsBackButton}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={styles.savingGoalsHeaderCenter}>
            <View style={styles.savingGoalsHeaderIcon}>
              <MaterialIcons name="track-changes" size={24} color={themeColors.text} />
            </View>
            <Text style={[styles.savingGoalsTitle, { color: themeColors.text }]}>Mục tiêu tiết kiệm</Text>
            <Text style={[styles.savingGoalsSubtitle, { color: themeColors.textSecondary }]}>Theo dõi & đạt được mục tiêu</Text>
          </View>
          <TouchableOpacity style={styles.savingGoalsAddButton}>
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        <View style={styles.savingGoalsSummaryStats}>
          <View style={styles.savingGoalsSummaryCard}>
            <Text style={styles.savingGoalsSummaryLabel}>Tổng mục tiêu</Text>
            <Text style={styles.savingGoalsSummaryValue}>{totalGoals}</Text>
          </View>
          <View style={styles.savingGoalsSummaryCard}>
            <Text style={styles.savingGoalsSummaryLabel}>Đang theo đuổi</Text>
            <Text style={styles.savingGoalsSummaryValue}>{activeGoals}</Text>
          </View>
        </View>

        {/* Goal Card */}
        <View style={styles.savingGoalCard}>
          <View style={styles.savingGoalCardHeader}>
            <View style={styles.savingGoalCardHeaderLeft}>
              <Text style={styles.savingGoalCardTitle}>{goal.title}</Text>
              <Text style={styles.savingGoalCardCategory}>{goal.category}</Text>
            </View>
            <TouchableOpacity style={styles.savingGoalCardDelete}>
              <MaterialIcons name="delete-outline" size={20} color="#99A1AF" />
            </TouchableOpacity>
          </View>

          {/* Progress Section */}
          <View style={styles.savingGoalProgressSection}>
            <View style={styles.savingGoalProgressHeader}>
              <Text style={styles.savingGoalProgressLabel}>Tiến độ</Text>
              <Text style={styles.savingGoalProgressPercentage}>{goal.progress.toFixed(1)}%</Text>
            </View>
            <View style={styles.savingGoalProgressBar}>
              <View style={styles.savingGoalProgressBarTrack}>
                <LinearGradient
                  colors={['#51A2FF', '#155DFC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.savingGoalProgressBarFill,
                    { width: `${goal.progress}%` }
                  ]}
                />
              </View>
            </View>
            <View style={styles.savingGoalAmountRow}>
              <Text style={styles.savingGoalCurrentAmount}>
                {formatCurrency(goal.currentAmount)}
              </Text>
              <Text style={styles.savingGoalTargetAmount}>
                {formatCurrency(goal.targetAmount)}
              </Text>
            </View>
          </View>

          {/* Metrics */}
          <View style={styles.savingGoalMetrics}>
            <View style={styles.savingGoalMetricCard}>
              <MaterialIcons name="calendar-today" size={20} color="#51A2FF" />
              <Text style={styles.savingGoalMetricLabel}>Còn lại</Text>
              <Text style={styles.savingGoalMetricValue}>{goal.daysRemaining} ngày</Text>
            </View>
            <View style={styles.savingGoalMetricCard}>
              <MaterialIcons name="trending-up" size={20} color="#00D492" />
              <Text style={styles.savingGoalMetricLabel}>Mỗi ngày</Text>
              <Text style={styles.savingGoalMetricValue}>{formatCurrency(goal.dailyAmount)}</Text>
            </View>
          </View>

          {/* Quick Add Buttons */}
          <View style={styles.savingGoalQuickAddButtons}>
            <TouchableOpacity
              style={styles.savingGoalQuickAddButton}
              onPress={() => handleQuickAdd(100000)}>
              <Text style={styles.savingGoalQuickAddButtonText}>+ 100k</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.savingGoalQuickAddButton}
              onPress={() => handleQuickAdd(500000)}>
              <Text style={styles.savingGoalQuickAddButtonText}>+ 500k</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.savingGoalQuickAddButton}
              onPress={() => handleQuickAdd(1000000)}>
              <LinearGradient
                colors={['#9810FA', '#155DFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.savingGoalQuickAddButtonGradient}>
                <Text style={styles.savingGoalQuickAddButtonTextGradient}>+ 1tr</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
