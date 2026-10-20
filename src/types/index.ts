/**
 * Tipi condivisi di ExpFlow. Rispecchiano lo schema SQLite in
 * `src/services/database.ts`.
 */

/** Valute supportate dall'MVP. */
export type CurrencyCode = 'EUR' | 'USD' | 'GBP';

/** Lingue supportate dall'app. */
export type Language = 'it' | 'es' | 'en';

/**
 * Categoria di spesa. Le categorie di default non sono eliminabili
 * (`isCustom = false`); quelle create dall'utente sì.
 */
export interface Category {
  id: string;
  /** Chiave logica stabile usata dal LLM e per i18n (es. "food"). */
  name: string;
  /** Colore HEX per chart e chip. */
  color: string;
  /** Nome icona (set Ionicons). */
  icon: string;
  isCustom: boolean;
}

/** Spesa registrata. */
export interface Expense {
  id: string;
  /** Data della spesa in formato ISO (YYYY-MM-DD). */
  date: string;
  amount: number;
  currency: CurrencyCode;
  merchant: string | null;
  /** `Category.id` di riferimento. */
  category: string;
  notes: string | null;
  /** URI locale della foto scontrino, se conservata. */
  photoUri: string | null;
  /** Testo OCR grezzo, utile per re-parsing e debug. */
  rawOcrText: string | null;
  /** Timestamp epoch (ms). */
  createdAt: number;
  updatedAt: number;
}

/**
 * Esercente memorizzato per l'apprendimento della categoria:
 * se un merchant è già stato visto, si riusa `defaultCategory`.
 */
export interface Merchant {
  id: string;
  name: string;
  defaultCategory: string | null;
  timesSeen: number;
  lastSeen: number;
}

/** Payload per creare una spesa (campi generati dal DB esclusi). */
export type NewExpense = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;
