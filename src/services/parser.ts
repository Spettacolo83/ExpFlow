import { Language, ParsedReceipt } from '@/types';

const VAT_OR_ADDRESS = /(p\.?\s?iva|c\.?f\.?|vat|via |tel|str\.|cap |n\.?\s?\d)/i;

/** Format a Date as `YYYY-MM-DD` using local components (timezone-safe). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Convert a monetary token to a number, independent of locale convention.
 * The rightmost separator followed by exactly two digits is treated as the
 * decimal point; every other separator is grouping. Correctly handles
 * `1.234,56`, `1,234.56`, `1,00` and `1.00`.
 */
function normalizeAmount(token: string): number | null {
  const cleaned = token.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;
  const lastSep = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  let normalized: string;
  if (lastSep === -1) {
    normalized = cleaned;
  } else if (cleaned.length - lastSep - 1 === 2) {
    const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, '');
    const fracPart = cleaned.slice(lastSep + 1);
    normalized = `${intPart}.${fracPart}`;
  } else {
    normalized = cleaned.replace(/[.,]/g, '');
  }
  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

const MONEY_TOKEN = /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+[.,]\d{2}/g;

const TOTAL_KEYWORD_RE =
  /(?:^|\s)(totale|total a pagar|total|importo|a pagar|saldo|amount)(?=[\s:]|\d|$)/i;

function extractAmount(lines: string[]): { amount: number | null; confidence: number } {
  // 1. Prefer a line whose total keyword stands as its own word.
  for (const line of lines) {
    if (TOTAL_KEYWORD_RE.test(line)) {
      const matches = line.match(MONEY_TOKEN);
      if (matches?.length) {
        const amount = normalizeAmount(matches[matches.length - 1]);
        if (amount !== null) return { amount, confidence: 0.9 };
      }
    }
  }
  // 2. Fallback: largest monetary value, excluding VAT/address/phone lines.
  const all = lines
    .filter((line) => !VAT_OR_ADDRESS.test(line))
    .flatMap((line) => line.match(MONEY_TOKEN) ?? [])
    .map((t) => normalizeAmount(t))
    .filter((n): n is number => n !== null);
  if (all.length) return { amount: Math.max(...all), confidence: 0.4 };
  return { amount: null, confidence: 0 };
}

const DATE_PATTERNS = [
  /\b(\d{4})-(\d{2})-(\d{2})\b/, // ISO
  /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/, // D/M/Y or M/D/Y
];

/** Returns an ISO date string only if (year, month, day) is a real calendar date. */
function buildValidDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (dt.getMonth() !== month - 1 || dt.getDate() !== day) return null; // overflow (e.g. 31/04)
  return toIsoDate(dt);
}

function extractDate(
  lines: string[],
  locale: Language,
  today: Date
): { date: string; confidence: number } {
  const text = lines.join(' ');
  const iso = text.match(DATE_PATTERNS[0]);
  if (iso) {
    const valid = buildValidDate(parseInt(iso[1], 10), parseInt(iso[2], 10), parseInt(iso[3], 10));
    if (valid) return { date: valid, confidence: 0.9 };
  }
  const dmy = text.match(DATE_PATTERNS[1]);
  if (dmy) {
    const first = parseInt(dmy[1], 10);
    const second = parseInt(dmy[2], 10);
    let year = parseInt(dmy[3], 10);
    if (year < 100) year += 2000;
    const day = locale === 'en' ? second : first;
    const month = locale === 'en' ? first : second;
    const valid = buildValidDate(year, month, day);
    if (valid) return { date: valid, confidence: 0.8 };
  }
  return { date: toIsoDate(today), confidence: 0 };
}

function extractMerchant(lines: string[]): { merchant: string | null; confidence: number } {
  for (const raw of lines.slice(0, 4)) {
    const line = raw.trim();
    if (line.length < 3 || line.length > 48) continue;
    if (VAT_OR_ADDRESS.test(line)) continue;
    const letters = line.replace(/[^\p{L}]/gu, '');
    if (letters.length < 3) continue;
    const upperRatio =
      [...letters].filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length /
      letters.length;
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

  const { amount, confidence: amountC } = extractAmount(lines);
  const { date, confidence: dateC } = extractDate(lines, locale, today);
  const { merchant, confidence: merchantC } = extractMerchant(lines);

  return {
    amount,
    date,
    merchant,
    confidence: { amount: amountC, date: dateC, merchant: merchantC },
  };
}
