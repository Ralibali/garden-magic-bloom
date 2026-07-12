import { describe, it, expect } from 'vitest';
import { computeDashboardPriority } from '@/lib/dashboardPriority';

const TODAY = '2026-07-12';

describe('computeDashboardPriority', () => {
  it('prioriterar urgent plant care före reminder och sowing', () => {
    const result = computeDashboardPriority({
      today: TODAY,
      plants: [
        { id: 'p1', display_name: 'Monstera', care_profile: { status: 'urgent', daysUntilWater: -2 } },
      ],
      reminders: [
        { id: 'r1', title: 'Vattna', type: 'watering', date: '2026-07-10', done: false, created_at: TODAY },
      ],
      sowings: [
        { id: 's1', variety: 'Tomat', expected_harvest_date: '2026-07-13' },
      ],
      climateZone: 3,
    });
    expect(result.primaryAction?.kind).toBe('plant_care');
    expect(result.primaryAction?.id).toBe('plant:p1');
    expect(result.secondaryActions.length).toBeLessThanOrEqual(2);
    expect(result.allDone).toBe(false);
  });

  it('deduplicerar samma växt även om den finns i flera källor', () => {
    const result = computeDashboardPriority({
      today: TODAY,
      plants: [
        { id: 'p1', display_name: 'Monstera', care_profile: { status: 'urgent', daysUntilWater: -1 } },
        { id: 'p1', display_name: 'Monstera', care_profile: { status: 'due', daysUntilWater: 0 } },
      ],
      climateZone: 3,
    });
    // dedup på plant:p1 -> exakt en action, weightval urgent
    expect(result.primaryAction?.id).toBe('plant:p1');
    expect(result.secondaryActions.length).toBe(0);
  });

  it('returnerar allDone med nextCheck när inget är akut', () => {
    const result = computeDashboardPriority({
      today: TODAY,
      plants: [
        { id: 'p1', display_name: 'Monstera', care_profile: { status: 'good', daysUntilWater: 4 } },
        { id: 'p2', display_name: 'Ficus', care_profile: { status: 'good', daysUntilWater: 2 } },
      ],
      climateZone: 3,
    });
    expect(result.primaryAction).toBeNull();
    expect(result.allDone).toBe(true);
    expect(result.nextCheck?.title).toBe('Ficus');
    expect(result.nextCheck?.inDays).toBe(2);
  });

  it('inkluderar weather-action endast med verkliga väderdata', () => {
    const noWeather = computeDashboardPriority({ today: TODAY, climateZone: 3 });
    expect(noWeather.allDone).toBe(true);

    const frost = computeDashboardPriority({
      today: TODAY,
      weather: { daily: { temperature_2m_min: [-2], precipitation_probability_max: [10] } },
      climateZone: 3,
    });
    expect(frost.primaryAction?.kind).toBe('weather');
    expect(frost.primaryAction?.id).toBe('weather:frost');
  });

  it('reminders i framtiden ignoreras', () => {
    const result = computeDashboardPriority({
      today: TODAY,
      reminders: [
        { id: 'r1', title: 'Framtid', type: 'other', date: '2026-08-01', done: false, created_at: TODAY },
      ],
      climateZone: 3,
    });
    expect(result.allDone).toBe(true);
  });
});
