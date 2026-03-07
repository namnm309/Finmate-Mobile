import * as FileSystem from 'expo-file-system/legacy';

const TRIPS_FILE = 'trip_events.json';
const EXPENSES_FILE = 'trip_expenses.json';

function getTripsPath(): string {
  return `${FileSystem.documentDirectory}${TRIPS_FILE}`;
}

function getExpensesPath(): string {
  return `${FileSystem.documentDirectory}${EXPENSES_FILE}`;
}

export type TripEventType = 'du_lich' | 'tiec' | 'dam_cuoi' | 'khac';

export interface TripEvent {
  id: string;
  name: string;
  type: TripEventType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  budget: number; // 0 = không giới hạn
  notes?: string;
  createdAt: string; // ISO
}

export interface TripExpense {
  id: string;
  tripId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  description: string;
  createdAt: string; // ISO
}

export const TRIP_TYPE_LABELS: Record<TripEventType, string> = {
  du_lich: 'Du lịch',
  tiec: 'Tiệc',
  dam_cuoi: 'Đám cưới',
  khac: 'Khác',
};

export async function loadTripEvents(): Promise<TripEvent[]> {
  try {
    const uri = getTripsPath();
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory) return [];
    const text = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(text || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadTripExpenses(): Promise<TripExpense[]> {
  try {
    const uri = getExpensesPath();
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory) return [];
    const text = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(text || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addTripEvent(
  data: Omit<TripEvent, 'id' | 'createdAt'>
): Promise<TripEvent> {
  const trips = await loadTripEvents();
  const newTrip: TripEvent = {
    ...data,
    id: `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  trips.unshift(newTrip);
  await FileSystem.writeAsStringAsync(getTripsPath(), JSON.stringify(trips, null, 0));
  return newTrip;
}

export async function updateTripEvent(
  id: string,
  updates: Partial<Omit<TripEvent, 'id' | 'createdAt'>>
): Promise<void> {
  const trips = await loadTripEvents();
  const idx = trips.findIndex((t) => t.id === id);
  if (idx === -1) return;
  trips[idx] = { ...trips[idx], ...updates };
  await FileSystem.writeAsStringAsync(getTripsPath(), JSON.stringify(trips, null, 0));
}

export async function deleteTripEvent(id: string): Promise<void> {
  const trips = await loadTripEvents();
  const filtered = trips.filter((t) => t.id !== id);
  await FileSystem.writeAsStringAsync(getTripsPath(), JSON.stringify(filtered, null, 0));
  const expenses = await loadTripExpenses();
  const filteredExp = expenses.filter((e) => e.tripId !== id);
  await FileSystem.writeAsStringAsync(getExpensesPath(), JSON.stringify(filteredExp, null, 0));
}

export async function addTripExpense(
  data: Omit<TripExpense, 'id' | 'createdAt'>
): Promise<TripExpense> {
  const expenses = await loadTripExpenses();
  const newExp: TripExpense = {
    ...data,
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  expenses.unshift(newExp);
  await FileSystem.writeAsStringAsync(getExpensesPath(), JSON.stringify(expenses, null, 0));
  return newExp;
}

export async function deleteTripExpense(id: string): Promise<void> {
  const expenses = await loadTripExpenses();
  const filtered = expenses.filter((e) => e.id !== id);
  await FileSystem.writeAsStringAsync(getExpensesPath(), JSON.stringify(filtered, null, 0));
}
