import { useUser } from '@clerk/clerk-expo';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { styles } from '@/styles/index.styles';
import { useUserService } from '@/lib/services/userService';
import { UserResponse } from '@/lib/types/user';
import { useAuth } from '@/hooks/use-auth';

// Mock data cho thống kê
const accountStats = {
  totalTransactions: 248,
  categories: 12,
  goalProgress: 78,
  daysUsed: 45,
};

// Helper function để format date từ ISO string sang DD/MM/YYYY
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Chưa cập nhật';
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return 'Chưa cập nhật';
  }
};

// Helper function để format date từ DD/MM/YYYY sang ISO string
const parseDateToISO = (dateString: string): string | undefined => {
  if (!dateString) return undefined;
  try {
    const [day, month, year] = dateString.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toISOString();
  } catch {
    return undefined;
  }
};

export default function AccountSettingsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { signOut } = useAuth();
  const { getUserProfile, updateUserProfile, deleteUserData, deleteUserAccount } = useUserService();
  
  // State management
  const [userData, setUserData] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<{ key: string; label: string; value: string; isDate?: boolean } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Fetch user data khi component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserProfile();
        setUserData(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Không thể tải thông tin người dùng';
        setError(errorMessage);
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Helper functions
  const getUserInitial = (): string => {
    if (userData?.fullName) {
      return userData.fullName[0].toUpperCase();
    }
    if (user?.firstName) return user.firstName[0].toUpperCase();
    if (user?.emailAddresses?.[0]?.emailAddress) {
      return user.emailAddresses[0].emailAddress[0].toUpperCase();
    }
    return 'U';
  };

  const getUserFullName = (): string => {
    if (userData?.fullName) {
      return userData.fullName;
    }
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) return user.firstName;
    if (user?.emailAddresses?.[0]?.emailAddress) {
      return user.emailAddresses[0].emailAddress.split('@')[0];
    }
    return 'Nguyễn Văn A';
  };

  const getMemberSince = (): string => {
    if (userData?.createdAt) {
      const date = new Date(userData.createdAt);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return `Thành viên từ tháng ${month}/${year}`;
    }
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return `Thành viên từ tháng ${month}/${year}`;
  };

  const handleBack = () => {
    router.push('/(protected)/(tabs)/other');
  };

  const refreshUserData = async () => {
    try {
      const data = await getUserProfile();
      setUserData(data);
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  };

  const handleEdit = () => {
    // Navigate to edit screen hoặc hiển thị edit modal
    Alert.alert('Chỉnh sửa', 'Nhấn vào từng mục để chỉnh sửa');
  };

  const handleInfoItemPress = (field: string, currentValue: string) => {
    const fieldMap: Record<string, { key: keyof UserResponse; label: string; isDate?: boolean }> = {
      'Họ và tên': { key: 'fullName', label: 'Họ và tên' },
      'Số điện thoại': { key: 'phoneNumber', label: 'Số điện thoại' },
      'Địa chỉ': { key: 'address', label: 'Địa chỉ' },
      'Ngày sinh': { key: 'dateOfBirth', label: 'Ngày sinh', isDate: true },
      'Nghề nghiệp': { key: 'occupation', label: 'Nghề nghiệp' },
    };

    const fieldInfo = fieldMap[field];
    if (!fieldInfo) {
      Alert.alert('Thông báo', 'Không thể chỉnh sửa trường này');
      return;
    }

    // Email không thể edit
    if (field === 'Email') {
      Alert.alert('Thông báo', 'Email được quản lý bởi Clerk, không thể chỉnh sửa tại đây');
      return;
    }

    // Mở modal để edit
    setEditingField({
      key: fieldInfo.key as string,
      label: fieldInfo.label,
      value: currentValue === 'Chưa cập nhật' ? '' : currentValue,
      isDate: fieldInfo.isDate,
    });
    setEditValue(currentValue === 'Chưa cập nhật' ? '' : currentValue);
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;

    if (!editValue || editValue.trim() === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập giá trị');
      return;
    }

    try {
      setUpdating(true);
      const updateData: any = {};
      
      if (editingField.isDate) {
        // Validate date format DD/MM/YYYY
        const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dateRegex.test(editValue)) {
          Alert.alert('Lỗi', 'Vui lòng nhập ngày theo định dạng DD/MM/YYYY');
          setUpdating(false);
          return;
        }
        updateData[editingField.key] = parseDateToISO(editValue);
      } else {
        updateData[editingField.key] = editValue.trim();
      }

      await updateUserProfile(updateData);
      await refreshUserData();
      setEditingField(null);
      setEditValue('');
      Alert.alert('Thành công', 'Đã cập nhật thông tin');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể cập nhật thông tin';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Xóa tất cả dữ liệu',
      'Bạn có chắc chắn muốn xóa toàn bộ giao dịch và cài đặt? Hành động này không thể hoàn tác.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await deleteUserData();
              await refreshUserData();
              Alert.alert('Thành công', 'Đã xóa tất cả dữ liệu');
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Không thể xóa dữ liệu';
              Alert.alert('Lỗi', errorMessage);
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xóa tài khoản',
      'Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của bạn? Hành động này không thể hoàn tác.',
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa tài khoản',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await deleteUserAccount();
              Alert.alert('Thành công', 'Tài khoản đã được xóa. Bạn sẽ được đăng xuất.');
              // Sign out và redirect về login
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Không thể xóa tài khoản';
              Alert.alert('Lỗi', errorMessage);
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const accountInfoItems = [
    {
      id: 1,
      label: 'Họ và tên',
      value: getUserFullName(),
      icon: 'person',
      iconColor: '#51A2FF',
    },
    {
      id: 2,
      label: 'Email',
      value: userData?.email || user?.emailAddresses?.[0]?.emailAddress || 'user@email.com',
      icon: 'email',
      iconColor: '#51A2FF',
    },
    {
      id: 3,
      label: 'Số điện thoại',
      value: userData?.phoneNumber || 'Chưa cập nhật',
      icon: 'phone',
      iconColor: '#51A2FF',
    },
    {
      id: 4,
      label: 'Địa chỉ',
      value: userData?.address || 'Chưa cập nhật',
      icon: 'location-on',
      iconColor: '#51A2FF',
    },
    {
      id: 5,
      label: 'Ngày sinh',
      value: formatDate(userData?.dateOfBirth),
      icon: 'calendar-today',
      iconColor: '#51A2FF',
    },
    {
      id: 6,
      label: 'Nghề nghiệp',
      value: userData?.occupation || 'Chưa cập nhật',
      icon: 'business',
      iconColor: '#51A2FF',
    },
  ];

  const statCards = [
    {
      id: 1,
      value: accountStats.totalTransactions.toString(),
      label: 'Tổng giao dịch',
      color: '#51A2FF',
    },
    {
      id: 2,
      value: accountStats.categories.toString(),
      label: 'Danh mục',
      color: '#9810FA',
    },
    {
      id: 3,
      value: `${accountStats.goalProgress}%`,
      label: 'Tiến độ mục tiêu',
      color: '#00D492',
    },
    {
      id: 4,
      value: accountStats.daysUsed.toString(),
      label: 'Ngày sử dụng',
      color: '#EF4444',
    },
  ];

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#51A2FF" />
          <Text style={{ marginTop: 16, color: '#FFFFFF' }}>Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !userData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#EF4444', marginBottom: 16, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                setLoading(true);
                setError(null);
                const data = await getUserProfile();
                setUserData(data);
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Không thể tải thông tin người dùng';
                setError(errorMessage);
              } finally {
                setLoading(false);
              }
            }}
            style={{
              backgroundColor: '#51A2FF',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}>
            <Text style={{ color: '#FFFFFF' }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.accountSettingsHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.accountSettingsBackButton}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.accountSettingsHeaderCenter}>
            <Text style={styles.accountSettingsTitle}>Cài đặt tài khoản</Text>
          </View>
          <TouchableOpacity 
            onPress={handleEdit} 
            style={styles.accountSettingsEditButton}
            disabled={updating}>
            {updating ? (
              <ActivityIndicator size="small" color="#51A2FF" />
            ) : (
              <MaterialIcons name="edit" size={24} color="#51A2FF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.accountSettingsProfileSection}>
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
          <Text style={styles.accountSettingsProfileName}>{getUserFullName()}</Text>
          <Text style={styles.accountSettingsMemberSince}>{getMemberSince()}</Text>
        </View>

        {/* Account Information Section */}
        <View style={styles.accountSettingsSection}>
          <Text style={styles.accountSettingsSectionTitle}>Thông tin tài khoản</Text>
          <View style={styles.accountSettingsInfoContainer}>
            {accountInfoItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.accountSettingsInfoItem}
                activeOpacity={0.7}
                onPress={() => handleInfoItemPress(item.label, item.value)}
                disabled={updating}>
                <View style={[styles.accountSettingsInfoIcon, { backgroundColor: item.iconColor }]}>
                  <MaterialIcons name={item.icon as any} size={20} color="#FFFFFF" />
                </View>
                <View style={styles.accountSettingsInfoContent}>
                  <Text style={styles.accountSettingsInfoLabel}>{item.label}</Text>
                  <Text style={styles.accountSettingsInfoValue}>{item.value}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#99A1AF" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Account Statistics Section */}
        <View style={styles.accountSettingsSection}>
          <Text style={styles.accountSettingsSectionTitle}>Thống kê tài khoản</Text>
          <View style={styles.accountSettingsStatsGrid}>
            {statCards.map((card) => (
              <View
                key={card.id}
                style={[styles.accountSettingsStatCard, { backgroundColor: card.color }]}>
                <Text style={styles.accountSettingsStatValue}>{card.value}</Text>
                <Text style={styles.accountSettingsStatLabel}>{card.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.accountSettingsSection}>
          <Text style={styles.accountSettingsSectionTitle}>Khu vực nguy hiểm</Text>
          <View style={styles.accountSettingsDangerZone}>
            <TouchableOpacity
              style={styles.accountSettingsDangerItem}
              activeOpacity={0.7}
              onPress={handleDeleteAllData}
              disabled={updating}>
              <View style={styles.accountSettingsDangerContent}>
                <Text style={styles.accountSettingsDangerLabel}>Xóa tất cả dữ liệu</Text>
                <Text style={styles.accountSettingsDangerDescription}>
                  Xóa toàn bộ giao dịch và cài đặt
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#FB2C36" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.accountSettingsDangerItem}
              activeOpacity={0.7}
              onPress={handleDeleteAccount}
              disabled={updating}>
              <View style={styles.accountSettingsDangerContent}>
                <Text style={styles.accountSettingsDangerLabel}>Xóa tài khoản</Text>
                <Text style={styles.accountSettingsDangerDescription}>
                  Xóa vĩnh viễn tài khoản của bạn
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#FB2C36" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editingField !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditingField(null)}>
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#1F2937',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
          }}>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 20,
              fontWeight: 'bold',
              marginBottom: 16,
            }}>
              Chỉnh sửa {editingField?.label}
            </Text>
            
            <TextInput
              style={{
                backgroundColor: '#374151',
                borderRadius: 8,
                padding: 12,
                color: '#FFFFFF',
                fontSize: 16,
                marginBottom: 16,
              }}
              placeholder={`Nhập ${editingField?.label.toLowerCase()}`}
              placeholderTextColor="#9CA3AF"
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
            />

            {editingField?.isDate && (
              <Text style={{
                color: '#9CA3AF',
                fontSize: 12,
                marginBottom: 16,
              }}>
                Định dạng: DD/MM/YYYY
              </Text>
            )}

            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={() => {
                  setEditingField(null);
                  setEditValue('');
                }}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}>
                <Text style={{ color: '#9CA3AF', fontSize: 16 }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={updating}
                style={{
                  backgroundColor: '#51A2FF',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}>
                {updating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
