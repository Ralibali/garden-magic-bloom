import { describe, expect, it } from 'vitest';
import { buildSeasonJourney } from '@/lib/seasonJourney';

describe('seasonJourney', () => {
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
