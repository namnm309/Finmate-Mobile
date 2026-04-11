/**
 * Transaction Repository — Offline-First CRUD
 */
import { getDb, generateLocalId, sanitizeParams } from '../database';
import { SYNC_STATUS } from '../schema';
import type {
  TransactionDto,
  TransactionListResponseDto,
  CreateTransactionRequest,
} from '@/lib/types/transaction';
import type { UpdateTransactionRequest, GetTransactionsParams } from '@/lib/services/transactionService';

// ============================================================
// Read
// ============================================================

export async function getTransactions(params?: GetTransactionsParams): Promise<TransactionListResponseDto> {
  const db = await getDb();

  let whereClauses = ['_sync_status != ?'];
  const queryParams: any[] = [SYNC_STATUS.PENDING_DELETE];

  if (params?.transactionTypeId) {
    whereClauses.push('transaction_type_id = ?');
    queryParams.push(params.transactionTypeId);
  }
  if (params?.categoryId) {
    whereClauses.push('category_id = ?');
    queryParams.push(params.categoryId);
  }
  if (params?.moneySourceId) {
    whereClauses.push('(money_source_id = ? OR money_source_id IN (SELECT local_id FROM money_sources WHERE server_id = ?))');
    queryParams.push(params.moneySourceId, params.moneySourceId);
  }
  if (params?.startDate) {
    whereClauses.push('transaction_date >= ?');
    queryParams.push(params.startDate);
  }
  if (params?.endDate) {
    whereClauses.push('transaction_date <= ?');
    queryParams.push(params.endDate);
  }

  const where = whereClauses.join(' AND ');

  // Count total
  const countResult = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM transactions WHERE ${where}`,
    queryParams
  );
  const totalCount = countResult?.cnt ?? 0;

  // Pagination
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM transactions WHERE ${where} ORDER BY transaction_date DESC, created_at DESC LIMIT ? OFFSET ?`,
    [...queryParams, pageSize, offset]
  );

  return {
    totalCount,
    page,
    pageSize,
    transactions: rows.map(mapTransaction),
  };
}

export async function getTransactionById(localId: string): Promise<TransactionDto | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM transactions WHERE (local_id = ? OR server_id = ?) AND _sync_status != ?',
    [localId, localId, SYNC_STATUS.PENDING_DELETE]
  );
  return row ? mapTransaction(row) : null;
}

// ============================================================
// Write (offline-first)
// ============================================================

export async function createTransaction(data: CreateTransactionRequest, userId: string): Promise<TransactionDto> {
  const db = await getDb();
  const now = new Date().toISOString();
  const localId = generateLocalId();

  // Resolve names from reference/local data
  const typeRow = await db.getFirstAsync<any>('SELECT * FROM transaction_types WHERE id = ?', [data.transactionTypeId]);
  const categoryRow = await db.getFirstAsync<any>(
    'SELECT * FROM categories WHERE (local_id = ? OR server_id = ?)',
    [data.categoryId, data.categoryId]
  );
  const msRow = await db.getFirstAsync<any>(
    'SELECT * FROM money_sources WHERE (local_id = ? OR server_id = ?)',
    [data.moneySourceId, data.moneySourceId]
  );

  await db.runAsync(
    `INSERT INTO transactions (
      local_id, user_id, transaction_type_id, transaction_type_name, transaction_type_color, is_income,
      money_source_id, money_source_name, money_source_icon,
      category_id, category_name, category_icon,
      contact_id, contact_name, amount, transaction_date, description,
      is_borrowing_for_this, is_fee, exclude_from_report,
      created_at, updated_at, _sync_status, _local_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    sanitizeParams([
      localId, userId,
      data.transactionTypeId, typeRow?.name ?? '', typeRow?.color ?? '#000', typeRow?.is_income ? 1 : 0,
      data.moneySourceId, msRow?.name ?? '', msRow?.icon ?? '',
      data.categoryId, categoryRow?.name ?? '', categoryRow?.icon ?? '',
      data.contactId ?? null, null,
      data.amount, data.transactionDate, data.description ?? null,
      data.isBorrowingForThis ? 1 : 0, data.isFee ? 1 : 0, data.excludeFromReport ? 1 : 0,
      now, now, SYNC_STATUS.PENDING_CREATE, now,
    ])
  );

  // Update local money source balance
  if (msRow) {
    const balanceChange = typeRow?.is_income ? data.amount : -data.amount;
    await db.runAsync(
      'UPDATE money_sources SET balance = balance + ? WHERE local_id = ?',
      [balanceChange, msRow.local_id]
    );
  }

  return (await getTransactionById(localId))!;
}

export async function updateTransaction(localId: string, data: UpdateTransactionRequest): Promise<TransactionDto | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM transactions WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return null;

  const actualLocalId = existing.local_id;
  const newStatus = existing._sync_status === SYNC_STATUS.PENDING_CREATE
    ? SYNC_STATUS.PENDING_CREATE
    : SYNC_STATUS.PENDING_UPDATE;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.transactionTypeId !== undefined) { updates.push('transaction_type_id = ?'); params.push(data.transactionTypeId); }
  if (data.moneySourceId !== undefined) { updates.push('money_source_id = ?'); params.push(data.moneySourceId); }
  if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId); }
  if (data.contactId !== undefined) { updates.push('contact_id = ?'); params.push(data.contactId); }
  if (data.amount !== undefined) { updates.push('amount = ?'); params.push(data.amount); }
  if (data.transactionDate !== undefined) { updates.push('transaction_date = ?'); params.push(data.transactionDate); }
  if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
  if (data.isBorrowingForThis !== undefined) { updates.push('is_borrowing_for_this = ?'); params.push(data.isBorrowingForThis ? 1 : 0); }
  if (data.isFee !== undefined) { updates.push('is_fee = ?'); params.push(data.isFee ? 1 : 0); }
  if (data.excludeFromReport !== undefined) { updates.push('exclude_from_report = ?'); params.push(data.excludeFromReport ? 1 : 0); }

  if (updates.length === 0) return getTransactionById(actualLocalId);

  updates.push('updated_at = ?', '_sync_status = ?', '_local_updated_at = ?');
  params.push(now, newStatus, now, actualLocalId);

  await db.runAsync(
    `UPDATE transactions SET ${updates.join(', ')} WHERE local_id = ?`,
    params
  );

  return getTransactionById(actualLocalId);
}

export async function deleteTransaction(localId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM transactions WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return;

  // Reverse balance change
  const msRow = await db.getFirstAsync<any>(
    'SELECT * FROM money_sources WHERE local_id = ? OR server_id = ?',
    [existing.money_source_id, existing.money_source_id]
  );
  if (msRow) {
    const balanceRevert = existing.is_income ? -existing.amount : existing.amount;
    await db.runAsync(
      'UPDATE money_sources SET balance = balance + ? WHERE local_id = ?',
      [balanceRevert, msRow.local_id]
    );
  }

  if (existing._sync_status === SYNC_STATUS.PENDING_CREATE) {
    await db.runAsync('DELETE FROM transactions WHERE local_id = ?', [existing.local_id]);
  } else {
    await db.runAsync(
      'UPDATE transactions SET _sync_status = ?, _local_updated_at = ? WHERE local_id = ?',
      [SYNC_STATUS.PENDING_DELETE, now, existing.local_id]
    );
  }
}

// ============================================================
// Sync helpers
// ============================================================

export async function getPendingTransactions(): Promise<any[]> {
  const db = await getDb();
  return db.getAllAsync<any>(
    'SELECT * FROM transactions WHERE _sync_status != ?',
    [SYNC_STATUS.SYNCED]
  );
}

export async function upsertTransactionFromServer(serverData: TransactionDto): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<any>('SELECT * FROM transactions WHERE server_id = ?', [serverData.id]);
  const now = new Date().toISOString();

  if (existing) {
    if (existing._sync_status === SYNC_STATUS.SYNCED) {
      await db.runAsync(
        `UPDATE transactions SET
          transaction_type_id = ?, transaction_type_name = ?, transaction_type_color = ?, is_income = ?,
          money_source_id = ?, money_source_name = ?, money_source_icon = ?,
          category_id = ?, category_name = ?, category_icon = ?,
          contact_id = ?, contact_name = ?,
          amount = ?, transaction_date = ?, description = ?,
          is_borrowing_for_this = ?, is_fee = ?, exclude_from_report = ?,
          created_at = ?, updated_at = ?, _sync_status = ?, _server_updated_at = ?
         WHERE local_id = ?`,
        sanitizeParams([
          serverData.transactionTypeId, serverData.transactionTypeName, serverData.transactionTypeColor, serverData.isIncome ? 1 : 0,
          serverData.moneySourceId, serverData.moneySourceName, serverData.moneySourceIcon,
          serverData.categoryId, serverData.categoryName, serverData.categoryIcon,
          serverData.contactId ?? null, serverData.contactName ?? null,
          serverData.amount, serverData.transactionDate, serverData.description ?? null,
          serverData.isBorrowingForThis ? 1 : 0, serverData.isFee ? 1 : 0, serverData.excludeFromReport ? 1 : 0,
          serverData.createdAt, serverData.updatedAt, SYNC_STATUS.SYNCED, serverData.updatedAt,
          existing.local_id,
        ])
      );
    }
  } else {
    const localId = generateLocalId();
    await db.runAsync(
      `INSERT INTO transactions (
        local_id, server_id, user_id, transaction_type_id, transaction_type_name, transaction_type_color, is_income,
        money_source_id, money_source_name, money_source_icon,
        category_id, category_name, category_icon,
        contact_id, contact_name, amount, transaction_date, description,
        is_borrowing_for_this, is_fee, exclude_from_report,
        created_at, updated_at, _sync_status, _local_updated_at, _server_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sanitizeParams([
        localId, serverData.id, serverData.userId,
        serverData.transactionTypeId, serverData.transactionTypeName, serverData.transactionTypeColor, serverData.isIncome ? 1 : 0,
        serverData.moneySourceId, serverData.moneySourceName, serverData.moneySourceIcon,
        serverData.categoryId, serverData.categoryName, serverData.categoryIcon,
        serverData.contactId ?? null, serverData.contactName ?? null,
        serverData.amount, serverData.transactionDate, serverData.description ?? null,
        serverData.isBorrowingForThis ? 1 : 0, serverData.isFee ? 1 : 0, serverData.excludeFromReport ? 1 : 0,
        serverData.createdAt, serverData.updatedAt, SYNC_STATUS.SYNCED, now, serverData.updatedAt,
      ])
    );
  }
}

export async function markTransactionSynced(localId: string, serverId: string, serverUpdatedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE transactions SET server_id = ?, _sync_status = ?, _server_updated_at = ? WHERE local_id = ?',
    [serverId, SYNC_STATUS.SYNCED, serverUpdatedAt, localId]
  );
}

export async function removeTransactionLocally(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE local_id = ?', [localId]);
}

// ============================================================
// Aggregations for local reports
// ============================================================

export async function getLocalOverview(startDate?: string, endDate?: string): Promise<{
  totalIncome: number;
  totalExpense: number;
  difference: number;
  categoryStats: Array<{
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    amount: number;
    percentage: number;
    color: string;
  }>;
}> {
  const db = await getDb();

  let dateFilter = '';
  const params: any[] = [SYNC_STATUS.PENDING_DELETE];

  if (startDate) { dateFilter += ' AND transaction_date >= ?'; params.push(startDate); }
  if (endDate) { dateFilter += ' AND transaction_date <= ?'; params.push(endDate); }

  // Total income/expense
  const totals = await db.getFirstAsync<any>(
    `SELECT
      COALESCE(SUM(CASE WHEN is_income = 1 THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN is_income = 0 THEN amount ELSE 0 END), 0) as total_expense
     FROM transactions
     WHERE _sync_status != ? AND exclude_from_report = 0${dateFilter}`,
    params
  );

  const totalIncome = totals?.total_income ?? 0;
  const totalExpense = totals?.total_expense ?? 0;
  const totalAll = totalIncome + totalExpense;

  // Category breakdown
  const catRows = await db.getAllAsync<any>(
    `SELECT
      category_id, category_name, category_icon,
      SUM(amount) as total_amount,
      transaction_type_color as color
     FROM transactions
     WHERE _sync_status != ? AND exclude_from_report = 0${dateFilter}
     GROUP BY category_id
     ORDER BY total_amount DESC`,
    params
  );

  const categoryStats = catRows.map((row: any) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    amount: row.total_amount,
    percentage: totalAll > 0 ? (row.total_amount / totalAll) * 100 : 0,
    color: row.color || '#888',
  }));

  return {
    totalIncome,
    totalExpense,
    difference: totalIncome - totalExpense,
    categoryStats,
  };
}

// ============================================================
// Mapper
// ============================================================

function mapTransaction(row: any): TransactionDto {
  return {
    id: row.server_id || row.local_id,
    userId: row.user_id,
    transactionTypeId: row.transaction_type_id,
    transactionTypeName: row.transaction_type_name,
    transactionTypeColor: row.transaction_type_color,
    isIncome: !!row.is_income,
    moneySourceId: row.money_source_id,
    moneySourceName: row.money_source_name,
    moneySourceIcon: row.money_source_icon,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryIcon: row.category_icon,
    contactId: row.contact_id ?? undefined,
    contactName: row.contact_name ?? undefined,
    amount: row.amount,
    transactionDate: row.transaction_date,
    description: row.description ?? undefined,
    isBorrowingForThis: !!row.is_borrowing_for_this,
    isFee: !!row.is_fee,
    excludeFromReport: !!row.exclude_from_report,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
