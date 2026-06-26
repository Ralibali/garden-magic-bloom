import { describe, expect, it } from 'vitest';
import {
  addDaysToDateKey,
  buildGardenActions,
  localDateKey,
  visibleGardenActions,
} from './gardenToday';

describe('gardenToday', () => {
  it('uses the Stockholm calendar date around UTC midnight', () => {
    expect(localDateKey(new Date('2026-06-25T22:30:00.000Z'))).toBe('2026-06-26');
  });

  it('adds days without timezone or DST drift', () => {
    expect(addDaysToDateKey('2026-03-28', 3)).toBe('2026-03-31');
    expect(addDaysToDateKey('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('does not warn for ordinary wind but warns for strong wind', () => {
    const calm = buildGardenActions({
      climateZone: 3,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: localDateKey(), type: 'direct', status: 'sown' }],
      weather: { daily: { wind_speed_10m_max: [25], precipitation_sum: [0, 0], temperature_2m_min: [10] } },
    });
    expect(calm.some((action) => action.id.startsWith('wind-'))).toBe(false);

    const windy = buildGardenActions({
      climateZone: 3,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: localDateKey(), type: 'direct', status: 'sown' }],
      weather: { daily: { wind_speed_10m_max: [42], precipitation_sum: [0, 0], temperature_2m_min: [10] } },
    });
    expect(windy.find((action) => action.id.startsWith('wind-'))?.priority).toBe('today');
  });

  it('recommends waiting with major watering when rain is imminent', () => {
    const actions = buildGardenActions({
      climateZone: 3,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: localDateKey(), type: 'direct', status: 'sown' }],
      rainData: { dryDays: 5, totalPrecipitation: 0 },
      weather: { daily: { precipitation_sum: [3, 4], temperature_2m_min: [10], wind_speed_10m_max: [10] } },
    });
    expect(actions.some((action) => action.id.startsWith('rain-wait-'))).toBe(true);
    expect(actions.some((action) => action.id.startsWith('dry-'))).toBe(false);
  });

  it('prioritizes overdue reminders and hides completed actions for today', () => {
    const today = localDateKey();
    const yesterday = addDaysToDateKey(today, -1);
    const actions = buildGardenActions({
      climateZone: 3,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: today, type: 'direct', status: 'sown' }],
      reminders: [{ id: 'r-1', title: 'Vattna växthuset', type: 'watering', date: yesterday, done: false }],
    });
    const reminder = actions.find((action) => action.id === 'reminder-r-1');
    expect(reminder?.priority).toBe('urgent');
    expect(visibleGardenActions(actions, { 'reminder-r-1': { completedAt: new Date().toISOString() } })).not.toContainEqual(reminder);
  });

  it('ignores sowings dated in the future', () => {
    const actions = buildGardenActions({
      climateZone: 3,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 'future', variety: 'Tomat', sow_date: addDaysToDateKey(localDateKey(), 10), type: 'indoor', status: 'indoor' }],
    });
    expect(actions.some((action) => action.id.includes('future'))).toBe(false);
  });
});
