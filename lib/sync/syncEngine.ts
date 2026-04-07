/**
 * Sync Engine
 * Handles bi-directional sync between local SQLite and remote API.
 * 
 * Push: local pending changes → server API
 * Pull: server data → local SQLite
 */
import { API_BASE_URL } from '@/lib/api';
import { SYNC_STATUS } from '@/lib/db/schema';
import { getDb } from '@/lib/db/database';
import { isOnline } from './networkMonitor';

// Repositories
import * as transactionRepo from '@/lib/db/repositories/transactionRepository';
import * as moneySourceRepo from '@/lib/db/repositories/moneySourceRepository';
import * as categoryRepo from '@/lib/db/repositories/categoryRepository';
import * as goalRepo from '@/lib/db/repositories/goalRepository';
import * as savingsBookRepo from '@/lib/db/repositories/savingsBookRepository';
import * as refDataRepo from '@/lib/db/repositories/referenceDataRepository';

// Types
import type { TransactionDto, TransactionListResponseDto } from '@/lib/types/transaction';
import type { MoneySourceDto, MoneySourceGroupedResponseDto } from '@/lib/types/moneySource';
import type { CategoryDto } from '@/lib/types/transaction';
import type { GoalDto } from '@/lib/types/goal';
import type { SavingsBookDto } from '@/lib/types/savingsBook';

export type SyncState = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  errors: string[];
}

type SyncListener = (state: SyncState, result?: SyncResult) => void;

let _syncState: SyncState = 'idle';
let _isSyncing = false;
let _listeners = new Set<SyncListener>();
let _getTokenFn: (() => Promise<string | null>) | null = null;

// ============================================================
// Configuration
// ============================================================

export function configureSyncEngine(getToken: () => Promise<string | null>): void {
  _getTokenFn = getToken;
}

export function onSyncStateChange(listener: SyncListener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

export function getSyncState(): SyncState {
  return _syncState;
}

function setSyncState(state: SyncState, result?: SyncResult): void {
  _syncState = state;
  _listeners.forEach((fn) => fn(state, result));
}

// ============================================================
// Auth helper
// ============================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_getTokenFn) {
    const token = await _getTokenFn();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> || {}) },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text.substring(0, 200)}`);
  }
  return response.json();
}

// ============================================================
// Full Sync (push + pull)
// ============================================================

export async function fullSync(): Promise<SyncResult> {
  if (_isSyncing) {
    if (__DEV__) console.log('[Sync] Already syncing, skipping...');
    return { success: true, pushed: 0, pulled: 0, errors: [] };
  }

  if (!isOnline()) {
    setSyncState('offline');
    return { success: false, pushed: 0, pulled: 0, errors: ['Không có kết nối mạng'] };
  }

  _isSyncing = true;
  setSyncState('syncing');

  const result: SyncResult = { success: true, pushed: 0, pulled: 0, errors: [] };

  try {
    // 1. Push local changes first (order matters: categories → money sources → transactions → goals → savings)
    const pushResult = await pushAllPendingChanges();
    result.pushed = pushResult.pushed;
    result.errors.push(...pushResult.errors);

    // 2. Pull from server
    const pullResult = await pullAllFromServer();
    result.pulled = pullResult.pulled;
    result.errors.push(...pullResult.errors);

    // 3. Update last sync time
    await setLastSyncTime(new Date().toISOString());

    result.success = result.errors.length === 0;
    setSyncState(result.success ? 'idle' : 'error', result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(msg);
    result.success = false;
    setSyncState('error', result);
    console.error('[Sync] Full sync failed:', msg);
  } finally {
    _isSyncing = false;
  }

  if (__DEV__) console.log('[Sync] Complete:', result);
  return result;
}

// ============================================================
// Push: local → server
// ============================================================

async function pushAllPendingChanges(): Promise<{ pushed: number; errors: string[] }> {
  let pushed = 0;
  const errors: string[] = [];

  // Push categories first (transactions depend on them)
  const catResult = await pushPendingEntity(
    'categories',
    () => categoryRepo.getPendingCategories(),
    pushCategory,
  );
  pushed += catResult.pushed;
  errors.push(...catResult.errors);

  // Push money sources (transactions depend on them)
  const msResult = await pushPendingEntity(
    'money_sources',
    () => moneySourceRepo.getPendingMoneySources(),
    pushMoneySource,
  );
  pushed += msResult.pushed;
  errors.push(...msResult.errors);

  // Push transactions
  const txResult = await pushPendingEntity(
    'transactions',
    () => transactionRepo.getPendingTransactions(),
    pushTransaction,
  );
  pushed += txResult.pushed;
  errors.push(...txResult.errors);

  // Push goals
  const goalResult = await pushPendingEntity(
    'goals',
    () => goalRepo.getPendingGoals(),
    pushGoal,
  );
  pushed += goalResult.pushed;
  errors.push(...goalResult.errors);

  // Push savings books
  const sbResult = await pushPendingEntity(
    'savings_books',
    () => savingsBookRepo.getPendingSavingsBooks(),
    pushSavingsBook,
  );
  pushed += sbResult.pushed;
  errors.push(...sbResult.errors);

  return { pushed, errors };
}

async function pushPendingEntity(
  entityName: string,
  getPending: () => Promise<any[]>,
  pushFn: (record: any) => Promise<void>,
): Promise<{ pushed: number; errors: string[] }> {
  let pushed = 0;
  const errors: string[] = [];

  try {
    const pending = await getPending();
    if (__DEV__ && pending.length > 0) {
      console.log(`[Sync] Pushing ${pending.length} ${entityName}...`);
    }

    for (const record of pending) {
      try {
        await pushFn(record);
        pushed++;
      } catch (error) {
        const msg = `[${entityName}] ${error instanceof Error ? error.message : String(error)}`;
        errors.push(msg);
        if (__DEV__) console.error(`[Sync] Push error:`, msg);
      }
    }
  } catch (error) {
    errors.push(`[${entityName}] Failed to get pending: ${error}`);
  }

  return { pushed, errors };
}

// ---- Individual Push Functions ----

async function pushCategory(record: any): Promise<void> {
  const { _sync_status, local_id, server_id } = record;

  if (_sync_status === SYNC_STATUS.PENDING_CREATE) {
    const body = {
      transactionTypeId: record.transaction_type_id,
      name: record.name,
      icon: record.icon,
      parentCategoryId: record.parent_category_id || undefined,
    };
    const created = await apiFetch<CategoryDto>(`${API_BASE_URL}/api/categories`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    await categoryRepo.markCategorySynced(local_id, created.id, created.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_UPDATE && server_id) {
    const body = { name: record.name, icon: record.icon, parentCategoryId: record.parent_category_id || undefined };
    const updated = await apiFetch<CategoryDto>(`${API_BASE_URL}/api/categories/${server_id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    await categoryRepo.markCategorySynced(local_id, updated.id, updated.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_DELETE && server_id) {
    await apiFetch(`${API_BASE_URL}/api/categories/${server_id}`, { method: 'DELETE' });
    await categoryRepo.removeCategoryLocally(local_id);
  }
}

async function pushMoneySource(record: any): Promise<void> {
  const { _sync_status, local_id, server_id } = record;

  if (_sync_status === SYNC_STATUS.PENDING_CREATE) {
    const body = {
      accountTypeId: record.account_type_id,
      name: record.name,
      icon: record.icon,
      color: record.color,
      balance: record.balance,
      currency: record.currency,
    };
    const created = await apiFetch<MoneySourceDto>(`${API_BASE_URL}/api/money-sources`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    await moneySourceRepo.markMoneySourceSynced(local_id, created.id, created.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_UPDATE && server_id) {
    const body = {
      accountTypeId: record.account_type_id,
      name: record.name,
      icon: record.icon,
      color: record.color,
      balance: record.balance,
      currency: record.currency,
      isActive: !!record.is_active,
    };
    const updated = await apiFetch<MoneySourceDto>(`${API_BASE_URL}/api/money-sources/${server_id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    await moneySourceRepo.markMoneySourceSynced(local_id, updated.id, updated.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_DELETE && server_id) {
    await apiFetch(`${API_BASE_URL}/api/money-sources/${server_id}`, { method: 'DELETE' });
    await moneySourceRepo.removeMoneySourceLocally(local_id);
  }
}

async function pushTransaction(record: any): Promise<void> {
  const { _sync_status, local_id, server_id } = record;
  const db = await getDb();

  // Resolve server IDs for foreign keys
  const msRow = await db.getFirstAsync<any>(
    'SELECT server_id FROM money_sources WHERE local_id = ? OR server_id = ?',
    [record.money_source_id, record.money_source_id]
  );
  const catRow = await db.getFirstAsync<any>(
    'SELECT server_id FROM categories WHERE local_id = ? OR server_id = ?',
    [record.category_id, record.category_id]
  );

  const moneySourceServerId = msRow?.server_id || record.money_source_id;
  const categoryServerId = catRow?.server_id || record.category_id;

  if (_sync_status === SYNC_STATUS.PENDING_CREATE) {
    const body = {
      transactionTypeId: record.transaction_type_id,
      moneySourceId: moneySourceServerId,
      categoryId: categoryServerId,
      contactId: record.contact_id || undefined,
      amount: record.amount,
      transactionDate: record.transaction_date,
      description: record.description || undefined,
      isBorrowingForThis: !!record.is_borrowing_for_this,
      isFee: !!record.is_fee,
      excludeFromReport: !!record.exclude_from_report,
    };
    const created = await apiFetch<any>(`${API_BASE_URL}/api/transactions`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    await transactionRepo.markTransactionSynced(local_id, created.id, created.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_UPDATE && server_id) {
    const body = {
      transactionTypeId: record.transaction_type_id,
      moneySourceId: moneySourceServerId,
      categoryId: categoryServerId,
      contactId: record.contact_id || undefined,
      amount: record.amount,
      transactionDate: record.transaction_date,
      description: record.description || undefined,
      isBorrowingForThis: !!record.is_borrowing_for_this,
      isFee: !!record.is_fee,
      excludeFromReport: !!record.exclude_from_report,
    };
    const updated = await apiFetch<any>(`${API_BASE_URL}/api/transactions/${server_id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    await transactionRepo.markTransactionSynced(local_id, updated.id, updated.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_DELETE && server_id) {
    await apiFetch(`${API_BASE_URL}/api/transactions/${server_id}`, { method: 'DELETE' });
    await transactionRepo.removeTransactionLocally(local_id);
  }
}

async function pushGoal(record: any): Promise<void> {
  const { _sync_status, local_id, server_id } = record;

  if (_sync_status === SYNC_STATUS.PENDING_CREATE) {
    const body = {
      title: record.title,
      description: record.description || undefined,
      targetAmount: record.target_amount,
      currentAmount: record.current_amount,
      targetDate: record.target_date || undefined,
      currency: record.currency,
      icon: record.icon,
      color: record.color,
    };
    const created = await apiFetch<GoalDto>(`${API_BASE_URL}/api/goals`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    await goalRepo.markGoalSynced(local_id, created.id, created.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_UPDATE && server_id) {
    const body = {
      title: record.title,
      description: record.description || undefined,
      targetAmount: record.target_amount,
      currentAmount: record.current_amount,
      targetDate: record.target_date || undefined,
      status: record.status,
      currency: record.currency,
      icon: record.icon,
      color: record.color,
      isActive: !!record.is_active,
    };
    const updated = await apiFetch<GoalDto>(`${API_BASE_URL}/api/goals/${server_id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    await goalRepo.markGoalSynced(local_id, updated.id, updated.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_DELETE && server_id) {
    await apiFetch(`${API_BASE_URL}/api/goals/${server_id}`, { method: 'DELETE' });
    await goalRepo.removeGoalLocally(local_id);
  }
}

async function pushSavingsBook(record: any): Promise<void> {
  const { _sync_status, local_id, server_id } = record;

  if (_sync_status === SYNC_STATUS.PENDING_CREATE) {
    const body = {
      name: record.name,
      bankId: record.bank_id,
      currency: record.currency,
      depositDate: record.deposit_date,
      termMonths: record.term_months,
      interestRate: record.interest_rate,
      nonTermInterestRate: record.non_term_interest_rate,
      daysInYearForInterest: record.days_in_year_for_interest,
      interestPaymentType: record.interest_payment_type,
      maturityOption: record.maturity_option,
      sourceMoneySourceId: record.source_money_source_id || undefined,
      description: record.description || undefined,
      excludeFromReports: !!record.exclude_from_reports,
      initialBalance: record.initial_balance,
    };
    const created = await apiFetch<SavingsBookDto>(`${API_BASE_URL}/api/savings-books`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    await savingsBookRepo.markSavingsBookSynced(local_id, created.id, created.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_UPDATE && server_id) {
    const body = {
      name: record.name,
      bankId: record.bank_id,
      currency: record.currency,
      depositDate: record.deposit_date,
      termMonths: record.term_months,
      interestRate: record.interest_rate,
      nonTermInterestRate: record.non_term_interest_rate,
      daysInYearForInterest: record.days_in_year_for_interest,
      interestPaymentType: record.interest_payment_type,
      maturityOption: record.maturity_option,
      description: record.description || undefined,
      excludeFromReports: !!record.exclude_from_reports,
    };
    const updated = await apiFetch<SavingsBookDto>(`${API_BASE_URL}/api/savings-books/${server_id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    await savingsBookRepo.markSavingsBookSynced(local_id, updated.id, updated.updatedAt);
  } else if (_sync_status === SYNC_STATUS.PENDING_DELETE && server_id) {
    await apiFetch(`${API_BASE_URL}/api/savings-books/${server_id}`, { method: 'DELETE' });
    await savingsBookRepo.removeSavingsBookLocally(local_id);
  }
}

// ============================================================
// Pull: server → local
// ============================================================

async function pullAllFromServer(): Promise<{ pulled: number; errors: string[] }> {
  let pulled = 0;
  const errors: string[] = [];

  // 1. Pull reference data first
  try {
    const transTypes = await apiFetch<any[]>(`${API_BASE_URL}/api/transaction-types`);
    await refDataRepo.upsertTransactionTypes(transTypes);
    pulled += transTypes.length;
  } catch (e) { errors.push(`[transactionTypes] ${e}`); }

  try {
    const accTypes = await apiFetch<any[]>(`${API_BASE_URL}/api/account-types`);
    await refDataRepo.upsertAccountTypes(accTypes);
    pulled += accTypes.length;
  } catch (e) { errors.push(`[accountTypes] ${e}`); }

  try {
    const banks = await apiFetch<any[]>(`${API_BASE_URL}/api/banks`);
    await refDataRepo.upsertBanks(banks);
    pulled += banks.length;
  } catch (e) { errors.push(`[banks] ${e}`); }

  try {
    const currencies = await apiFetch<any[]>(`${API_BASE_URL}/api/currencies`);
    await refDataRepo.upsertCurrencies(currencies);
    pulled += currencies.length;
  } catch (e) { errors.push(`[currencies] ${e}`); }

  // 2. Pull user data
  try {
    const categories = await apiFetch<CategoryDto[]>(`${API_BASE_URL}/api/categories`);
    for (const cat of categories) {
      await categoryRepo.upsertCategoryFromServer(cat);
    }
    pulled += categories.length;
    // Clean up server-deleted categories
    await cleanDeletedFromServer('categories', categories.map(c => c.id));
  } catch (e) { errors.push(`[categories] ${e}`); }

  try {
    const moneySources = await apiFetch<MoneySourceDto[]>(`${API_BASE_URL}/api/money-sources`);
    for (const ms of moneySources) {
      await moneySourceRepo.upsertMoneySourceFromServer(ms);
    }
    pulled += moneySources.length;
    await cleanDeletedFromServer('money_sources', moneySources.map(m => m.id));
  } catch (e) { errors.push(`[moneySources] ${e}`); }

  try {
    // Pull transactions with large page size
    const txResp = await apiFetch<TransactionListResponseDto>(
      `${API_BASE_URL}/api/transactions?pageSize=1000`
    );
    for (const tx of txResp.transactions) {
      await transactionRepo.upsertTransactionFromServer(tx);
    }
    pulled += txResp.transactions.length;
    await cleanDeletedFromServer('transactions', txResp.transactions.map(t => t.id));
  } catch (e) { errors.push(`[transactions] ${e}`); }

  try {
    const goals = await apiFetch<GoalDto[]>(`${API_BASE_URL}/api/goals`);
    for (const g of goals) {
      await goalRepo.upsertGoalFromServer(g);
    }
    pulled += goals.length;
    await cleanDeletedFromServer('goals', goals.map(g => g.id));
  } catch (e) { errors.push(`[goals] ${e}`); }

  try {
    const savingsBooks = await apiFetch<SavingsBookDto[]>(`${API_BASE_URL}/api/savings-books`);
    for (const sb of savingsBooks) {
      await savingsBookRepo.upsertSavingsBookFromServer(sb);
    }
    pulled += savingsBooks.length;
    await cleanDeletedFromServer('savings_books', savingsBooks.map(s => s.id));
  } catch (e) { errors.push(`[savingsBooks] ${e}`); }

  return { pulled, errors };
}

/**
 * Remove locally-synced records that no longer exist on server
 * (i.e., deleted on another device)
 */
async function cleanDeletedFromServer(table: string, serverIds: string[]): Promise<void> {
  if (serverIds.length === 0) return;

  const db = await getDb();
  // Get all synced records with server_id
  const localRecords = await db.getAllAsync<any>(
    `SELECT local_id, server_id FROM ${table} WHERE server_id IS NOT NULL AND _sync_status = ?`,
    [SYNC_STATUS.SYNCED]
  );

  const serverIdSet = new Set(serverIds);
  for (const record of localRecords) {
    if (record.server_id && !serverIdSet.has(record.server_id)) {
      // Server deleted this record
      await db.runAsync(`DELETE FROM ${table} WHERE local_id = ?`, [record.local_id]);
      if (__DEV__) console.log(`[Sync] Cleaned deleted ${table}: ${record.server_id}`);
    }
  }
}

// ============================================================
// Sync metadata helpers
// ============================================================

export async function getLastSyncTime(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    "SELECT value FROM _sync_meta WHERE key = 'last_sync_time'"
  );
  return row?.value ?? null;
}

async function setLastSyncTime(time: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO _sync_meta (key, value) VALUES ('last_sync_time', ?)",
    [time]
  );
}

export async function getPendingChangesCount(): Promise<number> {
  const db = await getDb();
  let total = 0;

  const tables = ['categories', 'money_sources', 'transactions', 'goals', 'savings_books'];
  for (const table of tables) {
    const result = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE _sync_status != ?`,
      [SYNC_STATUS.SYNCED]
    );
    total += result?.cnt ?? 0;
  }

  return total;
}
