import { Colors, GlassCardColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SavingGoalData } from '@/contexts/saving-goal-context';
import { useSavingGoal } from '@/contexts/saving-goal-context';
import { useChatService } from '@/lib/services/chatService';
import { computeGoalMetrics } from '@/lib/utils/goalMetrics';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const formatCurrency = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

const stripAsterisks = (s: string) => s.replace(/\*+/g, '');

const CONGRATS_MSG = `🎉 Chúc mừng bạn đã đạt mục tiêu!

Bạn đã tiết kiệm đủ (hoặc vượt) số tiền mong muốn. Hãy tự thưởng cho bản thân và tiếp tục duy trì thói quen tiết kiệm nhé!`;

const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 16, right: 20, bottom: 36, left: 12 };
const Y_AXIS_WIDTH = 52;
const MAX_RANGE_DAYS = 365;

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + months);
  return out;
}

/** Sinh tối đa 12 điểm theo tháng: start, start+1m, start+2m, ... (vd: 22/1, 22/2, 22/3...) */
function getTickDates(start: Date, end: Date): Date[] {
  const result: Date[] = [start];
  const endTime = end.getTime();
  for (let i = 1; i < 12; i++) {
    const d = addMonths(new Date(start), i);
    if (d.getTime() > endTime) break;
    result.push(d);
  }
  if (result[result.length - 1]?.getTime() < endTime - 86400000) result.push(end);
  return result;
}

function formatDateLabel(d: Date): string {
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Cache plan AI theo goalId để tránh gọi API mỗi lần focus (tối ưu rate limit ~10 req/phút) */
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút
const planCache: Record<string, { text: string; timestamp: number }> = {};

function getCachedPlan(goalId: string): string | null {
  const cached = planCache[goalId];
  if (!cached) return null;
  if (Date.now() - cached.timestamp > PLAN_CACHE_TTL_MS) {
    delete planCache[goalId];
    return null;
  }
  return cached.text;
}

function setCachedPlan(goalId: string, text: string) {
  planCache[goalId] = { text, timestamp: Date.now() };
}

const PLAN_PROMPT = (opts: {
  salary: number;
  title: string;
  targetAmount: number;
  daysToAchieve: number;
  dailyEssential: number;
  currentAmount: number;
  daysLeft: number;
  dailyTarget: number;
  todaySaved?: number;
  yesterdaySaved?: number;
}) => {
  const { salary, title, targetAmount, dailyEssential, currentAmount, daysLeft, dailyTarget, todaySaved, yesterdaySaved } = opts;
  const remaining = targetAmount - currentAmount;
  const salaryPerDay = Math.floor(salary / 30);
  const maxDailySpend = Math.max(dailyEssential + 1000, salaryPerDay - dailyTarget);
  return `Bạn là chuyên gia tài chính. Trả lời NGẮN GỌN theo ĐÚNG 4 mục, dùng số liệu sau:

Dữ liệu (nội bộ, không giải thích ra):
- Mỗi ngày được sử dụng tối đa: ${formatCurrency(maxDailySpend)}
- Phải bỏ hũ tối thiểu: ${formatCurrency(dailyTarget)}
- Còn ${daysLeft} ngày hoàn thành ${title}
- Hôm nay bỏ: ${todaySaved != null ? formatCurrency(todaySaved) : 'chưa có'} | Hôm qua: ${yesterdaySaved != null ? formatCurrency(yesterdaySaved) : 'chưa có'}

Format trả lời (CHỈ 4 mục, không thêm giải thích về thiết yếu/bắt buộc):
1. Mỗi ngày được sử dụng tối đa: [số tiền]
2. Phải bỏ vào hũ tiết kiệm tối thiểu: [số tiền]
3. Còn bao nhiêu ngày nữa hoàn thành mục tiêu: [số ngày]
4. Nhận xét: [So sánh hôm nay vs hôm qua (nếu có). Lời khích lệ ngắn gọn]

CẤM tuyệt đối dùng ký tự * (sao). Dùng dấu "-" liệt kê, emoji nhẹ.`;
};

export default function SavingPlanScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const idParam = params.id;
  const id = typeof idParam === 'string' ? idParam : Array.isArray(idParam) ? idParam[0] : undefined;
  const router = useRouter();
  const resolvedTheme = useColorScheme();
  const themeColors = Colors[resolvedTheme];
  const { goals } = useSavingGoal();
  const { sendMessage } = useChatService();
  const [selectedId, setSelectedId] = useState<string | null>(id ?? null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDatePickerFor, setShowDatePickerFor] = useState<'start' | 'end' | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const defaultFilterEnd = useMemo(() => new Date(today), []);
  const defaultFilterStart = useMemo(() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 3);
    return d;
  }, []);

  const [filterStart, setFilterStart] = useState<Date>(defaultFilterStart);
  const [filterEnd, setFilterEnd] = useState<Date>(defaultFilterEnd);

  const goal = goals.find((g) => g.id === (selectedId || id));

  useEffect(() => {
    if (!goal) return;
    const start = new Date(goal.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const rangeDays = (end.getTime() - start.getTime()) / 86400000;
    if (rangeDays > MAX_RANGE_DAYS) {
      const s = new Date(end);
      s.setDate(s.getDate() - MAX_RANGE_DAYS);
      setFilterStart(s);
    } else {
      setFilterStart(start);
    }
    setFilterEnd(end);
  }, [goal?.id]);

  const handleDatePickerChange = useCallback(
    (which: 'start' | 'end') => (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') setShowDatePickerFor(null);
      if (!selectedDate) return;
      const d = new Date(selectedDate);
      d.setHours(0, 0, 0, 0);
      if (which === 'start') {
        const maxEnd = new Date(d);
        maxEnd.setDate(maxEnd.getDate() + MAX_RANGE_DAYS);
        setFilterStart(d);
        if (filterEnd.getTime() < d.getTime()) setFilterEnd(d);
        else if (filterEnd.getTime() > maxEnd.getTime()) setFilterEnd(maxEnd);
      } else {
        const minStart = new Date(d);
        minStart.setDate(minStart.getDate() - MAX_RANGE_DAYS);
        setFilterEnd(d);
        if (filterStart.getTime() > d.getTime()) setFilterStart(d);
        else if (filterStart.getTime() < minStart.getTime()) setFilterStart(minStart);
      }
    },
    [filterStart, filterEnd]
  );

  const isAchieved = goal ? goal.currentAmount >= goal.targetAmount : false;
  const [planText, setPlanText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualReloading, setManualReloading] = useState(false);
  const lastReloadAtRef = useRef<number>(0);
  const RELOAD_THROTTLE_MS = 15000; // 15 giây giữa mỗi lần reload (tối ưu rate limit)

  const remaining = goal ? goal.targetAmount - goal.currentAmount : 0;
  const { daysRemaining, dailyAmount } = goal ? computeGoalMetrics(goal) : { daysRemaining: 0, dailyAmount: 0 };
  const daysLeft = daysRemaining;
  const dailyTarget = dailyAmount;

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const contributions = goal?.contributions ?? [];
  const todaySaved = contributions.find((c) => c.date === todayStr)?.amount;
  const yesterdaySaved = contributions.find((c) => c.date === yesterdayStr)?.amount;

  const planPromptPayload = goal ? {
    salary: goal.salary,
    title: goal.title,
    targetAmount: goal.targetAmount,
    daysToAchieve: goal.daysToAchieve,
    dailyEssential: goal.dailyEssential,
    currentAmount: goal.currentAmount,
    daysLeft,
    dailyTarget,
    todaySaved,
    yesterdaySaved,
  } : null;

  const fetchPlan = useCallback(async (forceRefresh = false) => {
    if (!goal || !planPromptPayload || isAchieved) return;
    if (!forceRefresh) {
      const cached = getCachedPlan(goal.id);
      if (cached) {
        setPlanText(cached);
        return;
      }
    }
    setLoading(true);
    let cancelled = false;
    try {
      const reply = await sendMessage(
        [{ role: 'user', content: 'Lập plan tiết kiệm' }],
        { systemPrompt: PLAN_PROMPT(planPromptPayload), temperature: 0.5, aiFeature: 'plan' }
      );
      if (!cancelled) {
        setPlanText(reply);
        setCachedPlan(goal.id, reply);
      }
    } catch {
      if (!cancelled) setPlanText('Không thể tải plan. Kiểm tra kết nối.');
    } finally {
      if (!cancelled) setLoading(false);
      if (!cancelled) setManualReloading(false);
    }
    return () => { cancelled = true; };
  }, [goal?.id, planPromptPayload, isAchieved]);

  useEffect(() => {
    if (id) setSelectedId(id);
  }, [id]);

  useEffect(() => {
    if (!goal && goals.length > 0) {
      router.back();
    }
  }, [goal?.id, goals.length, router]);

  useFocusEffect(
    useCallback(() => {
      if (!goal) return;
      if (isAchieved) {
        setPlanText(CONGRATS_MSG);
        setLoading(false);
        return;
      }
      if (!planPromptPayload) return;
      const cached = getCachedPlan(goal.id);
      if (cached) {
        setPlanText(cached);
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      sendMessage(
        [{ role: 'user', content: 'Lập plan tiết kiệm' }],
        { systemPrompt: PLAN_PROMPT(planPromptPayload), temperature: 0.5, aiFeature: 'plan' }
      )
        .then((reply) => {
          if (!cancelled) {
            setPlanText(reply);
            setCachedPlan(goal.id, reply);
          }
        })
        .catch(() => { if (!cancelled) setPlanText('Không thể tải plan. Kiểm tra kết nối.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [goal?.id, isAchieved, planPromptPayload])
  );

  const handleReload = () => {
    if (isAchieved) return;
    const now = Date.now();
    if (now - lastReloadAtRef.current < RELOAD_THROTTLE_MS && !loading) {
      return; // Throttle: chưa đủ 15s kể từ lần reload trước
    }
    lastReloadAtRef.current = now;
    setManualReloading(true);
    fetchPlan(true); // forceRefresh để bỏ qua cache
  };

  const handleSelectGoal = (g: SavingGoalData) => {
    setSelectedId(g.id);
    setShowDropdown(false);
    if (g.currentAmount >= g.targetAmount) {
      setPlanText(CONGRATS_MSG);
      setLoading(false);
    } else {
      setPlanText(null);
    }
  };

  const prevGoalIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!goal || isAchieved || !planPromptPayload) return;
    if (prevGoalIdRef.current !== null && prevGoalIdRef.current !== goal.id) {
      prevGoalIdRef.current = goal.id;
      const cached = getCachedPlan(goal.id);
      if (cached) {
        setPlanText(cached);
      } else {
        fetchPlan(false);
      }
    } else if (prevGoalIdRef.current === null) {
      prevGoalIdRef.current = goal.id;
    }
  }, [goal?.id, isAchieved, planPromptPayload, fetchPlan]);

  const screenWidth = Dimensions.get('window').width;
  const cardPadding = 32;
  const scrollPadding = 40;
  const chartAreaWidth = Math.max(0, screenWidth - scrollPadding - cardPadding - Y_AXIS_WIDTH - 8);
  const chartInnerWidth = Math.max(1, chartAreaWidth - CHART_PADDING.left - CHART_PADDING.right);
  const chartInnerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const tickDates = useMemo(
    () => getTickDates(filterStart, filterEnd),
    [filterStart.getTime(), filterEnd.getTime()]
  );

  const chartData = useMemo(() => {
    const startStr = toDateStr(filterStart);
    const endStr = toDateStr(filterEnd);
    const filtered = contributions
      .filter((c) => c.date >= startStr && c.date <= endStr)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    if (filtered.length === 0)
      return tickDates.map((t) => ({ date: toDateStr(t), cumulative: 0 }));
    let cum = 0;
    const byDate: Record<string, number> = {};
    for (const c of filtered) {
      cum += c.amount;
      byDate[c.date] = cum;
    }
    const sortedDates = Object.keys(byDate).sort();
    const points: { date: string; cumulative: number }[] = [];
    for (const tick of tickDates) {
      const ds = toDateStr(tick);
      let val = 0;
      for (const d of sortedDates) {
        if (d <= ds) val = byDate[d];
      }
      points.push({ date: ds, cumulative: val });
    }
    return points;
  }, [contributions, filterStart, filterEnd, tickDates]);

  const maxCum = chartData.length > 0 ? Math.max(...chartData.map((d) => d.cumulative), 1) : 1;
  const yTicks = [0, Math.round(maxCum / 2), maxCum].filter((v, i, a) => a.indexOf(v) === i);

  const pathD = useMemo(() => {
    if (chartData.length === 0) return '';
    const w = chartInnerWidth;
    const h = chartInnerHeight;
    const left = CHART_PADDING.left;
    const top = CHART_PADDING.top;
    const bottomY = top + h;
    const points = chartData.map((d, i) => {
      const x = left + (chartData.length === 1 ? 0 : (w * i) / (chartData.length - 1));
      const y = top + h - (d.cumulative / maxCum) * h;
      return `${x},${y}`;
    });
    const firstX = left;
    return `M${firstX},${bottomY} L${points.join(' L')}`;
  }, [chartData, maxCum, chartInnerWidth, chartInnerHeight]);

  const svgWidth = Y_AXIS_WIDTH + CHART_PADDING.left + chartInnerWidth + CHART_PADDING.right;

  if (!goal) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        {goals.length > 1 ? (
          <TouchableOpacity
            style={[styles.dropdown, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}
            onPress={() => setShowDropdown(true)}
            activeOpacity={0.8}>
            <Text style={[styles.dropdownText, { color: themeColors.text }]} numberOfLines={1}>
              {goal?.title ?? 'Chọn mục tiêu'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={themeColors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Plan AI</Text>
        )}
        <TouchableOpacity
          style={[styles.reloadBtn, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}
          onPress={handleReload}
          disabled={loading || isAchieved}
          activeOpacity={0.8}>
          {loading && manualReloading ? (
            <ActivityIndicator size="small" color="#16a34a" />
          ) : (
            <MaterialIcons name="auto-awesome" size={22} color="#16a34a" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.goalCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
          <Text style={[styles.goalTitle, { color: themeColors.text }]}>{goal.title}</Text>
          <Text style={[styles.goalMeta, { color: themeColors.textSecondary }]}>
            {isAchieved ? 'Đã hoàn thành' : `Còn ${daysLeft} ngày • Để dành ${formatCurrency(dailyTarget)}/ngày`}
          </Text>
        </View>

        {isAchieved ? (
          <View style={[styles.planCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
            <Text style={[styles.planBody, { color: themeColors.text }]}>{CONGRATS_MSG}</Text>
          </View>
        ) : loading && !manualReloading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#16a34a" />
            <Text style={[styles.loadingText, { color: themeColors.textSecondary }]}>Đang lập plan...</Text>
          </View>
        ) : planText ? (
          <View style={[styles.planCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
            <Text style={[styles.planBody, { color: themeColors.text }]}>{stripAsterisks(planText)}</Text>
          </View>
        ) : null}

        <Modal visible={showDropdown} transparent animationType="fade">
          <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowDropdown(false)}>
            <View style={[styles.dropdownList, { backgroundColor: themeColors.card, borderWidth: 1, borderColor: GlassCardColors.border }]} onStartShouldSetResponder={() => true}>
              {goals.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={[styles.dropdownItem, selectedId === g.id && { backgroundColor: resolvedTheme === 'dark' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(22, 163, 74, 0.15)' }]}
                  onPress={() => handleSelectGoal(g)}
                  activeOpacity={0.7}>
                  <Text style={[styles.dropdownItemText, { color: themeColors.text }]}>{g.title}</Text>
                  {g.currentAmount >= g.targetAmount && (
                    <Text style={[styles.dropdownItemBadge, { color: '#16a34a' }]}>Hoàn thành</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={[styles.chartCard, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}>
          <Text style={[styles.chartTitle, { color: themeColors.text }]}>Xu hướng tiết kiệm</Text>

          <View style={[styles.filterRow, { backgroundColor: GlassCardColors.inner }]}>
            <TouchableOpacity
              style={[styles.filterBtn, { borderColor: themeColors.textSecondary }]}
              onPress={() => setShowDatePickerFor('start')}
              activeOpacity={0.7}>
              <MaterialIcons name="event" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.filterLabel, { color: themeColors.textSecondary }]}>Từ:</Text>
              <Text style={[styles.filterValue, { color: themeColors.text }]}>{formatDateLabel(filterStart)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, { borderColor: themeColors.textSecondary }]}
              onPress={() => setShowDatePickerFor('end')}
              activeOpacity={0.7}>
              <MaterialIcons name="event" size={16} color={themeColors.textSecondary} />
              <Text style={[styles.filterLabel, { color: themeColors.textSecondary }]}>Đến:</Text>
              <Text style={[styles.filterValue, { color: themeColors.text }]}>{formatDateLabel(filterEnd)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePickerFor && (
            <View style={Platform.OS === 'ios' ? styles.datePickerWrap : undefined}>
              <DateTimePicker
                value={showDatePickerFor === 'start' ? filterStart : filterEnd}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={showDatePickerFor === 'start' ? filterEnd : today}
                minimumDate={
                  showDatePickerFor === 'start'
                    ? (goal ? new Date(goal.startDate) : undefined)
                    : filterStart
                }
                onChange={handleDatePickerChange(showDatePickerFor)}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={[styles.datePickerDone, { backgroundColor: GlassCardColors.bg, borderWidth: 1, borderColor: GlassCardColors.border }]}
                  onPress={() => setShowDatePickerFor(null)}>
                  <Text style={{ color: '#155DFC', fontWeight: '600' }}>Xong</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {chartData.length > 0 && chartData.some((d) => d.cumulative > 0) ? (
            <View style={[styles.chartWrap, { overflow: 'hidden' }]}>
              <View style={styles.chartInner}>
                <View style={styles.yAxisLabels}>
                  {[...yTicks].reverse().map((v) => (
                    <Text key={v} style={[styles.yLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>
                      {v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}
                    </Text>
                  ))}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Svg width={svgWidth} height={CHART_HEIGHT}>
                    <Path
                      d={pathD}
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                  <View style={[styles.chartLabels, { paddingLeft: CHART_PADDING.left }]}>
                    {tickDates.map((d, i) => (
                      <View key={i} style={{ flex: tickDates.length === 1 ? 0 : 1 }}>
                        <Text style={[styles.chartLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>
                          {formatDateLabel(d)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <Text style={[styles.chartEmpty, { color: themeColors.textSecondary }]}>Chưa có dữ liệu trong khoảng đã chọn</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  dropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  dropdownText: { fontSize: 16, fontWeight: '600', flex: 1 },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  dropdownList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dropdownItemText: { fontSize: 16 },
  dropdownItemBadge: { fontSize: 12, fontWeight: '600' },
  reloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  goalCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  goalTitle: { fontSize: 18, fontWeight: '600' },
  goalMeta: { fontSize: 14, marginTop: 4 },
  loadingWrap: { alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 12 },
  planCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  planBody: { fontSize: 15, lineHeight: 24 },
  chartCard: {
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  chartTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
  },
  filterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 12 },
  filterValue: { fontSize: 12, fontWeight: '600', flex: 1 },
  chartWrap: { marginTop: 0 },
  chartInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  yAxisLabels: {
    width: Y_AXIS_WIDTH,
    justifyContent: 'space-between',
    paddingVertical: CHART_PADDING.top,
    marginRight: 4,
  },
  yLabel: { fontSize: 10 },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingRight: CHART_PADDING.right,
  },
  chartLabel: { fontSize: 10 },
  chartEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  datePickerWrap: { marginBottom: 8 },
  datePickerDone: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
});
