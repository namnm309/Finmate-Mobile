import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { styles } from '@/styles/index.styles';
import { useUser } from '@clerk/clerk-expo';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Mock data - có thể kết nối API sau
const stats = {
  transactions: 248,
  categories: 12,
  goals: 78, // percentage
};

// Menu items data
const accountMenuItems = [
  {
    id: 1,
    title: 'Cài đặt tài khoản',
    icon: 'settings',
    color: '#51A2FF',
  },
  {
    id: 2,
    title: 'Bảo mật',
    icon: 'security',
    color: '#00D492',
  },
  {
    id: 3,
    title: 'Thông báo',
    icon: 'notifications',
    color: '#FBBF24',
  },
  {
    id: 4,
    title: 'Giao diện',
    icon: 'dark-mode',
    color: '#16a34a',
  },
];

const utilityMenuItems = [
  {
    id: 1,
    title: 'Mục tiêu tiết kiệm',
    icon: 'track-changes',
    color: '#F6339A',
  },
  {
    id: 2,
    title: 'Cộng đồng',
    icon: 'forum',
    color: '#00D492',
  },
  {
    id: 3,
    title: 'Gợi ý kiếm tiền',
    icon: 'trending-up',
    color: '#00D492',
  },
  {
    id: 4,
    title: 'Quản lý thẻ',
    icon: 'credit-card',
    color: '#9810FA',
  },
  {
    id: 5,
    title: 'Chia sẻ ngân sách',
    icon: 'people',
    color: '#F6339A',
  },
  {
    id: 6,
    title: 'Xuất báo cáo',
    icon: 'description',
    color: '#22D3EE',
  },
];

const supportMenuItems = [
  {
    id: 1,
    title: 'Trợ giúp',
    icon: 'help-outline',
    color: '#FBBF24',
  },
  {
    id: 2,
    title: 'Đánh giá ứng dụng',
    icon: 'star-outline',
    color: '#FF6900',
  },
  {
    id: 3,
    title: 'Chia sẻ ứng dụng',
    icon: 'share',
    color: '#00D492',
  },
  {
    id: 4,
    title: 'Ngôn ngữ',
    icon: 'language',
    color: '#9810FA',
    subtext: 'Tiếng Việt',
  },
  {
    id: 5,
    title: 'Lấy token Swagger',
    icon: 'code',
    color: '#22D3EE',
  },
];

export default function OtherScreen() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isLight = resolvedTheme === 'light';
  const groupCardStyle = isLight
    ? {
        backgroundColor: themeColors.card,
        borderWidth: 1,
        borderColor: themeColors.border,
        borderRadius: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        overflow: 'hidden' as const,
      }
    : {
        backgroundColor: themeColors.card,
        borderRadius: 14,
        overflow: 'hidden' as const,
      };
  const rowBaseStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  };

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

  const getUserEmail = () => {
    return user?.emailAddresses?.[0]?.emailAddress || 'user@email.com';
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleNavigateToCommunity = () => {
    router.push('/(protected)/(other-pages)/community');
  };

  const handleNavigateToSavingGoals = () => {
    router.push('/(protected)/(other-pages)/saving-goals');
  };

  const handleNavigateToInvestment = () => {
    router.push('/(protected)/(other-pages)/investment-suggestions');
  };

  const handleNavigateToAccountSettings = () => {
    router.push('/(protected)/(other-pages)/account-settings');
  };

  const handleAccountMenuItemPress = (itemId: number) => {
    switch (itemId) {
      case 1: // Cài đặt tài khoản
        handleNavigateToAccountSettings();
        break;
      case 2: // Bảo mật
        // TODO: Navigate to security settings
        break;
      case 3: // Thông báo
        // TODO: Navigate to notification settings
        break;
      case 4: // Giao diện
        router.push('/(protected)/(other-pages)/theme-settings');
        break;
      default:
        break;
    }
  };

  const handleMenuItemPress = (itemId: number) => {
    switch (itemId) {
      case 1: // Mục tiêu tiết kiệm
        handleNavigateToSavingGoals();
        break;
      case 2: // Cộng đồng
        handleNavigateToCommunity();
        break;
      case 3: // Gợi ý kiếm tiền
        handleNavigateToInvestment();
        break;
      default:
        break;
    }
  };

  const handleSupportMenuItemPress = async (itemId: number) => {
    if (itemId === 5) {
      // Lấy token Swagger
      try {
        const token = await getToken({ template: 'swagger-test' });
        if (token) {
          await Clipboard.setStringAsync(token);
          Alert.alert(
            'Đã copy token',
            'Token đã được copy. Mở Swagger → Authorize → Dán (Bearer token).'
          );
        } else {
          Alert.alert(
            'Lỗi',
            'Không lấy được token. Kiểm tra đăng nhập và template Clerk.'
          );
        }
      } catch (error) {
        console.error('Error getting Swagger token:', error);
        Alert.alert(
          'Lỗi',
          'Không lấy được token. Kiểm tra đăng nhập và template Clerk.'
        );
      }
    }
    // Các item khác (Trợ giúp, Đánh giá, Chia sẻ ứng dụng, Ngôn ngữ) có thể xử lý sau
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.otherHeader}>
          <Text style={[styles.otherTitle, { color: themeColors.text }]}>Khác</Text>
        </View>

        {/* User Info Card */}
        <TouchableOpacity style={styles.otherUserCard} activeOpacity={0.8}>
          <LinearGradient
            colors={[themeColors.tint, themeColors.success2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.otherUserCardGradient}>
            <View style={styles.otherUserInfo}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarBorder}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarGradient}>
                    <Text style={styles.avatarText}>{getUserInitial()}</Text>
                  </LinearGradient>
                </View>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userNameText}>{getUserName()}</Text>
                <Text style={styles.greetingText}>{getUserEmail()}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Account Section */}
        <View style={styles.otherSection}>
          <Text style={[styles.otherSectionTitle, { color: themeColors.textSecondary, fontWeight: '400', fontSize: 12.9 } ]}>Tài khoản</Text>
          <View style={groupCardStyle}>
            {accountMenuItems.map((item, idx) => {
              const isLast = idx === accountMenuItems.length - 1;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[rowBaseStyle, !isLast && { borderBottomWidth: 1, borderBottomColor: themeColors.border }]}
                  activeOpacity={0.7}
                  onPress={() => handleAccountMenuItemPress(item.id)}>
                  <View style={[styles.otherMenuItemIcon, { backgroundColor: item.color }]}>
                    <MaterialIcons name={item.icon as any} size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.otherMenuItemContent}>
                    <Text style={[styles.otherMenuItemText, { color: themeColors.text }]}>{item.title}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={themeColors.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Utility Section */}
        <View style={styles.otherSection}>
          <Text style={[styles.otherSectionTitle, { color: themeColors.textSecondary, fontWeight: '400', fontSize: 12.8 } ]}>Tiện ích</Text>
          <View style={groupCardStyle}>
            {utilityMenuItems.map((item, idx) => {
              const isLast = idx === utilityMenuItems.length - 1;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[rowBaseStyle, !isLast && { borderBottomWidth: 1, borderBottomColor: themeColors.border }]}
                  activeOpacity={0.7}
                  onPress={() => handleMenuItemPress(item.id)}>
                  <View style={[styles.otherMenuItemIcon, { backgroundColor: item.color }]}>
                    <MaterialIcons name={item.icon as any} size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.otherMenuItemContent}>
                    <Text style={[styles.otherMenuItemText, { color: themeColors.text }]}>{item.title}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={themeColors.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.otherSection}>
          <Text style={[styles.otherSectionTitle, { color: themeColors.textSecondary, fontWeight: '400', fontSize: 12.9 } ]}>Hỗ trợ</Text>
          <View style={groupCardStyle}>
            {supportMenuItems.map((item, idx) => {
              const isLast = idx === supportMenuItems.length - 1;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[rowBaseStyle, !isLast && { borderBottomWidth: 1, borderBottomColor: themeColors.border }]}
                  activeOpacity={0.7}
                  onPress={() => handleSupportMenuItemPress(item.id)}>
                  <View style={[styles.otherMenuItemIcon, { backgroundColor: item.color }]}>
                    <MaterialIcons name={item.icon as any} size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.otherMenuItemContent}>
                    <Text style={[styles.otherMenuItemText, { color: themeColors.text }]}>{item.title}</Text>
                    {item.subtext && (
                      <Text style={[styles.otherMenuItemSubtext, { color: themeColors.muted }]}>{item.subtext}</Text>
                    )}
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={themeColors.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.otherLogoutButton, { backgroundColor: themeColors.card }]}
          onPress={handleLogout}
          activeOpacity={0.7}>
          <View style={styles.otherLogoutButtonContent}>
            <MaterialIcons name="exit-to-app" size={20} color="#FB2C36" />
            <Text style={styles.otherLogoutText}>Đăng xuất</Text>
          </View>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
