import { useAIModal } from '@/contexts/ai-modal-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  addDebtEntry,
  CREDITOR_OTHER,
  CREDITOR_PRESETS,
  DebtEntry,
  deleteDebtEntry,
  loadDebtEntries,
} from '@/lib/storage/debtStorage';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

export default function DebtTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { openAIModal } = useAIModal();

  const [entries, setEntries] = useState<DebtEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCreditorModal, setShowCreditorModal] = useState(false);

  const [date, setDate] = useState(() => new Date());
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [creditor, setCreditor] = useState('');
  const [creditorCustom, setCreditorCustom] = useState(''); // Khi chọn "Khác"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadDebtEntries();
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleBack = () => {
    router.replace({ pathname: '/(protected)/(tabs)/report', params: { __replace: 'pop' } } as any);
  };

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setDate(selected);
  };

  const selectCreditor = (name: string) => {
    if (name === CREDITOR_OTHER) {
      setCreditor(CREDITOR_OTHER);
      setCreditorCustom('');
    } else {
      setCreditor(name);
      setCreditorCustom('');
    }
    setShowCreditorModal(false);
  };

  const getCreditorDisplay = () => {
    if (!creditor) return 'Chọn chủ nợ';
    if (creditor === CREDITOR_OTHER) return creditorCustom.trim() || CREDITOR_OTHER;
    return creditor;
  };

  const getCreditorValue = () => {
    if (creditor === CREDITOR_OTHER) return creditorCustom.trim();
    return creditor;
  };

  const handleSave = async () => {
    const amt = parseAmount(amount);
    const creditorValue = getCreditorValue();

    if (!creditorValue) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn hoặc nhập chủ nợ.');
      return;
    }
    if (amt <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    if (!notes.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ghi chú.');
      return;
    }

    setSaving(true);
    try {
      const dateStr = date.toISOString().slice(0, 10);
      await addDebtEntry({
        date: dateStr,
        amount: amt,
        notes: notes.trim(),
        creditor: creditorValue,
      });
      setAmount('');
      setNotes('');
      setCreditor('');
      setCreditorCustom('');
      setDate(new Date());
      await load();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xóa', 'Bạn có chắc muốn xóa khoản nợ này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDebtEntry(id);
            await load();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background, flex: 1 }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[localStyles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={[localStyles.header, { paddingTop: insets.top + 4 }]}>
            <TouchableOpacity onPress={handleBack} style={localStyles.backButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <View style={localStyles.headerCenter}>
              <View style={[localStyles.headerIconWrap, { backgroundColor: themeColors.tint + '30' }]}>
                <MaterialIcons name="swap-horiz" size={28} color={themeColors.tint} />
              </View>
              <Text style={[localStyles.title, { color: themeColors.text }]}>Theo dõi vay nợ</Text>
              <Text style={[localStyles.subtitle, { color: themeColors.textSecondary }]}>
                Ghi chép các khoản nợ
              </Text>
            </View>
          </View>

          {/* Form thêm mới */}
          <View style={[localStyles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[localStyles.cardTitle, { color: themeColors.text }]}>Thêm khoản nợ</Text>

            {/* Ngày */}
            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Ngày vay</Text>
            <TouchableOpacity
              style={[localStyles.inputRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}>
              <MaterialIcons name="calendar-today" size={20} color={themeColors.tint} />
              <Text style={[localStyles.inputText, { color: themeColors.text }]}>
                {date.getDate().toString().padStart(2, '0')}/{(date.getMonth() + 1).toString().padStart(2, '0')}/{date.getFullYear()}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

            {/* Số tiền */}
            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Số tiền (VNĐ)</Text>
            <TextInput
              style={[localStyles.textInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="0"
              placeholderTextColor={themeColors.textSecondary}
              value={amount}
              onChangeText={(v) => setAmount(formatAmountDisplay(v))}
              keyboardType="decimal-pad"
            />

            {/* Ghi chú */}
            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Ghi chú</Text>
            <TextInput
              style={[localStyles.textInput, localStyles.notesInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="VD: Vay mua điện thoại, Trả góp..."
              placeholderTextColor={themeColors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            {/* Chủ nợ */}
            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Chủ nợ</Text>
            <TouchableOpacity
              style={[localStyles.inputRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
              onPress={() => setShowCreditorModal(true)}
              activeOpacity={0.7}>
              <MaterialIcons name="account-balance" size={20} color={themeColors.tint} />
              <Text style={[localStyles.inputText, { color: creditor ? themeColors.text : themeColors.textSecondary }]}>
                {getCreditorDisplay()}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {creditor === CREDITOR_OTHER && (
              <TextInput
                style={[localStyles.textInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text, marginTop: 12 }]}
                placeholder="Nhập tên người/công ty bạn nợ"
                placeholderTextColor={themeColors.textSecondary}
                value={creditorCustom}
                onChangeText={setCreditorCustom}
              />
            )}

            <TouchableOpacity
              style={[localStyles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="add" size={22} color="#FFFFFF" />
                  <Text style={localStyles.saveBtnText}>Lưu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Danh sách đã lưu */}
          <View style={[localStyles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[localStyles.cardTitle, { color: themeColors.text }]}>Khoản nợ đã ghi</Text>
            {loading ? (
              <ActivityIndicator size="small" color={themeColors.tint} style={{ marginVertical: 24 }} />
            ) : entries.length === 0 ? (
              <Text style={[localStyles.emptyText, { color: themeColors.textSecondary }]}>Chưa có khoản nợ nào</Text>
            ) : (
              entries.map((e) => (
                <View
                  key={e.id}
                  style={[localStyles.entryRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                  <View style={localStyles.entryLeft}>
                    <Text style={[localStyles.entryCreditor, { color: themeColors.text }]}>{e.creditor}</Text>
                    <Text style={[localStyles.entryNotes, { color: themeColors.textSecondary }]} numberOfLines={1}>{e.notes}</Text>
                    <Text style={[localStyles.entryDate, { color: themeColors.textSecondary }]}>{formatDateShort(e.date)}</Text>
                  </View>
                  <View style={localStyles.entryRight}>
                    <Text style={[localStyles.entryAmount, { color: '#dc2626' }]}>{formatCurrency(e.amount)}</Text>
                    <TouchableOpacity onPress={() => handleDelete(e.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialIcons name="delete-outline" size={20} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Nút hỏi AI */}
          <TouchableOpacity
            style={localStyles.aiButton}
            onPress={() => openAIModal('Giúp tôi đánh giá khoản nợ và lên kế hoạch trả nợ hợp lý.', true)}
            activeOpacity={0.8}>
            <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
            <Text style={localStyles.aiButtonText}>Hỏi AI</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal chọn chủ nợ */}
      <Modal
        visible={showCreditorModal}
        transparent
        animationType="slide">
        <TouchableOpacity
          style={localStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCreditorModal(false)}>
          <View style={[localStyles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[localStyles.modalTitle, { color: themeColors.text }]}>Chọn chủ nợ</Text>

            <ScrollView
              style={localStyles.creditorScroll}
              contentContainerStyle={localStyles.creditorScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled>
              <Text style={[localStyles.creditorSection, { color: themeColors.textSecondary }]}>Ngân hàng</Text>
              {CREDITOR_PRESETS.banks.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[localStyles.creditorOption, { borderColor: themeColors.border }]}
                  onPress={() => selectCreditor(name)}
                  activeOpacity={0.7}>
                  <MaterialIcons name="account-balance" size={20} color={themeColors.tint} />
                  <Text style={[localStyles.creditorOptionText, { color: themeColors.text }]}>{name}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[localStyles.creditorSection, { color: themeColors.textSecondary }]}>Công ty tài chính</Text>
              {CREDITOR_PRESETS.finance.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[localStyles.creditorOption, { borderColor: themeColors.border }]}
                  onPress={() => selectCreditor(name)}
                  activeOpacity={0.7}>
                  <MaterialIcons name="business" size={20} color={themeColors.tint} />
                  <Text style={[localStyles.creditorOptionText, { color: themeColors.text }]}>{name}</Text>
                </TouchableOpacity>
              ))}

              <Text style={[localStyles.creditorSection, { color: themeColors.textSecondary }]}>Khác</Text>
              <TouchableOpacity
                style={[localStyles.creditorOption, { borderColor: themeColors.border }]}
                onPress={() => selectCreditor(CREDITOR_OTHER)}
                activeOpacity={0.7}>
                <MaterialIcons name="person" size={20} color={themeColors.tint} />
                <Text style={[localStyles.creditorOptionText, { color: themeColors.text }]}>
                  Khác (nhập tên người/công ty)
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[localStyles.modalCloseBtn, { backgroundColor: themeColors.border }]}
              onPress={() => setShowCreditorModal(false)}>
              <Text style={[localStyles.modalCloseText, { color: themeColors.text }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  header: { marginBottom: 24, alignItems: 'center' },
  backButton: { position: 'absolute', top: 8, left: 0, zIndex: 1, padding: 8 },
  headerCenter: { alignItems: 'center' },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },

  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },

  label: { fontSize: 14, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputText: { fontSize: 16 },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    fontSize: 16,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#51A2FF',
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },

  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  entryLeft: { flex: 1 },
  entryCreditor: { fontSize: 16, fontWeight: '600' },
  entryNotes: { fontSize: 14, marginTop: 2 },
  entryDate: { fontSize: 12, marginTop: 2 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  entryAmount: { fontSize: 15, fontWeight: '600' },

  emptyText: { fontSize: 15, textAlign: 'center', marginVertical: 20 },

  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  aiButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  creditorScroll: { maxHeight: 340 },
  creditorScrollContent: { paddingBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  creditorSection: { fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  creditorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  creditorOptionText: { fontSize: 16 },
  modalCloseBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 16, fontWeight: '600' },
});
