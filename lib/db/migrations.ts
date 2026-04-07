/**
 * Database Migrations
 * Manages schema versions and upgrades
 */
import { CREATE_TABLES_SQL, CREATE_INDEXES_SQL } from './schema';
import type { SQLiteDatabase } from 'expo-sqlite';

const CURRENT_VERSION = 1;

/**
 * Run all pending migrations
 */
export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const currentVersion = await getDbVersion(db);

  if (currentVersion < 1) {
    await migrateV1(db);
  }

  // Future migrations go here:
  // if (currentVersion < 2) { await migrateV2(db); }

  await setDbVersion(db, CURRENT_VERSION);
}

/**
 * V1: Initial schema - create all tables and indexes
 */
async function migrateV1(db: SQLiteDatabase): Promise<void> {
  if (__DEV__) console.log('[DB] Running migration V1: Create tables...');

  await db.execAsync('BEGIN TRANSACTION');
  try {
    // Create tables
    for (const sql of CREATE_TABLES_SQL) {
      await db.execAsync(sql);
    }
    // Create indexes
    for (const sql of CREATE_INDEXES_SQL) {
      await db.execAsync(sql);
    }
    await db.execAsync('COMMIT');
    if (__DEV__) console.log('[DB] Migration V1 completed successfully');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.error('[DB] Migration V1 failed:', error);
    throw error;
  }
}

/**
 * Get current database version using PRAGMA user_version
 */
async function getDbVersion(db: SQLiteDatabase): Promise<number> {
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return result?.user_version ?? 0;
}

/**
 * Set database version
 */
async function setDbVersion(db: SQLiteDatabase, version: number): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${version}`);
}
