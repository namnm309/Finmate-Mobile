import { useAppAlert } from '@/contexts/app-alert-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBankService } from '@/lib/services/bankService';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useSavingsBookService } from '@/lib/services/savingsBookService';
import { BankDto, UpdateSavingsBookRequest } from '@/lib/types/savingsBook';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

export default function EditSavingsBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useAppAlert();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isDark = resolvedTheme === 'dark';
  const headerBgColor = isDark ? themeColors.cardGlass : themeColors.tint;
  const headerFgColor = isDark ? themeColors.text : '#FFFFFF';

  const { getAll: getBanks } = useBankService();
  const { getGroupedMoneySources } = useMoneySourceService();
  const { getSavingsBookById, updateSavingsBook } = useSavingsBookService();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banks, setBanks] = useState<BankDto[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [moneySources, setMoneySources] = useState<{ id: string; name: string; groupName: string }[]>([]);
  const [showSourceModal, setShowSourceModal] = useState(false);

  const [name, setName] = useState('');
  const [selectedBank, setSelectedBank] = useState<BankDto | null>(null);
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
    if (!id) return;
    try {
      setLoading(true);
      const [book, banksData, grouped] = await Promise.all([
        getSavingsBookById(id),
        getBanks(),
        getGroupedMoneySources(),
      ]);
      if (!book) {
        setError('Không tìm thấy sổ');
        return;
      }
      if (book.status !== 'Active') {
        setError('Chỉ có thể sửa sổ đang hoạt động');
        return;
      }
      setBanks(banksData);
      const flat = grouped.groups.flatMap(g => g.moneySources.map(ms => ({ id: ms.id, name: ms.name, groupName: g.accountTypeName })));
      setMoneySources(flat);

      setName(book.name);
      setSelectedBank(banksData.find(b => b.id === book.bankId) || banksData[0] || null);
      setDepositDate(new Date(book.depositDate));
      setTermMonths(String(book.termMonths));
      setInterestRate(String(book.interestRate));
      setNonTermInterestRate(String(book.nonTermInterestRate));
      setDaysInYear(String(book.daysInYearForInterest));
      setInterestPaymentType((book.interestPaymentType as 'CuoiKy') || 'CuoiKy');
      setMaturityOption((book.maturityOption as 'TaiTucGocVaLai') || 'TaiTucGocVaLai');
      setSourceMoneySourceId(book.sourceMoneySourceId || null);
      setDescription(book.description || '');
      setExcludeFromReports(book.excludeFromReports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải');
    } finally {
      setLoading(false);
    }
  // Chỉ phụ thuộc id; bỏ API functions để tránh loop (hook đổi reference mỗi render)
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!id || !name.trim() || !selectedBank) return;
    const term = parseInt(termMonths, 10);
    if (isNaN(term) || term < 1) {
      showAlert({ title: 'Lỗi', message: 'Kỳ hạn phải là số nguyên > 0', icon: 'error' });
      return;
    }
    try {
      setSaving(true);
      const req: UpdateSavingsBookRequest = {
        name: name.trim(),
        bankId: selectedBank.id,
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
      };
      await updateSavingsBook(id, req);
      showAlert({
        title: 'Thành công',
        message: 'Đã cập nhật sổ',
        icon: 'check-circle',
        buttons: [{ text: 'OK', style: 'confirm', onPress: () => router.replace({ pathname: '/(protected)/(tabs)/account', params: { __replace: 'pop' } } as any) }],
      });
    } catch (err) {
      showAlert({ title: 'Lỗi', message: err instanceof Error ? err.message : 'Không thể cập nhật', icon: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || error) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <View style={[s.header, { backgroundColor: headerBgColor }]}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={headerFgColor} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: headerFgColor }]}>Sửa sổ tiết kiệm</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.loading}>
          {loading ? <ActivityIndicator size="large" color={themeColors.tint} /> : <Text style={{ color: '#F87171' }}>{error}</Text>}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <View style={[s.header, { backgroundColor: headerBgColor }]}>
        <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={headerFgColor} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: headerFgColor }]}>Sửa sổ tiết kiệm</Text>
        <TouchableOpacity style={[s.headerBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <MaterialIcons name="check" size={24} color={headerFgColor} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={[s.formCard, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity style={[s.row, { borderBottomColor: themeColors.border }]} onPress={() => setShowBankModal(true)}>
            <MaterialIcons name="account-balance" size={24} color={themeColors.tint} style={{ marginRight: 12 }} />
            <Text style={[s.rowText, { color: themeColors.text }]}>{selectedBank?.name ?? 'Chọn ngân hàng'}</Text>
            <MaterialIcons name="chevron-right" size={24} color={themeColors.icon} />
          </TouchableOpacity>
          <View style={[s.row, { borderBottomColor: themeColors.border }]}>
            <MaterialIcons name="edit" size={24} color={themeColors.tint} style={{ marginRight: 12 }} />
            <TextInput style={[s.input, { color: themeColors.text }]} placeholder="Tên sổ" placeholderTextColor={themeColors.textSecondary} value={name} onChangeText={setName} />
          </View>
          <View style={[s.row, { borderBottomColor: themeColors.border }]}>
            <Text style={[s.rowLabel, { color: themeColors.text }]}>Kỳ hạn (tháng)</Text>
            <TextInput style={[s.inputSmall, { color: themeColors.text }]} value={termMonths} onChangeText={setTermMonths} keyboardType="number-pad" />
          </View>
          <View style={[s.row, { borderBottomColor: themeColors.border }]}>
            <Text style={[s.rowLabel, { color: themeColors.text }]}>Lãi suất (%/năm)</Text>
            <TextInput style={[s.inputSmall, { color: themeColors.text }]} value={interestRate} onChangeText={setInterestRate} keyboardType="decimal-pad" />
          </View>
          <TouchableOpacity style={[s.row, { borderBottomColor: themeColors.border }]} onPress={() => setShowSourceModal(true)}>
            <MaterialIcons name="add" size={24} color={themeColors.tint} style={{ marginRight: 12 }} />
            <Text style={[s.rowText, { color: themeColors.text }]}>{sourceMoneySourceId ? moneySources.find(m => m.id === sourceMoneySourceId)?.name ?? 'Đã chọn' : 'Tiền gửi từ tài khoản'}</Text>
            <MaterialIcons name="chevron-right" size={24} color={themeColors.icon} />
          </TouchableOpacity>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <Text style={[s.rowLabel, { color: themeColors.text }]}>Không tính vào báo cáo</Text>
            <Switch value={excludeFromReports} onValueChange={setExcludeFromReports} trackColor={{ false: themeColors.border, true: themeColors.tint }} />
          </View>
        </View>
        <TouchableOpacity style={[s.saveBtn, { backgroundColor: themeColors.tint }]} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>Lưu lại</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showBankModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowBankModal(false)}>
          <View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
            {banks.map((b) => (
              <TouchableOpacity key={b.id} style={s.modalItem} onPress={() => { setSelectedBank(b); setShowBankModal(false); }}>
                <Text style={{ color: themeColors.text }}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showSourceModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowSourceModal(false)}>
          <View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity style={s.modalItem} onPress={() => { setSourceMoneySourceId(null); setShowSourceModal(false); }}>
              <Text style={{ color: themeColors.textSecondary }}>Không chọn</Text>
            </TouchableOpacity>
            {moneySources.map((ms) => (
              <TouchableOpacity key={ms.id} style={s.modalItem} onPress={() => { setSourceMoneySourceId(ms.id); setShowSourceModal(false); }}>
                <Text style={{ color: themeColors.text }}>{ms.name}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  formCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  rowText: { flex: 1, fontSize: 16 },
  rowLabel: { flex: 1, fontSize: 16 },
  input: { flex: 1, fontSize: 16 },
  inputSmall: { width: 80, fontSize: 16, textAlign: 'right' },
  saveBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' },
});
