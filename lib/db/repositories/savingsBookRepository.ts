/**
 * Savings Book Repository — Offline-First CRUD
 */
import { getDb, generateLocalId, sanitizeParams } from '../database';
import { SYNC_STATUS } from '../schema';
import type {
  SavingsBookDto,
  CreateSavingsBookRequest,
  UpdateSavingsBookRequest,
} from '@/lib/types/savingsBook';

// ============================================================
// Read
// ============================================================

export async function getAllSavingsBooks(): Promise<SavingsBookDto[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM savings_books WHERE _sync_status != ? ORDER BY created_at DESC',
    [SYNC_STATUS.PENDING_DELETE]
  );
  return rows.map(mapSavingsBook);
}

export async function getSavingsBookById(localId: string): Promise<SavingsBookDto | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM savings_books WHERE (local_id = ? OR server_id = ?) AND _sync_status != ?',
    [localId, localId, SYNC_STATUS.PENDING_DELETE]
  );
  return row ? mapSavingsBook(row) : null;
}

// ============================================================
// Write (offline-first)
// ============================================================

export async function createSavingsBook(data: CreateSavingsBookRequest, userId: string): Promise<SavingsBookDto> {
  const db = await getDb();
  const now = new Date().toISOString();
  const localId = generateLocalId();

  // Get bank name
  const bankRow = await db.getFirstAsync<any>('SELECT name FROM banks WHERE id = ?', [data.bankId]);

  // Calculate maturity date
  const depositDate = new Date(data.depositDate);
  const maturityDate = new Date(depositDate);
  maturityDate.setMonth(maturityDate.getMonth() + data.termMonths);

  await db.runAsync(
    `INSERT INTO savings_books (
      local_id, user_id, bank_id, bank_name, name, currency, deposit_date, term_months,
      interest_rate, non_term_interest_rate, days_in_year_for_interest,
      interest_payment_type, maturity_option, source_money_source_id,
      description, exclude_from_reports, initial_balance, current_balance,
      maturity_date, status, created_at, updated_at, _sync_status, _local_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?)`,
    sanitizeParams([
      localId, userId, data.bankId, bankRow?.name ?? '',
      data.name, data.currency ?? 'VND', data.depositDate, data.termMonths,
      data.interestRate ?? 0, data.nonTermInterestRate ?? 0, data.daysInYearForInterest ?? 365,
      data.interestPaymentType ?? 'CuoiKy', data.maturityOption ?? 'TaiTucGocVaLai',
      data.sourceMoneySourceId ?? null,
      data.description ?? null, data.excludeFromReports ? 1 : 0,
      data.initialBalance ?? 0, data.initialBalance ?? 0,
      maturityDate.toISOString(), now, now, SYNC_STATUS.PENDING_CREATE, now,
    ])
  );

  return (await getSavingsBookById(localId))!;
}

export async function updateSavingsBook(localId: string, data: UpdateSavingsBookRequest): Promise<SavingsBookDto | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM savings_books WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return null;

  const actualLocalId = existing.local_id;
  const newStatus = existing._sync_status === SYNC_STATUS.PENDING_CREATE
    ? SYNC_STATUS.PENDING_CREATE
    : SYNC_STATUS.PENDING_UPDATE;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
  if (data.bankId !== undefined) { updates.push('bank_id = ?'); params.push(data.bankId); }
  if (data.currency !== undefined) { updates.push('currency = ?'); params.push(data.currency); }
  if (data.depositDate !== undefined) { updates.push('deposit_date = ?'); params.push(data.depositDate); }
  if (data.termMonths !== undefined) { updates.push('term_months = ?'); params.push(data.termMonths); }
  if (data.interestRate !== undefined) { updates.push('interest_rate = ?'); params.push(data.interestRate); }
  if (data.nonTermInterestRate !== undefined) { updates.push('non_term_interest_rate = ?'); params.push(data.nonTermInterestRate); }
  if (data.daysInYearForInterest !== undefined) { updates.push('days_in_year_for_interest = ?'); params.push(data.daysInYearForInterest); }
  if (data.interestPaymentType !== undefined) { updates.push('interest_payment_type = ?'); params.push(data.interestPaymentType); }
  if (data.maturityOption !== undefined) { updates.push('maturity_option = ?'); params.push(data.maturityOption); }
  if (data.sourceMoneySourceId !== undefined) { updates.push('source_money_source_id = ?'); params.push(data.sourceMoneySourceId); }
  if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
  if (data.excludeFromReports !== undefined) { updates.push('exclude_from_reports = ?'); params.push(data.excludeFromReports ? 1 : 0); }

  if (updates.length === 0) return getSavingsBookById(actualLocalId);

  updates.push('updated_at = ?', '_sync_status = ?', '_local_updated_at = ?');
  params.push(now, newStatus, now, actualLocalId);

  await db.runAsync(
    `UPDATE savings_books SET ${updates.join(', ')} WHERE local_id = ?`,
    params
  );

  return getSavingsBookById(actualLocalId);
}

export async function deleteSavingsBook(localId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM savings_books WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return;

  if (existing._sync_status === SYNC_STATUS.PENDING_CREATE) {
    await db.runAsync('DELETE FROM savings_books WHERE local_id = ?', [existing.local_id]);
  } else {
    await db.runAsync(
      'UPDATE savings_books SET _sync_status = ?, _local_updated_at = ? WHERE local_id = ?',
      [SYNC_STATUS.PENDING_DELETE, now, existing.local_id]
    );
  }
}

// ============================================================
// Sync helpers
// ============================================================

export async function getPendingSavingsBooks(): Promise<any[]> {
  const db = await getDb();
  return db.getAllAsync<any>('SELECT * FROM savings_books WHERE _sync_status != ?', [SYNC_STATUS.SYNCED]);
}

export async function upsertSavingsBookFromServer(serverData: SavingsBookDto): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<any>('SELECT * FROM savings_books WHERE server_id = ?', [serverData.id]);
  const now = new Date().toISOString();

  if (existing) {
    if (existing._sync_status === SYNC_STATUS.SYNCED) {
      await db.runAsync(
        `UPDATE savings_books SET
          bank_id = ?, bank_name = ?, name = ?, currency = ?, deposit_date = ?,
          term_months = ?, interest_rate = ?, non_term_interest_rate = ?,
          days_in_year_for_interest = ?, interest_payment_type = ?, maturity_option = ?,
          source_money_source_id = ?, description = ?, exclude_from_reports = ?,
          initial_balance = ?, current_balance = ?, maturity_date = ?, status = ?,
          created_at = ?, updated_at = ?, _sync_status = ?, _server_updated_at = ?
         WHERE local_id = ?`,
        sanitizeParams([
          serverData.bankId, serverData.bankName, serverData.name, serverData.currency,
          serverData.depositDate, serverData.termMonths, serverData.interestRate,
          serverData.nonTermInterestRate, serverData.daysInYearForInterest,
          serverData.interestPaymentType, serverData.maturityOption,
          serverData.sourceMoneySourceId ?? null, serverData.description ?? null,
          serverData.excludeFromReports ? 1 : 0, serverData.initialBalance,
          serverData.currentBalance, serverData.maturityDate, serverData.status,
          serverData.createdAt, serverData.updatedAt, SYNC_STATUS.SYNCED, serverData.updatedAt,
          existing.local_id,
        ])
      );
    }
  } else {
    const localId = generateLocalId();
    await db.runAsync(
      `INSERT INTO savings_books (
        local_id, server_id, user_id, bank_id, bank_name, name, currency, deposit_date,
        term_months, interest_rate, non_term_interest_rate, days_in_year_for_interest,
        interest_payment_type, maturity_option, source_money_source_id, description,
        exclude_from_reports, initial_balance, current_balance, maturity_date, status,
        created_at, updated_at, _sync_status, _local_updated_at, _server_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sanitizeParams([
        localId, serverData.id, serverData.userId,
        serverData.bankId, serverData.bankName, serverData.name, serverData.currency,
        serverData.depositDate, serverData.termMonths, serverData.interestRate,
        serverData.nonTermInterestRate, serverData.daysInYearForInterest,
        serverData.interestPaymentType, serverData.maturityOption,
        serverData.sourceMoneySourceId ?? null, serverData.description ?? null,
        serverData.excludeFromReports ? 1 : 0, serverData.initialBalance,
        serverData.currentBalance, serverData.maturityDate, serverData.status,
        serverData.createdAt, serverData.updatedAt, SYNC_STATUS.SYNCED, now, serverData.updatedAt,
      ])
    );
  }
}

export async function markSavingsBookSynced(localId: string, serverId: string, serverUpdatedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE savings_books SET server_id = ?, _sync_status = ?, _server_updated_at = ? WHERE local_id = ?',
    [serverId, SYNC_STATUS.SYNCED, serverUpdatedAt, localId]
  );
}

export async function removeSavingsBookLocally(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM savings_books WHERE local_id = ?', [localId]);
}

// ============================================================
// Mapper
// ============================================================

function mapSavingsBook(row: any): SavingsBookDto {
  return {
    id: row.server_id || row.local_id,
    userId: row.user_id,
    bankId: row.bank_id,
    bankName: row.bank_name,
    name: row.name,
    currency: row.currency,
    depositDate: row.deposit_date,
    termMonths: row.term_months,
    interestRate: row.interest_rate,
    nonTermInterestRate: row.non_term_interest_rate,
    daysInYearForInterest: row.days_in_year_for_interest,
    interestPaymentType: row.interest_payment_type,
    maturityOption: row.maturity_option,
    sourceMoneySourceId: row.source_money_source_id ?? undefined,
    description: row.description ?? undefined,
    excludeFromReports: !!row.exclude_from_reports,
    initialBalance: row.initial_balance,
    currentBalance: row.current_balance,
    maturityDate: row.maturity_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
