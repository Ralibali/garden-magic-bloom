import { describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
import { isoWeekDate, planSuggestion } from './seedPlans';
import { cleanSeedExtraction, validateSeedImage } from '../../supabase/functions/_shared/seedPhoto';
describe('reviewed packet planning', () => {
  it('keeps missing or non-text extraction fields unknown, including partial expiry dates', () => {
    expect(cleanSeedExtraction({ variety: null, brand: 123, expiry_text: '2028', quantity: '  20 frön ' })).toEqual({ variety: null, brand: null, expiry_text: '2028', quantity: '20 frön', instructions: null, warning: null });
  });
  it('rejects malformed extraction and bounds instructions', () => {
    expect(() => cleanSeedExtraction([])).toThrow();
    expect(cleanSeedExtraction({ instructions: 'a'.repeat(9000) }).instructions).toHaveLength(3000);
  });
  it('accepts only bounded JPEG data, never a remote URL', () => {
    expect(validateSeedImage('data:image/jpeg;base64,/9j/AA==')).toBeTruthy();
    for (const value of ['https://internal/photo', 'data:image/png;base64,AAAA', 'data:image/jpeg;base64,AAAA', 'data:image/jpeg;base64,/9j/' + 'A'.repeat(3_000_000)]) expect(() => validateSeedImage(value)).toThrow();
  });
  it('calculates ISO week Mondays across year boundaries', () => {
    expect(isoWeekDate(2026, 1)).toBe('2025-12-29');
    expect(isoWeekDate(2027, 1)).toBe('2027-01-04');
  });
  it('does not guess dates without a known crop and Swedish zone', () => {
    expect(planSuggestion('Okänd sort', 3, 2027, 'indoor', 'outdoor')).toBeNull();
    expect(planSuggestion('Tomat', 0, 2027, 'indoor', 'outdoor')).toBeNull();
  });
  it('requires manually reviewed greenhouse dates and avoids unsuitable outdoor dates', () => {
    expect(planSuggestion('Tomat', 3, 2027, 'indoor', 'greenhouse')).toMatchObject({ sow: '', transplant: '' });
    expect(planSuggestion('Tomat', 8, 2027, 'direct', 'outdoor')?.sow).toBe('');
  });
});
