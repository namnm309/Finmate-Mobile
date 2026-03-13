import { useAppAlert } from '@/contexts/app-alert-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSavingGoal } from '@/contexts/saving-goal-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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

function formatAmountDisplay(raw: string): string {
  const cleaned = raw.replace(/\D/g, '');
  if (!cleaned) return '';
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseAmount(display: string): number {
  return parseInt(display.replace(/\D/g, ''), 10) || 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

export default function CreateSavingGoalScreen() {
  const router = useRouter();
  const { showAlert } = useAppAlert();
  const insets = useSafeAreaInsets();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { addGoal } = useSavingGoal();

  const [salary, setSalary] = useState('');
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [daysToAchieve, setDaysToAchieve] = useState('');
  const [dailyEssential, setDailyEssential] = useState('');
  const [category, setCategory] = useState('Khác');

  const handleSalaryChange = (v: string) => setSalary(formatAmountDisplay(v));
  const handleTargetChange = (v: string) => setTargetAmount(formatAmountDisplay(v));
  const handleEssentialChange = (v: string) => setDailyEssential(formatAmountDisplay(v));

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const s = parseAmount(salary);
    const t = parseAmount(targetAmount);
    const e = parseAmount(dailyEssential);
    const d = parseInt(daysToAchieve, 10);

    if (!title.trim()) {
      showAlert({ title: 'Thiếu thông tin', message: 'Vui lòng nhập tên mục tiêu.', icon: 'warning' });
      return;
    }
    if (s <= 0) {
      showAlert({ title: 'Thiếu thông tin', message: 'Vui lòng nhập lương hợp lệ.', icon: 'warning' });
      return;
    }
    if (t <= 0) {
      showAlert({ title: 'Thiếu thông tin', message: 'Vui lòng nhập số tiền mục tiêu hợp lệ.', icon: 'warning' });
      return;
    }
    if (d <= 0 || isNaN(d)) {
      showAlert({ title: 'Thiếu thông tin', message: 'Vui lòng nhập số ngày mong muốn đạt mục tiêu.', icon: 'warning' });
      return;
    }
    if (e < 0) {
      showAlert({ title: 'Thiếu thông tin', message: 'Vui lòng nhập số tiền sinh hoạt thiết yếu mỗi ngày.', icon: 'warning' });
      return;
    }

    const salaryPerDay = s / 30;
    const maxAffordableDaily = Math.max(0, salaryPerDay - e);
    const requiredDaily = t / d;

    if (maxAffordableDaily <= 0) {
      showAlert({
        title: 'Không thể tiết kiệm',
        message: 'Với thu nhập và chi tiêu thiết yếu hiện tại, bạn không có dư để tiết kiệm. Vui lòng kiểm tra lại số liệu.',
        icon: 'warning',
      });
      return;
    }

    if (requiredDaily > maxAffordableDaily) {
      const adjustedDays = Math.ceil(t / maxAffordableDaily);
      showAlert({
        title: 'Thời gian đã được điều chỉnh',
        message: `Với thu nhập và chi tiêu thiết yếu hiện tại, bạn chỉ có thể tiết kiệm tối đa ${formatCurrency(Math.floor(maxAffordableDaily))}/ngày.\n\nĐể đạt mục tiêu ${formatCurrency(t)}, cần khoảng ${adjustedDays} ngày.\nThời gian đã được tự động điều chỉnh từ ${d} thành ${adjustedDays} ngày.`,
        icon: 'info',
        buttons: [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đồng ý',
            style: 'confirm',
            onPress: async () => {
              setSaving(true);
              try {
                await addGoal({
                  salary: s,
                  title: title.trim(),
                  category,
                  targetAmount: t,
                  daysToAchieve: adjustedDays,
                  dailyEssential: e,
                });
                router.back();
              } catch (err) {
                showAlert({
                  title: 'Lỗi',
                  message: err instanceof Error ? err.message : 'Không thể lưu mục tiêu. Vui lòng thử lại.',
                  icon: 'error',
                });
              } finally {
                setSaving(false);
              }
            },
          },
        ],
      });
      return;
    }

    setSaving(true);
    try {
      await addGoal({
        salary: s,
        title: title.trim(),
        category,
        targetAmount: t,
        daysToAchieve: d,
        dailyEssential: e,
      });
      router.back();
    } catch (err) {
      showAlert({
        title: 'Lỗi',
        message: err instanceof Error ? err.message : 'Không thể lưu mục tiêu. Vui lòng thử lại.',
        icon: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Tạo mục tiêu mới</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.field, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Lương (VND/tháng)</Text>
            <TextInput
              style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.background }]}
              placeholder="VD: 18.000.000"
              placeholderTextColor={themeColors.textSecondary}
              value={salary}
              onChangeText={handleSalaryChange}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.field, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Tên mục tiêu</Text>
            <TextInput
              style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.background }]}
              placeholder="VD: iPhone 17 Pro Max"
              placeholderTextColor={themeColors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={[styles.field, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Số tiền mục tiêu (VND)</Text>
            <TextInput
              style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.background }]}
              placeholder="VD: 40.000.000"
              placeholderTextColor={themeColors.textSecondary}
              value={targetAmount}
              onChangeText={handleTargetChange}
              keyboardType="numeric"
            />
          </View>

          <View style={[styles.field, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Số ngày mong muốn đạt mục tiêu</Text>
            <TextInput
              style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.background }]}
              placeholder="VD: 90"
              placeholderTextColor={themeColors.textSecondary}
              value={daysToAchieve}
              onChangeText={setDaysToAchieve}
              keyboardType="number-pad"
            />
          </View>

          <View style={[styles.field, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Số tiền sinh hoạt thiết yếu mỗi ngày (VND)</Text>
            <TextInput
              style={[styles.input, { color: themeColors.text, backgroundColor: themeColors.background }]}
              placeholder="VD: 150.000"
              placeholderTextColor={themeColors.textSecondary}
              value={dailyEssential}
              onChangeText={handleEssentialChange}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Lưu mục tiêu</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboard: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  headerRight: { width: 36 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  field: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: { fontSize: 13, marginBottom: 8 },
  input: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  saveBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
