import { describe, expect, it } from 'vitest';
import { parsePublicPlan } from '@/lib/publicPlan';

describe('public plan import', () => {
  it('preserves a public sowing calendar through signup', () => {
    expect(parsePublicPlan({
      type: 'sakalender',
      zone: '4',
      method: 'Växthus',
      crops: ['Tomat', 'Gurka', 'Tomat'],
    })).toMatchObject({
      type: 'sakalender',
      zone: 4,
      method: 'Växthus',
      crops: ['Tomat', 'Gurka'],
    });
  });

  it('keeps a singular crop from Odlingsakuten', () => {
    expect(parsePublicPlan({
      type: 'odlingsakuten',
      crop: 'Tomat',
      symptom: 'Gula blad',
      place: 'Pallkrage',
    })).toMatchObject({
      type: 'odlingsakuten',
      crops: ['Tomat'],
      method: 'Pallkrage',
    });
  });

  it('rejects unknown payloads and normalizes unsafe values', () => {
    expect(parsePublicPlan({ type: 'unknown' })).toBeNull();
    expect(parsePublicPlan({
      type: 'odlingsplan',
      climateZone: 99,
      growingMethod: '',
      selectedCrops: [' Morot ', '', null],
    })).toMatchObject({
      type: 'odlingsplan',
      zone: 3,
      method: 'Pallkrage',
      crops: ['Morot'],
    });
  });
});
