import { useAppAlert } from '@/contexts/app-alert-context';
import { Colors, GlassCardColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMoneySourceService } from '@/lib/services/moneySourceService';
import type { MoneySourceDto } from '@/lib/types/moneySource';
import type { MonthlyExpense } from '@/lib/types/monthlyExpense';
import {
  addMonthlyExpense,
  loadMonthlyExpenses,
  removeMonthlyExpense,
  updateMonthlyExpense,
} from '@/lib/storage/monthlyExpenseStorage';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/styles/index.styles';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
};

function formatAmountDisplay(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (!cleaned) return '';
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseAmount(display: string): number {
  return parseInt(display.replace(/\D/g, ''), 10) || 0;
}

export default function MonthlyExpensesScreen() {
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isLight = resolvedTheme === 'light';
  const { showAlert } = useAppAlert();
  const { getMoneySources } = useMoneySourceService();

  const [expenses, setExpenses] = useState<MonthlyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moneySources, setMoneySources] = useState<MoneySourceDto[]>([]);
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  const [amount, setAmount] = useState('');
  const [selectedWallet, setSelectedWallet] = useState<{ id: string; name: string } | null>(null);
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sources] = await Promise.all([
        loadMonthlyExpenses(),
        getMoneySources(),
      ]);
      setExpenses(data);
      setMoneySources(sources.filter((m) => m.isActive));
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [getMoneySources]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleBack = () => {
    router.back();
  };

  const openAdd = () => {
    setEditingId(null);
    setAmount('');
    setSelectedWallet(null);
    setDescription('');
    setShowModal(true);
    setShowWalletPicker(false);
  };

  const openEdit = (item: MonthlyExpense) => {
    setEditingId(item.id);
    setAmount(formatAmountDisplay(String(item.amount)));
    setSelectedWallet({ id: item.moneySourceId, name: item.moneySourceName });
    setDescription(item.description || '');
    setShowModal(true);
    setShowWalletPicker(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setAmount('');
    setSelectedWallet(null);
    setDescription('');
  };

  const handleSave = async () => {
    const amt = parseAmount(amount);
    if (amt <= 0) {
      showAlert({ title: 'Lỗi', message: 'Vui lòng nhập số tiền hợp lệ', icon: 'error' });
      return;
    }
    if (!selectedWallet) {
      showAlert({ title: 'Lỗi', message: 'Vui lòng chọn tài khoản trừ', icon: 'error' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateMonthlyExpense(editingId, {
          amount: amt,
          moneySourceId: selectedWallet.id,
          moneySourceName: selectedWallet.name,
          description: description.trim() || undefined,
        });
        showAlert({ title: 'Thành công', message: 'Đã cập nhật chi phí hàng tháng', icon: 'check-circle' });
      } else {
        await addMonthlyExpense({
          amount: amt,
          moneySourceId: selectedWallet.id,
          moneySourceName: selectedWallet.name,
          description: description.trim() || undefined,
        });
        showAlert({ title: 'Thành công', message: 'Đã thêm chi phí hàng tháng', icon: 'check-circle' });
      }
      closeModal();
      load();
    } catch {
      showAlert({ title: 'Lỗi', message: 'Không thể lưu. Vui lòng thử lại.', icon: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: MonthlyExpense) => {
    showAlert({
      title: 'Xóa chi phí hàng tháng',
      message: `Bạn có chắc muốn xóa khoản ${formatCurrency(item.amount)}/tháng trừ từ ${item.moneySourceName}?`,
      icon: 'warning',
      buttons: [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'danger',
          onPress: async () => {
            await removeMonthlyExpense(item.id);
            load();
          },
        },
      ],
    });
  };

  const totalMonthly = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cardBg = isLight ? themeColors.card : GlassCardColors.bg;
  const cardBorder = isLight ? themeColors.border : GlassCardColors.border;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent', flex: 1 }]} edges={['top', 'bottom']}>
      <View style={localStyles.header}>
        <TouchableOpacity onPress={handleBack} style={localStyles.backBtn} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[localStyles.headerTitle, { color: themeColors.text }]}>Chi phí hàng tháng</Text>
      </View>

      <ScrollView
        style={localStyles.scroll}
        contentContainerStyle={localStyles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={[localStyles.infoCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <MaterialIcons name="info-outline" size={24} color={themeColors.tint} />
          <Text style={[localStyles.infoText, { color: themeColors.textSecondary }]}>
            Các khoản chi phí cố định (tiền trọ, học phí...) sẽ tự động trừ vào tài khoản đã chọn vào đầu mỗi tháng. Bạn sẽ nhận thông báo khi trừ.
          </Text>
        </View>

        <Text style={[localStyles.sectionTitle, { color: themeColors.text }]}>
          Danh sách ({expenses.length} khoản)
        </Text>

        {loading ? (
          <View style={localStyles.loadingWrap}>
            <ActivityIndicator size="large" color={themeColors.tint} />
          </View>
        ) : expenses.length === 0 ? (
          <View style={[localStyles.emptyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <MaterialIcons name="calendar-month" size={48} color={themeColors.icon} />
            <Text style={[localStyles.emptyText, { color: themeColors.textSecondary }]}>
              Chưa có chi phí hàng tháng nào.{'\n'}Thêm khoản để tự động trừ đầu tháng.
            </Text>
          </View>
        ) : (
          expenses.map((item) => (
            <View key={item.id} style={[localStyles.itemCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={localStyles.itemLeft}>
                <Text style={[localStyles.itemAmount, { color: themeColors.text }]}>{formatCurrency(item.amount)}/tháng</Text>
                <Text style={[localStyles.itemWallet, { color: themeColors.textSecondary }]}>
                  Trừ từ: {item.moneySourceName}
                </Text>
                {item.description ? (
                  <Text style={[localStyles.itemDesc, { color: themeColors.textSecondary }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <View style={localStyles.itemActions}>
                <TouchableOpacity onPress={() => openEdit(item)} style={localStyles.iconBtn} activeOpacity={0.7}>
                  <MaterialIcons name="edit" size={22} color={themeColors.tint} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item)} style={localStyles.iconBtn} activeOpacity={0.7}>
                  <MaterialIcons name="delete-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {expenses.length > 0 && (
          <View style={[localStyles.totalCard, { backgroundColor: cardBg, borderColor: themeColors.tint }]}>
            <Text style={[localStyles.totalLabel, { color: themeColors.text }]}>Tổng chi phí/tháng</Text>
            <Text style={[localStyles.totalAmount, { color: themeColors.tint }]}>{formatCurrency(totalMonthly)}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[localStyles.addBtn, { backgroundColor: themeColors.tint }]}
          onPress={openAdd}
          activeOpacity={0.8}>
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
          <Text style={localStyles.addBtnText}>Thêm chi phí hàng tháng</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={localStyles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={localStyles.modalBackdrop} activeOpacity={1} onPress={closeModal} />
          <View style={[localStyles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[localStyles.modalTitle, { color: themeColors.text }]}>
              {editingId ? 'Sửa chi phí hàng tháng' : 'Thêm chi phí hàng tháng'}
            </Text>

            <Text style={[localStyles.inputLabel, { color: themeColors.text }]}>Số tiền mỗi tháng (₫)</Text>
            <TextInput
              style={[localStyles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="VD: 6000000"
              placeholderTextColor={themeColors.textSecondary}
              value={amount}
              onChangeText={(t) => setAmount(formatAmountDisplay(t))}
              keyboardType="numeric"
            />

            <Text style={[localStyles.inputLabel, { color: themeColors.text }]}>Trừ từ tài khoản</Text>
            <TouchableOpacity
              style={[localStyles.pickerBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
              onPress={() => setShowWalletPicker(!showWalletPicker)}>
              <Text style={[localStyles.pickerText, { color: selectedWallet ? themeColors.text : themeColors.textSecondary }]}>
                {selectedWallet ? `${selectedWallet.name}` : 'Chọn tài khoản'}
              </Text>
              <MaterialIcons name="keyboard-arrow-down" size={24} color={themeColors.icon} />
            </TouchableOpacity>

            {showWalletPicker && (
              <View style={[localStyles.pickerList, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                {moneySources.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={localStyles.pickerItem}
                    onPress={() => {
                      setSelectedWallet({ id: m.id, name: m.name });
                      setShowWalletPicker(false);
                    }}>
                    <Text style={[localStyles.pickerItemText, { color: themeColors.text }]}>{m.name}</Text>
                    <Text style={[localStyles.pickerItemSub, { color: themeColors.textSecondary }]}>{formatCurrency(m.balance)}</Text>
                  </TouchableOpacity>
                ))}
                {moneySources.length === 0 && (
                  <Text style={[localStyles.pickerEmpty, { color: themeColors.textSecondary }]}>Chưa có tài khoản nào</Text>
                )}
              </View>
            )}

            <Text style={[localStyles.inputLabel, { color: themeColors.text }]}>Ghi chú (tùy chọn)</Text>
            <TextInput
              style={[localStyles.input, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="VD: Tiền trọ, học phí..."
              placeholderTextColor={themeColors.textSecondary}
              value={description}
              onChangeText={setDescription}
            />

            <View style={localStyles.modalActions}>
              <TouchableOpacity onPress={closeModal} style={localStyles.modalBtnCancel}>
                <Text style={{ color: themeColors.textSecondary }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[localStyles.modalBtnSave, { backgroundColor: themeColors.tint }]}>
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: { marginTop: 12, textAlign: 'center', fontSize: 14 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  itemLeft: { flex: 1 },
  itemAmount: { fontSize: 16, fontWeight: '700' },
  itemWallet: { fontSize: 14, marginTop: 4 },
  itemDesc: { fontSize: 13, marginTop: 2 },
  itemActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 16,
  },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalAmount: { fontSize: 18, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  pickerText: { fontSize: 16 },
  pickerList: {
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  pickerItemText: { fontSize: 16 },
  pickerItemSub: { fontSize: 12, marginTop: 2 },
  pickerEmpty: { padding: 16, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtnCancel: { flex: 1, padding: 14, alignItems: 'center' },
  modalBtnSave: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 10 },
});
