import { describe, expect, it } from 'vitest';
import { buildBrevoLeadAttributes } from '../../supabase/functions/_shared/brevoLeadAttributes';

describe('buildBrevoLeadAttributes', () => {
  it('mappar lead-data till Brevo-attribut', () => {
    expect(buildBrevoLeadAttributes({
      source: 'sakalender',
      created_at: '2026-07-04T13:00:00.000Z',
      converted_user_id: null,
      plan: {
        type: 'sakalender',
        zone: '3',
        crops: ['Tomat', 'Gurka', 'Morot'],
      },
    })).toEqual({
      LEAD_SOURCE: 'sakalender',
      LEAD_ZONE: '3',
      LEAD_PLAN_TYPE: 'sakalender',
      LEAD_CROPS: 'Tomat, Gurka, Morot',
      LEAD_CREATED: '2026-07-04',
      CONVERTED: false,
    });
  });

  it('begränsar grödlistan till tio värden och markerar konverterade leads', () => {
    const crops = Array.from({ length: 12 }, (_, index) => `Gröda ${index + 1}`);
    const result = buildBrevoLeadAttributes({
      source: 'odlingsplan',
      created_at: '2026-07-04T13:00:00.000Z',
      converted_user_id: 'user-1',
      plan: { type: 'odlingsplan', recommendedCrops: crops },
    });

    expect(result.CONVERTED).toBe(true);
    expect(result.LEAD_CROPS?.split(', ')).toHaveLength(10);
  });
});
