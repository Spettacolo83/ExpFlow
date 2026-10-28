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
