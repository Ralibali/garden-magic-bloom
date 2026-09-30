import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildCalendarEvents,
  buildIcs,
  buildMonthGrid,
  buildYearWheel,
  cropNameForSowing,
  estimateHarvest,
  estimatePlantOut,
  getWeekGuide,
  isoWeekMonday,
  isoWeekOfKey,
  mondayOf,
  summarizeEvents,
  weekInSpan,
  type CalendarSowing,
} from '@/lib/gardenCalendar';

const tomato: CalendarSowing = {
  id: 's1',
  variety: 'Tomat – Sungold',
  sow_date: '2026-03-23',
  type: 'indoor',
  status: 'indoor',
  plant_kind: 'edible',
  crop_key: 'tomat',
  beds: { name: 'Växthuset' },
};

describe('datumhjälp', () => {
  it('räknar ISO-veckor rätt runt årsskiftet', () => {
    expect(isoWeekMonday(2026, 1)).toBe('2025-12-29');
    expect(isoWeekMonday(2026, 32)).toBe('2026-08-03');
    expect(isoWeekOfKey('2026-01-01')).toBe(1);
    expect(isoWeekOfKey('2027-01-01')).toBe(53);
    expect(isoWeekOfKey('2026-09-30')).toBe(40);
  });

  it('adderar dagar utan att påverkas av sommartid', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(mondayOf('2026-09-30')).toBe('2026-09-28');
    expect(mondayOf('2026-09-28')).toBe('2026-09-28');
  });

  it('bygger en månadsvy med hela veckor som börjar på måndag', () => {
    const grid = buildMonthGrid(2026, 9);
    expect(grid[0].days[0].key).toBe('2026-08-31');
    expect(grid[0].days[0].inMonth).toBe(false);
    expect(grid[0].week).toBe(36);
    expect(grid.every((w) => w.days.length === 7)).toBe(true);
    expect(grid.at(-1)!.days.at(-1)!.key).toBe('2026-10-04');
    expect(grid.flatMap((w) => w.days).filter((d) => d.inMonth)).toHaveLength(30);
  });

  it('hanterar spann över årsskiftet', () => {
    expect(weekInSpan(51, 50, 4)).toBe(true);
    expect(weekInSpan(2, 50, 4)).toBe(true);
    expect(weekInSpan(20, 50, 4)).toBe(false);
    expect(weekInSpan(20, 18, 22)).toBe(true);
  });
});

describe('zonguiden', () => {
  it('säger att tomat förodlas i v.13 i zon 3', () => {
    const guide = getWeekGuide(3, 13);
    expect(guide.forodla.map((c) => c.name)).toContain('Tomat');
    expect(guide.total).toBeGreaterThan(0);
  });

  it('markerar när ett fönster stänger', () => {
    const tomat = getWeekGuide(3, 14).forodla.find((c) => c.name === 'Tomat');
    expect(tomat?.closesNow).toBe(true);
  });

  it('flaggar aldrig skörd som sista veckan – skörden slutar ju med säsongen', () => {
    const guide = getWeekGuide(3, 40);
    expect(guide.skorda.length).toBeGreaterThan(5);
    expect(guide.skorda.some((c) => c.closesNow)).toBe(false);
  });

  it('årshjulet innehåller alla grödor med fönster', () => {
    const wheel = buildYearWheel(3);
    const tomat = wheel.find((r) => r.name === 'Tomat');
    expect(tomat?.spans.map((s) => s.activity)).toEqual(['forodla', 'planteraUt', 'skorda']);
  });
});

describe('personliga uppskattningar', () => {
  it('matchar gröda via crop_key och fri text', () => {
    expect(cropNameForSowing(tomato)).toBe('Tomat');
    expect(cropNameForSowing({ variety: 'Rädisa – French Breakfast', crop_key: null })).toBe('Rädisa');
    expect(cropNameForSowing({ variety: 'Något okänt', crop_key: 'unknown' })).toBeNull();
  });

  it('räknar skörd från användarens egen såddag', () => {
    expect(estimateHarvest(tomato, 3)).toEqual({ date: '2026-08-10', warning: undefined });
  });

  it('varnar när sen sådd ger skörd efter säsongen', () => {
    const late = estimateHarvest({ ...tomato, sow_date: '2026-06-15' }, 3);
    expect(late?.date).toBe('2026-11-02');
    expect(late?.warning).toMatch(/efter zonens vanliga skördefönster/);
  });

  it('hoppar över prydnadsväxter och höstsatta grödor', () => {
    expect(estimateHarvest({ ...tomato, plant_kind: 'ornamental' }, 3)).toBeNull();
    expect(estimateHarvest({ ...tomato, variety: 'Vitlök', crop_key: 'vitlok', type: 'direct' }, 3)).toBeNull();
  });

  it('föreslår utplantering tidigast när zonens fönster öppnar', () => {
    expect(estimatePlantOut(tomato, 3)).toBe('2026-05-18');
    expect(estimatePlantOut({ ...tomato, sow_date: '2026-02-02' }, 3)).toBe('2026-05-11');
    expect(estimatePlantOut({ ...tomato, transplant_date: '2026-05-20' }, 3)).toBeNull();
    expect(estimatePlantOut({ ...tomato, type: 'direct' }, 3)).toBeNull();
  });
});

describe('buildCalendarEvents', () => {
  const base = { zone: 3, from: '2026-01-01', to: '2026-12-31', today: '2026-04-01' };

  it('samlar sådder, uppskattningar, skördar, påminnelser och frostmarkörer', () => {
    const events = buildCalendarEvents({
      ...base,
      sowings: [tomato],
      harvests: [{ id: 'h1', variety: 'Tomat – Sungold', harvest_date: '2026-08-20', weight_grams: 1500 }],
      reminders: [{ id: 'r1', title: 'Härda av tomaterna', date: '2026-05-10', done: false }],
    });
    const kinds = events.map((e) => e.kind);
    expect(kinds).toEqual(expect.arrayContaining(['sown', 'plant-out-due', 'harvest-expected', 'harvested', 'reminder', 'frost']));
    expect(events.find((e) => e.kind === 'harvested')?.detail).toBe('1,5 kg');
    expect(events.find((e) => e.kind === 'sown')?.detail).toBe('Förodling · Växthuset');
    // Sorterad på datum
    expect(events.map((e) => e.date)).toEqual([...events.map((e) => e.date)].sort());
  });

  it('flyttar en missad utplantering till idag', () => {
    const events = buildCalendarEvents({ ...base, today: '2026-06-10', sowings: [tomato] });
    expect(events.find((e) => e.kind === 'plant-out-due')?.date).toBe('2026-06-10');
  });

  it('visar ingen beräknad skörd för avslutade sådder eller sådder som redan ger skörd', () => {
    for (const status of ['done', 'harvesting']) {
      const events = buildCalendarEvents({ ...base, sowings: [{ ...tomato, status }] });
      expect(events.some((e) => e.kind === 'harvest-expected')).toBe(false);
    }
  });

  it('föreslår omgångssådd för snabba grödor medan fönstret är öppet', () => {
    const radish: CalendarSowing = { id: 'r', variety: 'Rädisa', sow_date: '2026-05-04', type: 'direct', status: 'sown', crop_key: 'radisa' };
    const events = buildCalendarEvents({ ...base, today: '2026-05-01', sowings: [radish] });
    const next = events.find((e) => e.kind === 'succession');
    expect(next?.date).toBe('2026-05-18');
    expect(next?.title).toBe('Så nästa omgång rädisa');
  });

  it('föreslår ingen omgångssådd när direktsåfönstret har stängt', () => {
    const radish: CalendarSowing = { id: 'r', variety: 'Rädisa', sow_date: '2026-07-10', type: 'direct', status: 'sown', crop_key: 'radisa' };
    const events = buildCalendarEvents({ ...base, today: '2026-07-25', sowings: [radish] });
    expect(events.some((e) => e.kind === 'succession')).toBe(false);
  });

  it('respekterar datumintervallet', () => {
    const events = buildCalendarEvents({ ...base, from: '2026-03-01', to: '2026-03-31', sowings: [tomato] });
    expect(events.every((e) => e.date >= '2026-03-01' && e.date <= '2026-03-31')).toBe(true);
    expect(events.some((e) => e.kind === 'sown')).toBe(true);
  });

  it('tål trasiga datum', () => {
    const events = buildCalendarEvents({
      ...base,
      sowings: [{ ...tomato, sow_date: 'inte-ett-datum' }],
      reminders: [{ id: 'x', title: 'Trasig', date: '' }],
    });
    expect(events.every((e) => e.kind === 'frost')).toBe(true);
  });

  it('summerar öppna och försenade uppgifter', () => {
    const events = buildCalendarEvents({
      ...base,
      today: '2026-05-12',
      sowings: [tomato],
      reminders: [
        { id: 'a', title: 'Försenad', date: '2026-05-01' },
        { id: 'b', title: 'Klar', date: '2026-05-02', done: true },
      ],
    });
    const summary = summarizeEvents(events, '2026-05-12');
    expect(summary.overdue).toBe(1);
    expect(summary.openTasks).toBe(2);
    expect(summary.upcomingHarvests).toBe(1);
    expect(summary.sown).toBe(1);
  });
});

describe('buildIcs', () => {
  it('skapar en giltig iCal-fil med CRLF, escaping och radvikning', () => {
    const ics = buildIcs(
      [
        { id: 'reminder:1', kind: 'reminder', date: '2026-05-10', title: 'Härda av tomater, gurkor; och chili', detail: 'Rad ett\nRad två' },
        { id: 'sown:2', kind: 'sown', date: '2026-03-23', title: 'Sådde tomat', detail: 'Förodling · '.repeat(20) },
      ],
      { now: new Date('2026-09-30T12:00:00Z') },
    );
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260510');
    expect(ics).toContain('DTEND;VALUE=DATE:20260511');
    expect(ics).toContain('SUMMARY:Härda av tomater\\, gurkor\\; och chili');
    expect(ics).toContain('Rad ett\\nRad två');
    expect(ics).toContain('DTSTAMP:20260930T120000Z');
    // Bara uppgifter får avisering
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(1);
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
  });
});
