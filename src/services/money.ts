/**
 * Parses a user-typed amount in either `1.234,56` (EU) or `1,234.56` (US/UK)
 * convention into a positive number, or null if empty / invalid / non-positive.
 * The rightmost separator is treated as the decimal point.
 */
export function parseUserAmount(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  const decimalSep = lastComma > lastDot ? ',' : lastDot > -1 ? '.' : '';
  let normalized: string;
  if (decimalSep === '') {
    normalized = s.replace(/[.,\s]/g, '');
  } else {
    const thousandSep = decimalSep === ',' ? '.' : ',';
    normalized = s.split(thousandSep).join('').replace(decimalSep, '.');
  }
  const value = parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}
