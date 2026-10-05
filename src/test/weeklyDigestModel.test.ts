import { describe, expect, it } from 'vitest';
import { buildDigestModel } from '../../supabase/functions/_shared/weeklyDigestModel';

const profile = { user_id: 'u1', display_name: 'Anna Andersson', climate_zone: 3 };

describe('weekly digest model', () => {
  it('excludes finished sowings from active list', () => {
    const model = buildDigestModel({
      profile,
      sowings: [
        { variety: 'Tomat Sungold', status: 'done', sow_date: '2026-03-01' },
        { variety: 'Morot Napoli', status: 'transplanted', sow_date: '2026-04-01' },
      ],
      harvests: [],
      currentWeek: 31,
    });
    expect(model.activeSowings.map((s) => s.variety)).toEqual(['Morot Napoli']);
  });

  it('only suggests harvest for crops the user actually sowed', () => {
    const model = buildDigestModel({
      profile,
      sowings: [{ variety: 'Morot Napoli', status: 'transplanted', sow_date: '2026-04-01' }],
      harvests: [],
      currentWeek: 31,
    });
    expect(model.soonHarvest).toContain('Morot');
    expect(model.soonHarvest).not.toContain('Tomat');
  });

  it('ignores ornamental sowings for harvest suggestions', () => {
    const model = buildDigestModel({
      profile,
      sowings: [{ variety: 'Dahlia Café au Lait', status: 'flowering', plant_kind: 'ornamental' }],
      harvests: [],
      currentWeek: 31,
    });
    expect(model.soonHarvest).toEqual([]);
  });
});

describe('veckomejlet med kalendern', () => {
  const tomato = { id: 's1', variety: 'Tomat – Sungold', crop_key: 'tomat', status: 'indoor', type: 'indoor', sow_date: '2026-03-23', plant_kind: 'edible' };

  it('tar med kalenderns egna förslag för veckan', () => {
    const model = buildDigestModel({ profile, sowings: [tomato], harvests: [], today: '2026-05-14', currentDate: new Date('2026-05-14T08:00:00Z') });
    expect(model.calendarHighlights).toEqual([{ kind: 'plant-out-due', title: 'Plantera ut Tomat – Sungold', date: '2026-05-18' }]);
    expect(model.hasContent).toBe(true);
  });

  it('tar med användarens egna påminnelser och räknar försenade', () => {
    const model = buildDigestModel({
      profile,
      sowings: [],
      harvests: [],
      today: '2026-05-14',
      currentDate: new Date('2026-05-14T08:00:00Z'),
      reminders: [{ title: 'Plantera ut Gurka', due_date: '2026-05-16' }],
      reminderItems: [
        { id: 'a', title: 'Gödsla tomaterna', date: '2026-05-15', done: false },
        { id: 'b', title: 'Klar redan', date: '2026-05-15', done: true },
        { id: 'c', title: 'Långt fram', date: '2026-06-30' },
        { id: 'd', title: 'Försenad', date: '2026-05-10' },
        { id: 'e', title: 'Bortglömd', date: '2025-01-10' },
        { id: 'f', title: 'Plantera ut gurka', date: '2026-05-16' },
      ],
    });
    expect(model.reminders).toEqual([
      { title: 'Gödsla tomaterna', due_date: '2026-05-15' },
      { title: 'Plantera ut gurka', due_date: '2026-05-16' },
    ]);
    expect(model.overdueReminders).toBe(1);
  });

  it('länkar grödorna att så till såtidssidorna och flaggar sista veckan', () => {
    const model = buildDigestModel({ profile, sowings: [], harvests: [], currentWeek: 14, today: '2026-04-01', currentDate: new Date('2026-04-01T08:00:00Z') });
    const tomat = model.sowNowLinks.find((crop) => crop.name === 'Tomat');
    expect(tomat).toEqual({ name: 'Tomat', url: 'https://odlingsdagboken.com/satider/tomat', closing: true });
  });
});
