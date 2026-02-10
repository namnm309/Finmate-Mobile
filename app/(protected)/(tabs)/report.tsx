import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { styles } from '@/styles/index.styles';

// Format số tiền VNĐ
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

// Format tên tháng
const getMonthName = (monthIndex: number): string => {
  const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  return months[monthIndex] || `Tháng ${monthIndex + 1}`;
};

export default function ReportScreen() {
  const router = useRouter();
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

  // Mock data
  const currentBalance = 24815000;
  const totalAssets = 26450000;
  const totalDebt = 1635000;

  // Dữ liệu 5 tháng gần nhất (từ tháng 6 đến tháng 10)
  const monthlyData = [
    { month: 5, income: 18500000, expense: 12340000 }, // Tháng 6
    { month: 6, income: 21000000, expense: 15000000 }, // Tháng 7
    { month: 7, income: 19500000, expense: 18000000 }, // Tháng 8
    { month: 8, income: 22000000, expense: 16500000 }, // Tháng 9
    { month: 9, income: 20000000, expense: 14000000 }, // Tháng 10
  ];

  // Tính max value để scale biểu đồ
  const maxValue = Math.max(
    ...monthlyData.flatMap(m => [m.income, m.expense])
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.reportHeader}>
          <Text style={[styles.reportHeaderTitle, { color: themeColors.text }]}>Báo cáo</Text>
        </View>

        {/* Card Tài chính hiện tại */}
        <View style={styles.card}>
          <LinearGradient
            colors={['#009966', '#008236']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reportCurrentFinanceCard}>
            <Text style={[styles.reportCurrentFinanceTitle, { color: '#d0fae5' }]}>Tài chính hiện tại</Text>
            <Text style={styles.reportCurrentBalance}>{formatCurrency(currentBalance)}</Text>
            
            <View style={styles.reportFinanceBoxes}>
              <TouchableOpacity style={styles.reportFinanceBox}>
                <View style={styles.reportFinanceBoxContent}>
                  <Text style={styles.reportFinanceBoxLabel}>Tổng có</Text>
                  <Text style={styles.reportFinanceBoxValue}>{formatCurrency(totalAssets)}</Text>
                </View>
                <MaterialIcons name="keyboard-arrow-up" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.reportFinanceBox}>
                <View style={styles.reportFinanceBoxContent}>
                  <Text style={styles.reportFinanceBoxLabel}>Tổng nợ</Text>
                  <Text style={styles.reportFinanceBoxValue}>{formatCurrency(totalDebt)}</Text>
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
            <TouchableOpacity style={styles.reportViewDetailButton}>
              <Text style={[styles.reportViewDetailText, { color: themeColors.tint }]}>Xem chi tiết</Text>
            </TouchableOpacity>
          </View>

          {/* Biểu đồ cột 5 tháng */}
          <View style={styles.reportBarChartContainer}>
            <View style={styles.reportBarChart}>
              {monthlyData.map((data, index) => (
                <View key={index} style={styles.reportBarChartMonth}>
                  <View style={styles.reportBarChartBars}>
                    <View
                      style={[
                        styles.reportBar,
                        styles.reportIncomeBar,
                        { height: `${(data.income / maxValue) * 100}%` }
                      ]}
                    />
                    <View
                      style={[
                        styles.reportBar,
                        styles.reportExpenseBar,
                        { height: `${(data.expense / maxValue) * 100}%` }
                      ]}
                    />
                  </View>
                  <Text style={[styles.reportBarChartMonthLabel, { color: themeColors.textSecondary }]}>
                    {getMonthName(data.month)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Thông báo trạng thái */}
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
              Chi tiêu tháng trước bằng 0, chưa có dữ liệu so sánh
            </Text>
          </View>
        </View>

        {/* Lưới 6 ô chức năng */}
        <View style={styles.reportFunctionsGrid}>
          {functions.map((func) => {
            const handlePress = () => {
              if (func.id === 1) {
                // Phân tích chi tiêu
                router.push('/(protected)/(other-pages)/expense-analysis');
              } else if (func.id === 6) {
                // Phân tích tài chính
                router.push('/(protected)/(other-pages)/financial-analysis');
              }
              // Các chức năng khác có thể thêm sau
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
