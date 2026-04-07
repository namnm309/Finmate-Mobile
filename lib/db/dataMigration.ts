/**
 * Data Migration
 * Migrates existing expo-file-system storage data into SQLite.
 * Runs once on first app launch after the offline-first update.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { getDb, generateLocalId } from './database';
import { SYNC_STATUS } from './schema';

const MIGRATION_DONE_KEY = 'file_to_sqlite_migration_done';

/**
 * Check if file→SQLite migration has already been done
 */
export async function isDataMigrationDone(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    "SELECT value FROM _sync_meta WHERE key = ?",
    [MIGRATION_DONE_KEY]
  );
  return row?.value === 'true';
}

/**
 * Run data migration from file-system to SQLite
 */
export async function runDataMigration(): Promise<void> {
  if (await isDataMigrationDone()) {
    if (__DEV__) console.log('[Migration] Already done, skipping');
    return;
  }

  if (__DEV__) console.log('[Migration] Starting file→SQLite migration...');

  const db = await getDb();

  try {
    // Migrate counterparty entries
    await migrateCounterparties(db);

    // Migrate debt entries
    await migrateDebts(db);

    // Migrate monthly expenses
    await migrateMonthlyExpenses(db);

    // Migrate trip events & expenses
    await migrateTripEvents(db);

    // Mark done
    await db.runAsync(
      "INSERT OR REPLACE INTO _sync_meta (key, value) VALUES (?, 'true')",
      [MIGRATION_DONE_KEY]
    );

    if (__DEV__) console.log('[Migration] File→SQLite migration completed!');
  } catch (error) {
    console.error('[Migration] Failed:', error);
    // Don't mark as done so it retries next time
  }
}

// ============================================================
// Individual migrations
// ============================================================

async function migrateCounterparties(db: any): Promise<void> {
  try {
    const path = `${FileSystem.documentDirectory}counterparty_entries.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return;

    const text = await FileSystem.readAsStringAsync(path);
    const entries = JSON.parse(text || '[]');
    if (!Array.isArray(entries) || entries.length === 0) return;

    if (__DEV__) console.log(`[Migration] Migrating ${entries.length} counterparty entries...`);
    // Counterparties don't have a server-side table, keep in file system
    // (they're local-only features). No migration needed for SQLite.
  } catch (error) {
    if (__DEV__) console.warn('[Migration] Counterparty migration skipped:', error);
  }
}

async function migrateDebts(db: any): Promise<void> {
  try {
    const path = `${FileSystem.documentDirectory}debt_entries.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return;

    const text = await FileSystem.readAsStringAsync(path);
    const entries = JSON.parse(text || '[]');
    if (!Array.isArray(entries) || entries.length === 0) return;

    if (__DEV__) console.log(`[Migration] ${entries.length} debt entries — keeping in file system (local-only)`);
    // Debts are local-only, no server table. Keep in file system.
  } catch (error) {
    if (__DEV__) console.warn('[Migration] Debt migration skipped:', error);
  }
}

async function migrateMonthlyExpenses(db: any): Promise<void> {
  try {
    const path = `${FileSystem.documentDirectory}monthly_expenses.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return;

    const text = await FileSystem.readAsStringAsync(path);
    const entries = JSON.parse(text || '[]');
    if (!Array.isArray(entries) || entries.length === 0) return;

    if (__DEV__) console.log(`[Migration] ${entries.length} monthly expenses — keeping in file system (local-only)`);
    // Monthly expenses are local-only, no server table. Keep in file system.
  } catch (error) {
    if (__DEV__) console.warn('[Migration] Monthly expense migration skipped:', error);
  }
}

async function migrateTripEvents(db: any): Promise<void> {
  try {
    const path = `${FileSystem.documentDirectory}trip_events.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return;

    const text = await FileSystem.readAsStringAsync(path);
    const entries = JSON.parse(text || '[]');
    if (!Array.isArray(entries) || entries.length === 0) return;

    if (__DEV__) console.log(`[Migration] ${entries.length} trip events — keeping in file system (local-only)`);
    // Trip events are local-only, no server table. Keep in file system.
  } catch (error) {
    if (__DEV__) console.warn('[Migration] Trip event migration skipped:', error);
  }
}
