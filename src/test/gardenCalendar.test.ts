import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildCalendarEvents,
  buildIcs,
  buildMonthGrid,
  buildForecastFrostEvents,
  buildSeasonPlan,
  buildYearWheel,
  calendarFeedLinks,
  exposedToFrost,
  forecastByDate,
  lastYearSameWeek,
  upcomingCalendarHighlights,
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
    expect(events.find((e) => e.kind === 'harvested')?.detail).toBe('1,50 kg');
    expect(events.find((e) => e.kind === 'sown')?.detail).toBe('Förodling · Växthuset');
    // Sorterad på datum
    expect(events.map((e) => e.date)).toEqual([...events.map((e) => e.date)].sort());
  });

  it('varnar när utplanteringsfönstret redan har stängt', () => {
    const late = { ...tomato, sow_date: '2026-08-10' };
    const events = buildCalendarEvents({ ...base, today: '2026-09-30', sowings: [late] });
    const plantOut = events.find((e) => e.kind === 'plant-out-due');
    expect(plantOut?.date).toBe('2026-10-05');
    expect(plantOut?.warning).toMatch(/stängde v\.22/);
    const onTime = buildCalendarEvents({ ...base, today: '2026-04-01', sowings: [tomato] }).find((e) => e.kind === 'plant-out-due');
    expect(onTime?.warning).toBeUndefined();
  });

  it('flyttar en missad utplantering till idag', () => {
    const events = buildCalendarEvents({ ...base, today: '2026-06-10', sowings: [tomato] });
    expect(events.find((e) => e.kind === 'plant-out-due')?.date).toBe('2026-06-10');
  });

  it('tjatar inte om utplantering för bortglömda förodlingar från förra året', () => {
    const events = buildCalendarEvents({ ...base, today: '2026-05-01', sowings: [{ ...tomato, sow_date: '2025-03-20' }] , from: '2025-01-01' });
    expect(events.some((e) => e.kind === 'plant-out-due')).toBe(false);
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

  it('tål sådder helt utan såddatum', () => {
    const events = buildCalendarEvents({ ...base, sowings: [{ ...tomato, sow_date: undefined as unknown as string }, { ...tomato, id: 'n', sow_date: null as unknown as string }] });
    expect(events.every((e) => e.kind === 'frost')).toBe(true);
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
    expect(ics).not.toContain('REFRESH-INTERVAL');
    expect(buildIcs([], { refreshHours: 6 })).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT6H\r\nX-PUBLISHED-TTL:PT6H');
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
  });
});

describe('väder i kalendern', () => {
  const forecast = {
    daily: {
      time: ['2026-05-12', '2026-05-13', '2026-05-14'],
      temperature_2m_min: [4, -2, 1.4],
      temperature_2m_max: [14, 9, 11],
      precipitation_sum: [0, 3.2, null],
      weather_code: [1, 61, 3],
    },
  };

  it('läser prognosen per dag', () => {
    const map = forecastByDate(forecast);
    expect(map.get('2026-05-13')).toEqual({ date: '2026-05-13', min: -2, max: 9, precip: 3.2, code: 61 });
    expect(map.get('2026-05-14')?.precip).toBeNull();
    expect(forecastByDate(null).size).toBe(0);
  });

  it('varnar för frostnätter och namnger plantorna som står ute', () => {
    const outside = { ...tomato, status: 'transplanted', transplant_date: '2026-05-10', beds: { name: 'Pallkrage' } };
    const indoor = { ...tomato, id: 's2', variety: 'Chili – Habanero', crop_key: 'chili' };
    const events = buildForecastFrostEvents(forecast, [outside, indoor]);
    expect(events.map((e) => e.date)).toEqual(['2026-05-13', '2026-05-14']);
    expect(events[0].title).toBe('Frostnatt väntas · −2 °C');
    expect(events[0].detail).toContain('Tomat – Sungold');
    expect(events[0].detail).not.toContain('Habanero');
    expect(events[0].warning).toMatch(/1 frostkänslig planta/);
    expect(events[1].title).toBe('Risk för frost · 1 °C');
    expect(events[1].warning).toBeUndefined();
  });

  it('räknar plantor i växthuset som skyddade', () => {
    const greenhouse = { ...tomato, status: 'transplanted', beds: { name: 'Växthuset' } };
    const outside = { ...tomato, id: 'b', status: 'transplanted', beds: { name: 'Pallkrage 2' } };
    expect(exposedToFrost([greenhouse, outside]).map((s) => s.id)).toEqual(['b']);
  });

  it('räknar inte kål eller prydnadsväxter som frostkänsliga', () => {
    const kale = { ...tomato, variety: 'Grönkål', crop_key: 'gronkal', status: 'transplanted' };
    const dahlia = { ...tomato, status: 'transplanted', plant_kind: 'ornamental' };
    expect(exposedToFrost([kale, dahlia])).toEqual([]);
  });
});

describe('säsongsplanen', () => {
  it('gör påminnelser av zonens fönster och hoppar över det som passerat', () => {
    const plan = buildSeasonPlan(['Tomat', 'Morot', 'Tomat', 'Okänd'], 3, 2026, '2026-04-01');
    expect(plan.map((p) => `${p.step}:${p.crop}:${p.date}`)).toEqual([
      'direktsa:Morot:2026-04-27',
      'planteraUt:Tomat:2026-05-11',
      'skorda:Morot:2026-07-27',
      'skorda:Tomat:2026-08-03',
    ]);
    expect(plan[1]).toMatchObject({ title: 'Plantera ut tomat', type: 'transplant', key: 'season-plan:2026:Tomat:planteraUt' });
  });

  it('ger hela året när planen görs i förväg', () => {
    const plan = buildSeasonPlan(['Tomat'], 3, 2027, '2026-10-01');
    expect(plan.map((p) => p.step)).toEqual(['forodla', 'planteraUt', 'skorda']);
    expect(plan[0].date).toBe(isoWeekMonday(2027, 12));
  });
});

describe('minnen och höjdpunkter', () => {
  it('hittar det du gjorde samma vecka förra året', () => {
    const events = buildCalendarEvents({
      zone: 3, from: '2025-01-01', to: '2026-12-31', today: '2026-03-25',
      sowings: [{ ...tomato, id: 'old', sow_date: '2025-03-19', status: 'done' }, tomato],
      reminders: [{ id: 'r', title: 'Köp såjord', date: '2025-03-17', done: true }, { id: 'o', title: 'Öppen', date: '2025-03-18' }],
    });
    const memories = lastYearSameWeek(events, '2026-03-18');
    expect(memories.map((e) => e.title)).toEqual(['Köp såjord', 'Sådde Tomat – Sungold']);
  });

  it('plockar kalenderns egna förslag för veckan, men inte vanliga påminnelser', () => {
    const events = buildCalendarEvents({ zone: 3, from: '2026-01-01', to: '2026-12-31', today: '2026-05-14', sowings: [tomato], reminders: [{ id: 'r', title: 'X', date: '2026-05-15' }] });
    const highlights = upcomingCalendarHighlights(events, '2026-05-14');
    expect(highlights.map((e) => e.kind)).toEqual(['plant-out-due']);
  });
});

describe('calendarFeedLinks', () => {
  it('bygger https-, webcal-, Google- och Outlook-länkar till samma flöde', () => {
    const links = calendarFeedLinks('https://abc.supabase.co/', 'f'.repeat(64));
    expect(links.https).toBe(`https://abc.supabase.co/functions/v1/calendar-feed?token=${'f'.repeat(64)}`);
    expect(links.webcal).toBe(`webcal://abc.supabase.co/functions/v1/calendar-feed?token=${'f'.repeat(64)}`);
    expect(links.google).toBe(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(links.webcal)}`);
    expect(new URL(links.outlook).searchParams.get('url')).toBe(links.https);
  });
});
