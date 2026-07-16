import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, computeAchievements } from './achievements';

const byId = (list: ReturnType<typeof computeAchievements>, id: string) =>
  list.find((a) => a.id === id)!;

describe('computeAchievements', () => {
  it('returnerar alla utmärkelser olåsta utan data', () => {
    const result = computeAchievements({});
    expect(result).toHaveLength(ACHIEVEMENTS.length);
    expect(result.every((a) => !a.earned)).toBe(true);
  });

  it('låser upp första sådden och första skörden', () => {
    const result = computeAchievements({
      sowings: [{ variety: 'Tomat', sow_date: '2026-03-10' }],
      harvests: [{ variety: 'Tomat', weight_grams: 250, harvest_date: '2026-07-01' }],
    });
    expect(byId(result, 'forsta-sadd').earned).toBe(true);
    expect(byId(result, 'forsta-skord').earned).toBe(true);
  });

  it('hanterar kilonivåer med progress', () => {
    const result = computeAchievements({
      harvests: [
        { variety: 'Potatis', weight_grams: 7200, harvest_date: '2026-08-01' },
      ],
    });
    expect(byId(result, 'kiloklubben').earned).toBe(true);
    const tio = byId(result, 'tiokilosklubben');
    expect(tio.earned).toBe(false);
    expect(tio.progressLabel).toBe('7,2 / 10 kg');
  });

  it('räknar distinkta sorter skiftlägesokänsligt', () => {
    const sowings = ['Tomat', 'tomat ', 'Gurka', 'Morot', 'Sallat', 'Lök', 'Chili', 'Paprika', 'Dill', 'Persilja', 'Rädisa']
      .map((variety) => ({ variety, sow_date: '2026-04-01' }));
    const result = computeAchievements({ sowings });
    expect(byId(result, 'sortsamlaren').earned).toBe(true);
  });

  it('räknar avklarade steg från både påminnelser och smarta åtgärder', () => {
    const settings = {
      reminders: Array.from({ length: 13 }, () => ({ done: true })),
      smart_action_state: Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [`a${i}`, { completedAt: '2026-06-01T08:00:00Z' }]),
      ),
    };
    const result = computeAchievements({ settings });
    expect(byId(result, 'flitmyran').earned).toBe(true);
  });

  it('kräver aktivitet under två olika år för Veteranen', () => {
    const oneYear = computeAchievements({
      sowings: [{ variety: 'Tomat', sow_date: '2026-03-10' }],
      harvests: [{ variety: 'Tomat', weight_grams: 100, harvest_date: '2026-07-01' }],
    });
    expect(byId(oneYear, 'veteranen').earned).toBe(false);

    const twoYears = computeAchievements({
      sowings: [{ variety: 'Tomat', sow_date: '2025-03-10' }],
      harvests: [{ variety: 'Tomat', weight_grams: 100, harvest_date: '2026-07-01' }],
    });
    expect(byId(twoYears, 'veteranen').earned).toBe(true);
  });
});
