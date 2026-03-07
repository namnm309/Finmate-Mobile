import * as FileSystem from 'expo-file-system/legacy';

const STORAGE_FILE = 'counterparty_entries.json';

function getStoragePath(): string {
  return `${FileSystem.documentDirectory}${STORAGE_FILE}`;
}

export type CounterpartyType = 'Thu' | 'Chi';

export interface CounterpartyEntry {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  eventName: string;
  amount: number;
  type: CounterpartyType;
  createdAt: string; // ISO string
}

export async function loadCounterpartyEntries(): Promise<CounterpartyEntry[]> {
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

export async function saveCounterpartyEntries(entries: CounterpartyEntry[]): Promise<void> {
  try {
    const uri = getStoragePath();
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(entries, null, 0));
  } catch {
    throw new Error('Không thể lưu dữ liệu');
  }
}

export async function addCounterpartyEntry(
  entry: Omit<CounterpartyEntry, 'id' | 'createdAt'>
): Promise<CounterpartyEntry> {
  const entries = await loadCounterpartyEntries();
  const newEntry: CounterpartyEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  entries.unshift(newEntry);
  await saveCounterpartyEntries(entries);
  return newEntry;
}

export async function deleteCounterpartyEntry(id: string): Promise<void> {
  const entries = await loadCounterpartyEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await saveCounterpartyEntries(filtered);
}
