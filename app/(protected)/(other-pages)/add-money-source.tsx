import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { AccountTypeDto, CurrencyDto, IconDto } from '@/lib/types/moneySource';

// Country code to flag emoji mapping
const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length < 2) return '🏳️';
  
  // Convert country code to flag emoji
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export default function AddMoneySourceScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { 
    getAccountTypes, 
    getCurrencies, 
    getIcons, 
    createMoneySource 
  } = useMoneySourceService();

  // Data states
  const [accountTypes, setAccountTypes] = useState<AccountTypeDto[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [icons, setIcons] = useState<IconDto[]>([]);
  
  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [balance, setBalance] = useState('0');
  const [name, setName] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState<AccountTypeDto | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyDto | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('account-balance-wallet');
  const [description, setDescription] = useState('');
  const [excludeFromReport, setExcludeFromReport] = useState(false);

  // Modal states
  const [showAccountTypeModal, setShowAccountTypeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showIconModal, setShowIconModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoadingData(true);
      setError(null);

      const [typesData, currenciesData, iconsData] = await Promise.all([
        getAccountTypes(),
        getCurrencies(),
        getIcons(),
      ]);

      setAccountTypes(typesData);
      setCurrencies(currenciesData);
      setIcons(iconsData);

      // Set defaults
      if (typesData.length > 0) {
        setSelectedAccountType(typesData[0]);
        setSelectedIcon(typesData[0].icon || 'account-balance-wallet');
      }
      if (currenciesData.length > 0) {
        // Default to VND
        const vnd = currenciesData.find(c => c.code === 'VND') || currenciesData[0];
        setSelectedCurrency(vnd);
      }
    } catch (err) {
      // Log chi tiết để biết request nào lỗi (xem [API] log trước đó để biết URL/status)
      console.error('[AddMoneySource] Error fetching data (account types / currencies / icons):', {
        error: err,
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      const errorMessage = err instanceof Error ? err.message : 'Không thể tải dữ liệu';
      setError(errorMessage);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When account type changes, update icon to match
  const handleAccountTypeSelect = (type: AccountTypeDto) => {
    setSelectedAccountType(type);
    setSelectedIcon(type.icon || 'account-balance-wallet');
    setShowAccountTypeModal(false);
  };

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên tài khoản');
      return;
    }

    if (!selectedAccountType) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại tài khoản');
      return;
    }

    const balanceNumber = parseFloat(balance.replace(/[^0-9.-]/g, '')) || 0;

    try {
      setSaving(true);

      await createMoneySource({
        accountTypeId: selectedAccountType.id,
        name: name.trim(),
        icon: selectedIcon,
        color: selectedAccountType.color || '#51A2FF',
        balance: balanceNumber,
        currency: selectedCurrency?.code || 'VND',
      });

      Alert.alert('Thành công', 'Đã tạo tài khoản mới', [
        {
          text: 'OK',
          onPress: () =>
            router.replace({
              pathname: '/(protected)/(tabs)/account',
              params: { __replace: 'pop' },
            } as any),
        },
      ]);
    } catch (err) {
      // Log chi tiết lỗi để debug
      console.error('[AddMoneySource] Error creating money source:', {
        error: err,
        requestData: {
          accountTypeId: selectedAccountType.id,
          name: name.trim(),
          icon: selectedIcon,
          color: selectedAccountType.color || '#51A2FF',
          balance: balanceNumber,
          currency: selectedCurrency?.code || 'VND',
        },
        stack: err instanceof Error ? err.stack : undefined,
      });

      // Xử lý error message chi tiết hơn
      let errorMessage = 'Không thể tạo tài khoản';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Hiển thị thông báo lỗi cụ thể hơn
        if (errorMessage.includes('Invalid AccountTypeId')) {
          errorMessage = 'Loại tài khoản không hợp lệ. Vui lòng thử lại.';
        } else if (errorMessage.includes('foreign key')) {
          errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
        } else if (errorMessage.includes('Database error')) {
          errorMessage = 'Lỗi hệ thống. Vui lòng thử lại sau.';
        } else if (errorMessage.includes('Unauthorized')) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        }
      }

      Alert.alert('Lỗi', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Format số dư: chỉ lấy số, bỏ số 0 đầu khi nhập, hiển thị dấu chấm phân cách hàng nghìn (1.000)
  const formatWithThousandSeparators = (numStr: string): string => {
    if (!numStr) return numStr;
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleBalanceChange = (text: string) => {
    const rawDigits = text.replace(/\D/g, '');
    const numStr = rawDigits === '' ? '' : parseInt(rawDigits, 10).toString();
    const displayValue = numStr === '' ? '0' : formatWithThousandSeparators(numStr);
    setBalance(displayValue);
  };

  // Filter currencies by search
  const filteredCurrencies = currencies.filter(c => 
    c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  // Loading state
  if (loadingData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              router.replace({
                pathname: '/(protected)/(tabs)/account',
                params: { __replace: 'pop' },
              } as any)
            }
            activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thêm tài khoản</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#51A2FF" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thêm tài khoản</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#F87171" />
          <Text style={styles.errorText}>{error}</Text>
          {(error.includes('does not exist') || error.includes('relation') || error.includes('API Error: 500')) && (
            <Text style={[styles.errorText, { marginTop: 8, fontSize: 13, opacity: 0.9 }]}>
              Có thể database server chưa sẵn sàng. Thử lại sau hoặc liên hệ hỗ trợ.
            </Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={() => { setError(null); fetchData(); }}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() =>
            router.replace({
              pathname: '/(protected)/(tabs)/account',
              params: { __replace: 'pop' },
            } as any)
          }
          activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm tài khoản</Text>
        <TouchableOpacity
          style={[styles.headerButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialIcons name="check" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        
        {/* Balance Input */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư ban đầu</Text>
          <View style={styles.balanceInputContainer}>
            <TextInput
              style={styles.balanceInput}
              value={balance}
              onChangeText={handleBalanceChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#6B7280"
            />
            <Text style={styles.balanceSymbol}>
              {selectedCurrency?.symbol || '₫'}
            </Text>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formCard}>
          {/* Icon + Name Input */}
          <TouchableOpacity 
            style={styles.formRow}
            onPress={() => setShowIconModal(true)}
            activeOpacity={0.7}>
            <View style={[styles.iconPreview, { backgroundColor: selectedAccountType?.color || '#51A2FF' }]}>
              <MaterialIcons name={selectedIcon as any} size={24} color="#FFFFFF" />
            </View>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Tên tài khoản"
              placeholderTextColor="#6B7280"
            />
          </TouchableOpacity>

          {/* Account Type Selector */}
          <TouchableOpacity 
            style={styles.formRow}
            onPress={() => setShowAccountTypeModal(true)}
            activeOpacity={0.7}>
            <View style={[styles.iconPreview, { backgroundColor: selectedAccountType?.color || '#51A2FF' }]}>
              <MaterialIcons name={(selectedAccountType?.icon || 'account-balance-wallet') as any} size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.formRowText}>
              {selectedAccountType?.name || 'Chọn loại tài khoản'}
            </Text>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Currency Selector */}
          <TouchableOpacity 
            style={styles.formRow}
            onPress={() => setShowCurrencyModal(true)}
            activeOpacity={0.7}>
            <View style={styles.currencyIcon}>
              <Text style={styles.currencyIconText}>
                {selectedCurrency?.symbol || '₫'}
              </Text>
            </View>
            <Text style={styles.formRowText}>
              {selectedCurrency?.code || 'VND'}
            </Text>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Description */}
          <View style={styles.formRow}>
            <MaterialIcons name="notes" size={24} color="#9CA3AF" />
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Diễn giải"
              placeholderTextColor="#6B7280"
            />
          </View>
        </View>

        {/* Exclude from Report Toggle */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Không tính vào báo cáo</Text>
            <Switch
              value={excludeFromReport}
              onValueChange={setExcludeFromReport}
              trackColor={{ false: '#374151', true: '#51A2FF' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text style={styles.toggleDescription}>
            Ghi chép trên tài khoản này sẽ không được thống kê vào TẤT CẢ báo cáo (trừ báo cáo theo dõi vay nợ)
          </Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveButton, saving && { opacity: 0.6 }]} 
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Lưu lại</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Account Type Modal */}
      <Modal
        visible={showAccountTypeModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowAccountTypeModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalHeaderButton}
              onPress={() => setShowAccountTypeModal(false)}
              activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chọn loại tài khoản</Text>
            <View style={styles.modalHeaderButton} />
          </View>
          <ScrollView style={styles.modalContent}>
            {accountTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.accountTypeItem,
                  selectedAccountType?.id === type.id && styles.accountTypeItemSelected,
                ]}
                onPress={() => handleAccountTypeSelect(type)}
                activeOpacity={0.7}>
                <View style={[styles.accountTypeIcon, { backgroundColor: type.color || '#51A2FF' }]}>
                  <MaterialIcons name={(type.icon || 'account-balance-wallet') as any} size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.accountTypeName}>{type.name}</Text>
                {selectedAccountType?.id === type.id && (
                  <MaterialIcons name="check" size={24} color="#51A2FF" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalHeaderButton}
              onPress={() => setShowCurrencyModal(false)}
              activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Loại tiền tệ</Text>
            <View style={styles.modalHeaderButton} />
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              value={currencySearch}
              onChangeText={setCurrencySearch}
              placeholder="Tìm theo loại tiền tệ"
              placeholderTextColor="#6B7280"
            />
          </View>

          <ScrollView style={styles.modalContent}>
            {filteredCurrencies.map((currency) => (
              <TouchableOpacity
                key={currency.id}
                style={[
                  styles.currencyItem,
                  selectedCurrency?.id === currency.id && styles.currencyItemSelected,
                ]}
                onPress={() => {
                  setSelectedCurrency(currency);
                  setShowCurrencyModal(false);
                  setCurrencySearch('');
                }}
                activeOpacity={0.7}>
                <Text style={styles.currencyFlag}>{getCountryFlag(currency.countryCode)}</Text>
                <View style={styles.currencyInfo}>
                  <Text style={styles.currencyName}>{currency.name}</Text>
                  <Text style={styles.currencyCode}>{currency.code}</Text>
                </View>
                <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                {selectedCurrency?.id === currency.id && (
                  <MaterialIcons name="check" size={24} color="#51A2FF" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Icon Modal */}
      <Modal
        visible={showIconModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowIconModal(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalHeaderButton}
              onPress={() => setShowIconModal(false)}
              activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chọn biểu tượng</Text>
            <View style={styles.modalHeaderButton} />
          </View>
          <ScrollView style={styles.modalContent}>
            <View style={styles.iconGrid}>
              {icons.map((icon) => (
                <TouchableOpacity
                  key={icon.name}
                  style={[
                    styles.iconItem,
                    selectedIcon === icon.name && styles.iconItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedIcon(icon.name);
                    setShowIconModal(false);
                  }}
                  activeOpacity={0.7}>
                  <MaterialIcons 
                    name={icon.name as any} 
                    size={28} 
                    color={selectedIcon === icon.name ? '#51A2FF' : '#9CA3AF'} 
                  />
                  <Text style={[
                    styles.iconLabel,
                    selectedIcon === icon.name && styles.iconLabelSelected
                  ]} numberOfLines={1}>
                    {icon.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1729',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2939',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#F87171',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#51A2FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    backgroundColor: '#1E2939',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 8,
  },
  balanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceInput: {
    color: '#51A2FF',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 100,
  },
  balanceSymbol: {
    color: '#51A2FF',
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
  },
  formCard: {
    backgroundColor: '#1E2939',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  iconPreview: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nameInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  formRowText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencyIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  descriptionInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  toggleCard: {
    backgroundColor: '#1E2939',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  toggleDescription: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#51A2FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#0F1729',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2939',
  },
  modalHeaderButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2939',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  accountTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2939',
  },
  accountTypeItemSelected: {
    backgroundColor: '#1E2939',
  },
  accountTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountTypeName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2939',
  },
  currencyItemSelected: {
    backgroundColor: '#1E2939',
  },
  currencyFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 2,
  },
  currencyCode: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  currencySymbol: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '500',
    marginRight: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  iconItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconItemSelected: {
    backgroundColor: '#1E2939',
    borderRadius: 12,
  },
  iconLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  iconLabelSelected: {
    color: '#51A2FF',
  },
});
