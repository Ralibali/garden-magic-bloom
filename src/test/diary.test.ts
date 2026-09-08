import { describe, expect, it } from 'vitest';
import { buildDiary, diaryDate, filterDiary, isDiaryDate, validateDiaryNote, type DiarySources } from '@/lib/diary';
import { getPulseLogTarget } from '@/lib/gardenPulse';
import { isRouteVisible } from '@/lib/gardenModules';

const sources = (overrides: Partial<DiarySources> = {}): DiarySources => ({ sowings: [], harvests: [], photos: [], notes: [], care: [], pests: [], seasons: [], ...overrides });
const sowing = { id: 'same-id', variety: 'Tomat', sow_date: '2026-03-10', transplant_date: '2026-05-20', notes: 'Söderväggen gav värme', bed_id: 'bed-1', beds: { name: 'Södra bädden' } } as DiarySources['sowings'][number];
const filters = { query: '', year: 'all', month: 'all', kind: 'all', place: 'all' } as const;

describe('gardening diary', () => {
  it('uses actual event dates and unique ids across sowing and transplant', () => {
    const events = buildDiary(sources({ sowings: [sowing] }));
    expect(events.map(event => event.date)).toEqual(['2026-05-20', '2026-03-10']);
    expect(new Set(events.map(event => event.id)).size).toBe(2);
  });
  it('places an old photo in the right year and finds its plant library name', () => {
    const photo = { id: 'photo', taken_at: '2024-07-13', created_at: '2026-09-08', photo_url: 'private/photo.jpg', caption: null, bed_id: null, beds: null, sowings: null, my_plant_id: 'plant-1', my_plants: { custom_name: null, plants: { name_sv: 'Monstera' } } } as DiarySources['photos'][number];
    const events = buildDiary(sources({ photos: [photo] }));
    expect(events[0]).toMatchObject({ date: '2024-07-13', subject: 'Monstera', place: 'Monstera' });
    expect(filterDiary(events, { ...filters, query: 'MONSTERA', year: '2024' })).toHaveLength(1);
  });
  it('combines Swedish search terms, year, month, type and place', () => {
    const events = buildDiary(sources({ sowings: [sowing] }));
    expect(filterDiary(events, { ...filters, query: 'tomat SÖDERVÄGGEN', year: '2026', month: '03', kind: 'sowing', place: 'bed:bed-1' })).toHaveLength(1);
    expect(filterDiary(events, { ...filters, query: 'tomat', year: '2025' })).toEqual([]);
    expect(filterDiary(events, { ...filters, kind: 'harvest' })).toEqual([]);
    expect(filterDiary(events, filters)).toHaveLength(2);
  });
  it('never duplicates structured plant care through its legacy mirror', () => {
    const notes = [
      { id: 'own', plant_id: null, log_type: 'note', note: 'En lärdom', created_at: '2026-06-10T12:00:00Z' },
      { id: 'mirror', plant_id: 'plant', log_type: 'health_check', note: 'Bladen ser bra ut', created_at: '2026-06-10T12:00:00Z' },
    ] as DiarySources['notes'];
    const care = [{ id: 'care', plant_id: 'plant', event_type: 'health_check', occurred_at: '2026-06-10T12:00:00Z', note: 'Bladen ser bra ut', my_plants: null }] as DiarySources['care'];
    expect(buildDiary(sources({ notes, care })).map(event => event.kind).sort()).toEqual(['care', 'note']);
  });
  it('keeps season learnings in their season even when written next year', () => {
    const seasons = [{ id: 'season', year: 2025, created_at: '2026-01-04T12:00:00Z', went_well: 'Mycket skörd', didnt_work: 'För tätt', grow_again: 'partly', learnings: 'Gallra', beds: { name: 'Pallkragen' }, bed_id: 'bed' }] as DiarySources['seasons'];
    const events = buildDiary(sources({ seasons }));
    expect(events[0].date).toBe('2025-12-31');
    expect(events[0].body).toContain('Delvis');
    expect(filterDiary(events, { ...filters, year: '2025' })).toHaveLength(1);
  });
  it('rejects impossible dates rather than moving them to another day', () => {
    expect(isDiaryDate('2026-02-30')).toBe(false);
    expect(diaryDate('2026-02-30')).toBe('');
    expect(diaryDate(null)).toBe('');
    expect(diaryDate('invalid')).toBe('');
    expect(isDiaryDate('2024-02-29')).toBe(true);
    expect(buildDiary(sources({ sowings: [{ ...sowing, sow_date: 'invalid', transplant_date: null }] }))).toEqual([]);
  });
  it('preserves plain dates and converts timestamps to Stockholm across DST and year boundaries', () => {
    expect(diaryDate('2026-01-01')).toBe('2026-01-01');
    expect(diaryDate('2025-12-31T23:30:00Z')).toBe('2026-01-01');
    expect(diaryDate('2026-06-15T22:30:00Z')).toBe('2026-06-16');
    expect(diaryDate('2026-03-29T00:30:00Z')).toBe('2026-03-29');
  });
  it('validates blank, oversized, future and invalid notes', () => {
    expect(validateDiaryNote('  \n ', '2026-06-10', '2026-06-10')).not.toBe('');
    expect(validateDiaryNote('å'.repeat(5001), '2026-06-10', '2026-06-10')).not.toBe('');
    expect(validateDiaryNote('Bra', '2026-06-11', '2026-06-10')).not.toBe('');
    expect(validateDiaryNote('Bra', '2026-02-30', '2026-06-10')).not.toBe('');
    expect(validateDiaryNote('Äntligen!\nTomaterna blommar 🌱', '2026-06-10', '2026-06-10')).toBe('');
  });
  it('makes the diary available to every gardening profile', () => {
    for (const category of ['kokstradgard', 'krukvaxter', 'bar_frukt', 'blommor'] as const) expect(isRouteVisible('/app/timeline', [category])).toBe(true);
  });
});

describe('garden pulse log destination', () => {
  it('keeps a germination or hardening task in the sowing flow', () => {
    expect(getPulseLogTarget({ kind: 'sowing', sourceSowingId: 'sowing', actionPath: '/app/sowings' }, [])).toEqual({ path: '/app/sowings', state: undefined });
  });
  it('prefills harvest with the real variety, never an action title', () => {
    expect(getPulseLogTarget({ kind: 'harvest', sourceSowingId: 'sowing', actionPath: '/app/harvests' }, [{ id: 'sowing', variety: 'Sungold', bed_id: 'bed' }])).toEqual({ path: '/app/harvests', state: { prefill: { sowing_id: 'sowing', bed_id: 'bed', variety: 'Sungold' } } });
  });
  it('does not prefill a deleted sowing', () => {
    expect(getPulseLogTarget({ kind: 'harvest', sourceSowingId: 'deleted', actionPath: '/app/harvests' }, []).state).toBeUndefined();
  });
});
