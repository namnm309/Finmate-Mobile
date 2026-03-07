import { useAIModal } from '@/contexts/ai-modal-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  addTripEvent,
  deleteTripEvent,
  loadTripEvents,
  loadTripExpenses,
  TRIP_TYPE_LABELS,
  TripEvent,
  TripEventType,
} from '@/lib/storage/tripEventStorage';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
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

const TRIP_TYPES: TripEventType[] = ['du_lich', 'tiec', 'dam_cuoi', 'khac'];

const TYPE_ICONS: Record<TripEventType, string> = {
  du_lich: 'flight',
  tiec: 'celebration',
  dam_cuoi: 'favorite',
  khac: 'event',
};

export default function TripEventScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { openAIModal } = useAIModal();

  const [trips, setTrips] = useState<TripEvent[]>([]);
  const [expensesByTrip, setExpensesByTrip] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState<TripEventType>('du_lich');
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date());
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tripList, expenseList] = await Promise.all([
        loadTripEvents(),
        loadTripExpenses(),
      ]);
      setTrips(tripList);
      const byTrip: Record<string, number> = {};
      expenseList.forEach((e) => {
        byTrip[e.tripId] = (byTrip[e.tripId] || 0) + e.amount;
      });
      setExpensesByTrip(byTrip);
    } catch {
      setTrips([]);
      setExpensesByTrip({});
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

  const onStartDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selected) {
      setStartDate(selected);
      if (endDate < selected) setEndDate(selected);
    }
  };

  const onEndDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selected) setEndDate(selected);
  };

  const selectType = (t: TripEventType) => {
    setType(t);
    setShowTypeModal(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên chuyến đi/sự kiện.');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Lỗi', 'Ngày kết thúc phải sau ngày bắt đầu.');
      return;
    }

    setSaving(true);
    try {
      await addTripEvent({
        name: name.trim(),
        type,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        budget: parseAmount(budget) || 0,
        notes: notes.trim() || undefined,
      });
      setName('');
      setBudget('');
      setNotes('');
      setStartDate(new Date());
      setEndDate(new Date());
      setType('du_lich');
      await load();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (trip: TripEvent) => {
    Alert.alert('Xóa', `Bạn có chắc muốn xóa "${trip.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTripEvent(trip.id);
            await load();
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa.');
          }
        },
      },
    ]);
  };

  const handleViewDetail = (trip: TripEvent) => {
    router.push({
      pathname: '/(protected)/(other-pages)/trip-event-detail',
      params: { id: trip.id },
    } as any);
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
                <MaterialIcons name="event" size={28} color={themeColors.tint} />
              </View>
              <Text style={[localStyles.title, { color: themeColors.text }]}>Chuyến đi / Sự kiện</Text>
              <Text style={[localStyles.subtitle, { color: themeColors.textSecondary }]}>
                Theo dõi chi tiêu (du lịch, tiệc, đám cưới...)
              </Text>
            </View>
          </View>

          {/* Form thêm mới */}
          <View style={[localStyles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[localStyles.cardTitle, { color: themeColors.text }]}>Thêm chuyến đi/sự kiện</Text>

            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Tên</Text>
            <TextInput
              style={[localStyles.textInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="VD: Du lịch Đà Lạt 2025, Đám cưới bạn A..."
              placeholderTextColor={themeColors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Loại</Text>
            <TouchableOpacity
              style={[localStyles.inputRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
              onPress={() => setShowTypeModal(true)}
              activeOpacity={0.7}>
              <MaterialIcons name={TYPE_ICONS[type] as any} size={20} color={themeColors.tint} />
              <Text style={[localStyles.inputText, { color: themeColors.text }]}>{TRIP_TYPE_LABELS[type]}</Text>
              <MaterialIcons name="arrow-drop-down" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>

            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Ngày bắt đầu</Text>
            <TouchableOpacity
              style={[localStyles.inputRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.7}>
              <MaterialIcons name="calendar-today" size={20} color={themeColors.tint} />
              <Text style={[localStyles.inputText, { color: themeColors.text }]}>
                {formatDateShort(startDate.toISOString().slice(0, 10))}
              </Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onStartDateChange}
              />
            )}

            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Ngày kết thúc</Text>
            <TouchableOpacity
              style={[localStyles.inputRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
              onPress={() => setShowEndPicker(true)}
              activeOpacity={0.7}>
              <MaterialIcons name="event" size={20} color={themeColors.tint} />
              <Text style={[localStyles.inputText, { color: themeColors.text }]}>
                {formatDateShort(endDate.toISOString().slice(0, 10))}
              </Text>
            </TouchableOpacity>

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onEndDateChange}
                minimumDate={startDate}
              />
            )}

            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Ngân sách dự kiến (VNĐ, tùy chọn)</Text>
            <TextInput
              style={[localStyles.textInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="0 = không giới hạn"
              placeholderTextColor={themeColors.textSecondary}
              value={budget}
              onChangeText={(v) => setBudget(formatAmountDisplay(v))}
              keyboardType="decimal-pad"
            />

            <Text style={[localStyles.label, { color: themeColors.textSecondary }]}>Ghi chú</Text>
            <TextInput
              style={[localStyles.textInput, localStyles.notesInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }]}
              placeholder="VD: Khách sạn, địa điểm..."
              placeholderTextColor={themeColors.textSecondary}
              value={notes}
              onChangeText={setNotes}
              multiline
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
                  <Text style={localStyles.saveBtnText}>Lưu</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Danh sách chuyến đi/sự kiện */}
          <View style={[localStyles.card, { backgroundColor: themeColors.card }]}>
            <Text style={[localStyles.cardTitle, { color: themeColors.text }]}>Chuyến đi & sự kiện</Text>
            {loading ? (
              <ActivityIndicator size="small" color={themeColors.tint} style={{ marginVertical: 24 }} />
            ) : trips.length === 0 ? (
              <Text style={[localStyles.emptyText, { color: themeColors.textSecondary }]}>
                Chưa có chuyến đi/sự kiện nào. Thêm mới để theo dõi chi tiêu!
              </Text>
            ) : (
              trips.map((trip) => {
                const spent = expensesByTrip[trip.id] || 0;
                const budgetVal = trip.budget || 0;
                const progress = budgetVal > 0 ? Math.min(100, (spent / budgetVal) * 100) : 0;
                return (
                  <TouchableOpacity
                    key={trip.id}
                    style={[localStyles.tripCard, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                    onPress={() => handleViewDetail(trip)}
                    activeOpacity={0.8}>
                    <View style={localStyles.tripCardHeader}>
                      <View style={[localStyles.tripIcon, { backgroundColor: themeColors.tint + '25' }]}>
                        <MaterialIcons name={TYPE_ICONS[trip.type] as any} size={24} color={themeColors.tint} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[localStyles.tripName, { color: themeColors.text }]}>{trip.name}</Text>
                        <Text style={[localStyles.tripMeta, { color: themeColors.textSecondary }]}>
                          {TRIP_TYPE_LABELS[trip.type]} • {formatDateShort(trip.startDate)} - {formatDateShort(trip.endDate)}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(trip)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <MaterialIcons name="delete-outline" size={20} color={themeColors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <View style={localStyles.tripCardBody}>
                      <View style={localStyles.tripAmountRow}>
                        <Text style={[localStyles.tripAmountLabel, { color: themeColors.textSecondary }]}>Đã chi</Text>
                        <Text style={[localStyles.tripAmountValue, { color: '#dc2626' }]}>{formatCurrency(spent)}</Text>
                      </View>
                      {budgetVal > 0 && (
                        <>
                          <View style={localStyles.tripAmountRow}>
                            <Text style={[localStyles.tripAmountLabel, { color: themeColors.textSecondary }]}>Ngân sách</Text>
                            <Text style={[localStyles.tripAmountValue, { color: themeColors.text }]}>{formatCurrency(budgetVal)}</Text>
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
                      <Text style={[localStyles.tripTapHint, { color: themeColors.textSecondary }]}>
                        Nhấn để thêm chi tiêu →
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Nút hỏi AI */}
          <TouchableOpacity
            style={localStyles.aiButton}
            onPress={() =>
              openAIModal(
                'Giúp tôi theo dõi và phân tích chi tiêu theo chuyến đi, sự kiện. Đưa ra gợi ý tiết kiệm và quản lý ngân sách khi đi du lịch, dự tiệc, đám cưới.',
                true
              )
            }
            activeOpacity={0.8}>
            <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
            <Text style={localStyles.aiButtonText}>Hỏi AI</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal chọn loại */}
      <Modal visible={showTypeModal} transparent animationType="fade">
        <TouchableOpacity style={localStyles.modalOverlay} activeOpacity={1} onPress={() => setShowTypeModal(false)}>
          <View style={[localStyles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[localStyles.modalTitle, { color: themeColors.text }]}>Chọn loại</Text>
            {TRIP_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[localStyles.typeOption, { borderColor: themeColors.border }]}
                onPress={() => selectType(t)}
                activeOpacity={0.7}>
                <MaterialIcons name={TYPE_ICONS[t] as any} size={20} color={themeColors.tint} />
                <Text style={[localStyles.typeOptionText, { color: themeColors.text }]}>{TRIP_TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[localStyles.modalCloseBtn, { backgroundColor: themeColors.border }]}
              onPress={() => setShowTypeModal(false)}>
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
  card: { borderRadius: 16, padding: 20, marginBottom: 20 },
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
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
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
  tripCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  tripCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tripIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  tripName: { fontSize: 16, fontWeight: '600' },
  tripMeta: { fontSize: 13, marginTop: 2 },
  tripCardBody: { marginLeft: 56 },
  tripAmountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  tripAmountLabel: { fontSize: 13 },
  tripAmountValue: { fontSize: 14, fontWeight: '600' },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8, marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  tripTapHint: { fontSize: 12, marginTop: 4 },
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
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  typeOptionText: { fontSize: 16 },
  modalCloseBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, fontWeight: '600' },
});
