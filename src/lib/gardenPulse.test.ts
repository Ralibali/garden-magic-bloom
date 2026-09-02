import { describe, expect, it } from 'vitest';
import { addDaysToDateKey, localDateKey } from './gardenToday';
import { buildGardenPulse, groupPulseBuckets } from './gardenPulse';
import type { GardenAction } from './gardenToday';

function action(partial: Partial<GardenAction> & Pick<GardenAction, 'id' | 'priority'>): GardenAction {
  return {
    title: partial.title || partial.id,
    description: partial.description || '',
    kind: partial.kind || 'reminder',
    actionPath: '/app/reminders',
    actionLabel: 'Öppna',
    groPrompt: 'test',
    reminderType: 'other',
    ...partial,
  };
}

describe('groupPulseBuckets', () => {
  it('puts urgent in late, today in today, soon in week', () => {
    const result = groupPulseBuckets([
      action({ id: 'late-1', priority: 'urgent', title: 'Försenad vattning' }),
      action({ id: 'today-1', priority: 'today', title: 'Kolla grodd' }),
      action({ id: 'week-1', priority: 'soon', title: 'Härda tomat' }),
    ]);
    expect(result.late.map((item) => item.id)).toEqual(['late-1']);
    expect(result.today.map((item) => item.id)).toEqual(['today-1']);
    expect(result.week.map((item) => item.id)).toEqual(['week-1']);
  });

  it('deduplicates by action id', () => {
    const result = groupPulseBuckets([
      action({ id: 'same', priority: 'urgent' }),
      action({ id: 'same', priority: 'today' }),
    ]);
    expect(result.late).toHaveLength(1);
    expect(result.today).toHaveLength(0);
  });
});

describe('buildGardenPulse', () => {
  it('returns empty when nothing important exists', () => {
    const now = localDateKey();
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [],
    });
    expect(pulse.empty).toBe(true);
    expect(pulse.late).toHaveLength(0);
    expect(pulse.today).toHaveLength(0);
    expect(pulse.week).toHaveLength(0);
  });

  it('puts overdue reminders in late', () => {
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: localDateKey(),
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: localDateKey(), type: 'direct', status: 'sown' }],
      reminders: [{
        id: 'r-late',
        title: 'Gallra morötter',
        type: 'other',
        date: addDaysToDateKey(localDateKey(), -3),
        done: false,
      }],
    });
    expect(pulse.empty).toBe(false);
    expect(pulse.late.some((item) => item.sourceReminderId === 'r-late')).toBe(true);
  });

  it('puts upcoming reminders this week in week, not today', () => {
    const now = localDateKey();
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [{
        id: 'r-week',
        title: 'Plantera ut Sungold',
        type: 'transplant',
        date: addDaysToDateKey(now, 3),
        done: false,
      }],
    });
    expect(pulse.week.some((item) => item.sourceReminderId === 'r-week')).toBe(true);
    expect(pulse.today.some((item) => item.sourceReminderId === 'r-week')).toBe(false);
    expect(pulse.late.some((item) => item.sourceReminderId === 'r-week')).toBe(false);
  });

  it('hides completed actions and can still show week items', () => {
    const now = localDateKey();
    const pulse = buildGardenPulse({
      climateZone: 3,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [{
        id: 'r-1',
        title: 'Vattna växthuset',
        type: 'watering',
        date: now,
        done: false,
      }],
      actionState: {
        'reminder-r-1': { completedAt: new Date().toISOString() },
      },
    });
    expect(pulse.today.some((item) => item.id === 'reminder-r-1')).toBe(false);
  });

  it('does not invent onboarding tasks for an empty garden', () => {
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: localDateKey(),
      beds: [],
      sowings: [],
      reminders: [],
    });
    expect(pulse.empty).toBe(true);
    expect([...pulse.late, ...pulse.today, ...pulse.week].some((item) => item.kind === 'start')).toBe(false);
    expect([...pulse.late, ...pulse.today, ...pulse.week].some((item) => item.id.startsWith('start-'))).toBe(false);
  });

  it('stays empty when beds exist but nothing is due', () => {
    const now = localDateKey();
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      sowings: [
        { id: 's-1', variety: 'Tomat – Sungold', sow_date: now, type: 'direct', status: 'sown', bed_id: 'a' },
        { id: 's-2', variety: 'Morot', sow_date: now, type: 'direct', status: 'sown', bed_id: 'b' },
      ],
      reminders: [],
    });
    expect(pulse.empty).toBe(true);
  });

  it('hides done reminders and snoozed actions', () => {
    const now = localDateKey();
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [
        { id: 'done', title: 'Redan klar', type: 'other', date: addDaysToDateKey(now, -1), done: true },
        { id: 'open', title: 'Öppen idag', type: 'other', date: now, done: false },
      ],
      actionState: {
        'reminder-open': { snoozedUntil: addDaysToDateKey(now, 2) },
      },
    });
    expect(pulse.late.some((item) => item.sourceReminderId === 'done')).toBe(false);
    expect(pulse.today.some((item) => item.sourceReminderId === 'open')).toBe(false);
    expect(pulse.empty).toBe(true);
  });

  it('does not duplicate the same reminder across buckets', () => {
    const now = localDateKey();
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [{
        id: 'r-dup',
        title: 'Kolla växthuset',
        type: 'other',
        date: now,
        done: false,
      }],
    });
    const ids = [...pulse.late, ...pulse.today, ...pulse.week]
      .filter((item) => item.sourceReminderId === 'r-dup')
      .map((item) => item.id);
    expect(ids).toHaveLength(1);
  });

  it('adds a frost row only when Open-Meteo min temperature is present and cold', () => {
    const now = localDateKey();
    const base = {
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [] as { id: string; title: string; type: 'other'; date: string; done: boolean }[],
    };
    const withoutWeather = buildGardenPulse(base);
    expect([...withoutWeather.late, ...withoutWeather.today].some((item) => item.kind === 'frost')).toBe(false);

    const missingTemp = buildGardenPulse({
      ...base,
      weather: { daily: { precipitation_sum: [0, 0], wind_speed_10m_max: [10] } },
    });
    expect([...missingTemp.late, ...missingTemp.today].some((item) => item.kind === 'frost')).toBe(false);

    const frost = buildGardenPulse({
      ...base,
      weather: { daily: { temperature_2m_min: [-2], precipitation_sum: [0, 0], wind_speed_10m_max: [10] } },
    });
    expect([...frost.late, ...frost.today].some((item) => item.id.startsWith('frost-'))).toBe(true);
  });

  it('treats missing collections as empty, not invented work', () => {
    const pulse = buildGardenPulse({ climateZone: 3 });
    expect(pulse.empty).toBe(true);
  });
});
