import { describe, expect, it } from 'vitest';
import { getExpiryStatus } from './seedExpiry';

const today = new Date(2026, 6, 18); // 18 juli 2026

describe('getExpiryStatus', () => {
  it('returnerar none utan datum', () => {
    expect(getExpiryStatus(null, 90, today)).toBe('none');
    expect(getExpiryStatus(undefined, 90, today)).toBe('none');
    expect(getExpiryStatus('', 90, today)).toBe('none');
    expect(getExpiryStatus('inte-datum', 90, today)).toBe('none');
  });

  it('returnerar expired för passerade datum', () => {
    expect(getExpiryStatus('2026-07-17', 90, today)).toBe('expired');
    expect(getExpiryStatus('2025-12-31', 90, today)).toBe('expired');
  });

  it('returnerar soon inom tröskeln (90 dagar)', () => {
    expect(getExpiryStatus('2026-07-18', 90, today)).toBe('soon'); // idag
    expect(getExpiryStatus('2026-08-01', 90, today)).toBe('soon');
    expect(getExpiryStatus('2026-10-16', 90, today)).toBe('soon'); // exakt 90 dagar
  });

  it('returnerar ok längre fram', () => {
    expect(getExpiryStatus('2026-10-17', 90, today)).toBe('ok'); // 91 dagar
    expect(getExpiryStatus('2027-06-01', 90, today)).toBe('ok');
  });

  it('respekterar anpassad tröskel', () => {
    expect(getExpiryStatus('2026-08-01', 13, today)).toBe('ok'); // 14 dagar bort > 13
    expect(getExpiryStatus('2026-08-01', 14, today)).toBe('soon'); // 14 dagar bort ≤ 14
    expect(getExpiryStatus('2026-08-01', 30, today)).toBe('soon');
  });
});
