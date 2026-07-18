import { describe, expect, it } from 'vitest';
import {
  buildStatusPatch,
  daysSinceDate,
  nextSowingStatus,
  normalizeSowingStatus,
  previousSowingStatus,
  sowingAgeLabel,
  sowingStatusIndex,
  SOWING_STATUS_ORDER,
} from './sowingLifecycle';

describe('sowingLifecycle', () => {
  it('normaliserar okända statusvärden till sown', () => {
    expect(normalizeSowingStatus('sown')).toBe('sown');
    expect(normalizeSowingStatus('harvesting')).toBe('harvesting');
    expect(normalizeSowingStatus('konstig-status')).toBe('sown');
    expect(normalizeSowingStatus(null)).toBe('sown');
    expect(normalizeSowingStatus(undefined)).toBe('sown');
  });

  it('returnerar nästa steg i livscykeln', () => {
    expect(nextSowingStatus('sown')).toBe('indoor');
    expect(nextSowingStatus('indoor')).toBe('transplanted');
    expect(nextSowingStatus('transplanted')).toBe('harvesting');
    expect(nextSowingStatus('harvesting')).toBe('done');
    expect(nextSowingStatus('done')).toBeNull();
  });

  it('returnerar föregående steg i livscykeln', () => {
    expect(previousSowingStatus('done')).toBe('harvesting');
    expect(previousSowingStatus('indoor')).toBe('sown');
    expect(previousSowingStatus('sown')).toBeNull();
  });

  it('ger rätt stegindex för progressvisning', () => {
    expect(sowingStatusIndex('sown')).toBe(0);
    expect(sowingStatusIndex('done')).toBe(SOWING_STATUS_ORDER.length - 1);
    expect(sowingStatusIndex('okänd')).toBe(0);
  });

  it('räknar dagar sedan datum korrekt', () => {
    const now = new Date(2026, 5, 15); // 15 juni 2026
    expect(daysSinceDate('2026-06-15', now)).toBe(0);
    expect(daysSinceDate('2026-06-10', now)).toBe(5);
    expect(daysSinceDate('2026-06-20', now)).toBe(-5);
    expect(daysSinceDate(null, now)).toBeNull();
    expect(daysSinceDate('inte-ett-datum', now)).toBeNull();
  });

  it('sätter transplant_date automatiskt vid utplantering', () => {
    const patch = buildStatusPatch({ status: 'indoor', transplant_date: null }, 'transplanted', '2026-05-20');
    expect(patch.status).toBe('transplanted');
    expect(patch.transplant_date).toBe('2026-05-20');
  });

  it('skriver inte över befintligt transplant_date', () => {
    const patch = buildStatusPatch({ status: 'indoor', transplant_date: '2026-05-01' }, 'transplanted', '2026-05-20');
    expect(patch.transplant_date).toBeUndefined();
  });

  it('sätter inget transplant_date för andra statusar', () => {
    const patch = buildStatusPatch({ status: 'sown', transplant_date: null }, 'harvesting', '2026-08-01');
    expect(patch).toEqual({ status: 'harvesting' });
  });

  it('ger mänsklig åldertext', () => {
    const now = new Date(2026, 5, 15);
    expect(sowingAgeLabel('2026-06-15', now)).toBe('Sådd idag');
    expect(sowingAgeLabel('2026-06-14', now)).toBe('Sådd igår');
    expect(sowingAgeLabel('2026-06-12', now)).toBe('Sådd för 3 dagar sedan');
    expect(sowingAgeLabel('2026-06-01', now)).toBe('Sådd för 2 veckor sedan');
    expect(sowingAgeLabel('2026-06-20', now)).toBe('Sås om 5 dagar');
    expect(sowingAgeLabel(null, now)).toBeNull();
  });
});
