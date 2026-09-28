import { describe, expect, it } from 'vitest';
import { buildSeasonJourney } from '@/lib/seasonJourney';

describe('seasonJourney', () => {
  it('counts activity after Swedish midnight on the same day as date-only logs', () => {
    const journey = buildSeasonJourney({
      now: new Date('2026-07-04T22:30:00Z'),
      photos: [{ created_at: '2026-07-04T22:15:00Z' }],
      sowings: [{ sow_date: '2026-07-04' }],
    });
    expect(journey.streakDays).toBe(2);
    expect(journey.activeDaysThisSeason).toBe(2);
  });

  it('uses the Swedish year boundary and excludes future plans from activity days', () => {
    const journey = buildSeasonJourney({
      now: new Date('2026-12-31T23:30:00Z'),
      photos: [{ created_at: '2026-12-31T23:15:00Z' }, { created_at: '2026-12-30T12:00:00Z' }],
      sowings: [{ sow_date: '2027-01-02' }],
    });
    expect(journey.streakDays).toBe(1);
    expect(journey.activeDaysThisSeason).toBe(1);
  });

  it('counts each calendar day once across the autumn clock change', () => {
    const journey = buildSeasonJourney({
      now: new Date('2026-10-26T00:30:00Z'),
      photos: [{ created_at: '2026-10-25T22:30:00Z' }],
      sowings: [{ sow_date: '2026-10-26' }, { sow_date: '2026-10-24' }],
    });
    expect(journey.streakDays).toBe(3);
  });

  it('counts streaks and milestones', () => {
    const journey = buildSeasonJourney({
      now: new Date('2026-07-04T12:00:00Z'),
      sowings: [
        { sow_date: '2026-07-04' },
        { sow_date: '2026-07-03' },
        { sow_date: '2026-07-02' },
        { sow_date: '2026-06-01' },
        { sow_date: '2026-05-01' },
      ],
      harvests: [{ harvest_date: '2026-07-03', weight_grams: 12500 }],
      photos: Array.from({ length: 5 }, (_, index) => ({ created_at: `2026-07-0${index + 1}` })),
    });

    expect(journey.streakDays).toBe(4);
    expect(journey.reachedMilestones).toBeGreaterThanOrEqual(6);
    expect(journey.shareText).toContain('Odlingsdagboken');
  });
});
