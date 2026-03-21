import * as FileSystem from 'expo-file-system/legacy';

import type { MonthlyExpense, MonthlyExpenseNotification } from '@/lib/types/monthlyExpense';

const EXPENSES_FILE = 'monthly_expenses.json';
const PROCESSED_FILE = 'monthly_expenses_last_processed.txt';
const NOTIFICATIONS_FILE = 'monthly_expense_notifications.json';

function getPath(filename: string): string {
  return `${FileSystem.documentDirectory}${filename}`;
}

async function getJson<T>(path: string, defaultValue: T): Promise<T> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists || info.isDirectory) return defaultValue;
    const raw = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(raw || 'null') as T;
    return parsed ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

async function setJson<T>(path: string, value: T): Promise<void> {
  await FileSystem.writeAsStringAsync(path, JSON.stringify(value));
}

export async function loadMonthlyExpenses(): Promise<MonthlyExpense[]> {
  const parsed = await getJson<unknown>(getPath(EXPENSES_FILE), []);
  return Array.isArray(parsed) ? (parsed as MonthlyExpense[]) : [];
}

export async function saveMonthlyExpenses(expenses: MonthlyExpense[]): Promise<void> {
  await setJson(getPath(EXPENSES_FILE), expenses);
}

export async function addMonthlyExpense(data: Omit<MonthlyExpense, 'id' | 'createdAt'>): Promise<MonthlyExpense> {
  const list = await loadMonthlyExpenses();
  const newItem: MonthlyExpense = {
    ...data,
    id: `me-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  list.push(newItem);
  await saveMonthlyExpenses(list);
  return newItem;
}

export async function updateMonthlyExpense(id: string, data: Partial<Omit<MonthlyExpense, 'id' | 'createdAt'>>): Promise<void> {
  const list = await loadMonthlyExpenses();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...data };
  await saveMonthlyExpenses(list);
}

export async function removeMonthlyExpense(id: string): Promise<void> {
  const list = await loadMonthlyExpenses();
  await saveMonthlyExpenses(list.filter((e) => e.id !== id));
}

export async function getLastProcessedMonth(): Promise<string | null> {
  try {
    const path = getPath(PROCESSED_FILE);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists || info.isDirectory) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    return (raw || '').trim() || null;
  } catch {
    return null;
  }
}

export async function setLastProcessedMonth(ym: string): Promise<void> {
  await FileSystem.writeAsStringAsync(getPath(PROCESSED_FILE), ym);
}

export async function loadDeductionNotifications(): Promise<MonthlyExpenseNotification[]> {
  const parsed = await getJson<unknown>(getPath(NOTIFICATIONS_FILE), []);
  return Array.isArray(parsed) ? (parsed as MonthlyExpenseNotification[]) : [];
}

export async function addDeductionNotification(notif: Omit<MonthlyExpenseNotification, 'id' | 'read'>): Promise<void> {
  const list = await loadDeductionNotifications();
  const newItem: MonthlyExpenseNotification = {
    ...notif,
    id: `men-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    read: false,
  };
  list.unshift(newItem);
  if (list.length > 50) list.length = 50;
  await setJson(getPath(NOTIFICATIONS_FILE), list);
}

export async function markDeductionNotificationsRead(): Promise<void> {
  const list = await loadDeductionNotifications();
  for (const n of list) n.read = true;
  await setJson(getPath(NOTIFICATIONS_FILE), list);
}
