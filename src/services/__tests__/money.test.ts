import { parseUserAmount } from '@/services/money';

describe('parseUserAmount', () => {
  it('parses European thousands format', () => {
    expect(parseUserAmount('1.234,56')).toBe(1234.56);
  });
  it('parses US thousands format', () => {
    expect(parseUserAmount('1,234.56')).toBe(1234.56);
  });
  it('parses simple comma and dot decimals', () => {
    expect(parseUserAmount('12,50')).toBe(12.5);
    expect(parseUserAmount('12.50')).toBe(12.5);
  });
  it('parses a bare integer', () => {
    expect(parseUserAmount('42')).toBe(42);
  });
  it('rejects empty, whitespace, zero, negative and garbage', () => {
    expect(parseUserAmount('')).toBeNull();
    expect(parseUserAmount('   ')).toBeNull();
    expect(parseUserAmount('0')).toBeNull();
    expect(parseUserAmount('-5')).toBeNull();
    expect(parseUserAmount('abc')).toBeNull();
  });
});
