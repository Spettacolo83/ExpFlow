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

  it('falls back to EUR for an unrecognized currency and preserves null fields', () => {
    const row = {
      id: 'x',
      date: '2026-01-01',
      amount: 1,
      currency: 'XYZ',
      merchant: null,
      category: 'other',
      notes: null,
      photo_uri: null,
      raw_ocr_text: null,
      created_at: 1,
      updated_at: 2,
    };
    const mapped = mapRowToExpense(row);
    expect(mapped.currency).toBe('EUR');
    expect(mapped.merchant).toBeNull();
    expect(mapped.notes).toBeNull();
    expect(mapped.photoUri).toBeNull();
    expect(mapped.rawOcrText).toBeNull();
  });
});
