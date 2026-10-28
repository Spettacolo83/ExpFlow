/**
 * Accesso al database SQLite locale (expo-sqlite, API async).
 *
 * Contiene: apertura della connessione (singleton), creazione dello schema
 * e seed delle categorie di default. Le operazioni CRUD complete su spese
 * saranno aggiunte nella fase "Core features".
 *
 * Schema definito in EXPFLOW_PROMPT.md (Database SQLite schema).
 */
import * as SQLite from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { Category, CurrencyCode, Expense, NewExpense } from '@/types';
import { generateId } from '@/services/id';

const VALID_CURRENCIES: ReadonlySet<string> = new Set(['EUR', 'USD', 'GBP']);

const DB_NAME = 'expflow.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Restituisce la connessione condivisa, aprendola alla prima chiamata. */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  merchant TEXT,
  category TEXT NOT NULL,
  notes TEXT,
  photo_uri TEXT,
  raw_ocr_text TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  is_custom INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  default_category TEXT,
  times_seen INTEGER DEFAULT 1,
  last_seen INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
`;

/**
 * Inizializza lo schema e inserisce le categorie di default se la tabella
 * è vuota. Idempotente: può essere chiamata ad ogni avvio dell'app.
 */
export async function initDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(SCHEMA);
  await seedDefaultCategories(db);
}

async function seedDefaultCategories(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM categories;'
  );
  if (row && row.count > 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const category of DEFAULT_CATEGORIES) {
      await db.runAsync(
        'INSERT INTO categories (id, name, color, icon, is_custom) VALUES (?, ?, ?, ?, ?);',
        category.id,
        category.name,
        category.color,
        category.icon,
        category.isCustom ? 1 : 0
      );
    }
  });
}

/** Elimina tutti i dati utente (spese e merchant) mantenendo le categorie.
 *  Usato dalla funzione "Reset dati" delle impostazioni (GDPR). */
export async function clearUserData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('DELETE FROM expenses; DELETE FROM merchants;');
}

/** Shape of a raw `expenses` row as returned by SQLite (snake_case). */
export interface ExpenseRow {
  id: string;
  date: string;
  amount: number;
  currency: string;
  merchant: string | null;
  category: string;
  notes: string | null;
  photo_uri: string | null;
  raw_ocr_text: string | null;
  created_at: number;
  updated_at: number;
}

/** Pure mapper: SQLite row → domain `Expense`. */
export function mapRowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: row.date,
    amount: row.amount,
    // Guard against malformed/legacy rows: an unknown currency falls back to EUR.
    currency: VALID_CURRENCIES.has(row.currency) ? (row.currency as CurrencyCode) : 'EUR',
    merchant: row.merchant,
    category: row.category,
    notes: row.notes,
    photoUri: row.photo_uri,
    rawOcrText: row.raw_ocr_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Inserts a new expense and returns the stored row. */
export async function insertExpense(input: NewExpense): Promise<Expense> {
  const db = await getDatabase();
  const now = Date.now();
  const expense: Expense = { ...input, id: generateId(), createdAt: now, updatedAt: now };
  await db.runAsync(
    `INSERT INTO expenses
       (id, date, amount, currency, merchant, category, notes, photo_uri, raw_ocr_text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    expense.id,
    expense.date,
    expense.amount,
    expense.currency,
    expense.merchant,
    expense.category,
    expense.notes,
    expense.photoUri,
    expense.rawOcrText,
    expense.createdAt,
    expense.updatedAt
  );
  if (expense.merchant) {
    await upsertMerchant(expense.merchant, expense.category);
  }
  return expense;
}

/** Records a merchant sighting (foundation for the future categorization cache). */
export async function upsertMerchant(name: string, category?: string): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  // The generated id is only consumed on the first insert; on re-sightings the
  // ON CONFLICT(name) DO UPDATE path keeps the existing row and discards this id.
  await db.runAsync(
    `INSERT INTO merchants (id, name, default_category, times_seen, last_seen)
       VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(name) DO UPDATE SET
       times_seen = times_seen + 1,
       last_seen = excluded.last_seen,
       default_category = COALESCE(merchants.default_category, excluded.default_category);`,
    generateId(),
    name,
    category ?? null,
    now
  );
}

/** Returns all expenses, newest first. */
export async function getExpenses(): Promise<Expense[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ExpenseRow>(
    'SELECT * FROM expenses ORDER BY date DESC, created_at DESC;'
  );
  return rows.map(mapRowToExpense);
}

/** Returns all categories. */
export async function getCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    color: string;
    icon: string;
    is_custom: number;
  }>('SELECT * FROM categories ORDER BY is_custom ASC, name ASC;');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    isCustom: r.is_custom === 1,
  }));
}
