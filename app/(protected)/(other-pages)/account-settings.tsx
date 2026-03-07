import { useUser } from '@clerk/clerk-expo';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales.vi = {
  monthNames: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
  monthNamesShort: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
  dayNames: ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
  dayNamesShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  today: 'Hôm nay',
};
LocaleConfig.defaultLocale = 'vi';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { styles } from '@/styles/index.styles';
import { useUserService } from '@/lib/services/userService';
import { UserResponse } from '@/lib/types/user';
import { useAuth } from '@/hooks/use-auth';
import {
  validatePhoneVN,
  validateFullName,
  validateDateOfBirth,
  validateOccupation,
  formatPhoneInput,
} from '@/lib/utils/profileValidation';

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

// Format Date -> YYYY-MM-DD cho react-native-calendars
const toCalendarDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Ngày sinh hợp lệ: 5–120 tuổi
const getMinBirthDate = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 120);
  return toCalendarDateString(d);
};
const getMaxBirthDate = (): string => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return toCalendarDateString(d);
};

// Format ngày cho header popup (VD: Thứ 4, 3 Tháng 3 / 2021)
const formatDateForHeader = (date: Date): { dayStr: string; yearStr: string } => {
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const months = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const dayOfWeek = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return { dayStr: `${dayOfWeek}, ${day} ${month}`, yearStr: String(year) };
};

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
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState(false);

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
    let initialValue = currentValue === 'Chưa cập nhật' ? '' : currentValue;
    if (fieldInfo.key === 'phoneNumber' && initialValue) {
      initialValue = formatPhoneInput(initialValue);
    }

    setEditingField({
      key: fieldInfo.key as string,
      label: fieldInfo.label,
      value: initialValue,
      isDate: fieldInfo.isDate,
    });
    setEditValue(initialValue);
    if (isDateField) {
      const parsed = parseDisplayDateToDate(initialValue);
      if (parsed) {
        setSelectedDate(parsed);
      } else {
        const defaultDate = new Date();
        defaultDate.setFullYear(defaultDate.getFullYear() - 25);
        setSelectedDate(toLocalDateOnly(defaultDate));
        setEditValue(formatDateFromDate(defaultDate));
      }
    } else {
      setSelectedDate(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;

    if (editingField.isDate) {
      if (!selectedDate) {
        Alert.alert('Lỗi', 'Vui lòng chọn ngày sinh');
        return;
      }
      const dateCheck = validateDateOfBirth(selectedDate);
      if (!dateCheck.valid) {
        Alert.alert('Lỗi', dateCheck.message ?? 'Ngày sinh không hợp lệ');
        return;
      }
    } else {
      const raw = editValue.trim();
      if (!raw) {
        Alert.alert('Lỗi', 'Vui lòng nhập giá trị');
        return;
      }
      if (editingField.key === 'phoneNumber') {
        const check = validatePhoneVN(raw);
        if (!check.valid) {
          Alert.alert('Lỗi', check.message ?? 'Số điện thoại không hợp lệ');
          return;
        }
      } else if (editingField.key === 'fullName') {
        const check = validateFullName(raw);
        if (!check.valid) {
          Alert.alert('Lỗi', check.message ?? 'Họ tên không hợp lệ');
          return;
        }
      } else if (editingField.key === 'occupation') {
        const check = validateOccupation(raw);
        if (!check.valid) {
          Alert.alert('Lỗi', check.message ?? 'Nghề nghiệp không hợp lệ');
          return;
        }
      }
    }

    try {
      setUpdating(true);
      const updateData: any = {};
      
      if (editingField.isDate && selectedDate) {
        updateData[editingField.key] = toUTCDateOnlyISOString(selectedDate);
      } else {
        let valueToSave = editValue.trim();
        if (editingField.key === 'fullName') {
          const check = validateFullName(valueToSave);
          valueToSave = check.normalized ?? valueToSave;
        }
        if (editingField.key === 'phoneNumber') {
          valueToSave = formatPhoneInput(valueToSave);
        }
        updateData[editingField.key] = valueToSave;
      }

      await updateUserProfile(updateData);
      await refreshUserData();
      setEditingField(null);
      setEditValue('');
      setSelectedDate(null);
      setLatitude('');
      setLongitude('');
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

  // Lấy vị trí hiện tại - logic y chang QuanLySinhVien
  const handleGetCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập vị trí để lấy tọa độ.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude.toFixed(6));
      setLongitude(loc.coords.longitude.toFixed(6));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Vui lòng thử lại';
      Alert.alert('Lỗi', 'Không thể lấy vị trí: ' + msg);
    } finally {
      setLocationLoading(false);
    }
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent', flex: 1 }]} edges={['top', 'bottom']}>
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent', flex: 1 }]} edges={['top', 'bottom']}>
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent', flex: 1 }]} edges={['top', 'bottom']}>
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
              maxHeight: '85%',
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
            
            {editingField?.key === 'address' ? (
              (() => {
                const latNum = parseFloat(latitude);
                const lngNum = parseFloat(longitude);
                const hasValidCoords = !isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
                const mapCoords = hasValidCoords ? { latitude: latNum, longitude: lngNum } : null;
                return (
              <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 16 }}>
                {/* Địa chỉ text - giống QuanLySinhVien */}
                <Text style={{ color: themeColors.textSecondary, fontSize: 14, marginBottom: 8 }}>
                  Địa chỉ cụ thể (số nhà, đường, phường/xã, quận/huyện...)
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isLight ? themeColors.background : '#374151',
                    borderRadius: 8,
                    padding: 12,
                    color: themeColors.text,
                    fontSize: 16,
                    marginBottom: 12,
                    borderWidth: isLight ? 1 : 0,
                    borderColor: isLight ? themeColors.border : 'transparent',
                  }}
                  placeholder="VD: 123 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM"
                  placeholderTextColor={themeColors.textSecondary}
                  value={editValue}
                  onChangeText={setEditValue}
                  multiline
                  numberOfLines={2}
                  autoFocus
                />
                {/* Tọa độ - giống QuanLySinhVien: ô Vĩ độ, Kinh độ */}
                <Text style={{ color: themeColors.textSecondary, fontSize: 14, marginBottom: 4 }}>
                  Vị Trí (tọa độ) – nhập tay hoặc bấm nút bên dưới
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: isLight ? themeColors.background : '#374151',
                      borderRadius: 8,
                      padding: 12,
                      color: themeColors.text,
                      fontSize: 14,
                      borderWidth: isLight ? 1 : 0,
                      borderColor: isLight ? themeColors.border : 'transparent',
                    }}
                    placeholder="VD: 10.762622"
                    placeholderTextColor={themeColors.textSecondary}
                    value={latitude}
                    onChangeText={setLatitude}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: isLight ? themeColors.background : '#374151',
                      borderRadius: 8,
                      padding: 12,
                      color: themeColors.text,
                      fontSize: 14,
                      borderWidth: isLight ? 1 : 0,
                      borderColor: isLight ? themeColors.border : 'transparent',
                    }}
                    placeholder="VD: 106.660172"
                    placeholderTextColor={themeColors.textSecondary}
                    value={longitude}
                    onChangeText={setLongitude}
                    keyboardType="numeric"
                  />
                </View>
                {/* Nút lấy vị trí - dùng màu cố định để chữ luôn đọc được */}
                <TouchableOpacity
                  onPress={handleGetCurrentLocation}
                  disabled={locationLoading}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    backgroundColor: '#1976D2',
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginBottom: 12,
                  }}>
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <MaterialIcons name="my-location" size={20} color="#FFFFFF" />
                  )}
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
                    {locationLoading ? 'Đang lấy vị trí...' : 'Lấy vị trí hiện tại'}
                  </Text>
                </TouchableOpacity>
                {/* Section Vị Trí Trên Bản Đồ - luôn hiển thị khung, map hoặc placeholder */}
                <View style={{
                  borderRadius: 12,
                  padding: 16,
                  marginTop: 4,
                  backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: isLight ? themeColors.border : 'rgba(255,255,255,0.15)',
                }}>
                  <Text style={{ color: themeColors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                    Vị Trí Trên Bản Đồ
                  </Text>
                  {mapCoords ? (
                    <>
                      <Text style={{ color: themeColors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                        {latitude}, {longitude}
                      </Text>
                      {editValue ? (
                        <Text style={{ color: themeColors.textSecondary, fontSize: 13, marginBottom: 12 }}>
                          {editValue}
                        </Text>
                      ) : null}
                      <View style={{ height: 1, backgroundColor: isLight ? themeColors.border : 'rgba(255,255,255,0.2)', marginBottom: 12 }} />
                      <View style={{ height: 240, borderRadius: 12, overflow: 'hidden' }}>
                        <MapView
                          style={{ width: '100%', height: '100%' }}
                          initialRegion={{
                            latitude: mapCoords.latitude,
                            longitude: mapCoords.longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                          }}
                        >
                          <Marker
                            coordinate={mapCoords}
                            title="Vị trí của bạn"
                            description={editValue || 'Đã ghim vị trí'}
                            pinColor="#1976D2"
                          />
                        </MapView>
                      </View>
                    </>
                  ) : (
                    <View style={{
                      height: 240,
                      borderRadius: 12,
                      backgroundColor: isLight ? '#E5E7EB' : '#374151',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      borderColor: isLight ? '#9CA3AF' : '#6B7280',
                    }}>
                      <MaterialIcons name="map" size={48} color={isLight ? '#9CA3AF' : '#6B7280'} />
                      <Text style={{ color: themeColors.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center', paddingHorizontal: 16 }}>
                        Nhập tọa độ hoặc bấm "Lấy vị trí hiện tại"{'\n'}để xem bản đồ
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              </ScrollView>
                );
              })()
            ) : !editingField?.isDate ? (
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
                placeholder={editingField?.key === 'phoneNumber' ? 'VD: 0912345678' : `Nhập ${editingField?.label.toLowerCase()}`}
                placeholderTextColor={themeColors.textSecondary}
                value={editValue}
                onChangeText={(v) => setEditValue(editingField?.key === 'phoneNumber' ? formatPhoneInput(v) : v)}
                keyboardType={editingField?.key === 'phoneNumber' ? 'phone-pad' : 'default'}
                maxLength={editingField?.key === 'phoneNumber' ? 10 : undefined}
                autoFocus
              />
            ) : (
              <View style={{ borderWidth: 1, borderColor: isLight ? themeColors.border : 'rgba(255,255,255,0.2)', borderRadius: 12, overflow: 'hidden' }}>
                {/* Header xanh hiển thị ngày đã chọn */}
                <View style={{ backgroundColor: '#1976D2', paddingVertical: 16, paddingHorizontal: 16, alignItems: 'center' }}>
                  {selectedDate && (
                    <>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>
                        {formatDateForHeader(selectedDate).dayStr}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
                        {formatDateForHeader(selectedDate).yearStr}
                      </Text>
                    </>
                  )}
                </View>
                {/* Calendar - chỉ ngày 5–120 tuổi được tô màu, còn lại xám */}
                <Calendar
                  current={selectedDate ? toCalendarDateString(selectedDate) : toCalendarDateString(new Date())}
                  minDate={getMinBirthDate()}
                  maxDate={getMaxBirthDate()}
                  onDayPress={(day) => {
                    const d = new Date(day.dateString + 'T12:00:00');
                    const normalized = toLocalDateOnly(d);
                    setSelectedDate(normalized);
                    setEditValue(formatDateFromDate(normalized));
                  }}
                  markedDates={
                    selectedDate
                      ? { [toCalendarDateString(selectedDate)]: { selected: true, selectedColor: '#1976D2' } }
                      : {}
                  }
                  theme={{
                    backgroundColor: isLight ? themeColors.card : '#1F2937',
                    calendarBackground: isLight ? themeColors.card : '#1F2937',
                    textSectionTitleColor: themeColors.textSecondary,
                    selectedDayBackgroundColor: '#1976D2',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: themeColors.tint,
                    dayTextColor: themeColors.text,
                    textDisabledColor: isLight ? '#BDBDBD' : '#6B7280',
                    arrowColor: themeColors.tint,
                    monthTextColor: themeColors.text,
                    textDayFontSize: 16,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 14,
                  }}
                  style={{ marginTop: 8 }}
                  firstDay={1}
                  hideExtraDays
                  monthFormat="MMMM yyyy"
                />
                <Text style={{ color: themeColors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
                  Chỉ ngày sinh hợp lệ (5–120 tuổi) có thể chọn
                </Text>
              </View>
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
                  setSelectedDate(null);
                  setLatitude('');
                  setLongitude('');
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
