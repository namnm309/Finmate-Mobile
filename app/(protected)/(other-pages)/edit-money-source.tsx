import { DeleteMoneySourceDialog } from '@/components/DeleteMoneySourceDialog';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import {
  AccountTypeDto,
  CurrencyDto,
  MoneySourceDto,
} from '@/lib/types/moneySource';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
} from 'react-native';

const getCountryFlag = (countryCode: string): string => {
  if (!countryCode || countryCode.length < 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export default function EditMoneySourceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const moneySourceService = useMoneySourceService();
  const serviceRef = useRef(moneySourceService);
  serviceRef.current = moneySourceService;
  const { updateMoneySource, deleteMoneySource } = moneySourceService;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [accountTypes, setAccountTypes] = useState<AccountTypeDto[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [showAccountTypeModal, setShowAccountTypeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [currencySearch, setCurrencySearch] = useState('');

  const [balance, setBalance] = useState('0');
  const [name, setName] = useState('');
  const [selectedAccountType, setSelectedAccountType] = useState<AccountTypeDto | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyDto | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('account-balance-wallet');
  const [description, setDescription] = useState('');
  const [excludeFromReport, setExcludeFromReport] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Thiếu ID tài khoản');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const { getMoneySourceById, getAccountTypes, getCurrencies } = serviceRef.current;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const [source, typesData, currenciesData] = await Promise.all([
          getMoneySourceById(id),
          getAccountTypes(),
          getCurrencies(),
        ]);

        if (cancelled) return;
        if (!source) {
          setError('Không tìm thấy tài khoản');
          setLoading(false);
          return;
        }

        setAccountTypes(typesData);
        setCurrencies(currenciesData);

        // Giữ nguyên số từ API, không làm tròn — chỉ lấy phần nguyên để hiển thị
        const num = Number(source.balance) ?? 0;
        const intPart = Math.trunc(num);
        const absStr = String(Math.abs(intPart));
        const formatted = absStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setBalance(num < 0 ? `-${formatted}` : formatted || '0');
        setName(source.name ?? '');
        setSelectedIcon(source.icon ?? 'account-balance-wallet');
        setDescription('');
        setExcludeFromReport(false);

        const at = typesData.find(t => t.id === source.accountTypeId);
        if (at) {
          setSelectedAccountType(at);
          setSelectedIcon(at.icon ?? source.icon ?? 'account-balance-wallet');
        } else {
          setSelectedAccountType(typesData[0] ?? null);
        }

        const cur = currenciesData.find(c => c.code === source.currency);
        setSelectedCurrency(cur ?? currenciesData.find(c => c.code === 'VND') ?? currenciesData[0] ?? null);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu';
          setError(msg);
          console.error('[EditMoneySource] Error:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [id, retryKey]);

  const handleAccountTypeSelect = (type: AccountTypeDto) => {
    setSelectedAccountType(type);
    setSelectedIcon(type.icon || 'account-balance-wallet');
    setShowAccountTypeModal(false);
  };

  const formatWithThousandSeparators = (numStr: string): string => {
    if (!numStr) return numStr;
    return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleBalanceChange = (text: string) => {
    // Chỉ lấy chữ số (bỏ dấu chấm, phẩy, cách) — giữ nguyên chuỗi số, không qua parseInt để tránh giới hạn số
    const rawDigits = text.replace(/\D/g, '');
    if (rawDigits === '') {
      setBalance('0');
      return;
    }
    // Format dấu chấm phân cách hàng nghìn từ chuỗi số (không dùng parseInt để tránh mất số lớn)
    setBalance(formatWithThousandSeparators(rawDigits));
  };

  const filteredCurrencies = currencies.filter(
    c =>
      c.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!id) return;
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên tài khoản');
      return;
    }
    if (!selectedAccountType) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại tài khoản');
      return;
    }

    // Parse số dư: bỏ hết dấu chấm, phẩy, cách — chỉ lấy chữ số, không làm tròn
    // VD: "105.999.999" hoặc "105,999,999" -> "105999999" -> 105999999
    const balanceStr = String(balance).trim();
    const digitsOnly = balanceStr.replace(/[^0-9]/g, '');
    if (digitsOnly === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập số dư');
      return;
    }
    // Số lớn: dùng Number() (chính xác tới 15 chữ số); trên 15 chữ số có thể dùng BigInt nếu BE hỗ tr
    const rawValue = Number(digitsOnly);
    const isNegative = balanceStr.startsWith('-');
    const balanceToSend = Number.isNaN(rawValue) ? 0 : (isNegative ? -rawValue : rawValue);

    try {
      setSaving(true);
      await updateMoneySource(id, {
        name: name.trim(),
        accountTypeId: selectedAccountType.id,
        icon: selectedIcon,
        color: selectedAccountType.color || '#51A2FF',
        balance: balanceToSend,
        currency: selectedCurrency?.code || 'VND',
      });
      Alert.alert('Thành công', 'Đã cập nhật tài khoản', [
        {
          text: 'OK',
          onPress: () => {
            router.replace({
              pathname: '/(protected)/(tabs)/account',
              params: { refresh: String(Date.now()), __replace: 'pop' },
            } as any);
          },
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật';
      Alert.alert('Lỗi', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!id) return;
    try {
      await deleteMoneySource(id);
      setShowDeleteDialog(false);
      router.replace({
        pathname: '/(protected)/(tabs)/account',
        params: { __replace: 'pop' },
      } as any);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể xóa tài khoản';
      Alert.alert('Lỗi', msg);
    }
  };

  if (!id) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sửa tài khoản</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Thiếu ID tài khoản</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sửa tài khoản</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#51A2FF" />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sửa tài khoản</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => setRetryKey(k => k + 1)}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sửa tài khoản</Text>
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
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
            <Text style={styles.balanceSymbol}>{selectedCurrency?.symbol ?? '₫'}</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formRow}>
            <View style={[styles.iconPreview, { backgroundColor: selectedAccountType?.color ?? '#51A2FF' }]}>
              <MaterialIcons name={(selectedIcon || 'account-balance-wallet') as any} size={24} color="#FFFFFF" />
            </View>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Tên tài khoản"
              placeholderTextColor="#6B7280"
            />
          </View>

          <TouchableOpacity style={styles.formRow} onPress={() => setShowAccountTypeModal(true)} activeOpacity={0.7}>
            <View style={[styles.iconPreview, { backgroundColor: selectedAccountType?.color ?? '#51A2FF' }]}>
              <MaterialIcons name={(selectedAccountType?.icon || 'account-balance-wallet') as any} size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.formRowText}>{selectedAccountType?.name ?? 'Chọn loại tài khoản'}</Text>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.formRow} onPress={() => setShowCurrencyModal(true)} activeOpacity={0.7}>
            <View style={styles.currencyIcon}>
              <Text style={styles.currencyIconText}>{selectedCurrency?.symbol ?? '₫'}</Text>
            </View>
            <Text style={styles.formRowText}>{selectedCurrency?.code ?? 'VND'}</Text>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

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

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.deleteButton} onPress={() => setShowDeleteDialog(true)} activeOpacity={0.8}>
            <Text style={styles.deleteButtonText}>Xóa</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}>
            <Text style={styles.saveButtonText}>Lưu lại</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showAccountTypeModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowAccountTypeModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalHeaderButton} onPress={() => setShowAccountTypeModal(false)} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chọn loại tài khoản</Text>
            <View style={styles.modalHeaderButton} />
          </View>
          <ScrollView style={styles.modalContent}>
            {accountTypes.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[styles.accountTypeItem, selectedAccountType?.id === type.id && styles.accountTypeItemSelected]}
                onPress={() => handleAccountTypeSelect(type)}
                activeOpacity={0.7}>
                <View style={[styles.accountTypeIcon, { backgroundColor: type.color ?? '#51A2FF' }]}>
                  <MaterialIcons name={(type.icon || 'account-balance-wallet') as any} size={24} color="#FFFFFF" />
                </View>
                <Text style={styles.accountTypeName}>{type.name}</Text>
                {selectedAccountType?.id === type.id && <MaterialIcons name="check" size={24} color="#51A2FF" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showCurrencyModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowCurrencyModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalHeaderButton} onPress={() => setShowCurrencyModal(false)} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Loại tiền tệ</Text>
            <View style={styles.modalHeaderButton} />
          </View>
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
            {filteredCurrencies.map(currency => (
              <TouchableOpacity
                key={currency.id}
                style={[styles.currencyItem, selectedCurrency?.id === currency.id && styles.currencyItemSelected]}
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
                {selectedCurrency?.id === currency.id && <MaterialIcons name="check" size={24} color="#51A2FF" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <DeleteMoneySourceDialog
        visible={showDeleteDialog}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1729' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2939',
  },
  headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', marginTop: 12 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  errorText: { color: '#F87171', marginTop: 12, textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#51A2FF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  balanceCard: {
    backgroundColor: '#1E2939',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: { color: '#9CA3AF', fontSize: 14, marginBottom: 8 },
  balanceInputContainer: { flexDirection: 'row', alignItems: 'center' },
  balanceInput: {
    color: '#51A2FF',
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 100,
  },
  balanceSymbol: { color: '#51A2FF', fontSize: 24, fontWeight: '600', marginLeft: 8 },
  formCard: { backgroundColor: '#1E2939', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
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
  nameInput: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  formRowText: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  currencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencyIconText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  descriptionInput: { flex: 1, color: '#FFFFFF', fontSize: 16, marginLeft: 12 },
  toggleCard: { backgroundColor: '#1E2939', borderRadius: 16, padding: 16, marginBottom: 16 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  toggleLabel: { color: '#FFFFFF', fontSize: 16 },
  toggleDescription: { color: '#9CA3AF', fontSize: 14, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  deleteButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F87171',
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  deleteButtonText: { color: '#F87171', fontSize: 18, fontWeight: '600' },
  saveButton: { flex: 1, backgroundColor: '#51A2FF', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#0F1729' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2939',
  },
  modalHeaderButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  modalContent: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2939',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 16, marginLeft: 12 },
  accountTypeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2939',
  },
  accountTypeItemSelected: { backgroundColor: '#1E2939' },
  accountTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountTypeName: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2939',
  },
  currencyItemSelected: { backgroundColor: '#1E2939' },
  currencyFlag: { fontSize: 28, marginRight: 12 },
  currencyInfo: { flex: 1 },
  currencyName: { color: '#FFFFFF', fontSize: 16, marginBottom: 2 },
  currencyCode: { color: '#9CA3AF', fontSize: 14 },
  currencySymbol: { color: '#9CA3AF', fontSize: 18, fontWeight: '500', marginRight: 8 },
});
