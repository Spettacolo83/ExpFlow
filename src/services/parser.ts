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
