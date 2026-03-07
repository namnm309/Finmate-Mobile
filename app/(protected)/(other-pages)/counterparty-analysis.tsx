import { useAIModal } from '@/contexts/ai-modal-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  addCounterpartyEntry,
  CounterpartyEntry,
  CounterpartyType,
  deleteCounterpartyEntry,
  loadCounterpartyEntries,
} from '@/lib/storage/counterpartyStorage';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

const TYPES: CounterpartyType[] = ['Thu', 'Chi'];

export default function CounterpartyAnalysisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { openAIModal } = useAIModal();

  const [entries, setEntries] = useState<CounterpartyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const [date, setDate] = useState(() => new Date());
  const [eventName, setEventName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<CounterpartyType>('Chi');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadCounterpartyEntries();
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

  const handleSave = async () => {
    const amt = parseAmount(amount);
    if (!eventName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên sự kiện thu/chi.');
      return;
    }
    if (amt <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tiền hợp lệ.');
      return;
    }

    setSaving(true);
    try {
      const dateStr = date.toISOString().slice(0, 10);
      await addCounterpartyEntry({
        date: dateStr,
        eventName: eventName.trim(),
        amount: amt,
        type,
      });
      setEventName('');
      setAmount('');
      setDate(new Date());
      await load();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xóa', 'Bạn có chắc muốn xóa mục này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCounterpartyEntry(id);
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
                <MaterialIcons name="people" size={28} color={themeColors.tint} />
              </View>
              <Text style={[localStyles.title, { color: themeColors.text }]}>Đối tượng thu/chi</Text>
              <Text style={[localStyles.subtitle, { color: themeColors.textSecondary }]}>
                Theo dõi thu chi theo sự kiện
              </Text>
            </View>
          </View>

          {/* Form thêm mới */}
          <View style={[localStyles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[localStyles.cardTitle, { color: themeColors.text }]}>Thêm sự kiện thu/chi</Text>

            {/* Ngày chi tiêu */}
            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Ngày</Text>
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

            {/* Tên sự kiện */}
            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Tên sự kiện thu/chi</Text>
            <TextInput
              style={[localStyles.textInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="VD: Tiền lương, Ăn trưa, Trả nợ..."
              placeholderTextColor={themeColors.textSecondary}
              value={eventName}
              onChangeText={setEventName}
            />

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

            {/* Thu / Chi */}
            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Loại</Text>
            <View style={localStyles.typeRow}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    localStyles.typeBtn,
                    {
                      backgroundColor: type === t ? (t === 'Thu' ? '#16a34a' : '#dc2626') : themeColors.background,
                      borderColor: themeColors.border,
                    },
                  ]}
                  onPress={() => setType(t)}
                  activeOpacity={0.7}>
                  <MaterialIcons
                    name={t === 'Thu' ? 'trending-up' : 'trending-down'}
                    size={20}
                    color={type === t ? '#FFFFFF' : themeColors.textSecondary}
                  />
                  <Text style={[localStyles.typeBtnText, { color: type === t ? '#FFFFFF' : themeColors.text }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
            <Text style={[localStyles.cardTitle, { color: themeColors.text }]}>Đã lưu</Text>
            {loading ? (
              <ActivityIndicator size="small" color={themeColors.tint} style={{ marginVertical: 24 }} />
            ) : entries.length === 0 ? (
              <Text style={[localStyles.emptyText, { color: themeColors.textSecondary }]}>Chưa có sự kiện nào</Text>
            ) : (
              entries.map((e) => (
                <View
                  key={e.id}
                  style={[localStyles.entryRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                  <View style={localStyles.entryLeft}>
                    <Text style={[localStyles.entryEvent, { color: themeColors.text }]}>{e.eventName}</Text>
                    <Text style={[localStyles.entryDate, { color: themeColors.textSecondary }]}>{formatDateShort(e.date)}</Text>
                  </View>
                  <View style={localStyles.entryRight}>
                    <Text style={[localStyles.entryAmount, { color: e.type === 'Thu' ? '#16a34a' : '#dc2626' }]}>
                      {e.type === 'Thu' ? '+' : '-'} {formatCurrency(e.amount)}
                    </Text>
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
            onPress={() => openAIModal('Phân tích thu chi của tôi theo đối tượng. Đưa ra nhận xét và gợi ý.', true)}
            activeOpacity={0.8}>
            <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
            <Text style={localStyles.aiButtonText}>Hỏi AI</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  typeBtnText: { fontSize: 16, fontWeight: '600' },

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
  entryEvent: { fontSize: 16, fontWeight: '500' },
  entryDate: { fontSize: 13, marginTop: 2 },
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
});
