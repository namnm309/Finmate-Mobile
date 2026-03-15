import { useAppAlert } from '@/contexts/app-alert-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBankService } from '@/lib/services/bankService';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useSavingsBookService } from '@/lib/services/savingsBookService';
import { BankDto, CreateSavingsBookRequest } from '@/lib/types/savingsBook';
import { CurrencyDto, MoneySourceGroupedResponseDto } from '@/lib/types/moneySource';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const formatCurrency = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

export default function AddSavingsBookScreen() {
  const router = useRouter();
  const { showAlert } = useAppAlert();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isDark = resolvedTheme === 'dark';
  const headerBgColor = isDark ? themeColors.cardGlass : themeColors.tint;
  const headerFgColor = isDark ? themeColors.text : '#FFFFFF';

  const { getAll: getBanks } = useBankService();
  const { getGroupedMoneySources, getCurrencies } = useMoneySourceService();
  const { createSavingsBook } = useSavingsBookService();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banks, setBanks] = useState<BankDto[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [moneySources, setMoneySources] = useState<MoneySourceGroupedResponseDto | null>(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);

  const [initialBalance, setInitialBalance] = useState('0');
  const [name, setName] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankDto | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyDto | null>(null);
  const [depositDate, setDepositDate] = useState(new Date());
  const [termMonths, setTermMonths] = useState('3');
  const [interestRate, setInterestRate] = useState('0');
  const [nonTermInterestRate, setNonTermInterestRate] = useState('0.05');
  const [daysInYear, setDaysInYear] = useState('365');
  const [interestPaymentType, setInterestPaymentType] = useState<'CuoiKy' | 'DauKy'>('CuoiKy');
  const [maturityOption, setMaturityOption] = useState<'TaiTucGocVaLai' | 'TaiTucGoc' | 'TatToanSo'>('TaiTucGocVaLai');
  const [sourceMoneySourceId, setSourceMoneySourceId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [excludeFromReports, setExcludeFromReports] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [banksData, grouped, curList] = await Promise.all([
        getBanks(),
        getGroupedMoneySources(),
        getCurrencies(),
      ]);
      setBanks(banksData);
      setMoneySources(grouped);
      setCurrencies(curList);
      if (banksData.length) setSelectedBank(banksData[0]);
      setSelectedCurrency(curList.find(c => c.code === 'VND') || curList[0] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  // Các hàm từ hook đổi reference mỗi render → deps [] tránh loop với useEffect([fetchData])
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const parseAmount = (s: string) => {
    const digits = s.replace(/\D/g, '');
    return digits === '' ? 0 : Number(digits);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert({ title: 'Lỗi', message: 'Vui lòng nhập tên sổ tiết kiệm', icon: 'error' });
      return;
    }
    if (!selectedBank) {
      showAlert({ title: 'Lỗi', message: 'Vui lòng chọn ngân hàng', icon: 'error' });
      return;
    }
    const term = parseInt(termMonths, 10);
    if (isNaN(term) || term < 1) {
      showAlert({ title: 'Lỗi', message: 'Kỳ hạn phải là số nguyên tháng > 0', icon: 'error' });
      return;
    }
    try {
      setSaving(true);
      const req: CreateSavingsBookRequest = {
        name: name.trim(),
        bankId: selectedBank.id,
        currency: selectedCurrency?.code ?? 'VND',
        depositDate: depositDate.toISOString().split('T')[0],
        termMonths: term,
        interestRate: parseFloat(interestRate) || 0,
        nonTermInterestRate: parseFloat(nonTermInterestRate) || 0,
        daysInYearForInterest: parseInt(daysInYear, 10) || 365,
        interestPaymentType,
        maturityOption,
        sourceMoneySourceId: sourceMoneySourceId || undefined,
        description: description.trim() || undefined,
        excludeFromReports,
        initialBalance: parseAmount(initialBalance),
      };
      await createSavingsBook(req);
      showAlert({
        title: 'Thành công',
        message: 'Đã tạo sổ tiết kiệm',
        icon: 'check-circle',
        buttons: [{ text: 'OK', style: 'confirm', onPress: () => router.replace({ pathname: '/(protected)/(tabs)/account', params: { __replace: 'pop' } } as any) }],
      });
    } catch (err) {
      showAlert({ title: 'Lỗi', message: err instanceof Error ? err.message : 'Không thể tạo sổ', icon: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const formatNum = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  const flatMoneySources = moneySources?.groups.flatMap(g => g.moneySources.map(ms => ({ ...ms, groupName: g.accountTypeName }))) ?? [];
  const selectedSource = sourceMoneySourceId ? flatMoneySources.find(ms => ms.id === sourceMoneySourceId) : null;

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <View style={[s.header, { backgroundColor: headerBgColor }]}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={headerFgColor} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: headerFgColor }]}>Thêm sổ tiết kiệm</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.loading}>
          <ActivityIndicator size="large" color={themeColors.tint} />
          <Text style={{ color: themeColors.textSecondary, marginTop: 12 }}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.header, { backgroundColor: headerBgColor }]}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={headerFgColor} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: headerFgColor }]}>Thêm sổ tiết kiệm</Text>
          <TouchableOpacity style={[s.headerBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            <MaterialIcons name="check" size={24} color={headerFgColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Số dư ban đầu */}
          <View style={[s.section, { backgroundColor: themeColors.card }]}>
            <Text style={[s.sectionTitle, { color: themeColors.textSecondary }]}>Số dư ban đầu</Text>
            <View style={s.balanceRow}>
              <TextInput
                style={[s.balanceInput, { color: themeColors.text }]}
                value={formatNum(initialBalance) || '0'}
                onChangeText={(t) => setInitialBalance(t.replace(/\D/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={themeColors.textSecondary}
              />
              <Text style={[s.balanceUnit, { color: themeColors.textSecondary }]}>₫</Text>
            </View>
          </View>

          {/* Thông tin sổ */}
          <Text style={[s.blockTitle, { color: themeColors.textSecondary }]}>Thông tin sổ</Text>
          <View style={[s.section, { backgroundColor: themeColors.card }]}>
            <View style={[s.row, s.rowFirst, { borderBottomColor: themeColors.border }]}>
              <MaterialIcons name="savings" size={22} color={themeColors.tint} style={s.rowIcon} />
              <TextInput
                style={[s.rowInput, { color: themeColors.text }]}
                placeholder="Tên tài khoản tiết kiệm"
                placeholderTextColor={themeColors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
            <TouchableOpacity style={[s.row, { borderBottomColor: themeColors.border }]} onPress={() => setShowBankModal(true)}>
              <MaterialIcons name="account-balance" size={22} color={themeColors.tint} style={s.rowIcon} />
              <Text style={[s.rowValue, { color: themeColors.text }]} numberOfLines={1}>{selectedBank?.name ?? 'Chọn ngân hàng'}</Text>
              <MaterialIcons name="chevron-right" size={22} color={themeColors.icon} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.row, { borderBottomWidth: 0 }]} onPress={() => setShowCurrencyModal(true)}>
              <MaterialIcons name="attach-money" size={22} color={themeColors.tint} style={s.rowIcon} />
              <Text style={[s.rowValue, { color: themeColors.text }]}>{selectedCurrency?.code ?? 'VND'}</Text>
              <MaterialIcons name="chevron-right" size={22} color={themeColors.icon} />
            </TouchableOpacity>
          </View>

          {/* Kỳ hạn & Lãi suất */}
          <Text style={[s.blockTitle, { color: themeColors.textSecondary }]}>Kỳ hạn & Lãi suất</Text>
          <View style={[s.section, { backgroundColor: themeColors.card }]}>
            <View style={[s.row, s.rowFirst, { borderBottomColor: themeColors.border }]}>
              <Text style={[s.rowLabel, { color: themeColors.text }]}>Ngày gửi</Text>
              <Text style={[s.rowValue, { color: themeColors.textSecondary }]}>{depositDate.toLocaleDateString('vi-VN')}</Text>
            </View>
            <View style={[s.row, { borderBottomColor: themeColors.border }]}>
              <Text style={[s.rowLabel, { color: themeColors.text }]}>Kỳ hạn (tháng)</Text>
              <TextInput
                style={[s.rowInputRight, { color: themeColors.text }]}
                value={termMonths}
                onChangeText={setTermMonths}
                keyboardType="number-pad"
                placeholder="3"
                placeholderTextColor={themeColors.textSecondary}
              />
            </View>
            <View style={[s.row, { borderBottomColor: themeColors.border }]}>
              <Text style={[s.rowLabel, { color: themeColors.text }]}>Lãi suất (%/năm)</Text>
              <TextInput
                style={[s.rowInputRight, { color: themeColors.text }]}
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={themeColors.textSecondary}
              />
            </View>
            <View style={[s.row, { borderBottomColor: themeColors.border }]}>
              <Text style={[s.rowLabel, { color: themeColors.text }]}>Lãi suất không kỳ hạn (%/năm)</Text>
              <TextInput
                style={[s.rowInputRight, { color: themeColors.text }]}
                value={nonTermInterestRate}
                onChangeText={setNonTermInterestRate}
                keyboardType="decimal-pad"
                placeholderTextColor={themeColors.textSecondary}
              />
            </View>
            <View style={[s.row, { borderBottomColor: themeColors.border }]}>
              <Text style={[s.rowLabel, { color: themeColors.text }]}>Số ngày tính lãi/năm</Text>
              <TextInput
                style={[s.rowInputRight, { color: themeColors.text }]}
                value={daysInYear}
                onChangeText={setDaysInYear}
                keyboardType="number-pad"
                placeholderTextColor={themeColors.textSecondary}
              />
            </View>
            <View style={[s.row, { borderBottomColor: themeColors.border }]}>
              <Text style={[s.rowLabel, { color: themeColors.text }]}>Trả lãi</Text>
              <View style={s.chipRow}>
                {(['CuoiKy', 'DauKy'] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setInterestPaymentType(opt)}
                    style={[s.chip, interestPaymentType === opt && { backgroundColor: themeColors.tint }]}>
                    <Text style={[s.chipText, { color: interestPaymentType === opt ? '#fff' : themeColors.text }]}>{opt === 'CuoiKy' ? 'Cuối kỳ' : 'Đầu kỳ'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={[s.row, { borderBottomWidth: 0 }]}>
              <Text style={[s.rowLabel, { color: themeColors.text }]}>Khi đến hạn</Text>
              <View style={[s.chipRow, { flexWrap: 'wrap', justifyContent: 'flex-end' }]}>
                {(['TaiTucGocVaLai', 'TaiTucGoc', 'TatToanSo'] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setMaturityOption(opt)}
                    style={[s.chip, maturityOption === opt && { backgroundColor: themeColors.tint }]}>
                    <Text style={[s.chipTextSmall, { color: maturityOption === opt ? '#fff' : themeColors.text }]}>
                      {opt === 'TaiTucGocVaLai' ? 'Tái tục gốc và lãi' : opt === 'TaiTucGoc' ? 'Tái tục gốc' : 'Tất toán sổ'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Nguồn tiền & Ghi chú */}
          <Text style={[s.blockTitle, { color: themeColors.textSecondary }]}>Nguồn tiền & Ghi chú</Text>
          <View style={[s.section, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity style={[s.row, s.rowFirst, { borderBottomColor: themeColors.border }]} onPress={() => setShowSourceModal(true)}>
              <MaterialIcons name="account-balance-wallet" size={22} color={themeColors.tint} style={s.rowIcon} />
              <Text style={[s.rowValue, { color: themeColors.text }]} numberOfLines={1}>
                {selectedSource ? `${selectedSource.name} (${selectedSource.groupName})` : 'Chọn tài khoản nguồn'}
              </Text>
              <MaterialIcons name="chevron-right" size={22} color={themeColors.icon} />
            </TouchableOpacity>
            <View style={[s.row, { borderBottomColor: themeColors.border }]}>
              <MaterialIcons name="notes" size={22} color={themeColors.tint} style={s.rowIcon} />
              <TextInput
                style={[s.rowInput, { color: themeColors.text }]}
                placeholder="Diễn giải"
                placeholderTextColor={themeColors.textSecondary}
                value={description}
                onChangeText={setDescription}
              />
            </View>
            <View style={[s.row, { borderBottomWidth: 0 }]}>
              <Text style={[s.rowLabel, { color: themeColors.text }]}>Không tính vào báo cáo</Text>
              <Switch value={excludeFromReports} onValueChange={setExcludeFromReports} trackColor={{ false: themeColors.border, true: themeColors.tint }} thumbColor="#fff" />
            </View>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: themeColors.tint }]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={s.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu lại'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showBankModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowBankModal(false)}>
          <View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[s.modalTitle, { color: themeColors.text }]}>Chọn ngân hàng</Text>
            {banks.map((b) => (
              <TouchableOpacity key={b.id} style={s.modalItem} onPress={() => { setSelectedBank(b); setShowBankModal(false); }}>
                <Text style={{ color: themeColors.text }}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showCurrencyModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowCurrencyModal(false)}>
          <View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[s.modalTitle, { color: themeColors.text }]}>Chọn tiền tệ</Text>
            {currencies.map((c) => (
              <TouchableOpacity key={c.id} style={s.modalItem} onPress={() => { setSelectedCurrency(c); setShowCurrencyModal(false); }}>
                <Text style={{ color: themeColors.text }}>{c.code} - {c.symbol}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showSourceModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSourceModal(false)}>
          <View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[s.modalTitle, { color: themeColors.text }]}>Chọn tài khoản nguồn</Text>
            <TouchableOpacity style={s.modalItem} onPress={() => { setSourceMoneySourceId(null); setShowSourceModal(false); }}>
              <Text style={{ color: themeColors.textSecondary }}>Không chọn</Text>
            </TouchableOpacity>
            {flatMoneySources.map((ms) => (
              <TouchableOpacity key={ms.id} style={s.modalItem} onPress={() => { setSourceMoneySourceId(ms.id); setShowSourceModal(false); }}>
                <Text style={{ color: themeColors.text }}>{ms.name} ({ms.groupName})</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  blockTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  section: {
    borderRadius: 12,
    paddingVertical: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 16,
    letterSpacing: 0.3,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  balanceInput: {
    fontSize: 28,
    fontWeight: '700',
    minWidth: 100,
    textAlign: 'right',
    paddingVertical: 4,
  },
  balanceUnit: {
    fontSize: 18,
    marginLeft: 6,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  rowFirst: { paddingTop: 12 },
  rowIcon: { marginRight: 12, width: 22 },
  rowLabel: { flex: 1, fontSize: 15 },
  rowValue: { flex: 1, fontSize: 15 },
  rowInput: { flex: 1, fontSize: 15, paddingVertical: 2 },
  rowInputRight: { width: 72, fontSize: 15, textAlign: 'right', paddingVertical: 2 },
  chipRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  chipText: { fontSize: 14 },
  chipTextSmall: { fontSize: 12 },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' },
});
