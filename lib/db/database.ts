/**
 * Database initialization and access
 * Singleton pattern - one DB instance per app lifecycle
 */
import * as SQLite from 'expo-sqlite';
import { runMigrations } from './migrations';

const DB_NAME = 'finmate_offline.db';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Get or initialize the database
 * Thread-safe: multiple callers will wait for the same init
 */
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;

  if (!_initPromise) {
    _initPromise = initDatabase();
  }

  return _initPromise;
}

/**
 * Initialize database: open + run migrations + enable WAL
 */
async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    if (__DEV__) console.log('[DB] Opening database:', DB_NAME);

    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // Enable WAL mode for better concurrent read/write performance
    await db.execAsync('PRAGMA journal_mode = WAL');
    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON');

    // Run migrations
    await runMigrations(db);

    _db = db;
    if (__DEV__) console.log('[DB] Database initialized successfully');

    return db;
  } catch (error) {
    _initPromise = null;
    console.error('[DB] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Close the database (call on app shutdown or user logout)
 */
export async function closeDb(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
    _initPromise = null;
    if (__DEV__) console.log('[DB] Database closed');
  }
}

/**
 * Reset DB entirely — for logout/delete account
 */
export async function resetDb(): Promise<void> {
  await closeDb();
  await SQLite.deleteDatabaseAsync(DB_NAME);
  if (__DEV__) console.log('[DB] Database deleted');
}

/**
 * Generate a UUID-like local ID
 */
export function generateLocalId(): string {
  // Simple UUID v4 without external dependency
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
