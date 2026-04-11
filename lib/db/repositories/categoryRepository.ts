/**
 * Category Repository — Offline-First CRUD
 */
import { getDb, generateLocalId, sanitizeParams } from '../database';
import { SYNC_STATUS, type SyncStatus } from '../schema';
import type { CategoryDto } from '@/lib/types/transaction';
import type { CreateCategoryRequest, UpdateCategoryRequest } from '@/lib/services/categoryService';

// ============================================================
// Read
// ============================================================

export async function getAllCategories(transactionTypeId?: string): Promise<CategoryDto[]> {
  const db = await getDb();
  let sql = 'SELECT * FROM categories WHERE _sync_status != ? ORDER BY display_order';
  const params: any[] = [SYNC_STATUS.PENDING_DELETE];

  if (transactionTypeId) {
    sql = 'SELECT * FROM categories WHERE _sync_status != ? AND transaction_type_id = ? ORDER BY display_order';
    params.push(transactionTypeId);
  }

  const rows = await db.getAllAsync<any>(sql, params);
  return rows.map(mapCategory);
}

export async function getCategoryById(localId: string): Promise<CategoryDto | null> {
  const db = await getDb();
  // Search by local_id or server_id
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM categories WHERE (local_id = ? OR server_id = ?) AND _sync_status != ?',
    [localId, localId, SYNC_STATUS.PENDING_DELETE]
  );
  return row ? mapCategory(row) : null;
}

export async function getCategoryByServerId(serverId: string): Promise<any | null> {
  const db = await getDb();
  return db.getFirstAsync<any>(
    'SELECT * FROM categories WHERE server_id = ?',
    [serverId]
  );
}

// ============================================================
// Write (offline-first)
// ============================================================

export async function createCategory(data: CreateCategoryRequest, userId: string): Promise<CategoryDto> {
  const db = await getDb();
  const now = new Date().toISOString();
  const localId = generateLocalId();

  // Get transaction type name from reference data
  const typeRow = await db.getFirstAsync<any>(
    'SELECT name FROM transaction_types WHERE id = ?',
    [data.transactionTypeId]
  );

  await db.runAsync(
    `INSERT INTO categories (local_id, user_id, transaction_type_id, transaction_type_name, parent_category_id, name, icon, is_active, display_order, created_at, updated_at, _sync_status, _local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)`,
    sanitizeParams([localId, userId, data.transactionTypeId, typeRow?.name ?? '', data.parentCategoryId ?? null, data.name, data.icon ?? 'category', now, now, SYNC_STATUS.PENDING_CREATE, now])
  );

  return (await getCategoryById(localId))!;
}

export async function updateCategory(localId: string, data: UpdateCategoryRequest): Promise<CategoryDto | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  // Get current record
  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM categories WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return null;

  const actualLocalId = existing.local_id;
  const newStatus = existing._sync_status === SYNC_STATUS.PENDING_CREATE
    ? SYNC_STATUS.PENDING_CREATE // Keep pending_create if not yet synced
    : SYNC_STATUS.PENDING_UPDATE;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
  if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon); }
  if (data.parentCategoryId !== undefined) { updates.push('parent_category_id = ?'); params.push(data.parentCategoryId); }

  if (updates.length === 0) return getCategoryById(actualLocalId);

  updates.push('updated_at = ?', '_sync_status = ?', '_local_updated_at = ?');
  params.push(now, newStatus, now, actualLocalId);

  await db.runAsync(
    `UPDATE categories SET ${updates.join(', ')} WHERE local_id = ?`,
    params
  );

  return getCategoryById(actualLocalId);
}

export async function deleteCategory(localId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM categories WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return;

  if (existing._sync_status === SYNC_STATUS.PENDING_CREATE) {
    // Never synced to server — just delete locally
    await db.runAsync('DELETE FROM categories WHERE local_id = ?', [existing.local_id]);
  } else {
    // Mark for server deletion
    await db.runAsync(
      'UPDATE categories SET _sync_status = ?, _local_updated_at = ? WHERE local_id = ?',
      [SYNC_STATUS.PENDING_DELETE, now, existing.local_id]
    );
  }
}

// ============================================================
// Sync helpers
// ============================================================

export async function getPendingCategories(): Promise<any[]> {
  const db = await getDb();
  return db.getAllAsync<any>(
    'SELECT * FROM categories WHERE _sync_status != ?',
    [SYNC_STATUS.SYNCED]
  );
}

export async function upsertCategoryFromServer(serverData: CategoryDto): Promise<void> {
  const db = await getDb();

  // Check if already exists by server_id
  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM categories WHERE server_id = ?',
    [serverData.id]
  );

  const now = new Date().toISOString();

  if (existing) {
    // Only update if server data is newer and local has no pending changes
    if (existing._sync_status === SYNC_STATUS.SYNCED) {
      await db.runAsync(
        `UPDATE categories SET
          transaction_type_id = ?, transaction_type_name = ?, parent_category_id = ?,
          name = ?, icon = ?, is_active = ?, display_order = ?,
          created_at = ?, updated_at = ?, _sync_status = ?, _server_updated_at = ?
         WHERE local_id = ?`,
        sanitizeParams([
          serverData.transactionTypeId, serverData.transactionTypeName, serverData.parentCategoryId ?? null,
          serverData.name, serverData.icon, serverData.isActive ? 1 : 0, serverData.displayOrder,
          serverData.createdAt, serverData.updatedAt, SYNC_STATUS.SYNCED, serverData.updatedAt,
          existing.local_id,
        ])
      );
    }
    // If local has pending changes, skip (LWW — local changes will push on next sync)
  } else {
    // New from server
    const localId = generateLocalId();
    await db.runAsync(
      `INSERT INTO categories (local_id, server_id, user_id, transaction_type_id, transaction_type_name, parent_category_id, name, icon, is_active, display_order, created_at, updated_at, _sync_status, _local_updated_at, _server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sanitizeParams([
        localId, serverData.id, serverData.userId,
        serverData.transactionTypeId, serverData.transactionTypeName, serverData.parentCategoryId ?? null,
        serverData.name, serverData.icon, serverData.isActive ? 1 : 0, serverData.displayOrder,
        serverData.createdAt, serverData.updatedAt, SYNC_STATUS.SYNCED, now, serverData.updatedAt,
      ])
    );
  }
}

export async function markCategorySynced(localId: string, serverId: string, serverUpdatedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE categories SET server_id = ?, _sync_status = ?, _server_updated_at = ? WHERE local_id = ?',
    [serverId, SYNC_STATUS.SYNCED, serverUpdatedAt, localId]
  );
}

export async function removeCategoryLocally(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE local_id = ?', [localId]);
}

// ============================================================
// Mapper
// ============================================================

function mapCategory(row: any): CategoryDto {
  return {
    id: row.server_id || row.local_id,
    userId: row.user_id,
    transactionTypeId: row.transaction_type_id,
    transactionTypeName: row.transaction_type_name,
    parentCategoryId: row.parent_category_id ?? undefined,
    name: row.name,
    icon: row.icon,
    isActive: !!row.is_active,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
