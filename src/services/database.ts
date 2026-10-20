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
