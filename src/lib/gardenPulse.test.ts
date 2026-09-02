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

  it('does not invent start actions for an empty user', () => {
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

  it('does not invent extra actions for one bed or many beds', () => {
    const now = localDateKey();
    const one = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [],
    });
    const many = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }, { id: 'bed-2' }, { id: 'bed-3' }],
      sowings: [
        { id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown', bed_id: 'bed-1' },
        { id: 's-2', variety: 'Morot', sow_date: now, type: 'direct', status: 'sown', bed_id: 'bed-2' },
        { id: 's-3', variety: 'Dill', sow_date: now, type: 'direct', status: 'sown', bed_id: 'bed-3' },
      ],
      reminders: [],
    });
    expect(one.empty).toBe(true);
    expect(many.empty).toBe(true);
  });

  it('hides done reminders, snoozed actions, and stale completed sowing actions', () => {
    const now = localDateKey();
    const snoozed = buildGardenPulse({
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
    expect(snoozed.late.some((item) => item.sourceReminderId === 'done')).toBe(false);
    expect(snoozed.today.some((item) => item.sourceReminderId === 'open')).toBe(false);
    expect(snoozed.empty).toBe(true);

    const stale = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{
        id: 's-harden',
        variety: 'Tomat – Sungold',
        sow_date: addDaysToDateKey(now, -40),
        type: 'indoor',
        status: 'indoor',
      }],
      reminders: [{
        id: 'r-done',
        title: 'Gallra',
        type: 'other',
        date: addDaysToDateKey(now, -2),
        done: true,
      }],
      actionState: {
        'harden-s-harden': { completedAt: addDaysToDateKey(now, -1) + 'T12:00:00.000Z' },
      },
    });
    expect(stale.late.some((item) => item.sourceReminderId === 'r-done')).toBe(false);
    expect(stale.today.some((item) => item.id === 'harden-s-harden')).toBe(false);
    expect(stale.week.some((item) => item.id === 'harden-s-harden')).toBe(false);
  });

  it('does not duplicate a reminder across today and week', () => {
    const now = localDateKey();
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [{
        id: 'r-today',
        title: 'Vattna',
        type: 'watering',
        date: now,
        done: false,
      }],
    });
    const ids = [...pulse.late, ...pulse.today, ...pulse.week].map((item) => item.sourceReminderId);
    expect(ids.filter((id) => id === 'r-today')).toHaveLength(1);
    expect(pulse.week.some((item) => item.sourceReminderId === 'r-today')).toBe(false);
  });

  it('adds a weather row only when Open-Meteo already drives gardenToday', () => {
    const now = localDateKey();
    const garden = {
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [] as { id: string; title: string; type: 'other'; date: string; done: boolean }[],
    };
    const withoutWeather = buildGardenPulse(garden);
    expect([...withoutWeather.late, ...withoutWeather.today, ...withoutWeather.week].some((item) => item.kind === 'frost' || item.kind === 'weather')).toBe(false);

    const missingTemp = buildGardenPulse({
      ...garden,
      weather: { daily: { precipitation_sum: [0, 0], wind_speed_10m_max: [10] } },
    });
    expect([...missingTemp.late, ...missingTemp.today].some((item) => item.kind === 'frost')).toBe(false);

    const withWeather = buildGardenPulse({
      ...garden,
      weather: { daily: { temperature_2m_min: [-1], wind_speed_10m_max: [10], precipitation_sum: [0, 0] } },
    });
    expect(withWeather.late.some((item) => item.kind === 'frost') || withWeather.today.some((item) => item.kind === 'frost')).toBe(true);
  });

  it('stays empty when weather and reminder data are missing', () => {
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: localDateKey(),
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: localDateKey(), type: 'direct', status: 'sown' }],
    });
    expect(pulse.empty).toBe(true);
    expect(buildGardenPulse({ climateZone: 3 }).empty).toBe(true);
  });

  it('hides dismissed Pulse rows', () => {
    const now = localDateKey();
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1' }],
      sowings: [{ id: 's-1', variety: 'Sallat', sow_date: now, type: 'direct', status: 'sown' }],
      reminders: [{ id: 'r-d', title: 'Inte relevant', type: 'other', date: now, done: false }],
      actionState: { 'reminder-r-d': { dismissedAt: new Date().toISOString() } },
    });
    expect(pulse.today.some((item) => item.id === 'reminder-r-d')).toBe(false);
    expect(pulse.empty).toBe(true);
  });

  it('wires TODAY garden context and keeps reminder why as user_data', () => {
    const now = localDateKey();
    const pulse = buildGardenPulse({
      climateZone: 3,
      today: now,
      beds: [{ id: 'bed-1', name: 'Växthus' }],
      sowings: [{ id: 's-1', variety: 'Tomat – Sungold', sow_date: now, type: 'direct', status: 'sown', bed_id: 'bed-1' }],
      reminders: [{ id: 'r-why', title: 'Gallra', type: 'other', date: now, done: false, sowing_id: 's-1', bed_id: 'bed-1' }],
    });
    expect(pulse.context.scope).toBe('TODAY');
    expect(pulse.context.items.some((item) => item.id === 'r-why' && item.sowing_id === 's-1')).toBe(true);
    expect(pulse.today.find((item) => item.sourceReminderId === 'r-why')?.why).toBe('user_data');
  });
});
