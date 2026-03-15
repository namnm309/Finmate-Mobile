import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSavingsBookService } from '@/lib/services/savingsBookService';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SavingsBookDto } from '@/lib/types/savingsBook';

const formatCurrency = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

export default function SavingsBookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const isDark = resolvedTheme === 'dark';
  const headerBgColor = isDark ? themeColors.cardGlass : themeColors.tint;
  const headerFgColor = isDark ? themeColors.text : '#FFFFFF';

  const { getSavingsBookById } = useSavingsBookService();
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState<SavingsBookDto | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const b = await getSavingsBookById(id);
      setBook(b);
    } catch (err) {
      console.error(err);
      setBook(null);
    } finally {
      setLoading(false);
    }
  // Chỉ phụ thuộc id; bỏ getSavingsBookById để tránh loop (hook đổi reference mỗi render)
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = () => {
    if (id) router.push({ pathname: '/(protected)/(other-pages)/edit-savings-book', params: { id } });
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <View style={[s.header, { backgroundColor: headerBgColor }]}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={headerFgColor} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: headerFgColor }]}>Chi tiết sổ</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.loading}>
          <ActivityIndicator size="large" color={themeColors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
        <View style={[s.header, { backgroundColor: headerBgColor }]}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={headerFgColor} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: headerFgColor }]}>Chi tiết sổ</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.loading}>
          <Text style={{ color: themeColors.textSecondary }}>Không tìm thấy sổ</Text>
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
        <Text style={[s.headerTitle, { color: headerFgColor }]} numberOfLines={1}>{book.name}</Text>
        <TouchableOpacity style={s.headerBtn} onPress={handleEdit}>
          <MaterialIcons name="edit" size={24} color={headerFgColor} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        <View style={[s.card, { backgroundColor: themeColors.card }]}>
          <Text style={[s.label, { color: themeColors.textSecondary }]}>Số dư còn lại</Text>
          <Text style={[s.amount, { color: themeColors.text }]}>{formatCurrency(book.currentBalance)}</Text>
          <Text style={[s.label, { color: themeColors.textSecondary, marginTop: 16 }]}>Số dư ban đầu</Text>
          <Text style={[s.amountSmall, { color: themeColors.text }]}>{formatCurrency(book.initialBalance)}</Text>
        </View>

        <View style={[s.card, { backgroundColor: themeColors.card }]}>
          <View style={[s.row, { borderBottomColor: themeColors.border }]}>
            <Text style={[s.rowLabel, { color: themeColors.textSecondary }]}>Ngày gửi</Text>
            <Text style={[s.rowValue, { color: themeColors.text }]}>{new Date(book.depositDate).toLocaleDateString('vi-VN')}</Text>
          </View>
          <View style={[s.row, { borderBottomColor: themeColors.border }]}>
            <Text style={[s.rowLabel, { color: themeColors.textSecondary }]}>Kỳ hạn</Text>
            <Text style={[s.rowValue, { color: themeColors.text }]}>{book.termMonths} Tháng</Text>
          </View>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <Text style={[s.rowLabel, { color: themeColors.textSecondary }]}>Lãi suất</Text>
            <View style={[s.badge, { backgroundColor: themeColors.tint + '30' }]}>
              <Text style={{ color: themeColors.tint, fontWeight: '600' }}>{book.interestRate}%/năm</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 20, marginBottom: 16 },
  label: { fontSize: 14 },
  amount: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  amountSmall: { fontSize: 18, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 16, fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
});
