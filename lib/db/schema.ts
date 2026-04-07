/**
 * SQLite Database Schema for Finmate Offline-First
 * 
 * Mỗi table có thêm sync metadata:
 * - _sync_status: trạng thái đồng bộ
 * - _server_id: ID từ server (nullable khi chưa sync)
 * - _local_updated_at: timestamp local modify
 * - _server_updated_at: timestamp từ server
 */

// ============================================================
// Sync status constants
// ============================================================
export type SyncStatus = 'synced' | 'pending_create' | 'pending_update' | 'pending_delete';

export const SYNC_STATUS = {
  SYNCED: 'synced' as SyncStatus,
  PENDING_CREATE: 'pending_create' as SyncStatus,
  PENDING_UPDATE: 'pending_update' as SyncStatus,
  PENDING_DELETE: 'pending_delete' as SyncStatus,
};

// ============================================================
// SQL Table Definitions
// ============================================================

export const CREATE_TABLES_SQL = [
  // ---------- Metadata ----------
  `CREATE TABLE IF NOT EXISTS _sync_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,

  // ---------- Sync Queue ----------
  `CREATE TABLE IF NOT EXISTS _sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_local_id TEXT NOT NULL,
    action TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
  )`,

  // ---------- Reference Data (read-only from server) ----------
  `CREATE TABLE IF NOT EXISTS transaction_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#000000',
    is_income INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS account_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'account-balance-wallet',
    color TEXT NOT NULL DEFAULT '#51A2FF',
    display_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS banks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS currencies (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL DEFAULT '',
    country_code TEXT NOT NULL DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
  )`,

  // ---------- User Data (offline-first CRUD) ----------
  `CREATE TABLE IF NOT EXISTS categories (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    user_id TEXT NOT NULL,
    transaction_type_id TEXT NOT NULL,
    transaction_type_name TEXT NOT NULL DEFAULT '',
    parent_category_id TEXT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'category',
    is_active INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    _sync_status TEXT NOT NULL DEFAULT 'synced',
    _local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    _server_updated_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS money_sources (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    user_id TEXT NOT NULL,
    account_type_id TEXT NOT NULL,
    account_type_name TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'account-balance-wallet',
    color TEXT NOT NULL DEFAULT '#51A2FF',
    balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'VND',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    _sync_status TEXT NOT NULL DEFAULT 'synced',
    _local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    _server_updated_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS transactions (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    user_id TEXT NOT NULL,
    transaction_type_id TEXT NOT NULL,
    transaction_type_name TEXT NOT NULL DEFAULT '',
    transaction_type_color TEXT NOT NULL DEFAULT '#000000',
    is_income INTEGER NOT NULL DEFAULT 0,
    money_source_id TEXT NOT NULL,
    money_source_name TEXT NOT NULL DEFAULT '',
    money_source_icon TEXT NOT NULL DEFAULT '',
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL DEFAULT '',
    category_icon TEXT NOT NULL DEFAULT '',
    contact_id TEXT,
    contact_name TEXT,
    amount REAL NOT NULL DEFAULT 0,
    transaction_date TEXT NOT NULL,
    description TEXT,
    is_borrowing_for_this INTEGER NOT NULL DEFAULT 0,
    is_fee INTEGER NOT NULL DEFAULT 0,
    exclude_from_report INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    _sync_status TEXT NOT NULL DEFAULT 'synced',
    _local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    _server_updated_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS goals (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_amount REAL NOT NULL DEFAULT 0,
    current_amount REAL NOT NULL DEFAULT 0,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    currency TEXT NOT NULL DEFAULT 'VND',
    icon TEXT NOT NULL DEFAULT 'flag',
    color TEXT NOT NULL DEFAULT '#51A2FF',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    progress_percentage REAL NOT NULL DEFAULT 0,
    _sync_status TEXT NOT NULL DEFAULT 'synced',
    _local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    _server_updated_at TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS savings_books (
    local_id TEXT PRIMARY KEY,
    server_id TEXT,
    user_id TEXT NOT NULL,
    bank_id TEXT NOT NULL,
    bank_name TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'VND',
    deposit_date TEXT NOT NULL,
    term_months INTEGER NOT NULL DEFAULT 0,
    interest_rate REAL NOT NULL DEFAULT 0,
    non_term_interest_rate REAL NOT NULL DEFAULT 0,
    days_in_year_for_interest INTEGER NOT NULL DEFAULT 365,
    interest_payment_type TEXT NOT NULL DEFAULT 'CuoiKy',
    maturity_option TEXT NOT NULL DEFAULT 'TaiTucGocVaLai',
    source_money_source_id TEXT,
    description TEXT,
    exclude_from_reports INTEGER NOT NULL DEFAULT 0,
    initial_balance REAL NOT NULL DEFAULT 0,
    current_balance REAL NOT NULL DEFAULT 0,
    maturity_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    _sync_status TEXT NOT NULL DEFAULT 'synced',
    _local_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    _server_updated_at TEXT
  )`,
];

// Indexes for performance
export const CREATE_INDEXES_SQL = [
  `CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_sync ON transactions(_sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_server_id ON transactions(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_money_sources_user ON money_sources(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_money_sources_sync ON money_sources(_sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_money_sources_server_id ON money_sources(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_sync ON categories(_sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_categories_server_id ON categories(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_goals_sync ON goals(_sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_goals_server_id ON goals(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_savings_books_user ON savings_books(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_savings_books_sync ON savings_books(_sync_status)`,
  `CREATE INDEX IF NOT EXISTS idx_savings_books_server_id ON savings_books(server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON _sync_queue(status)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON _sync_queue(entity_type, entity_local_id)`,
];
