/**
 * Goal Repository — Offline-First CRUD
 */
import { getDb, generateLocalId } from '../database';
import { SYNC_STATUS } from '../schema';
import type { GoalDto, CreateGoalRequest, UpdateGoalRequest } from '@/lib/types/goal';

// ============================================================
// Read
// ============================================================

export async function getAllGoals(): Promise<GoalDto[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM goals WHERE _sync_status != ? ORDER BY created_at DESC',
    [SYNC_STATUS.PENDING_DELETE]
  );
  return rows.map(mapGoal);
}

export async function getGoalById(localId: string): Promise<GoalDto | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM goals WHERE (local_id = ? OR server_id = ?) AND _sync_status != ?',
    [localId, localId, SYNC_STATUS.PENDING_DELETE]
  );
  return row ? mapGoal(row) : null;
}

// ============================================================
// Write (offline-first)
// ============================================================

export async function createGoal(data: CreateGoalRequest, userId: string): Promise<GoalDto> {
  const db = await getDb();
  const now = new Date().toISOString();
  const localId = generateLocalId();
  const targetAmount = data.targetAmount || 0;
  const currentAmount = data.currentAmount || 0;
  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

  await db.runAsync(
    `INSERT INTO goals (local_id, user_id, title, description, target_amount, current_amount, target_date, status, currency, icon, color, is_active, created_at, updated_at, progress_percentage, _sync_status, _local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    [
      localId, userId, data.title, data.description ?? null,
      targetAmount, currentAmount, data.targetDate ?? null,
      data.currency ?? 'VND', data.icon ?? 'flag', data.color ?? '#51A2FF',
      now, now, progress, SYNC_STATUS.PENDING_CREATE, now,
    ]
  );

  return (await getGoalById(localId))!;
}

export async function updateGoal(localId: string, data: UpdateGoalRequest): Promise<GoalDto | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM goals WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return null;

  const actualLocalId = existing.local_id;
  const newStatus = existing._sync_status === SYNC_STATUS.PENDING_CREATE
    ? SYNC_STATUS.PENDING_CREATE
    : SYNC_STATUS.PENDING_UPDATE;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
  if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
  if (data.targetAmount !== undefined) { updates.push('target_amount = ?'); params.push(data.targetAmount); }
  if (data.currentAmount !== undefined) { updates.push('current_amount = ?'); params.push(data.currentAmount); }
  if (data.targetDate !== undefined) { updates.push('target_date = ?'); params.push(data.targetDate); }
  if (data.status !== undefined) { updates.push('status = ?'); params.push(data.status); }
  if (data.currency !== undefined) { updates.push('currency = ?'); params.push(data.currency); }
  if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon); }
  if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color); }
  if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive ? 1 : 0); }

  // Recalculate progress
  const newTarget = data.targetAmount ?? existing.target_amount;
  const newCurrent = data.currentAmount ?? existing.current_amount;
  const progress = newTarget > 0 ? (newCurrent / newTarget) * 100 : 0;
  updates.push('progress_percentage = ?');
  params.push(progress);

  if (updates.length === 0) return getGoalById(actualLocalId);

  updates.push('updated_at = ?', '_sync_status = ?', '_local_updated_at = ?');
  params.push(now, newStatus, now, actualLocalId);

  await db.runAsync(
    `UPDATE goals SET ${updates.join(', ')} WHERE local_id = ?`,
    params
  );

  return getGoalById(actualLocalId);
}

export async function deleteGoal(localId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM goals WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return;

  if (existing._sync_status === SYNC_STATUS.PENDING_CREATE) {
    await db.runAsync('DELETE FROM goals WHERE local_id = ?', [existing.local_id]);
  } else {
    await db.runAsync(
      'UPDATE goals SET _sync_status = ?, _local_updated_at = ? WHERE local_id = ?',
      [SYNC_STATUS.PENDING_DELETE, now, existing.local_id]
    );
  }
}

// ============================================================
// Sync helpers
// ============================================================

export async function getPendingGoals(): Promise<any[]> {
  const db = await getDb();
  return db.getAllAsync<any>('SELECT * FROM goals WHERE _sync_status != ?', [SYNC_STATUS.SYNCED]);
}

export async function upsertGoalFromServer(serverData: GoalDto): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<any>('SELECT * FROM goals WHERE server_id = ?', [serverData.id]);
  const now = new Date().toISOString();

  if (existing) {
    if (existing._sync_status === SYNC_STATUS.SYNCED) {
      await db.runAsync(
        `UPDATE goals SET
          title = ?, description = ?, target_amount = ?, current_amount = ?,
          target_date = ?, status = ?, currency = ?, icon = ?, color = ?,
          is_active = ?, created_at = ?, updated_at = ?, progress_percentage = ?,
          _sync_status = ?, _server_updated_at = ?
         WHERE local_id = ?`,
        [
          serverData.title, serverData.description, serverData.targetAmount, serverData.currentAmount,
          serverData.targetDate, serverData.status, serverData.currency, serverData.icon, serverData.color,
          serverData.isActive ? 1 : 0, serverData.createdAt, serverData.updatedAt, serverData.progressPercentage,
          SYNC_STATUS.SYNCED, serverData.updatedAt, existing.local_id,
        ]
      );
    }
  } else {
    const localId = generateLocalId();
    await db.runAsync(
      `INSERT INTO goals (local_id, server_id, user_id, title, description, target_amount, current_amount, target_date, status, currency, icon, color, is_active, created_at, updated_at, progress_percentage, _sync_status, _local_updated_at, _server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        localId, serverData.id, serverData.userId,
        serverData.title, serverData.description, serverData.targetAmount, serverData.currentAmount,
        serverData.targetDate, serverData.status, serverData.currency, serverData.icon, serverData.color,
        serverData.isActive ? 1 : 0, serverData.createdAt, serverData.updatedAt, serverData.progressPercentage,
        SYNC_STATUS.SYNCED, now, serverData.updatedAt,
      ]
    );
  }
}

export async function markGoalSynced(localId: string, serverId: string, serverUpdatedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE goals SET server_id = ?, _sync_status = ?, _server_updated_at = ? WHERE local_id = ?',
    [serverId, SYNC_STATUS.SYNCED, serverUpdatedAt, localId]
  );
}

export async function removeGoalLocally(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM goals WHERE local_id = ?', [localId]);
}

// ============================================================
// Mapper
// ============================================================

function mapGoal(row: any): GoalDto {
  return {
    id: row.server_id || row.local_id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    targetDate: row.target_date,
    status: row.status,
    currency: row.currency,
    icon: row.icon,
    color: row.color,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    progressPercentage: row.progress_percentage,
  };
}
