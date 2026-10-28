# Receipt Scan Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user capture a receipt, extract its text on-device, parse the key fields, review a pre-filled localized form, and persist the expense to SQLite.

**Architecture:** `expo-camera` captures a photo; `@react-native-ml-kit/text-recognition` turns it into raw text; a pure `parseReceipt` function extracts amount/date/merchant; the form writes through the `database` service to SQLite. UI is localized (EN/IT/ES) via `i18next`. The parser and the DB row mapper are pure and unit-tested; native pieces are verified manually on a device.

**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript, Expo Router, expo-camera, @react-native-ml-kit/text-recognition, expo-file-system, expo-localization, i18next/react-i18next, expo-sqlite, Jest (jest-expo).

**Conventions:** All repository artifacts (code, comments, commit messages) are in English. Commits follow Conventional Commits with **no** `Co-Authored-By` trailer. Push to `origin/main` after each commit.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `app.json` | Register expo-camera plugin + camera permission strings |
| `package.json` | Test script + jest-expo preset |
| `src/i18n/index.ts` | i18next init, device-locale detection, EN fallback |
| `src/locales/{en,it,es}.json` | Translation resources |
| `src/types/index.ts` | Add `ParsedReceipt` + `ExpenseRow` types |
| `src/services/id.ts` | Local unique id generator (pure) |
| `src/services/parser.ts` | Pure receipt text parser |
| `src/services/ocr.ts` | ML Kit OCR wrapper (native) |
| `src/services/database.ts` | Add `insertExpense`, `upsertMerchant`, `getExpenses`, `mapRowToExpense` |
| `src/services/__tests__/parser.test.ts` | Parser unit tests |
| `src/services/__tests__/database.test.ts` | `mapRowToExpense` unit tests |
| `src/components/Common/Button.tsx` | Themed button |
| `src/components/Common/Input.tsx` | Themed labeled text input |
| `src/components/Common/CategoryPicker.tsx` | Horizontal category selector |
| `src/components/Common/Fab.tsx` | Floating "+" action button |
| `src/components/Scan/OverlayGuide.tsx` | Camera framing overlay |
| `src/app/expense-form.tsx` | Review/edit/save screen (modal) |
| `src/app/scan.tsx` | Camera + OCR screen (full-screen) |
| `src/app/_layout.tsx` | i18n init + register `scan` and `expense-form` routes |
| `src/app/(tabs)/index.tsx` | Mount the FAB entry point |

---

## Task 1: Install dependencies and native configuration

**Files:**
- Modify: `package.json` (via installers)
- Modify: `app.json`

- [ ] **Step 1: Install runtime dependencies**

Run:
```bash
npx expo install expo-camera expo-file-system expo-localization @react-native-ml-kit/text-recognition
npm install i18next react-i18next
```
Expected: packages added to `package.json`; expo plugins auto-registered where applicable.

- [ ] **Step 2: Add the camera plugin and permission strings to `app.json`**

In `app.json`, add the camera plugin to the `plugins` array (keep existing `expo-router` and `expo-splash-screen` entries):

```json
[
  "expo-camera",
  {
    "cameraPermission": "Allow ExpFlow to access your camera to scan receipts.",
    "recordAudioAndroid": false
  }
]
```

- [ ] **Step 3: Verify config and types**

Run:
```bash
npx expo-doctor
npx tsc --noEmit
```
Expected: expo-doctor passes; tsc reports no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json app.json
git commit -m "chore: add camera, OCR, file-system and i18n dependencies"
git push origin main
```

---

## Task 2: Jest test harness

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the test toolchain**

Run:
```bash
npx expo install -- jest-expo --save-dev
npm install --save-dev jest @types/jest
```
Expected: dev dependencies added.

- [ ] **Step 2: Configure Jest in `package.json`**

Add a `test` script and a `jest` config block:

```json
"scripts": {
  "start": "expo start",
  "reset-project": "node ./scripts/reset-project.js",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "lint": "expo lint",
  "test": "jest"
},
"jest": {
  "preset": "jest-expo",
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|i18next|react-i18next))"
  ]
}
```

- [ ] **Step 3: Add a smoke test to prove the harness runs**

Create `src/services/__tests__/smoke.test.ts`:

```ts
describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run the smoke test**

Run: `npm test -- smoke`
Expected: 1 test passes.

- [ ] **Step 5: Remove the smoke test and commit**

```bash
rm src/services/__tests__/smoke.test.ts
git add package.json package-lock.json
git commit -m "test: set up jest-expo test harness"
git push origin main
```

---

## Task 3: Localization (EN / IT / ES)

**Files:**
- Create: `src/locales/en.json`, `src/locales/it.json`, `src/locales/es.json`
- Create: `src/i18n/index.ts`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: Create `src/locales/en.json`**

```json
{
  "common": {
    "appName": "ExpFlow",
    "save": "Save",
    "cancel": "Cancel",
    "today": "Today"
  },
  "home": {
    "addExpense": "Add expense"
  },
  "scan": {
    "title": "Scan receipt",
    "instruction": "Fit the receipt inside the frame",
    "capture": "Capture",
    "analyzing": "Analyzing receipt…",
    "manualEntry": "Manual entry",
    "chooseScan": "Scan receipt",
    "chooseManual": "Enter manually"
  },
  "permissions": {
    "cameraTitle": "Camera access needed",
    "cameraMessage": "ExpFlow uses the camera to scan your receipts. Nothing leaves your device.",
    "grant": "Allow camera",
    "openSettings": "Open settings"
  },
  "form": {
    "titleNew": "New expense",
    "titleEdit": "Edit expense",
    "amount": "Amount",
    "date": "Date",
    "merchant": "Merchant",
    "category": "Category",
    "notes": "Notes",
    "keepPhoto": "Keep receipt photo",
    "amountRequired": "Enter an amount",
    "amountInvalid": "Enter a valid amount",
    "ocrFailed": "Could not read the receipt. Fill in the details manually."
  },
  "categories": {
    "food": "Food & Groceries",
    "transport": "Transportation",
    "housing": "Housing",
    "health": "Health",
    "entertainment": "Entertainment",
    "work": "Work",
    "other": "Other"
  }
}
```

- [ ] **Step 2: Create `src/locales/it.json`**

```json
{
  "common": {
    "appName": "ExpFlow",
    "save": "Salva",
    "cancel": "Annulla",
    "today": "Oggi"
  },
  "home": {
    "addExpense": "Aggiungi spesa"
  },
  "scan": {
    "title": "Scansiona scontrino",
    "instruction": "Inquadra lo scontrino nel riquadro",
    "capture": "Scatta",
    "analyzing": "Analisi scontrino…",
    "manualEntry": "Inserimento manuale",
    "chooseScan": "Scansiona scontrino",
    "chooseManual": "Inserisci a mano"
  },
  "permissions": {
    "cameraTitle": "Serve l'accesso alla camera",
    "cameraMessage": "ExpFlow usa la camera per scansionare gli scontrini. Nulla lascia il tuo dispositivo.",
    "grant": "Consenti camera",
    "openSettings": "Apri impostazioni"
  },
  "form": {
    "titleNew": "Nuova spesa",
    "titleEdit": "Modifica spesa",
    "amount": "Totale",
    "date": "Data",
    "merchant": "Esercente",
    "category": "Categoria",
    "notes": "Note",
    "keepPhoto": "Mantieni foto scontrino",
    "amountRequired": "Inserisci un importo",
    "amountInvalid": "Inserisci un importo valido",
    "ocrFailed": "Impossibile leggere lo scontrino. Inserisci i dati a mano."
  },
  "categories": {
    "food": "Spesa alimentare",
    "transport": "Trasporti",
    "housing": "Casa",
    "health": "Salute",
    "entertainment": "Svago",
    "work": "Lavoro",
    "other": "Altro"
  }
}
```

- [ ] **Step 3: Create `src/locales/es.json`**

```json
{
  "common": {
    "appName": "ExpFlow",
    "save": "Guardar",
    "cancel": "Cancelar",
    "today": "Hoy"
  },
  "home": {
    "addExpense": "Añadir gasto"
  },
  "scan": {
    "title": "Escanear recibo",
    "instruction": "Encuadra el recibo dentro del marco",
    "capture": "Capturar",
    "analyzing": "Analizando recibo…",
    "manualEntry": "Entrada manual",
    "chooseScan": "Escanear recibo",
    "chooseManual": "Introducir a mano"
  },
  "permissions": {
    "cameraTitle": "Se necesita acceso a la cámara",
    "cameraMessage": "ExpFlow usa la cámara para escanear tus recibos. Nada sale de tu dispositivo.",
    "grant": "Permitir cámara",
    "openSettings": "Abrir ajustes"
  },
  "form": {
    "titleNew": "Nuevo gasto",
    "titleEdit": "Editar gasto",
    "amount": "Importe",
    "date": "Fecha",
    "merchant": "Comercio",
    "category": "Categoría",
    "notes": "Notas",
    "keepPhoto": "Guardar foto del recibo",
    "amountRequired": "Introduce un importe",
    "amountInvalid": "Introduce un importe válido",
    "ocrFailed": "No se pudo leer el recibo. Rellena los datos a mano."
  },
  "categories": {
    "food": "Alimentación",
    "transport": "Transporte",
    "housing": "Hogar",
    "health": "Salud",
    "entertainment": "Ocio",
    "work": "Trabajo",
    "other": "Otro"
  }
}
```

- [ ] **Step 4: Create `src/i18n/index.ts`**

```ts
import i18n from 'i18next';
import { getLocales } from 'expo-localization';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import it from '@/locales/it.json';

export const SUPPORTED_LANGUAGES = ['en', 'it', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Resolve the device language to one we support, falling back to English. */
function resolveDeviceLanguage(): SupportedLanguage {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code)
    ? (code as SupportedLanguage)
    : 'en';
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      it: { translation: it },
      es: { translation: es },
    },
    lng: resolveDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
```

- [ ] **Step 5: Initialize i18n in `src/app/_layout.tsx`**

Add this import near the top of `src/app/_layout.tsx` (side-effect import that runs init before any screen renders):

```ts
import '@/i18n';
```

- [ ] **Step 6: Verify types and that JSON imports resolve**

Run: `npx tsc --noEmit`
Expected: no errors. (`resolveJsonModule` is enabled by `expo/tsconfig.base`.)

- [ ] **Step 7: Commit**

```bash
git add src/locales src/i18n src/app/_layout.tsx
git commit -m "feat: add EN/IT/ES localization with device-locale detection"
git push origin main
```

---

## Task 4: Receipt parser (pure, TDD)

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/services/parser.ts`
- Test: `src/services/__tests__/parser.test.ts`

- [ ] **Step 1: Add `ParsedReceipt` to `src/types/index.ts`**

Append:

```ts
/** Result of parsing raw OCR text from a receipt. */
export interface ParsedReceipt {
  /** Detected total, or null if none could be read. */
  amount: number | null;
  /** Transaction date as ISO `YYYY-MM-DD`; defaults to today when not found. */
  date: string;
  /** Detected merchant name, or null. */
  merchant: string | null;
  /** 0–1 heuristic confidence per field. */
  confidence: { amount: number; date: number; merchant: number };
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/services/__tests__/parser.test.ts`:

```ts
import { parseReceipt, toIsoDate } from '@/services/parser';

const FIXED_TODAY = new Date(2026, 9, 28); // 2026-10-28 (month is 0-based)

describe('toIsoDate', () => {
  it('formats a date as YYYY-MM-DD in local time', () => {
    expect(toIsoDate(new Date(2026, 2, 9))).toBe('2026-03-09');
  });
});

describe('parseReceipt — Italian receipt', () => {
  const text = [
    'ESSELUNGA SPA',
    'VIA MILANO 12',
    'P.IVA 01234567890',
    'PANE            1,20',
    'LATTE           0,99',
    'TOTALE EUR     42,50',
    'DATA 12/03/2026 ORE 18:03',
  ].join('\n');

  it('extracts the total with comma decimals', () => {
    expect(parseReceipt(text, 'it', FIXED_TODAY).amount).toBe(42.5);
  });

  it('normalizes the date to ISO (day-first)', () => {
    expect(parseReceipt(text, 'it', FIXED_TODAY).date).toBe('2026-03-12');
  });

  it('picks the merchant from the header', () => {
    expect(parseReceipt(text, 'it', FIXED_TODAY).merchant).toBe('ESSELUNGA SPA');
  });
});

describe('parseReceipt — English receipt', () => {
  const text = ['WALMART', 'GROCERY', 'TOTAL  $15.99', '03/12/2026'].join('\n');

  it('extracts the total with dot decimals', () => {
    expect(parseReceipt(text, 'en', FIXED_TODAY).amount).toBe(15.99);
  });

  it('reads the date month-first for English', () => {
    expect(parseReceipt(text, 'en', FIXED_TODAY).date).toBe('2026-03-12');
  });
});

describe('parseReceipt — fallbacks', () => {
  it('returns today and nulls for empty input', () => {
    const result = parseReceipt('', 'it', FIXED_TODAY);
    expect(result.amount).toBeNull();
    expect(result.merchant).toBeNull();
    expect(result.date).toBe('2026-10-28');
    expect(result.confidence.amount).toBe(0);
  });

  it('falls back to the largest monetary value when no keyword is present', () => {
    const text = ['BAR CENTRALE', 'CAFFE 1,10', 'CORNETTO 1,30', '2,40'].join('\n');
    expect(parseReceipt(text, 'it', FIXED_TODAY).amount).toBe(2.4);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- parser`
Expected: FAIL — `parser.ts` does not exist / `parseReceipt is not a function`.

- [ ] **Step 4: Implement `src/services/parser.ts`**

```ts
import { Language, ParsedReceipt } from '@/types';

const TOTAL_KEYWORDS = [
  'totale',
  'total',
  'importo',
  'total a pagar',
  'a pagar',
  'saldo',
  'amount',
];

const VAT_OR_ADDRESS = /(p\.?\s?iva|c\.?f\.?|vat|via |tel|str\.|cap |n\.?\s?\d)/i;

/** Format a Date as `YYYY-MM-DD` using local components (timezone-safe). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Convert a locale-formatted monetary token to a number, or null. */
function normalizeAmount(token: string, locale: Language): number | null {
  const cleaned = token.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  let normalized: string;
  if (locale === 'en') {
    // dot = decimal, comma = thousands
    normalized = cleaned.replace(/,/g, '');
  } else {
    // it/es: comma = decimal, dot = thousands
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  }
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

const MONEY_TOKEN = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/g;

function extractAmount(
  lines: string[],
  locale: Language
): { amount: number | null; confidence: number } {
  // 1. Prefer a line containing a total keyword.
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (TOTAL_KEYWORDS.some((k) => lower.includes(k))) {
      const matches = line.match(MONEY_TOKEN);
      if (matches?.length) {
        const amount = normalizeAmount(matches[matches.length - 1], locale);
        if (amount !== null) return { amount, confidence: 0.9 };
      }
    }
  }
  // 2. Fallback: the largest monetary value anywhere.
  const all = lines
    .flatMap((line) => line.match(MONEY_TOKEN) ?? [])
    .map((t) => normalizeAmount(t, locale))
    .filter((n): n is number => n !== null);
  if (all.length) return { amount: Math.max(...all), confidence: 0.4 };
  return { amount: null, confidence: 0 };
}

const DATE_PATTERNS = [
  /\b(\d{4})-(\d{2})-(\d{2})\b/, // ISO
  /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/, // D/M/Y or M/D/Y
];

function extractDate(
  lines: string[],
  locale: Language,
  today: Date
): { date: string; confidence: number } {
  const text = lines.join(' ');
  const iso = text.match(DATE_PATTERNS[0]);
  if (iso) {
    return { date: `${iso[1]}-${iso[2]}-${iso[3]}`, confidence: 0.9 };
  }
  const dmy = text.match(DATE_PATTERNS[1]);
  if (dmy) {
    const a = parseInt(dmy[1], 10);
    const b = parseInt(dmy[2], 10);
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    // English receipts are month-first; others are day-first.
    const day = locale === 'en' ? b : a;
    const month = locale === 'en' ? a : b;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { date: toIsoDate(new Date(year, month - 1, day)), confidence: 0.8 };
    }
  }
  return { date: toIsoDate(today), confidence: 0 };
}

function extractMerchant(lines: string[]): { merchant: string | null; confidence: number } {
  for (const raw of lines.slice(0, 4)) {
    const line = raw.trim();
    if (line.length < 3 || line.length > 32) continue;
    if (VAT_OR_ADDRESS.test(line)) continue;
    const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length < 3) continue;
    const upperRatio =
      letters.length === 0
        ? 0
        : [...letters].filter((c) => c === c.toUpperCase()).length / letters.length;
    if (upperRatio >= 0.6) return { merchant: line, confidence: 0.7 };
  }
  // Fallback: first non-empty line.
  const first = lines.map((l) => l.trim()).find((l) => l.length >= 3);
  return first ? { merchant: first, confidence: 0.3 } : { merchant: null, confidence: 0 };
}

/**
 * Parse raw OCR text from a receipt into structured fields. Pure and total:
 * never throws, always returns a value (date defaults to `today`).
 */
export function parseReceipt(
  text: string,
  locale: Language,
  today: Date = new Date()
): ParsedReceipt {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const { amount, confidence: amountC } = extractAmount(lines, locale);
  const { date, confidence: dateC } = extractDate(lines, locale, today);
  const { merchant, confidence: merchantC } = extractMerchant(lines);

  return {
    amount,
    date,
    merchant,
    confidence: { amount: amountC, date: dateC, merchant: merchantC },
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- parser`
Expected: all parser tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/services/parser.ts src/services/__tests__/parser.test.ts
git commit -m "feat: add locale-aware receipt parser with unit tests"
git push origin main
```

---

## Task 5: Database access functions

**Files:**
- Create: `src/services/id.ts`
- Modify: `src/services/database.ts`
- Test: `src/services/__tests__/database.test.ts`

- [ ] **Step 1: Create `src/services/id.ts`**

```ts
/**
 * Generates a locally-unique id (timestamp + randomness). Sufficient for
 * device-local primary keys; no external dependency required.
 */
export function generateId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${time}-${rand}`;
}
```

- [ ] **Step 2: Write the failing test for the row mapper**

Create `src/services/__tests__/database.test.ts`:

```ts
import { mapRowToExpense } from '@/services/database';

describe('mapRowToExpense', () => {
  it('maps a snake_case DB row to a camelCase Expense', () => {
    const row = {
      id: 'abc',
      date: '2026-03-12',
      amount: 42.5,
      currency: 'EUR',
      merchant: 'ESSELUNGA',
      category: 'food',
      notes: null,
      photo_uri: null,
      raw_ocr_text: 'TOTALE 42,50',
      created_at: 1000,
      updated_at: 2000,
    };
    expect(mapRowToExpense(row)).toEqual({
      id: 'abc',
      date: '2026-03-12',
      amount: 42.5,
      currency: 'EUR',
      merchant: 'ESSELUNGA',
      category: 'food',
      notes: null,
      photoUri: null,
      rawOcrText: 'TOTALE 42,50',
      createdAt: 1000,
      updatedAt: 2000,
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- database`
Expected: FAIL — `mapRowToExpense` is not exported.

- [ ] **Step 4: Add the row type, mapper and write functions to `src/services/database.ts`**

Add the import at the top (alongside the existing imports):

```ts
import { Category, CurrencyCode, Expense, NewExpense } from '@/types';
import { generateId } from '@/services/id';
```

Append to the file:

```ts
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
    currency: row.currency as CurrencyCode,
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
  }>('SELECT * FROM categories;');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon,
    isCustom: r.is_custom === 1,
  }));
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- database`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/services/id.ts src/services/database.ts src/services/__tests__/database.test.ts
git commit -m "feat: add expense/merchant persistence and row mapper"
git push origin main
```

---

## Task 6: OCR and photo-storage services

**Files:**
- Create: `src/services/ocr.ts`
- Create: `src/services/photos.ts`

- [ ] **Step 1: Implement `src/services/ocr.ts`**

```ts
import TextRecognition from '@react-native-ml-kit/text-recognition';

/**
 * Runs on-device OCR on an image file and returns the recognized text.
 * Wraps ML Kit so the rest of the app never imports it directly. Returns an
 * empty string on failure — callers degrade gracefully to manual entry.
 */
export async function recognizeText(imageUri: string): Promise<string> {
  try {
    const result = await TextRecognition.recognize(imageUri);
    return result.text ?? '';
  } catch (error) {
    console.warn('[ExpFlow] OCR failed', error);
    return '';
  }
}
```

- [ ] **Step 2: Implement `src/services/photos.ts`**

Isolates file I/O so screens never touch the filesystem API directly. Uses the
stable legacy FileSystem API (available in SDK 58 at `expo-file-system/legacy`).

```ts
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copies a freshly-captured photo from the cache into the app's document
 * directory so it survives cache eviction. Returns the persistent URI, or the
 * original URI if copying fails (never blocks a save).
 */
export async function persistReceiptPhoto(cacheUri: string): Promise<string> {
  try {
    const dir = `${FileSystem.documentDirectory}receipts/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
    const ext = cacheUri.split('.').pop()?.split('?')[0] || 'jpg';
    const dest = `${dir}${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: cacheUri, to: dest });
    return dest;
  } catch (error) {
    console.warn('[ExpFlow] Could not persist receipt photo', error);
    return cacheUri;
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/ocr.ts src/services/photos.ts
git commit -m "feat: add OCR and receipt-photo storage services"
git push origin main
```

---

## Task 7: Common UI components

**Files:**
- Create: `src/components/Common/Button.tsx`
- Create: `src/components/Common/Input.tsx`
- Create: `src/components/Common/CategoryPicker.tsx`

- [ ] **Step 1: Create `src/components/Common/Button.tsx`**

```tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? theme.primary : theme.backgroundElement;
  const color = isPrimary ? theme.onPrimary : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[Typography.bodyBold, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
});
```

- [ ] **Step 2: Create `src/components/Common/Input.tsx`**

```tsx
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Input({
  label,
  error,
  style,
  ...rest
}: TextInputProps & { label: string; error?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <ThemedText style={Typography.caption} themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          Typography.body,
          {
            backgroundColor: theme.backgroundElement,
            color: theme.text,
            borderColor: error ? theme.error : theme.border,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <ThemedText style={Typography.small} themeColor="error">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.one },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
  },
});
```

- [ ] **Step 3: Create `src/components/Common/CategoryPicker.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DEFAULT_CATEGORIES } from '@/constants/categories';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export function CategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (categoryId: string) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {DEFAULT_CATEGORIES.map((category) => {
        const selected = category.id === value;
        return (
          <Pressable
            key={category.id}
            onPress={() => onChange(category.id)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? theme.primaryMuted : theme.backgroundElement,
                borderColor: selected ? theme.primary : theme.border,
              },
            ]}>
            <View style={[styles.dot, { backgroundColor: category.color }]}>
              <Ionicons name={category.icon as IoniconName} size={14} color="#FFFFFF" />
            </View>
            <ThemedText style={Typography.caption}>{t(`categories.${category.name}`)}</ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Common
git commit -m "feat: add reusable Button, Input and CategoryPicker components"
git push origin main
```

---

## Task 8: Expense form screen

**Files:**
- Create: `src/app/expense-form.tsx`
- Modify: `src/app/_layout.tsx` (register the route)

- [ ] **Step 1: Create `src/app/expense-form.tsx`**

```tsx
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Common/Button';
import { CategoryPicker } from '@/components/Common/CategoryPicker';
import { Input } from '@/components/Common/Input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UNCATEGORIZED_ID } from '@/constants/categories';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { insertExpense } from '@/services/database';
import { persistReceiptPhoto } from '@/services/photos';
import { CurrencyCode } from '@/types';

export default function ExpenseFormScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{
    amount?: string;
    date?: string;
    merchant?: string;
    photoUri?: string;
    rawOcrText?: string;
  }>();

  const today = new Date().toISOString().slice(0, 10);
  const [amount, setAmount] = useState(params.amount ?? '');
  const [date, setDate] = useState(params.date ?? today);
  const [merchant, setMerchant] = useState(params.merchant ?? '');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState(UNCATEGORIZED_ID);
  const [keepPhoto, setKeepPhoto] = useState(Boolean(params.photoUri));
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // Came from the scanner but nothing usable was read → non-blocking hint.
  const showOcrNotice = params.rawOcrText !== undefined && !params.amount;

  async function handleSave() {
    const normalized = amount.replace(',', '.').trim();
    const value = parseFloat(normalized);
    if (!normalized) {
      setError(t('form.amountRequired'));
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError(t('form.amountInvalid'));
      return;
    }
    setError(undefined);
    setSaving(true);
    try {
      let photoUri: string | null = null;
      if (keepPhoto && params.photoUri) {
        photoUri = await persistReceiptPhoto(params.photoUri);
      }
      await insertExpense({
        date,
        amount: value,
        currency: 'EUR' as CurrencyCode,
        merchant: merchant.trim() || null,
        category,
        notes: notes.trim() || null,
        photoUri,
        rawOcrText: params.rawOcrText || null,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText style={Typography.heading}>{t('form.titleNew')}</ThemedText>

          {showOcrNotice ? (
            <ThemedText style={Typography.caption} themeColor="error">
              {t('form.ocrFailed')}
            </ThemedText>
          ) : null}

          <Input
            label={t('form.amount')}
            value={amount}
            onChangeText={setAmount}
            keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
            placeholder="0,00"
            error={error}
          />
          <Input label={t('form.date')} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Input label={t('form.merchant')} value={merchant} onChangeText={setMerchant} />

          <View style={styles.field}>
            <ThemedText style={Typography.caption} themeColor="textSecondary">
              {t('form.category')}
            </ThemedText>
            <CategoryPicker value={category} onChange={setCategory} />
          </View>

          <Input
            label={t('form.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            style={{ height: 88, textAlignVertical: 'top', paddingTop: Spacing.two }}
          />

          {params.photoUri ? (
            <View style={styles.switchRow}>
              <ThemedText style={Typography.body}>{t('form.keepPhoto')}</ThemedText>
              <Switch
                value={keepPhoto}
                onValueChange={setKeepPhoto}
                trackColor={{ true: theme.primary }}
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button label={t('common.save')} onPress={handleSave} loading={saving} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  field: { gap: Spacing.one },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footer: { padding: Spacing.four },
});
```

- [ ] **Step 2: Register the route in `src/app/_layout.tsx`**

Inside the `<Stack>` (after the existing `<Stack.Screen name="(tabs)" />`), add:

```tsx
<Stack.Screen
  name="expense-form"
  options={{ presentation: 'modal', headerShown: true, title: '' }}
/>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify manual entry end-to-end (simulator is fine — no camera needed)**

Run: `npx expo run:android` (or `npx expo run:ios`). From a temporary button or via the deep link `exp://.../expense-form`, open the form, enter an amount, save. Then confirm persistence by calling `getExpenses()` from the Home screen's effect during development, or inspect via a log. (A dedicated entry point is added in Task 10.)
Expected: the form saves without error and `router.back()` returns to the previous screen.

- [ ] **Step 5: Commit**

```bash
git add src/app/expense-form.tsx src/app/_layout.tsx
git commit -m "feat: add expense form screen with validation and save"
git push origin main
```

---

## Task 9: Scan screen (camera + OCR)

**Files:**
- Create: `src/components/Scan/OverlayGuide.tsx`
- Create: `src/app/scan.tsx`
- Modify: `src/app/_layout.tsx` (register the route)

- [ ] **Step 1: Create `src/components/Scan/OverlayGuide.tsx`**

```tsx
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';

export function OverlayGuide() {
  const { t } = useTranslation();
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.frame} />
      <Text style={styles.hint}>{t('scan.instruction')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: '78%',
    height: '58%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.lg,
  },
  hint: {
    ...Typography.body,
    color: '#FFFFFF',
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
});
```

- [ ] **Step 2: Create `src/app/scan.tsx`**

```tsx
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OverlayGuide } from '@/components/Scan/OverlayGuide';
import { Button } from '@/components/Common/Button';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { recognizeText } from '@/services/ocr';
import { parseReceipt } from '@/services/parser';
import i18n from '@/i18n';
import { Language } from '@/types';

export default function ScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [busy, setBusy] = useState(false);

  async function handleCapture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) return;
      const text = await recognizeText(photo.uri);
      const locale = (i18n.language as Language) ?? 'en';
      const parsed = parseReceipt(text, locale);
      router.replace({
        pathname: '/expense-form',
        params: {
          amount: parsed.amount != null ? String(parsed.amount) : '',
          date: parsed.date,
          merchant: parsed.merchant ?? '',
          photoUri: photo.uri,
          rawOcrText: text,
        },
      });
    } finally {
      setBusy(false);
    }
  }

  if (!permission) {
    return <View style={styles.black} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permission}>
        <Text style={[Typography.heading, styles.permTitle]}>{t('permissions.cameraTitle')}</Text>
        <Text style={[Typography.body, styles.permBody]}>{t('permissions.cameraMessage')}</Text>
        <Button
          label={permission.canAskAgain ? t('permissions.grant') : t('permissions.openSettings')}
          onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      <OverlayGuide />
      {busy ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#FFFFFF" size="large" />
          <Text style={[Typography.body, styles.loaderText]}>{t('scan.analyzing')}</Text>
        </View>
      ) : (
        <SafeAreaView style={styles.controls} edges={['bottom']}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('scan.capture')}
            onPress={handleCapture}
            style={styles.shutter}
          />
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000000' },
  permission: {
    flex: 1,
    backgroundColor: '#000000',
    padding: Spacing.four,
    justifyContent: 'center',
    gap: Spacing.three,
  },
  permTitle: { color: '#FFFFFF' },
  permBody: { color: 'rgba(255,255,255,0.8)' },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: Spacing.five },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  loader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  loaderText: { color: '#FFFFFF' },
});
```

- [ ] **Step 3: Register the route in `src/app/_layout.tsx`**

Inside the `<Stack>`, add:

```tsx
<Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', headerShown: false }} />
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/scan.tsx src/components/Scan src/app/_layout.tsx
git commit -m "feat: add camera scan screen with on-device OCR"
git push origin main
```

---

## Task 10: Home FAB entry point

**Files:**
- Create: `src/components/Common/Fab.tsx`
- Modify: `src/app/(tabs)/index.tsx`

- [ ] **Step 1: Create `src/components/Common/Fab.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Fab({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Ionicons name="add" size={32} color={theme.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
```

- [ ] **Step 2: Wire the FAB + action sheet into `src/app/(tabs)/index.tsx`**

Replace the file contents with:

```tsx
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActionSheetIOS, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fab } from '@/components/Common/Fab';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, Typography } from '@/constants/theme';

export default function HomeScreen() {
  const { t } = useTranslation();

  function openAddExpense() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('scan.chooseScan'), t('scan.chooseManual'), t('common.cancel')],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) router.push('/scan');
          if (index === 1) router.push('/expense-form');
        }
      );
    } else {
      // Android: go straight to scanning; manual entry is reachable from there.
      router.push('/scan');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ThemedText style={Typography.display}>{t('common.appName')}</ThemedText>
        <ThemedText style={Typography.body} themeColor="textSecondary">
          Dashboard — month totals, breakdown and recent expenses (coming soon).
        </ThemedText>
        <View style={styles.spacer} />
      </SafeAreaView>
      <Fab onPress={openAddExpense} accessibilityLabel={t('home.addExpense')} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.two },
  spacer: { flex: 1 },
});
```

> **Note:** the Android path opens the scanner directly for this slice. A cross-platform bottom-sheet with both options can replace `ActionSheetIOS` in a later polish slice; kept minimal here (YAGNI).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Common/Fab.tsx "src/app/(tabs)/index.tsx"
git commit -m "feat: add Home FAB entry point for adding expenses"
git push origin main
```

---

## Task 11: End-to-end verification and final checks

**Files:** none (verification only)

- [ ] **Step 1: Full suite + static checks**

Run:
```bash
npm test
npx tsc --noEmit
npx expo lint
npx expo-doctor
```
Expected: tests pass; no type errors; lint clean; doctor passes.

- [ ] **Step 2: Build a dev client and run on a real Android device**

Run: `npx expo run:android` (device connected, USB debugging on).
Verify:
- FAB opens the scanner (Android) / action sheet (iOS).
- Camera preview shows with the framing overlay.
- Capturing a real receipt shows "Analyzing receipt…", then opens the form pre-filled with a plausible amount/date/merchant.
- Editing and saving returns to Home with no error.
- "Keep photo" toggle appears only when a photo exists.

- [ ] **Step 3: Verify persistence**

Temporarily log `getExpenses()` on Home mount (or inspect the SQLite DB) and confirm the saved expense is present with the expected fields. Remove the temporary log before committing.

- [ ] **Step 4: Verify on a real iPhone**

Run: `npx expo run:ios` (or build to a connected device). Repeat Step 2 checks; confirm the iOS action sheet offers both Scan and Manual entry.

- [ ] **Step 5: Verify localization**

Switch the device language to Italian and Spanish; confirm scan/form/permission strings follow. English is the fallback for any other language.

- [ ] **Step 6: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "chore: finalize receipt scan flow after device verification"
git push origin main
```

---

## Notes for the implementer

- **Native modules require a dev build.** Expo Go cannot load `@react-native-ml-kit/text-recognition`. The first `npx expo run:android|ios` triggers prebuild (CNG); never edit `ios/`/`android/` by hand.
- **Parser is the only logic-heavy unit.** Keep it pure; add a fixture to `parser.test.ts` whenever a real receipt parses wrong rather than patching the screen.
- **Technical debt (agreed):** this slice persists through the service layer directly. Introduce Zustand (`expensesStore`, `settingsStore`, `categoriesStore`) in the dashboard/CRUD slice, where reactive shared state earns its keep.
- **Out of scope here:** Groq LLM categorization and the reactive dashboard — next slices.
