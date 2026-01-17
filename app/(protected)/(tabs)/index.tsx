import { useUser } from '@clerk/clerk-expo';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { styles } from '@/styles/index.styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

// Format ngày tháng
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
};

export default function HomeScreen() {
  const { user } = useUser();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [aiInput, setAiInput] = useState('');

  // Mock data
  const totalBalance = 24815000;
  const today = new Date();
  const income = 18500000;
  const expense = 12340000;
  const difference = income - expense;
  const spendingLimit = 15000000;
  const spendingUsed = 12340000; // 82%
  const dailySaving = 173000;
  const daysRemaining = 182;
  const todaySuggestion = 369000;
  const avgDaily = 472000;
  const totalSpent = 8500000;

  const categories = [
    { name: 'Ăn uống', percentage: 35.2, color: '#FBBF24' },
    { name: 'Dịch vụ sinh hoạt', percentage: 24.5, color: '#F87171' },
    { name: 'Phát triển bản thân', percentage: 15.8, color: '#34D399' },
    { name: 'Tiền ra', percentage: 10.3, color: '#A78BFA' },
    { name: 'Hướng thu', percentage: 8.6, color: '#22D3EE' },
    { name: 'Các mục khác', percentage: 5.6, color: '#FB923C' },
  ];

  const tips = [
    'Tiết kiệm 173k cho iPhone 17 Pro Max',
    'Nấu ăn tại nhà thay vì ăn ngoài',
  ];


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
    <SafeAreaView style={styles.safeArea}>
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
              <Text style={styles.greetingText}>Xin chào!</Text>
              <Text style={styles.userNameText}>{getUserName()}</Text>
            </View>
          </View>
          
          {/* Status Bar Icons - Right */}
          <View style={styles.statusBarIcons}>
            <TouchableOpacity style={styles.statusIconButton}>
              <LinearGradient
                colors={['#9810FA', '#155DFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.statusIconGradient}>
                <MaterialIcons name="grid-view" size={16} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statusIconButton, styles.statusIconDark]}>
              <MaterialIcons name="chat-bubble-outline" size={16} color="#99A1AF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.statusIconButton, styles.statusIconDark]}>
              <MaterialIcons name="notifications-none" size={16} color="#99A1AF" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceLabel}>Tổng số dư</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>
              {balanceVisible ? formatCurrency(totalBalance) : '•••••••'}
            </Text>
            <TouchableOpacity
              onPress={() => setBalanceVisible(!balanceVisible)}
              style={styles.eyeButton}>
              <MaterialIcons
                name={balanceVisible ? 'visibility' : 'visibility-off'}
                size={20}
                color="#99A1AF"
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
        <View style={[styles.card, styles.darkCard]}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Tình hình thu chi</Text>
            <View style={styles.overviewActions}>
              <TouchableOpacity style={styles.overviewButton}>
                <MaterialIcons name="settings" size={16} color="#99A1AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.overviewDropdown}>
                <Text style={styles.overviewDropdownText}>Tháng này</Text>
                <MaterialIcons name="keyboard-arrow-down" size={16} color="#99A1AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary Stats */}
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>Thu</Text>
              <Text style={[styles.summaryValue, styles.incomeValue]}>
                {formatCurrency(income)}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>Chi</Text>
              <Text style={[styles.summaryValue, styles.expenseValue]}>
                {formatCurrency(expense)}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryLabel}>Chênh lệch</Text>
              <Text style={[styles.summaryValue, styles.incomeValue]}>
                +{formatCurrency(difference)}
              </Text>
            </View>
          </View>

          {/* Bar Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.barChart}>
              <View style={[styles.bar, styles.incomeBar, { height: '70%' }]} />
              <View style={[styles.bar, styles.expenseBar, { height: '50%' }]} />
            </View>
          </View>

          {/* Pie Chart Legend */}
          <View style={styles.pieChartSection}>
            <View style={styles.pieChartPlaceholder}>
              {/* Placeholder for pie chart - can be replaced with actual chart library */}
              <View style={styles.pieChartCircle} />
            </View>
            <View style={styles.legend}>
              {categories.map((category, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: category.color }]} />
                  <Text style={styles.legendName}>{category.name}</Text>
                  <Text style={styles.legendPercentage}>{category.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.historyButton}>
            <Text style={styles.historyButtonText}>Lịch sử ghi chép</Text>
          </TouchableOpacity>
        </View>

        {/* Spending Limit Card */}
        <View style={[styles.card, styles.darkCard]}>
          <View style={styles.limitHeader}>
            <Text style={styles.limitTitle}>Hạn mức chi</Text>
            <View style={styles.limitActions}>
              <TouchableOpacity style={styles.limitButton}>
                <MaterialIcons name="settings" size={16} color="#99A1AF" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.limitLink}>Xem tất cả →</Text>
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
              <Text style={styles.limitLabel}>Chi mỗi month</Text>
              <Text style={styles.limitDate}>01/10 - 31/10</Text>
              <Text style={styles.limitAmount}>{formatCurrency(spendingLimit)}</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <LinearGradient
                colors={['#FF8904', '#FB2C36']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${(spendingUsed / spendingLimit) * 100}%` }]}
              />
            </View>
          </View>

          <View style={styles.todayBox}>
            <Text style={styles.todayText}>Hôm nay</Text>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
