/**
 * Reference Data Repository
 * Manages read-only reference data cached from server:
 * - Transaction Types
 * - Account Types
 * - Banks
 * - Currencies
 */
import { getDb } from '../database';
import type { TransactionTypeDto, CategoryDto } from '@/lib/types/transaction';
import type { AccountTypeDto, CurrencyDto, IconDto } from '@/lib/types/moneySource';
import type { BankDto } from '@/lib/types/savingsBook';

// ============================================================
// Transaction Types
// ============================================================

export async function getAllTransactionTypes(): Promise<TransactionTypeDto[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM transaction_types ORDER BY display_order');
  return rows.map(mapTransactionType);
}

export async function getTransactionTypeById(id: string): Promise<TransactionTypeDto | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM transaction_types WHERE id = ?', [id]);
  return row ? mapTransactionType(row) : null;
}

export async function upsertTransactionTypes(types: TransactionTypeDto[]): Promise<void> {
  const db = await getDb();
  const stmt = await db.prepareAsync(
    `INSERT OR REPLACE INTO transaction_types (id, name, color, is_income, display_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  try {
    for (const t of types) {
      await stmt.executeAsync([t.id, t.name, t.color, t.isIncome ? 1 : 0, t.displayOrder, new Date().toISOString()]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

function mapTransactionType(row: any): TransactionTypeDto {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    isIncome: !!row.is_income,
    displayOrder: row.display_order,
  };
}

// ============================================================
// Account Types
// ============================================================

export async function getAllAccountTypes(): Promise<AccountTypeDto[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM account_types ORDER BY display_order');
  return rows.map(mapAccountType);
}

export async function upsertAccountTypes(types: AccountTypeDto[]): Promise<void> {
  const db = await getDb();
  const stmt = await db.prepareAsync(
    `INSERT OR REPLACE INTO account_types (id, name, icon, color, display_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  try {
    for (const t of types) {
      await stmt.executeAsync([t.id, t.name, t.icon, t.color, t.displayOrder, new Date().toISOString()]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

function mapAccountType(row: any): AccountTypeDto {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    displayOrder: row.display_order,
  };
}

// ============================================================
// Banks
// ============================================================

export async function getAllBanks(): Promise<BankDto[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM banks ORDER BY display_order');
  return rows.map(mapBank);
}

export async function getBankById(id: string): Promise<BankDto | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM banks WHERE id = ?', [id]);
  return row ? mapBank(row) : null;
}

export async function upsertBanks(banks: BankDto[]): Promise<void> {
  const db = await getDb();
  const stmt = await db.prepareAsync(
    `INSERT OR REPLACE INTO banks (id, name, code, display_order, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  try {
    for (const b of banks) {
      await stmt.executeAsync([b.id, b.name, b.code ?? null, b.displayOrder, new Date().toISOString()]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

function mapBank(row: any): BankDto {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? undefined,
    displayOrder: row.display_order,
  };
}

// ============================================================
// Currencies
// ============================================================

export async function getAllCurrencies(): Promise<CurrencyDto[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM currencies ORDER BY display_order');
  return rows.map(mapCurrency);
}

export async function upsertCurrencies(currencies: CurrencyDto[]): Promise<void> {
  const db = await getDb();
  const stmt = await db.prepareAsync(
    `INSERT OR REPLACE INTO currencies (id, code, name, symbol, country_code, display_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  try {
    for (const c of currencies) {
      await stmt.executeAsync([c.id, c.code, c.name, c.symbol, c.countryCode, c.displayOrder, new Date().toISOString()]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

function mapCurrency(row: any): CurrencyDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    countryCode: row.country_code,
    displayOrder: row.display_order,
  };
}

// ============================================================
// Check if reference data is loaded
// ============================================================

export async function hasReferenceData(): Promise<boolean> {
  const db = await getDb();
  const result = await db.getFirstAsync<{ cnt: number }>('SELECT COUNT(*) as cnt FROM transaction_types');
  return (result?.cnt ?? 0) > 0;
}
