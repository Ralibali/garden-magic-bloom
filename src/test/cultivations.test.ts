import { describe, expect, it } from 'vitest';
import { buildCultivations, filterCultivations, type CultivationSources } from '@/lib/cultivations';
import { buildGardenActions, visibleGardenActions } from '@/lib/gardenToday';
import { buildGardenPulse } from '@/lib/gardenPulse';
import { buildPlantCareProfile } from '@/lib/plantCareIntelligence';

const now = new Date('2026-09-08T12:00:00Z');
const data = (patch: Partial<CultivationSources> = {}): CultivationSources => ({ beds: [], sowings: [], plants: [], care: [], waterings: [], photos: [], harvests: [], pests: [], reminders: [], ...patch });
const sowing = (patch: Partial<CultivationSources['sowings'][number]> = {}) => ({ id: 's1', variety: 'Tomat', sow_date: '2026-05-01', status: 'transplanted', type: 'indoor', plant_kind: 'edible', ...patch } as CultivationSources['sowings'][number]);
const plant = (patch = {}) => ({ id: 'p1', custom_name: 'Monstera', watering_interval_days: 7, location: 'Köket', ...patch } as CultivationSources['plants'][number]);
const reminder = (id: string) => ({ id, title: 'Titta till', date: '2026-09-08', type: 'other' as const, done: false });

describe('all cultivations belong in the overview', () => {
  it('keeps all 125 sowings and 40 plants, including attention late in the input', () => {
    const items = buildCultivations(data({ sowings: Array.from({ length: 125 }, (_, i) => sowing({ id: `s${i}` })), plants: Array.from({ length: 40 }, (_, i) => plant({ id: `p${i}` })), reminders: [{ ...reminder('late'), sowing_id: 's124' }] }), now);
    expect(items).toHaveLength(165);
    expect(items.find(i => i.id === 'sowing:s124')?.status).toBe('attention');
    expect(items.filter(i => i.source === 'plant')).toHaveLength(40);
  });
  it('preserves ornamental flowering and overwintering as active, and future sowings as planned', () => {
    const items = buildCultivations(data({ sowings: [sowing({ id: 'flower', plant_kind: 'ornamental', status: 'flowering' }), sowing({ id: 'winter', plant_kind: 'ornamental', status: 'overwintering' }), sowing({ id: 'later', sow_date: '2027-04-01' }), sowing({ id: 'done', status: 'done' })] }), now);
    expect(items.find(i => i.id === 'sowing:flower')?.status).toBe('growing');
    expect(items.find(i => i.id === 'sowing:winter')?.status).toBe('growing');
    expect(items.find(i => i.id === 'sowing:later')?.status).toBe('planned');
    expect(items.find(i => i.id === 'sowing:done')?.status).toBe('done');
  });
  it('matches by identity, never by repeated variety or plant names', () => {
    const items = buildCultivations(data({ sowings: [sowing(), sowing({ id: 's2' })], plants: [plant(), plant({ id: 'p2' })], reminders: [{ ...reminder('r'), sowing_id: 's2' }, { ...reminder('p'), plant_id: 'p2' }], harvests: [{ id: 'h', sowing_id: 's2', weight_grams: 450, harvest_date: '2026-09-07' } as CultivationSources['harvests'][number]] }), now);
    expect(items.find(i => i.id === 'sowing:s1')?.dueReminders).toHaveLength(0);
    expect(items.find(i => i.id === 'sowing:s1')?.harvestedGrams).toBe(0);
    expect(items.find(i => i.id === 'sowing:s2')?.harvestedGrams).toBe(450);
    expect(items.find(i => i.id === 'plant:p2')?.dueReminders[0].id).toBe('p');
  });
  it('asks for the first observation instead of asserting known health', () => {
    const [item] = buildCultivations(data({ plants: [plant({ last_watered: '2026-09-08' })] }), now);
    expect(item.status).toBe('attention');
    expect(item.stage).toBe('Ny bekantskap');
    expect(item.reasons[0].title).toContain('första jordkontroll');
  });
  it('does not assign a bed-wide pest to every individual crop', () => {
    const [item] = buildCultivations(data({ sowings: [sowing({ bed_id: 'bed' })], pests: [{ id: 'pest', bed_id: 'bed', sowing_id: null, pest_name: 'Snigel', observed_date: '2026-09-07', resolved: false } as CultivationSources['pests'][number]] }), now);
    expect(item.reasons).toHaveLength(0);
  });
  it('combines Swedish search with type, place and lifecycle filters', () => {
    const items = buildCultivations(data({ plants: [plant({ location: 'Söderfönstret' })], sowings: [sowing({ status: 'done' })] }), now);
    expect(filterCultivations(items, { query: 'MONSTERA söder', type: 'plant', place: 'location:Söderfönstret', status: 'attention' })).toHaveLength(1);
    expect(filterCultivations(items, { query: '', type: 'all', place: 'all', status: 'active' })).toHaveLength(1);
  });
});

describe('smart actions never silently drop the rest of a garden', () => {
  it('keeps later reminders visible after earlier actions are completed', () => {
    const actions = buildGardenActions({ reminders: Array.from({ length: 35 }, (_, i) => reminder(String(i))), climateZone: 3, today: '2026-09-08' });
    const state = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`reminder-${i}`, { completedAt: '2026-09-08' }]));
    expect(visibleGardenActions(actions, state, '2026-09-08').filter(a => a.kind === 'reminder')).toHaveLength(5);
  });
  it('does not harden an already transplanted indoor-started plant', () => {
    const actions = buildGardenActions({ sowings: [sowing({ sow_date: '2026-07-15' })], climateZone: 3, today: '2026-09-08' });
    expect(actions.some(a => a.id.startsWith('harden-'))).toBe(false);
  });
  it('never assumes that an ornamental has tubers', () => {
    const actions = buildGardenActions({ sowings: [sowing({ variety: 'Lavendel', plant_kind: 'ornamental' })], climateZone: 3, weather: { minTemp: -2 }, today: '2026-09-08' });
    expect(actions.map(a => `${a.title} ${a.description}`).join(' ')).not.toMatch(/Gräv upp|Ta upp knölar/);
  });
  it('honors dismissed future reminders and the supplied date for snoozes', () => {
    const input = { climateZone: 3, today: '2026-09-08', reminders: [{ ...reminder('r'), date: '2026-09-09' }] };
    expect(buildGardenPulse({ ...input, actionState: { 'reminder-r': { dismissedAt: '2026-09-08' } } }).empty).toBe(true);
    expect(buildGardenPulse({ ...input, actionState: { 'reminder-r': { snoozedUntil: '2026-09-10' } } }).empty).toBe(true);
    expect(buildGardenPulse({ ...input, today: '2026-09-10', actionState: { 'reminder-r': { snoozedUntil: '2026-09-10' } } }).late).toHaveLength(1);
  });
});

describe('care advice follows current observations', () => {
  const wet = { event_type: 'health_check', occurred_at: '2026-09-08T10:00:00Z', soil_moisture: 'wet', health_rating: 4 };
  it('accepts a moist first check without requiring a fictional watering', () => {
    const profile = buildPlantCareProfile(plant(), [{ ...wet, soil_moisture: 'moist' }], now);
    expect(profile.status).toBe('soon');
    expect(profile.daysUntilWater).toBe(2);
    expect(profile.wateringsCount).toBe(0);
  });
  it('keeps a fresh wet check consistent with the next date even with a long base interval', () => {
    const p = plant({ last_watered: '2026-09-08', watering_interval_days: 14 });
    const profile = buildPlantCareProfile(p, [wet], now);
    expect(profile.status).toBe('soon');
    expect(profile.nextWaterAt?.slice(0, 10)).toBe('2026-09-10');
    expect(buildGardenActions({ overduePlants: [{ ...p, care_profile: profile }], climateZone: 3, today: '2026-09-08' }).some(a => a.kind === 'watering')).toBe(false);
  });
  it('does not let an old wet observation defer an overdue check forever', () => {
    const profile = buildPlantCareProfile(plant({ last_watered: '2026-07-01' }), [{ ...wet, occurred_at: '2026-07-02T10:00:00Z' }], now);
    expect(profile.status).toBe('urgent');
    expect(profile.daysUntilWater).toBeLessThan(0);
    expect(profile.recommendation).toContain('idag');
  });
  it('anchors a wet-soil recheck to the observation date and expires it after two days', () => {
    const p = plant({ last_watered: '2026-08-01' });
    const day0 = buildPlantCareProfile(p, [wet], now);
    const day1 = buildPlantCareProfile(p, [wet], new Date('2026-09-09T12:00:00Z'));
    const day2 = buildPlantCareProfile(p, [wet], new Date('2026-09-10T12:00:00Z'));
    expect(day0.daysUntilWater).toBe(2);
    expect(day1.daysUntilWater).toBe(1);
    expect(day0.nextWaterAt).toBe(day1.nextWaterAt);
    expect(day0.nextWaterAt?.slice(0, 10)).toBe('2026-09-10');
    expect(day2.status).toBe('urgent');
  });
  it.each([null, '2026-09-07'])('prioritizes stress even in wet soil with last watering %s', last_watered => {
    const p = buildPlantCareProfile(plant({ last_watered }), [{ ...wet, health_rating: 1, symptoms: ['root_rot', 'soft_stem'] }], now);
    expect(p.status).toBe('urgent');
    expect(p.reason).toContain('stress');
    expect(p.recommendation).toContain('idag');
    expect(p.recommendation).not.toContain('Vänta');
  });
  it('ignores future watering and health events and future stored watering dates', () => {
    const events = [{ event_type: 'watered', occurred_at: '2026-09-01T10:00:00Z' }];
    const baseline = buildPlantCareProfile(plant(), events, now);
    const future = buildPlantCareProfile(plant({ last_watered: '2027-01-01' }), [...events, { event_type: 'watered', occurred_at: '2027-01-01T10:00:00Z' }, { ...wet, occurred_at: '2027-01-02T10:00:00Z' }], now);
    expect(future).toEqual(baseline);
  });
});

it('respects snoozes in the overview while keeping a future task visible', () => {
  const [item] = buildCultivations(data({ sowings: [sowing()], reminders: [{ ...reminder('r'), sowing_id: 's1' }, { ...reminder('future'), date: '2026-09-12', sowing_id: 's1' }], actionState: { 'reminder-r': { snoozedUntil: '2026-09-10' } } }), now);
  expect(item.status).toBe('growing');
  expect(item.dueReminders).toHaveLength(0);
  expect(item.upcomingReminders[0].id).toBe('future');
});
