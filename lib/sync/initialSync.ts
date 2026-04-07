/**
 * Initial Sync
 * Runs when a user logs in on a new device (or first time after offline-first update).
 * Downloads all data from server and populates local SQLite.
 */
import { API_BASE_URL } from '@/lib/api';
import { getDb } from '@/lib/db/database';
import { SYNC_STATUS } from '@/lib/db/schema';
import { isOnline } from '@/lib/sync/networkMonitor';

// Repositories
import * as refDataRepo from '@/lib/db/repositories/referenceDataRepository';
import * as categoryRepo from '@/lib/db/repositories/categoryRepository';
import * as moneySourceRepo from '@/lib/db/repositories/moneySourceRepository';
import * as transactionRepo from '@/lib/db/repositories/transactionRepository';
import * as goalRepo from '@/lib/db/repositories/goalRepository';
import * as savingsBookRepo from '@/lib/db/repositories/savingsBookRepository';

// Types
import type { TransactionListResponseDto } from '@/lib/types/transaction';

const INITIAL_SYNC_DONE_KEY = 'initial_sync_done';

/**
 * Check if initial sync has been completed
 */
export async function isInitialSyncDone(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    "SELECT value FROM _sync_meta WHERE key = ?",
    [INITIAL_SYNC_DONE_KEY]
  );
  return row?.value === 'true';
}

/**
 * Run initial sync — pull everything from server into local SQLite
 * @param getToken Function to get auth token
 */
export async function runInitialSync(getToken: () => Promise<string | null>): Promise<{
  success: boolean;
  error?: string;
}> {
  if (await isInitialSyncDone()) {
    if (__DEV__) console.log('[InitialSync] Already done, skipping');
    return { success: true };
  }

  if (!isOnline()) {
    if (__DEV__) console.log('[InitialSync] Offline, will retry later');
    return { success: false, error: 'Không có kết nối mạng. Dữ liệu sẽ được tải khi có mạng.' };
  }

  if (__DEV__) console.log('[InitialSync] Starting initial data download...');

  try {
    const token = await getToken();
    if (!token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const apiFetch = async <T>(url: string): Promise<T> => {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`API ${res.status}`);
      return res.json();
    };

    // 1. Reference data
    if (__DEV__) console.log('[InitialSync] Downloading reference data...');

    try {
      const types = await apiFetch<any[]>(`${API_BASE_URL}/api/transaction-types`);
      await refDataRepo.upsertTransactionTypes(types);
    } catch (e) { if (__DEV__) console.warn('[InitialSync] transaction-types:', e); }

    try {
      const accTypes = await apiFetch<any[]>(`${API_BASE_URL}/api/account-types`);
      await refDataRepo.upsertAccountTypes(accTypes);
    } catch (e) { if (__DEV__) console.warn('[InitialSync] account-types:', e); }

    try {
      const banks = await apiFetch<any[]>(`${API_BASE_URL}/api/banks`);
      await refDataRepo.upsertBanks(banks);
    } catch (e) { if (__DEV__) console.warn('[InitialSync] banks:', e); }

    try {
      const currencies = await apiFetch<any[]>(`${API_BASE_URL}/api/currencies`);
      await refDataRepo.upsertCurrencies(currencies);
    } catch (e) { if (__DEV__) console.warn('[InitialSync] currencies:', e); }

    // 2. User data
    if (__DEV__) console.log('[InitialSync] Downloading user data...');

    try {
      const categories = await apiFetch<any[]>(`${API_BASE_URL}/api/categories`);
      for (const cat of categories) {
        await categoryRepo.upsertCategoryFromServer(cat);
      }
      if (__DEV__) console.log(`[InitialSync] ${categories.length} categories`);
    } catch (e) { if (__DEV__) console.warn('[InitialSync] categories:', e); }

    try {
      const moneySources = await apiFetch<any[]>(`${API_BASE_URL}/api/money-sources`);
      for (const ms of moneySources) {
        await moneySourceRepo.upsertMoneySourceFromServer(ms);
      }
      if (__DEV__) console.log(`[InitialSync] ${moneySources.length} money sources`);
    } catch (e) { if (__DEV__) console.warn('[InitialSync] money-sources:', e); }

    try {
      const txResp = await apiFetch<TransactionListResponseDto>(`${API_BASE_URL}/api/transactions?pageSize=1000`);
      for (const tx of txResp.transactions) {
        await transactionRepo.upsertTransactionFromServer(tx);
      }
      if (__DEV__) console.log(`[InitialSync] ${txResp.transactions.length} transactions`);
    } catch (e) { if (__DEV__) console.warn('[InitialSync] transactions:', e); }

    try {
      const goals = await apiFetch<any[]>(`${API_BASE_URL}/api/goals`);
      for (const g of goals) {
        await goalRepo.upsertGoalFromServer(g);
      }
      if (__DEV__) console.log(`[InitialSync] ${goals.length} goals`);
    } catch (e) { if (__DEV__) console.warn('[InitialSync] goals:', e); }

    try {
      const savingsBooks = await apiFetch<any[]>(`${API_BASE_URL}/api/savings-books`);
      for (const sb of savingsBooks) {
        await savingsBookRepo.upsertSavingsBookFromServer(sb);
      }
      if (__DEV__) console.log(`[InitialSync] ${savingsBooks.length} savings books`);
    } catch (e) { if (__DEV__) console.warn('[InitialSync] savings-books:', e); }

    // 3. Mark initial sync done
    const db = await getDb();
    await db.runAsync(
      "INSERT OR REPLACE INTO _sync_meta (key, value) VALUES (?, 'true')",
      [INITIAL_SYNC_DONE_KEY]
    );

    // 4. Set last sync time
    await db.runAsync(
      "INSERT OR REPLACE INTO _sync_meta (key, value) VALUES ('last_sync_time', ?)",
      [new Date().toISOString()]
    );

    if (__DEV__) console.log('[InitialSync] ✅ Initial sync completed!');
    return { success: true };

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[InitialSync] Failed:', msg);
    return { success: false, error: msg };
  }
}

/**
 * Reset initial sync flag (for testing or re-sync)
 */
export async function resetInitialSync(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM _sync_meta WHERE key = ?", [INITIAL_SYNC_DONE_KEY]);
}
