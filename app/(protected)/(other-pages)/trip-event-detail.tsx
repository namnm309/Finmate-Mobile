import { useAIModal } from '@/contexts/ai-modal-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  addTripExpense,
  deleteTripExpense,
  loadTripEvents,
  loadTripExpenses,
  TRIP_TYPE_LABELS,
  TripEvent,
  TripEventType,
  TripExpense,
} from '@/lib/storage/tripEventStorage';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

const TYPE_ICONS: Record<TripEventType, string> = {
  du_lich: 'flight',
  tiec: 'celebration',
  dam_cuoi: 'favorite',
  khac: 'event',
};

export default function TripEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { openAIModal } = useAIModal();

  const [trip, setTrip] = useState<TripEvent | null>(null);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [date, setDate] = useState(() => new Date());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [trips, expList] = await Promise.all([
        loadTripEvents(),
        loadTripExpenses(),
      ]);
      const t = trips.find((x) => x.id === id) || null;
      setTrip(t);
      setExpenses(expList.filter((e) => e.tripId === id));
    } catch {
      setTrip(null);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (id && !loading && !trip) {
      router.back();
    }
  }, [id, loading, trip, router]);

  const handleBack = () => router.back();

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setDate(selected);
  };

  const handleSave = async () => {
    if (!id || !trip) return;
    const amt = parseAmount(amount);
    if (amt <= 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tiền hợp lệ.');
      return;
    }

    setSaving(true);
    try {
      await addTripExpense({
        tripId: id,
        date: date.toISOString().slice(0, 10),
        amount: amt,
        description: description.trim() || 'Không mô tả',
      });
      setAmount('');
      setDescription('');
      setDate(new Date());
      await load();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = (exp: TripExpense) => {
    Alert.alert('Xóa', 'Bạn có chắc muốn xóa khoản chi này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTripExpense(exp.id);
            await load();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa.');
          }
        },
      },
    ]);
  };

  if (!trip && !loading) return null;

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const budget = trip?.budget || 0;
  const progress = budget > 0 ? Math.min(100, (totalSpent / budget) * 100) : 0;

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
            {trip && (
              <View style={localStyles.headerCenter}>
                <View style={[localStyles.tripIcon, { backgroundColor: themeColors.tint + '25' }]}>
                  <MaterialIcons name={TYPE_ICONS[trip.type] as any} size={28} color={themeColors.tint} />
                </View>
                <Text style={[localStyles.title, { color: themeColors.text }]}>{trip.name}</Text>
                <Text style={[localStyles.subtitle, { color: themeColors.textSecondary }]}>
                  {TRIP_TYPE_LABELS[trip.type]} • {formatDateShort(trip.startDate)} - {formatDateShort(trip.endDate)}
                </Text>
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={themeColors.tint} style={{ marginVertical: 40 }} />
          ) : trip ? (
            <>
              {/* Summary card */}
              <View style={[localStyles.card, { backgroundColor: themeColors.card }]}>
                <View style={localStyles.summaryRow}>
                  <Text style={[localStyles.summaryLabel, { color: themeColors.textSecondary }]}>Đã chi</Text>
                  <Text style={[localStyles.summaryValue, { color: '#dc2626' }]}>{formatCurrency(totalSpent)}</Text>
                </View>
                {budget > 0 && (
                  <>
                    <View style={localStyles.summaryRow}>
                      <Text style={[localStyles.summaryLabel, { color: themeColors.textSecondary }]}>Ngân sách</Text>
                      <Text style={[localStyles.summaryValue, { color: themeColors.text }]}>{formatCurrency(budget)}</Text>
                    </View>
                    <View style={[localStyles.progressBar, { backgroundColor: themeColors.border }]}>
                      <LinearGradient
                        colors={['#51A2FF', '#dc2626']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[localStyles.progressFill, { width: `${progress}%` }]}
                      />
                    </View>
                  </>
                )}
              </View>

              {/* Form thêm chi tiêu */}
              <View style={[localStyles.card, { backgroundColor: themeColors.card }]}>
                <Text style={[localStyles.cardTitle, { color: themeColors.text }]}>Thêm chi tiêu</Text>

                <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Ngày</Text>
                <TouchableOpacity
                  style={[localStyles.inputRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}>
                  <MaterialIcons name="calendar-today" size={20} color={themeColors.tint} />
                  <Text style={[localStyles.inputText, { color: themeColors.text }]}>
                    {formatDateShort(date.toISOString().slice(0, 10))}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                  />
                )}

                <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Số tiền (VNĐ)</Text>
                <TextInput
                  style={[localStyles.textInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
                  placeholder="0"
                  placeholderTextColor={themeColors.textSecondary}
                  value={amount}
                  onChangeText={(v) => setAmount(formatAmountDisplay(v))}
                  keyboardType="decimal-pad"
                />

                <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Diễn giải</Text>
                <TextInput
                  style={[localStyles.textInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
                  placeholder="VD: Vé máy bay, Khách sạn..."
                  placeholderTextColor={themeColors.textSecondary}
                  value={description}
                  onChangeText={setDescription}
                />

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
                      <Text style={localStyles.saveBtnText}>Thêm</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Danh sách chi tiêu */}
              <View style={[localStyles.card, { backgroundColor: themeColors.card }]}>
                <Text style={[localStyles.cardTitle, { color: themeColors.text }]}>Chi tiêu đã ghi</Text>
                {expenses.length === 0 ? (
                  <Text style={[localStyles.emptyText, { color: themeColors.textSecondary }]}>Chưa có chi tiêu nào</Text>
                ) : (
                  expenses.map((exp) => (
                    <View
                      key={exp.id}
                      style={[localStyles.expenseRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[localStyles.expenseDesc, { color: themeColors.text }]}>{exp.description}</Text>
                        <Text style={[localStyles.expenseDate, { color: themeColors.textSecondary }]}>{formatDateShort(exp.date)}</Text>
                      </View>
                      <View style={localStyles.expenseRight}>
                        <Text style={[localStyles.expenseAmount, { color: '#dc2626' }]}>{formatCurrency(exp.amount)}</Text>
                        <TouchableOpacity onPress={() => handleDeleteExpense(exp)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                onPress={() =>
                  openAIModal(
                    `Tôi đang theo dõi chi tiêu cho "${trip.name}" (${TRIP_TYPE_LABELS[trip.type]}). Đã chi ${formatCurrency(totalSpent)}${budget > 0 ? ` / ngân sách ${formatCurrency(budget)}` : ''}. Hãy phân tích và đưa ra gợi ý tiết kiệm.`,
                    true
                  )
                }
                activeOpacity={0.8}>
                <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
                <Text style={localStyles.aiButtonText}>Hỏi AI</Text>
              </TouchableOpacity>
            </>
          ) : null}
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
  tripIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  card: { borderRadius: 16, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 16, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 4 },
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
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  expenseDesc: { fontSize: 16, fontWeight: '500' },
  expenseDate: { fontSize: 13, marginTop: 2 },
  expenseRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  expenseAmount: { fontSize: 15, fontWeight: '600' },
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
