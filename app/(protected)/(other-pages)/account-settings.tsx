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
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { styles } from '@/styles/index.styles';
import { useUserService } from '@/lib/services/userService';
import { UserResponse } from '@/lib/types/user';
import { useAuth } from '@/hooks/use-auth';

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

// Helper function để parse date từ DD/MM/YYYY sang Date object
const parseDisplayDateToDate = (dateString?: string): Date | null => {
  if (!dateString || dateString === 'Chưa cập nhật') return null;
  try {
    const [day, month, year] = dateString.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

// Helper function để format Date object sang DD/MM/YYYY
const formatDateFromDate = (date: Date | null): string => {
  if (!date) return 'Chọn ngày sinh';
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Convert local Date (date-only) -> ISO at 00:00:00Z to avoid timezone shift
const toUTCDateOnlyISOString = (date: Date): string => {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
  return utc.toISOString();
};

// Normalize any Date -> local date-only (00:00 local)
const toLocalDateOnly = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export default function AccountSettingsScreen() {
  const { user } = useUser();
  const router = useRouter();
  const { signOut } = useAuth();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isLight = resolvedTheme === 'light';
  const textOnTint = resolvedTheme === 'dark' ? themeColors.background : '#ffffff';
  const { getUserProfile, updateUserProfile, deleteUserData, deleteUserAccount } = useUserService();
  
  // State management
  const [userData, setUserData] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<boolean>(false);
  const [editingField, setEditingField] = useState<{ key: string; label: string; value: string; isDate?: boolean } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
    const isDateField = !!fieldInfo.isDate;
    const initialValue = currentValue === 'Chưa cập nhật' ? '' : currentValue;

    setEditingField({
      key: fieldInfo.key as string,
      label: fieldInfo.label,
      value: initialValue,
      isDate: fieldInfo.isDate,
    });
    setEditValue(initialValue);
    setSelectedDate(isDateField ? parseDisplayDateToDate(initialValue) : null);
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;

    if (editingField.isDate) {
      if (!selectedDate) {
        Alert.alert('Lỗi', 'Vui lòng chọn ngày sinh');
        return;
      }
    } else {
      if (!editValue || editValue.trim() === '') {
        Alert.alert('Lỗi', 'Vui lòng nhập giá trị');
        return;
      }
    }

    try {
      setUpdating(true);
      const updateData: any = {};
      
      if (editingField.isDate) {
        if (selectedDate) {
          updateData[editingField.key] = toUTCDateOnlyISOString(selectedDate);
        }
      } else {
        updateData[editingField.key] = editValue.trim();
      }

      await updateUserProfile(updateData);
      await refreshUserData();
      setEditingField(null);
      setEditValue('');
      setSelectedDate(null);
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
              router.replace({
                pathname: '/(auth)/sign-in',
                params: { __replace: 'push' },
              } as any);
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

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text
            style={{
              marginTop: 16,
              color: themeColors.text,
            }}>
            Đang tải thông tin...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !userData) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
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
              backgroundColor: themeColors.tint,
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}>
            <Text style={{ color: textOnTint }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.accountSettingsHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.accountSettingsBackButton}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={styles.accountSettingsHeaderCenter}>
            <Text style={[styles.accountSettingsTitle, { color: themeColors.text }]}>Cài đặt tài khoản</Text>
          </View>
          {/* Bỏ nút chỉnh sửa (icon cây bút) */}
          <View style={styles.accountSettingsEditButton} />
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
          <Text
            style={[
              styles.accountSettingsProfileName,
              { color: themeColors.text },
            ]}>
            {getUserFullName()}
          </Text>
          <Text
            style={[
              styles.accountSettingsMemberSince,
              { color: themeColors.textSecondary },
            ]}>
            {getMemberSince()}
          </Text>
        </View>

        {/* Account Information Section */}
        <View style={styles.accountSettingsSection}>
          <Text
            style={[
              styles.accountSettingsSectionTitle,
              { color: themeColors.text },
            ]}>
            Thông tin tài khoản
          </Text>
          <View
            style={[
              styles.accountSettingsInfoContainer,
              isLight && {
                backgroundColor: themeColors.card,
                borderWidth: 1,
                borderColor: themeColors.border,
              },
            ]}>
            {accountInfoItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.accountSettingsInfoItem,
                  isLight && { borderBottomColor: themeColors.border },
                ]}
                activeOpacity={0.7}
                onPress={() => handleInfoItemPress(item.label, item.value)}
                disabled={updating}>
                <View style={[styles.accountSettingsInfoIcon, { backgroundColor: item.iconColor }]}>
                  <MaterialIcons name={item.icon as any} size={20} color="#FFFFFF" />
                </View>
                <View style={styles.accountSettingsInfoContent}>
                  <Text
                    style={[
                      styles.accountSettingsInfoLabel,
                      { color: themeColors.textSecondary },
                    ]}>
                    {item.label}
                  </Text>
                  <Text
                    style={[
                      styles.accountSettingsInfoValue,
                      { color: themeColors.text },
                    ]}>
                    {item.value}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={themeColors.icon}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.accountSettingsSection}>
          <Text
            style={[
              styles.accountSettingsSectionTitle,
              { color: themeColors.text },
            ]}>
            Khu vực nguy hiểm
          </Text>
          <View
            style={[
              styles.accountSettingsDangerZone,
              isLight && {
                backgroundColor: themeColors.card,
                borderWidth: 1,
                borderColor: themeColors.border,
              },
            ]}>
            <TouchableOpacity
              style={[
                styles.accountSettingsDangerItem,
                isLight && { borderBottomColor: themeColors.border },
              ]}
              activeOpacity={0.7}
              onPress={handleDeleteAllData}
              disabled={updating}>
              <View style={styles.accountSettingsDangerContent}>
                <Text style={styles.accountSettingsDangerLabel}>Xóa tất cả dữ liệu</Text>
                <Text
                  style={[
                    styles.accountSettingsDangerDescription,
                    { color: themeColors.textSecondary },
                  ]}>
                  Xóa toàn bộ giao dịch và cài đặt
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#FB2C36" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.accountSettingsDangerItem,
                isLight && { borderBottomColor: themeColors.border },
              ]}
              activeOpacity={0.7}
              onPress={handleDeleteAccount}
              disabled={updating}>
              <View style={styles.accountSettingsDangerContent}>
                <Text style={styles.accountSettingsDangerLabel}>Xóa tài khoản</Text>
                <Text
                  style={[
                    styles.accountSettingsDangerDescription,
                    { color: themeColors.textSecondary },
                  ]}>
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
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={{
              backgroundColor: isLight ? themeColors.card : '#1F2937',
              borderRadius: 16,
              padding: 24,
              width: '90%',
              maxWidth: 400,
            }}>
            <Text
              style={{
                color: themeColors.text,
                fontSize: 20,
                fontWeight: 'bold',
                marginBottom: 16,
              }}>
              Chỉnh sửa {editingField?.label}
            </Text>
            
            {!editingField?.isDate ? (
              <TextInput
                style={{
                  backgroundColor: isLight ? themeColors.background : '#374151',
                  borderRadius: 8,
                  padding: 12,
                  color: themeColors.text,
                  fontSize: 16,
                  marginBottom: 16,
                  borderWidth: isLight ? 1 : 0,
                  borderColor: isLight ? themeColors.border : 'transparent',
                }}
                placeholder={`Nhập ${editingField?.label.toLowerCase()}`}
                placeholderTextColor={themeColors.textSecondary}
                value={editValue}
                onChangeText={setEditValue}
                autoFocus
              />
            ) : (
              <>
                <Text
                  style={{
                    color: themeColors.textSecondary,
                    fontSize: 14,
                    marginBottom: 8,
                  }}>
                  Chọn ngày sinh
                </Text>

                <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  locale="vi-VN"
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    if (event.type === 'set' && date) {
                      const normalized = toLocalDateOnly(date);
                      setSelectedDate(normalized);
                      setEditValue(formatDateFromDate(normalized));
                    }
                  }}
                />
              </>
            )}

            <View
              style={{
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
                <Text
                  style={{
                    color: themeColors.textSecondary,
                    fontSize: 16,
                  }}>
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={updating}
                style={{
                  backgroundColor: themeColors.tint,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}>
                {updating ? (
                  <ActivityIndicator size="small" color={textOnTint} />
                ) : (
                  <Text style={{ color: textOnTint, fontSize: 16, fontWeight: '600' }}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
