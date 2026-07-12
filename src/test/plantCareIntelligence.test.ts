import { describe, expect, it } from 'vitest';
import { buildPlantCareProfile } from '@/lib/plantCareIntelligence';

describe('plant care intelligence', () => {
  it('shortens the rhythm when a plant repeatedly becomes very dry', () => {
    const profile = buildPlantCareProfile(
      { watering_interval_days: 7, location: 'Balkong' },
      [
        { event_type: 'watered', occurred_at: '2026-06-30T10:00:00Z', soil_moisture: 'very_dry', health_rating: 3 },
        { event_type: 'watered', occurred_at: '2026-07-05T10:00:00Z', soil_moisture: 'very_dry', health_rating: 3 },
        { event_type: 'watered', occurred_at: '2026-07-10T10:00:00Z', soil_moisture: 'dry', health_rating: 4 },
      ],
      new Date('2026-07-15T12:00:00Z'),
    );

    expect(profile.recommendedIntervalDays).toBeLessThan(7);
    expect(profile.historicalIntervalDays).toBe(5);
    expect(profile.confidence).toBe('learning');
  });

  it('delays watering when the soil is still wet', () => {
    const profile = buildPlantCareProfile(
      { watering_interval_days: 7, last_watered: '2026-07-01' },
      [{ event_type: 'health_check', occurred_at: '2026-07-08T10:00:00Z', soil_moisture: 'wet', health_rating: 4 }],
      new Date('2026-07-08T12:00:00Z'),
    );

    expect(profile.status).toBe('soon');
    expect(profile.recommendedIntervalDays).toBeGreaterThan(7);
    expect(profile.recommendation).toContain('Vänta');
  });

  it('prioritizes a stressed plant even before the next scheduled watering', () => {
    const profile = buildPlantCareProfile(
      { watering_interval_days: 10, last_watered: '2026-07-10' },
      [{ event_type: 'health_check', occurred_at: '2026-07-12T10:00:00Z', soil_moisture: 'moist', health_rating: 2, symptoms: ['soft_stem', 'yellow_leaves'] }],
      new Date('2026-07-12T12:00:00Z'),
    );

    expect(profile.status).toBe('urgent');
    expect(profile.healthScore).toBeLessThan(50);
  });

  it('unlocks a personal rhythm from enough real observations', () => {
    const events = Array.from({ length: 9 }, (_, index) => ({
      event_type: index % 2 === 0 ? 'watered' : 'health_check',
      occurred_at: `2026-06-${String(index + 1).padStart(2, '0')}T10:00:00Z`,
      soil_moisture: 'dry',
      health_rating: 5,
    }));
    const profile = buildPlantCareProfile({ watering_interval_days: 7 }, events, new Date('2026-06-12T12:00:00Z'));

    expect(profile.confidence).toBe('personal');
    expect(profile.knowledgeLevel).toBeGreaterThanOrEqual(3);
  });
});
