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
