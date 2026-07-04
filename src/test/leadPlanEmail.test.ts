import { describe, expect, it } from 'vitest';
import { isPlanWithinEmailLimit, isPublicLeadSource, normalizeLeadEmail } from '@/lib/leadPlanEmail';

describe('leadPlanEmail helpers', () => {
  it('normaliserar e-postadresser deterministiskt', () => {
    expect(normalizeLeadEmail('  TEST@Example.SE ')).toBe('test@example.se');
  });

  it('tillåter alla publika lead-källor som kan skicka dag 0-mejl', () => {
    expect(isPublicLeadSource('sakalender')).toBe(true);
    expect(isPublicLeadSource('odlingsplan')).toBe(true);
    expect(isPublicLeadSource('odlingsakuten')).toBe(true);
    expect(isPublicLeadSource('annan')).toBe(false);
  });

  it('stoppar plan-payloads som är större än mejlgränsen', () => {
    expect(isPlanWithinEmailLimit({ crops: ['Tomat'] }, 128)).toBe(true);
    expect(isPlanWithinEmailLimit({ note: 'x'.repeat(200) }, 128)).toBe(false);
  });
});
