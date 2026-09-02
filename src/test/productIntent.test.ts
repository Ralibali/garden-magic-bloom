import { describe, expect, it } from 'vitest';
import { destinationFromSearch, intentToPublicPlan, navigationForIntent } from '@/lib/productIntent';
import { zoneForPlace } from '@/lib/swedishZones';

describe('product intent handoff', () => {
  it('prefills sowings when adding a plant', () => {
    expect(navigationForIntent({ kind: 'add-plant', crop: 'Morot', slug: 'morot', returnTo: '/app/sowings' })).toEqual({
      path: '/app/sowings',
      state: { prefill: { variety: 'Morot' }, prefillCrop: 'Morot' },
    });
  });

  it('opens the pest log with symptom and plant note', () => {
    const dest = navigationForIntent({
      kind: 'save-problem',
      crop: 'Tomat',
      symptom: 'Gula blad',
      place: 'Pallkrage',
      returnTo: '/app/pests',
    });
    expect(dest.path).toBe('/app/pests');
    expect(dest.state.prefill).toMatchObject({
      pest_name: 'Gula blad',
      crop: 'Tomat',
    });
    expect(String((dest.state.prefill as { notes: string }).notes)).toContain('Tomat');
  });

  it('maps a Swedish example place to a zone', () => {
    expect(zoneForPlace('Malmö')).toBe(1);
    expect(zoneForPlace('Kiruna')).toBe(8);
    expect(zoneForPlace('okänd ort')).toBeNull();
  });

  it('writes a public plan with singular crop for Odlingsakuten', () => {
    expect(intentToPublicPlan({
      kind: 'save-problem',
      crop: 'Gurka',
      symptom: 'Slokande planta',
      returnTo: '/app/pests',
    })).toMatchObject({
      type: 'odlingsakuten',
      crop: 'Gurka',
      crops: ['Gurka'],
      symptom: 'Slokande planta',
    });
  });

  it('reads return + crop from the register query', () => {
    const dest = destinationFromSearch(new URLSearchParams('return=/app/sowings&crop=Chili'), null);
    expect(dest).toEqual({
      path: '/app/sowings',
      state: { prefill: { variety: 'Chili' }, prefillCrop: 'Chili' },
    });
  });
});
