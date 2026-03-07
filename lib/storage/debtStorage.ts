import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_FILE = 'debt_entries.json';

function getStoragePath(): string {
  return `${FileSystem.documentDirectory}${STORAGE_FILE}`;
}

export interface DebtEntry {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  amount: number;
  notes: string;
  creditor: string; // Tên chủ nợ (preset hoặc custom)
  createdAt: string; // ISO string
}

export const CREDITOR_PRESETS = {
  banks: [
    'Vietcombank',
    'VietinBank',
    'BIDV',
    'Techcombank',
    'VPBank',
    'MB Bank',
    'ACB',
    'TPBank',
    'Shinhan Bank',
    'HDBank',
    'MSB',
    'OCB',
    'Sacombank',
    'VietCapital Bank',
    'VIB',
  ],
  finance: [
    'FE Credit',
    'Home Credit',
    'HD SAISON',
    'Mirae Asset Finance',
    'Prudential Finance',
    'OCB Finance',
    'Shinhan Finance',
  ],
} as const;

export const CREDITOR_OTHER = 'Khác';

export async function loadDebtEntries(): Promise<DebtEntry[]> {
  try {
    const uri = getStoragePath();
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || info.isDirectory) return [];
    const text = await FileSystem.readAsStringAsync(uri);
    const parsed = JSON.parse(text || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDebtEntries(entries: DebtEntry[]): Promise<void> {
  try {
    const uri = getStoragePath();
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(entries, null, 0));
  } catch {
    throw new Error('Không thể lưu dữ liệu');
  }
}

export async function addDebtEntry(
  entry: Omit<DebtEntry, 'id' | 'createdAt'>
): Promise<DebtEntry> {
  const entries = await loadDebtEntries();
  const newEntry: DebtEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  entries.unshift(newEntry);
  await saveDebtEntries(entries);
  return newEntry;
}

export async function deleteDebtEntry(id: string): Promise<void> {
  const entries = await loadDebtEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await saveDebtEntries(filtered);
}
