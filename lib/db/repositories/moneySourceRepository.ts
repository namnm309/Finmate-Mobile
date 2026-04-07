/**
 * Money Source Repository — Offline-First CRUD
 */
import { getDb, generateLocalId } from '../database';
import { SYNC_STATUS } from '../schema';
import type {
  MoneySourceDto,
  MoneySourceGroupedDto,
  MoneySourceGroupedResponseDto,
  CreateMoneySourceRequest,
  UpdateMoneySourceRequest,
} from '@/lib/types/moneySource';

// ============================================================
// Read
// ============================================================

export async function getAllMoneySources(): Promise<MoneySourceDto[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM money_sources WHERE _sync_status != ? ORDER BY created_at',
    [SYNC_STATUS.PENDING_DELETE]
  );
  return rows.map(mapMoneySource);
}

export async function getGroupedMoneySources(): Promise<MoneySourceGroupedResponseDto> {
  const all = await getAllMoneySources();

  // Group by accountTypeId
  const groupMap = new Map<string, MoneySourceGroupedDto>();
  let totalBalance = 0;

  for (const ms of all) {
    totalBalance += ms.balance;

    if (!groupMap.has(ms.accountTypeId)) {
      groupMap.set(ms.accountTypeId, {
        accountTypeId: ms.accountTypeId,
        accountTypeName: ms.accountTypeName,
        displayOrder: 0,
        totalBalance: 0,
        moneySources: [],
      });
    }

    const group = groupMap.get(ms.accountTypeId)!;
    group.totalBalance += ms.balance;
    group.moneySources.push(ms);
  }

  return {
    totalBalance,
    groups: Array.from(groupMap.values()),
  };
}

export async function getMoneySourceById(localId: string): Promise<MoneySourceDto | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM money_sources WHERE (local_id = ? OR server_id = ?) AND _sync_status != ?',
    [localId, localId, SYNC_STATUS.PENDING_DELETE]
  );
  return row ? mapMoneySource(row) : null;
}

export async function getMoneySourceByServerId(serverId: string): Promise<any | null> {
  const db = await getDb();
  return db.getFirstAsync<any>('SELECT * FROM money_sources WHERE server_id = ?', [serverId]);
}

// ============================================================
// Write (offline-first)
// ============================================================

export async function createMoneySource(data: CreateMoneySourceRequest, userId: string): Promise<MoneySourceDto> {
  const db = await getDb();
  const now = new Date().toISOString();
  const localId = generateLocalId();

  // Get account type name
  const typeRow = await db.getFirstAsync<any>('SELECT name FROM account_types WHERE id = ?', [data.accountTypeId]);

  await db.runAsync(
    `INSERT INTO money_sources (local_id, user_id, account_type_id, account_type_name, name, icon, color, balance, currency, is_active, created_at, updated_at, _sync_status, _local_updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    [
      localId, userId, data.accountTypeId, typeRow?.name ?? '',
      data.name, data.icon ?? 'account-balance-wallet', data.color ?? '#51A2FF',
      data.balance ?? 0, data.currency ?? 'VND',
      now, now, SYNC_STATUS.PENDING_CREATE, now,
    ]
  );

  return (await getMoneySourceById(localId))!;
}

export async function updateMoneySource(localId: string, data: UpdateMoneySourceRequest): Promise<MoneySourceDto | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM money_sources WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return null;

  const actualLocalId = existing.local_id;
  const newStatus = existing._sync_status === SYNC_STATUS.PENDING_CREATE
    ? SYNC_STATUS.PENDING_CREATE
    : SYNC_STATUS.PENDING_UPDATE;

  const updates: string[] = [];
  const params: any[] = [];

  if (data.accountTypeId !== undefined) { updates.push('account_type_id = ?'); params.push(data.accountTypeId); }
  if (data.name !== undefined) { updates.push('name = ?'); params.push(data.name); }
  if (data.icon !== undefined) { updates.push('icon = ?'); params.push(data.icon); }
  if (data.color !== undefined) { updates.push('color = ?'); params.push(data.color); }
  if (data.balance !== undefined) { updates.push('balance = ?'); params.push(data.balance); }
  if (data.currency !== undefined) { updates.push('currency = ?'); params.push(data.currency); }
  if (data.isActive !== undefined) { updates.push('is_active = ?'); params.push(data.isActive ? 1 : 0); }

  if (updates.length === 0) return getMoneySourceById(actualLocalId);

  updates.push('updated_at = ?', '_sync_status = ?', '_local_updated_at = ?');
  params.push(now, newStatus, now, actualLocalId);

  await db.runAsync(
    `UPDATE money_sources SET ${updates.join(', ')} WHERE local_id = ?`,
    params
  );

  return getMoneySourceById(actualLocalId);
}

export async function deleteMoneySource(localId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<any>(
    'SELECT * FROM money_sources WHERE local_id = ? OR server_id = ?',
    [localId, localId]
  );
  if (!existing) return;

  if (existing._sync_status === SYNC_STATUS.PENDING_CREATE) {
    await db.runAsync('DELETE FROM money_sources WHERE local_id = ?', [existing.local_id]);
  } else {
    await db.runAsync(
      'UPDATE money_sources SET _sync_status = ?, _local_updated_at = ? WHERE local_id = ?',
      [SYNC_STATUS.PENDING_DELETE, now, existing.local_id]
    );
  }
}

// ============================================================
// Sync helpers
// ============================================================

export async function getPendingMoneySources(): Promise<any[]> {
  const db = await getDb();
  return db.getAllAsync<any>(
    'SELECT * FROM money_sources WHERE _sync_status != ?',
    [SYNC_STATUS.SYNCED]
  );
}

export async function upsertMoneySourceFromServer(serverData: MoneySourceDto): Promise<void> {
  const db = await getDb();
  const existing = await db.getFirstAsync<any>('SELECT * FROM money_sources WHERE server_id = ?', [serverData.id]);
  const now = new Date().toISOString();

  if (existing) {
    if (existing._sync_status === SYNC_STATUS.SYNCED) {
      await db.runAsync(
        `UPDATE money_sources SET
          account_type_id = ?, account_type_name = ?, name = ?, icon = ?, color = ?,
          balance = ?, currency = ?, is_active = ?, created_at = ?, updated_at = ?,
          _sync_status = ?, _server_updated_at = ?
         WHERE local_id = ?`,
        [
          serverData.accountTypeId, serverData.accountTypeName, serverData.name,
          serverData.icon, serverData.color, serverData.balance, serverData.currency,
          serverData.isActive ? 1 : 0, serverData.createdAt, serverData.updatedAt,
          SYNC_STATUS.SYNCED, serverData.updatedAt, existing.local_id,
        ]
      );
    }
  } else {
    const localId = generateLocalId();
    await db.runAsync(
      `INSERT INTO money_sources (local_id, server_id, user_id, account_type_id, account_type_name, name, icon, color, balance, currency, is_active, created_at, updated_at, _sync_status, _local_updated_at, _server_updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        localId, serverData.id, serverData.userId,
        serverData.accountTypeId, serverData.accountTypeName, serverData.name,
        serverData.icon, serverData.color, serverData.balance, serverData.currency,
        serverData.isActive ? 1 : 0, serverData.createdAt, serverData.updatedAt,
        SYNC_STATUS.SYNCED, now, serverData.updatedAt,
      ]
    );
  }
}

export async function markMoneySourceSynced(localId: string, serverId: string, serverUpdatedAt: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE money_sources SET server_id = ?, _sync_status = ?, _server_updated_at = ? WHERE local_id = ?',
    [serverId, SYNC_STATUS.SYNCED, serverUpdatedAt, localId]
  );
}

export async function removeMoneySourceLocally(localId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM money_sources WHERE local_id = ?', [localId]);
}

// ============================================================
// Helpers — resolve local_id from server_id for FK references
// ============================================================

export async function resolveMoneySourceLocalId(idOrServerId: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    'SELECT local_id FROM money_sources WHERE local_id = ? OR server_id = ?',
    [idOrServerId, idOrServerId]
  );
  return row?.local_id ?? null;
}

// ============================================================
// Mapper
// ============================================================

function mapMoneySource(row: any): MoneySourceDto {
  return {
    id: row.server_id || row.local_id,
    userId: row.user_id,
    accountTypeId: row.account_type_id,
    accountTypeName: row.account_type_name,
    name: row.name,
    icon: row.icon,
    color: row.color,
    balance: row.balance,
    currency: row.currency,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
