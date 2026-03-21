import { useAppAlert } from '@/contexts/app-alert-context';
import { useTransactionRefresh } from '@/contexts/transaction-refresh-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import { useSavingsBookService } from '@/lib/services/savingsBookService';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoneySourceGroupedDto } from '@/lib/types/moneySource';
import { SavingsBookDto } from '@/lib/types/savingsBook';

export default function WithdrawSavingsBookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useAppAlert();
  const themeColors = Colors[useColorScheme()];
  const isDark = useColorScheme() === 'dark';
  const headerFgColor = isDark ? themeColors.text : '#FFFFFF';

  const { getSavingsBookById, withdrawSavingsBook } = useSavingsBookService();
  const { getGroupedMoneySources } = useMoneySourceService();
  const { refreshTransactions } = useTransactionRefresh();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [book, setBook] = useState<SavingsBookDto | null>(null);
  const [groups, setGroups] = useState<MoneySourceGroupedDto[]>([]);
  const [amount, setAmount] = useState('');
  const [destId, setDestId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [b, grouped] = await Promise.all([getSavingsBookById(id), getGroupedMoneySources()]);
      setBook(b);
      setGroups(grouped.groups);
      if (grouped.groups.length > 0 && grouped.groups[0].moneySources.length > 0) {
        setDestId(grouped.groups[0].moneySources[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  // Chỉ phụ thuộc id; bỏ API functions để tránh loop
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!id || !book || !destId) {
      showAlert({ title: 'Lỗi', message: 'Chọn tài khoản nhận tiền', icon: 'error' });
      return;
    }
    const amt = parseFloat(amount.replace(/\D/g, ''));
    if (isNaN(amt) || amt <= 0 || amt > book.currentBalance) {
      showAlert({ title: 'Lỗi', message: 'Số tiền không hợp lệ', icon: 'error' });
      return;
    }
    try {
      setSaving(true);
      await withdrawSavingsBook(id, {
        amount: amt,
        destinationMoneySourceId: destId,
        date: new Date().toISOString().split('T')[0],
      });
      refreshTransactions();
      showAlert({
        title: 'Thành công',
        message: 'Đã rút tiền vào tài khoản',
        icon: 'check-circle',
        buttons: [{ text: 'OK', style: 'confirm', onPress: () => router.replace({ pathname: '/(protected)/(tabs)/account', params: { __replace: 'pop' } } as any) }],
      });
    } catch (err) {
      showAlert({ title: 'Lỗi', message: err instanceof Error ? err.message : 'Không thể rút', icon: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const flat = groups.flatMap(g => g.moneySources.map(ms => ({ ...ms, groupName: g.accountTypeName })));
  const selected = destId ? flat.find(m => m.id === destId) : null;

  if (loading || !book) {
    return (
      <SafeAreaView style={s.container}>
        <View style={[s.header, { backgroundColor: isDark ? themeColors.cardGlass : themeColors.tint }]}>
          <TouchableOpacity onPress={() => router.back()}><MaterialIcons name="arrow-back" size={24} color={headerFgColor} /></TouchableOpacity>
          <Text style={[s.headerTitle, { color: headerFgColor }]}>Rút một phần</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.loading}><ActivityIndicator size="large" color={themeColors.tint} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={[s.header, { backgroundColor: isDark ? themeColors.cardGlass : themeColors.tint }]}>
        <TouchableOpacity onPress={() => router.back()}><MaterialIcons name="arrow-back" size={24} color={headerFgColor} /></TouchableOpacity>
        <Text style={[s.headerTitle, { color: headerFgColor }]}>Rút một phần</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}><MaterialIcons name="check" size={24} color={headerFgColor} /></TouchableOpacity>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={[s.card, { backgroundColor: themeColors.card }]}>
          <Text style={[s.label, { color: themeColors.textSecondary }]}>Số tiền (tối đa {new Intl.NumberFormat('vi-VN').format(book.currentBalance)} ₫)</Text>
          <TextInput
            style={[s.input, { color: themeColors.text }]}
            value={amount}
            onChangeText={t => setAmount(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="0"
          />
        </View>
        <TouchableOpacity style={[s.row, { backgroundColor: themeColors.card }]} onPress={() => setShowModal(true)}>
          <Text style={{ color: themeColors.text }}>{selected ? selected.name : 'Chọn tài khoản nhận'}</Text>
          <MaterialIcons name="chevron-right" size={24} color={themeColors.icon} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: themeColors.tint }]} onPress={handleSave} disabled={saving}>
          <Text style={s.btnText}>Lưu lại</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
            {flat.map(ms => (
              <TouchableOpacity key={ms.id} style={s.modalItem} onPress={() => { setDestId(ms.id); setShowModal(false); }}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 16 },
  card: { borderRadius: 16, padding: 20, marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 8 },
  input: { fontSize: 24, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 16 },
  btn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalItem: { paddingVertical: 14 },
});
