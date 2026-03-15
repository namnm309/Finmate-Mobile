import { useAppAlert } from '@/contexts/app-alert-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useSavingsBookService } from '@/lib/services/savingsBookService';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoneySourceGroupedDto } from '@/lib/types/moneySource';
import { SavingsBookDto } from '@/lib/types/savingsBook';

const formatCurrency = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

export default function SettleSavingsBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useAppAlert();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isDark = resolvedTheme === 'dark';
  const headerBgColor = isDark ? themeColors.cardGlass : themeColors.tint;
  const headerFgColor = isDark ? themeColors.text : '#FFFFFF';

  const { getSavingsBookById, settleSavingsBook } = useSavingsBookService();
  const { getGroupedMoneySources } = useMoneySourceService();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [book, setBook] = useState<SavingsBookDto | null>(null);
  const [groups, setGroups] = useState<MoneySourceGroupedDto[]>([]);
  const [amount, setAmount] = useState('');
  const [settlementDate, setSettlementDate] = useState(new Date());
  const [selectedMoneySourceId, setSelectedMoneySourceId] = useState<string | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [b, grouped] = await Promise.all([
        getSavingsBookById(id),
        getGroupedMoneySources(),
      ]);
      setBook(b);
      setGroups(grouped.groups);
      if (b) {
        setAmount(String(Math.round(b.currentBalance)));
        if (grouped.groups.length > 0 && grouped.groups[0].moneySources.length > 0) {
          setSelectedMoneySourceId(grouped.groups[0].moneySources[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  // Chỉ phụ thuộc id; bỏ API functions để tránh loop (hook đổi reference mỗi render)
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!id || !book) return;
    const destId = selectedMoneySourceId;
    if (!destId) {
      showAlert({ title: 'Lỗi', message: 'Vui lòng chọn tài khoản nhận tiền', icon: 'error' });
      return;
    }
    const amt = parseFloat(amount.replace(/\D/g, '')) || book.currentBalance;
    if (amt <= 0 || amt > book.currentBalance) {
      showAlert({ title: 'Lỗi', message: 'Số tiền không hợp lệ', icon: 'error' });
      return;
    }
    try {
      setSaving(true);
      await settleSavingsBook(id, {
        amount: amt,
        settlementDate: settlementDate.toISOString().split('T')[0],
        destinationMoneySourceId: destId,
      });
      showAlert({
        title: 'Thành công',
        message: 'Đã tất toán sổ. Tiền đã được chuyển vào tài khoản.',
        icon: 'check-circle',
        buttons: [{ text: 'OK', style: 'confirm', onPress: () => router.replace({ pathname: '/(protected)/(tabs)/account', params: { __replace: 'pop' } } as any) }],
      });
    } catch (err) {
      showAlert({ title: 'Lỗi', message: err instanceof Error ? err.message : 'Không thể tất toán', icon: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const flatSources = groups.flatMap(g => g.moneySources.map(ms => ({ ...ms, groupName: g.accountTypeName })));
  const selectedSource = selectedMoneySourceId ? flatSources.find(ms => ms.id === selectedMoneySourceId) : null;

  if (loading || !book) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <View style={[s.header, { backgroundColor: headerBgColor }]}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={headerFgColor} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: headerFgColor }]}>Tất toán</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.loading}>
          <ActivityIndicator size="large" color={themeColors.tint} />
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
        <Text style={[s.headerTitle, { color: headerFgColor }]}>Tất toán</Text>
        <TouchableOpacity style={[s.headerBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
          <MaterialIcons name="check" size={24} color={headerFgColor} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={[s.amountCard, { backgroundColor: themeColors.card }]}>
          <Text style={[s.amountLabel, { color: themeColors.textSecondary }]}>Số tiền</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <TextInput
              style={[s.amountInput, { color: themeColors.tint }]}
              value={amount ? amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
              onChangeText={(t: string) => setAmount(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              placeholder={formatCurrency(book.currentBalance)}
              placeholderTextColor={themeColors.textSecondary}
            />
            <Text style={[s.amountSymbol, { color: themeColors.tint }]}>₫</Text>
          </View>
        </View>

        <View style={[s.formCard, { backgroundColor: themeColors.card }]}>
          <View style={[s.row, { borderBottomColor: themeColors.border }]}>
            <MaterialIcons name="calendar-today" size={24} color={themeColors.tint} style={{ marginRight: 12 }} />
            <Text style={[s.rowText, { color: themeColors.text }]}>Hôm nay - {settlementDate.toLocaleDateString('vi-VN')}</Text>
          </View>
          <TouchableOpacity style={[s.row, { borderBottomColor: themeColors.border }]} onPress={() => setShowAccountModal(true)}>
            <MaterialIcons name="add" size={24} color={themeColors.tint} style={{ marginRight: 12 }} />
            <Text style={[s.rowText, { color: themeColors.text }]}>{selectedSource ? selectedSource.name : 'Chọn tài khoản'}</Text>
            <MaterialIcons name="chevron-right" size={24} color={themeColors.icon} />
          </TouchableOpacity>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <MaterialIcons name="savings" size={24} color={themeColors.tint} style={{ marginRight: 12 }} />
            <Text style={[s.rowText, { color: themeColors.text }]}>Tất toán sổ tiết kiệm {book.name}</Text>
          </View>
        </View>

        <TouchableOpacity style={[s.saveBtn, { backgroundColor: themeColors.tint }]} onPress={handleSave} disabled={saving}>
          <Text style={s.saveBtnText}>Lưu lại</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAccountModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAccountModal(false)}>
          <View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[s.modalTitle, { color: themeColors.text }]}>Chọn tài khoản nhận tiền</Text>
            {flatSources.map((ms) => (
              <TouchableOpacity key={ms.id} style={s.modalItem} onPress={() => { setSelectedMoneySourceId(ms.id); setShowAccountModal(false); }}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  amountCard: { borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center' },
  amountLabel: { fontSize: 14, marginBottom: 8 },
  amountInput: { fontSize: 28, fontWeight: '700', minWidth: 150, textAlign: 'center' },
  amountSymbol: { fontSize: 20, marginLeft: 4 },
  formCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  rowText: { flex: 1, fontSize: 16 },
  saveBtn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' },
});
