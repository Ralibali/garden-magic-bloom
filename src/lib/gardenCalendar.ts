/**
 * Personlig odlingskalender. Slår ihop användarens egna rader (sådder,
 * utplanteringar, skördar, påminnelser) med zonens såmatris till en
 * gemensam händelselista – och kan exportera den som iCal (.ics).
 *
 * Allt här är rent och datumsäkert: datum hanteras som YYYY-MM-DD-nycklar
 * och räknas i UTC så att sommartid aldrig flyttar en händelse en dag.
 */
import {
  sowingMatrix,
  ZONE_LAST_FROST_WEEK,
  ZONE_SEASON_END_WEEK,
  type CropEntry,
  type CropTiming,
} from '@/data/sowingMatrix';
import { catalogueNameForKey, findCropForVariety } from '@/lib/harvestForecast';
import { UNKNOWN_CROP_KEY } from '@/lib/cropIdentity';
import { normalizePlantKind } from '@/lib/plantKind';

// ─── Datum ────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function parseKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function toKey(utc: number): string {
  return new Date(utc).toISOString().slice(0, 10);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseKey(value));
}

export function addDays(key: string, days: number): string {
  return toKey(parseKey(key) + days * DAY_MS);
}

export function diffDays(from: string, to: string): number {
  return Math.round((parseKey(to) - parseKey(from)) / DAY_MS);
}

/** ISO-veckonummer för en datumnyckel. */
export function isoWeekOfKey(key: string): number {
  const d = new Date(parseKey(key));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / DAY_MS + 1) / 7);
}

/** Måndagen i en ISO-vecka. Vecka 1 är veckan som innehåller 4 januari. */
export function isoWeekMonday(year: number, week: number): string {
  const jan4 = Date.UTC(year, 0, 4);
  const jan4Day = new Date(jan4).getUTCDay() || 7;
  return toKey(jan4 - (jan4Day - 1) * DAY_MS + (week - 1) * 7 * DAY_MS);
}

/** Måndag (veckostart) för veckan som innehåller datumet. */
export function mondayOf(key: string): string {
  const day = new Date(parseKey(key)).getUTCDay() || 7;
  return addDays(key, 1 - day);
}

export type MonthGridDay = { key: string; day: number; inMonth: boolean };
export type MonthGridWeek = { week: number; days: MonthGridDay[] };

/** Månadsvy med måndag som första veckodag, alltid hela veckor. */
export function buildMonthGrid(year: number, month: number): MonthGridWeek[] {
  const first = toKey(Date.UTC(year, month - 1, 1));
  const last = toKey(Date.UTC(year, month, 0));
  const weeks: MonthGridWeek[] = [];
  for (let start = mondayOf(first); start <= last; start = addDays(start, 7)) {
    const days: MonthGridDay[] = [];
    for (let i = 0; i < 7; i++) {
      const key = addDays(start, i);
      days.push({ key, day: Number(key.slice(8, 10)), inMonth: key.slice(0, 7) === first.slice(0, 7) });
    }
    weeks.push({ week: isoWeekOfKey(start), days });
  }
  return weeks;
}

export const WEEKDAYS_SV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
export const MONTHS_SV = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];
const WEEKDAYS_LONG_SV = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];

/** "onsdag 30 september" */
export function formatLongDate(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${WEEKDAYS_LONG_SV[new Date(parseKey(key)).getUTCDay()]} ${d} ${MONTHS_SV[m - 1]}`;
}

/** "28 sep – 4 okt" */
export function formatWeekRange(monday: string): string {
  const sunday = addDays(monday, 6);
  const short = (key: string) => `${Number(key.slice(8, 10))} ${MONTHS_SV[Number(key.slice(5, 7)) - 1].slice(0, 3)}`;
  return `${short(monday)} – ${short(sunday)}`;
}

// ─── Zonguide (såmatrisen) ────────────────────────────────────────────────

export type GuideActivity = 'forodla' | 'direktsa' | 'planteraUt' | 'skorda';

export const GUIDE_ACTIVITY_LABEL: Record<GuideActivity, string> = {
  forodla: 'Förodla inomhus',
  direktsa: 'Direktså',
  planteraUt: 'Plantera ut',
  skorda: 'Skörda',
};

export type GuideCrop = {
  name: string;
  category?: CropEntry['category'];
  startWeek: number;
  endWeek: number;
  /** Första eller sista veckan i fönstret – bra att lyfta fram. */
  opensNow: boolean;
  closesNow: boolean;
  note?: string;
};

export type WeekGuide = Record<GuideActivity, GuideCrop[]> & { week: number; zone: number; total: number };

const ACTIVITY_FIELDS: Record<GuideActivity, [keyof CropTiming, keyof CropTiming]> = {
  forodla: ['preStart', 'preEnd'],
  direktsa: ['directSowStart', 'directSowEnd'],
  planteraUt: ['plantOutStart', 'plantOutEnd'],
  skorda: ['harvestStart', 'harvestEnd'],
};

/** Sant om veckan ligger i spannet. Spann som går över årsskiftet (t.ex. v.50–4) hanteras. */
export function weekInSpan(week: number, start: number, end: number): boolean {
  return start <= end ? week >= start && week <= end : week >= start || week <= end;
}

function safeZone(zone: number): number {
  return Math.min(8, Math.max(1, Math.round(Number(zone) || 3)));
}

/** Vad zonens såmatris säger att man gör en viss vecka. */
export function getWeekGuide(zone: number, week: number): WeekGuide {
  const z = safeZone(zone);
  const guide: WeekGuide = { week, zone: z, total: 0, forodla: [], direktsa: [], planteraUt: [], skorda: [] };
  for (const crop of sowingMatrix) {
    const timing = crop.zones[z];
    if (!timing) continue;
    for (const activity of Object.keys(ACTIVITY_FIELDS) as GuideActivity[]) {
      const [startField, endField] = ACTIVITY_FIELDS[activity];
      const start = timing[startField] as number | null;
      const end = timing[endField] as number | null;
      if (start == null || end == null || !weekInSpan(week, start, end)) continue;
      guide[activity].push({
        name: crop.name,
        category: crop.category,
        startWeek: start,
        endWeek: end,
        opensNow: week === start,
        // Skördefönstret slutar med säsongen – där är "sista veckan" bara brus.
        closesNow: activity !== 'skorda' && week === end,
        note: timing.note,
      });
      guide.total += 1;
    }
  }
  for (const activity of Object.keys(ACTIVITY_FIELDS) as GuideActivity[]) {
    guide[activity].sort((a, b) => Number(b.closesNow) - Number(a.closesNow) || a.name.localeCompare(b.name, 'sv'));
  }
  return guide;
}

export type YearWheelRow = {
  name: string;
  category?: CropEntry['category'];
  note?: string;
  spans: { activity: GuideActivity; start: number; end: number }[];
};

/** Årshjulet: alla grödor med sina fönster (ISO-veckor) i zonen. */
export function buildYearWheel(zone: number): YearWheelRow[] {
  const z = safeZone(zone);
  return sowingMatrix.map((crop) => {
    const timing = crop.zones[z];
    const spans: YearWheelRow['spans'] = [];
    if (timing) {
      for (const activity of Object.keys(ACTIVITY_FIELDS) as GuideActivity[]) {
        const [startField, endField] = ACTIVITY_FIELDS[activity];
        const start = timing[startField] as number | null;
        const end = timing[endField] as number | null;
        if (start != null && end != null) spans.push({ activity, start, end });
      }
    }
    return { name: crop.name, category: crop.category, note: timing?.note, spans };
  });
}

// ─── Personliga händelser ─────────────────────────────────────────────────

export type CalendarEventKind =
  | 'sown'
  | 'transplanted'
  | 'plant-out-due'
  | 'harvest-expected'
  | 'harvested'
  | 'succession'
  | 'reminder'
  | 'frost';

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  date: string;
  title: string;
  detail?: string;
  cropName?: string | null;
  sowingId?: string;
  reminderId?: string;
  done?: boolean;
  /** Sant när kalendern räknat fram datumet (inte något användaren skrivit). */
  estimated?: boolean;
  /** T.ex. risk att skörden hamnar efter säsongsslut. */
  warning?: string;
};

export const EVENT_KIND_LABEL: Record<CalendarEventKind, string> = {
  sown: 'Sådd',
  transplanted: 'Utplanterad',
  'plant-out-due': 'Dags att plantera ut',
  'harvest-expected': 'Beräknad skörd',
  harvested: 'Skördat',
  succession: 'Nästa omgång',
  reminder: 'Påminnelse',
  frost: 'Klimat',
};

export type CalendarSowing = {
  id: string;
  variety: string;
  sow_date: string;
  transplant_date?: string | null;
  status?: string | null;
  type?: string | null;
  plant_kind?: string | null;
  crop_key?: string | null;
  beds?: { name?: string | null } | null;
};

export type CalendarHarvest = {
  id: string;
  variety: string;
  harvest_date: string;
  weight_grams?: number | null;
  beds?: { name?: string | null } | null;
};

export type CalendarReminder = {
  id: string;
  title: string;
  type?: string;
  date: string;
  done?: boolean;
  bed?: string;
  sowing_id?: string | null;
};

/** Grödor som mår bäst av att sås i omgångar, med rimligt intervall i veckor. */
export const SUCCESSION_WEEKS: Record<string, number> = {
  'Rädisa': 2,
  'Sallat': 3,
  'Spenat': 3,
  'Ruccola': 3,
  'Pak choi': 3,
  'Dill': 3,
  'Koriander': 3,
  'Bönor': 4,
  'Sockerärt': 4,
};

/** Matrisens gröda för en sådd – crop_key först, fri text som reserv. */
export function cropNameForSowing(sowing: Pick<CalendarSowing, 'variety' | 'crop_key'>): string | null {
  if (sowing.crop_key && sowing.crop_key !== UNKNOWN_CROP_KEY) {
    const byKey = catalogueNameForKey(sowing.crop_key);
    if (byKey) return byKey;
  }
  return findCropForVariety(sowing.variety);
}

function timingFor(cropName: string | null, zone: number): CropTiming | null {
  if (!cropName) return null;
  return sowingMatrix.find((c) => c.name === cropName)?.zones[safeZone(zone)] ?? null;
}

function isActive(status: string | null | undefined): boolean {
  return status !== 'done';
}

function bedSuffix(beds: { name?: string | null } | null | undefined): string {
  return beds?.name ? ` · ${beds.name}` : '';
}

function yearOf(key: string): number {
  return Number(key.slice(0, 4));
}

/**
 * Beräknad skörd: matrisens avstånd mellan såstart och skördestart läggs på
 * användarens faktiska såddag. Sår man sent blir skörden sen – och hamnar den
 * efter zonens skördefönster får användaren en varning.
 */
export function estimateHarvest(sowing: CalendarSowing, zone: number): { date: string; warning?: string } | null {
  if (!isDateKey(sowing.sow_date)) return null;
  if (normalizePlantKind(sowing.plant_kind) === 'ornamental') return null;
  const cropName = cropNameForSowing(sowing);
  const timing = timingFor(cropName, zone);
  if (!timing || timing.harvestStart == null || timing.harvestEnd == null) return null;
  const indoor = sowing.type === 'indoor';
  const sowStart = indoor
    ? timing.preStart ?? timing.directSowStart ?? timing.plantOutStart
    : timing.directSowStart ?? timing.plantOutStart ?? timing.preStart;
  if (sowStart == null) return null;
  const gapWeeks = timing.harvestStart - sowStart;
  // Fleråriga och höstsatta grödor (vitlök, sparris) har inget meningsfullt avstånd inom året.
  if (gapWeeks <= 0 || gapWeeks > 40) return null;
  const year = yearOf(sowing.sow_date);
  const byGap = addDays(sowing.sow_date, gapWeeks * 7);
  const windowStart = isoWeekMonday(year, timing.harvestStart);
  const date = byGap < windowStart ? windowStart : byGap;
  const windowEnd = addDays(isoWeekMonday(year, timing.harvestEnd), 6);
  const warning = date > windowEnd
    ? `Beräknad skörd efter zonens vanliga skördefönster (v.${timing.harvestEnd}). Skydda plantorna eller välj en snabbare sort.`
    : undefined;
  return { date, warning };
}

/** Varning när utplanteringen hamnar efter zonens fönster (t.ex. tomat förodlad i augusti). */
export function plantOutWarning(sowing: CalendarSowing, zone: number, date: string): string | undefined {
  const timing = timingFor(cropNameForSowing(sowing), zone);
  if (!timing || timing.plantOutEnd == null) return undefined;
  const windowEnd = addDays(isoWeekMonday(yearOf(date), timing.plantOutEnd), 6);
  // Två veckors marginal: en planta som är en vecka sen klarar sig oftast fint.
  if (diffDays(windowEnd, date) <= 14) return undefined;
  return `Zonens utplanteringsfönster stängde v.${timing.plantOutEnd}. Låt plantan stå kvar i växthus eller i kruka inomhus i stället för att plantera ut.`;
}

/** Förslag på utplantering för förodlade plantor som ännu står inne. */
export function estimatePlantOut(sowing: CalendarSowing, zone: number): string | null {
  if (!isDateKey(sowing.sow_date) || sowing.type !== 'indoor') return null;
  if (sowing.transplant_date) return null;
  if (sowing.status && !['sown', 'indoor'].includes(sowing.status)) return null;
  const timing = timingFor(cropNameForSowing(sowing), zone);
  if (!timing || timing.plantOutStart == null) return null;
  const year = yearOf(sowing.sow_date);
  const preStart = timing.preStart ?? timing.plantOutStart;
  const growWeeks = Math.max(2, timing.plantOutStart - preStart);
  const byGrowth = addDays(sowing.sow_date, growWeeks * 7);
  const windowStart = isoWeekMonday(year, timing.plantOutStart);
  return byGrowth < windowStart ? windowStart : byGrowth;
}

export type BuildCalendarInput = {
  zone: number;
  from: string;
  to: string;
  today: string;
  sowings?: CalendarSowing[];
  harvests?: CalendarHarvest[];
  reminders?: CalendarReminder[];
};

/** Alla personliga händelser (och zonens frostmarkörer) inom [from, to], sorterade. */
export function buildCalendarEvents({ zone, from, to, today, sowings = [], harvests = [], reminders = [] }: BuildCalendarInput): CalendarEvent[] {
  const z = safeZone(zone);
  const events: CalendarEvent[] = [];
  const inRange = (key: string | null | undefined): key is string => isDateKey(key) && key >= from && key <= to;

  for (const sowing of sowings) {
    const cropName = cropNameForSowing(sowing);
    const where = bedSuffix(sowing.beds);
    if (inRange(sowing.sow_date)) {
      events.push({
        id: `sown:${sowing.id}`,
        kind: 'sown',
        date: sowing.sow_date,
        title: `Sådde ${sowing.variety}`,
        detail: `${sowing.type === 'indoor' ? 'Förodling' : 'Direktsådd'}${where}`,
        cropName,
        sowingId: sowing.id,
      });
    }
    if (inRange(sowing.transplant_date)) {
      events.push({
        id: `transplanted:${sowing.id}`,
        kind: 'transplanted',
        date: sowing.transplant_date,
        title: `Planterade ut ${sowing.variety}`,
        detail: where ? where.slice(3) : undefined,
        cropName,
        sowingId: sowing.id,
      });
    }
    if (!isActive(sowing.status)) continue;

    // En förodling som stått "inne" i ett halvår är en bortglömd rad, inte en planta att plantera ut idag.
    const plantOut = diffDays(sowing.sow_date, today) <= 150 ? estimatePlantOut(sowing, z) : null;
    if (plantOut) {
      // Har datumet redan passerat flyttas förslaget till idag – plantan står ju fortfarande inne.
      const date = plantOut < today ? today : plantOut;
      if (inRange(date)) {
        events.push({
          id: `plant-out:${sowing.id}`,
          kind: 'plant-out-due',
          date,
          title: `Plantera ut ${sowing.variety}`,
          detail: `Härda av plantorna en vecka först. Normal sista frost i zon ${z} är v.${ZONE_LAST_FROST_WEEK[z]}.`,
          cropName,
          sowingId: sowing.id,
          estimated: true,
          warning: plantOutWarning(sowing, z, date),
        });
      }
    }

    if (sowing.status !== 'harvesting') {
      const harvest = estimateHarvest(sowing, z);
      if (harvest && inRange(harvest.date)) {
        events.push({
          id: `harvest-expected:${sowing.id}`,
          kind: 'harvest-expected',
          date: harvest.date,
          title: `Skörd kan börja: ${sowing.variety}`,
          detail: `Räknat från din såddag ${sowing.sow_date}${where}`,
          cropName,
          sowingId: sowing.id,
          estimated: true,
          warning: harvest.warning,
        });
      }
    }
  }

  // Omgångssådd: bara senaste sådden per gröda, och bara så länge direktsåfönstret är öppet.
  const latestByCrop = new Map<string, CalendarSowing>();
  for (const sowing of sowings) {
    const cropName = cropNameForSowing(sowing);
    if (!cropName || !SUCCESSION_WEEKS[cropName] || !isDateKey(sowing.sow_date)) continue;
    const current = latestByCrop.get(cropName);
    if (!current || sowing.sow_date > current.sow_date) latestByCrop.set(cropName, sowing);
  }
  for (const [cropName, sowing] of latestByCrop) {
    const timing = timingFor(cropName, z);
    if (!timing || timing.directSowEnd == null) continue;
    const suggested = addDays(sowing.sow_date, SUCCESSION_WEEKS[cropName] * 7);
    const date = suggested < today ? today : suggested;
    const windowEnd = addDays(isoWeekMonday(yearOf(date), timing.directSowEnd), 6);
    if (date > windowEnd || yearOf(date) !== yearOf(sowing.sow_date)) continue;
    if (!inRange(date)) continue;
    events.push({
      id: `succession:${cropName}:${date}`,
      kind: 'succession',
      date,
      title: `Så nästa omgång ${cropName.toLowerCase()}`,
      detail: `${SUCCESSION_WEEKS[cropName]} veckor efter senaste sådden – då får du jämn skörd hela säsongen. Direktsåfönstret stänger v.${timing.directSowEnd}.`,
      cropName,
      estimated: true,
    });
  }

  for (const harvest of harvests) {
    if (!inRange(harvest.harvest_date)) continue;
    const grams = Number(harvest.weight_grams) || 0;
    const weight = grams >= 1000 ? `${(grams / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} kg` : grams > 0 ? `${grams} g` : '';
    events.push({
      id: `harvested:${harvest.id}`,
      kind: 'harvested',
      date: harvest.harvest_date,
      title: `Skördade ${harvest.variety}`,
      detail: [weight, harvest.beds?.name].filter(Boolean).join(' · ') || undefined,
      cropName: findCropForVariety(harvest.variety),
    });
  }

  for (const reminder of reminders) {
    if (!reminder?.id || !inRange(reminder.date)) continue;
    events.push({
      id: `reminder:${reminder.id}`,
      kind: 'reminder',
      date: reminder.date,
      title: reminder.title,
      detail: reminder.bed || undefined,
      reminderId: reminder.id,
      sowingId: reminder.sowing_id || undefined,
      done: !!reminder.done,
    });
  }

  // Zonens klimatmarkörer för varje år som syns.
  for (let year = yearOf(from); year <= yearOf(to); year++) {
    const lastFrost = isoWeekMonday(year, ZONE_LAST_FROST_WEEK[z]);
    if (inRange(lastFrost)) {
      events.push({
        id: `frost:last:${year}`,
        kind: 'frost',
        date: lastFrost,
        title: 'Normal sista frostvecka',
        detail: `I zon ${z} brukar frostnätterna vara över efter v.${ZONE_LAST_FROST_WEEK[z]}. Värmeälskande plantor ut först därefter.`,
        estimated: true,
      });
    }
    const seasonEnd = isoWeekMonday(year, ZONE_SEASON_END_WEEK[z]);
    if (inRange(seasonEnd)) {
      events.push({
        id: `frost:first:${year}`,
        kind: 'frost',
        date: seasonEnd,
        title: 'Säsongen går mot sitt slut',
        detail: `Första höstfrosten kommer ofta runt v.${ZONE_SEASON_END_WEEK[z]} i zon ${z}. Skörda frostkänsligt och täck det som ska stå kvar.`,
        estimated: true,
      });
    }
  }

  const order: Record<CalendarEventKind, number> = {
    frost: 0, reminder: 1, 'plant-out-due': 2, succession: 3, 'harvest-expected': 4, sown: 5, transplanted: 6, harvested: 7,
  };
  return events.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || a.title.localeCompare(b.title, 'sv'));
}

export function groupEventsByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.date);
    if (list) list.push(event);
    else map.set(event.date, [event]);
  }
  return map;
}

/** Sammanfattning av en period – används som "din säsong i siffror". */
export function summarizeEvents(events: CalendarEvent[], today: string) {
  let openTasks = 0;
  let overdue = 0;
  let upcomingHarvests = 0;
  let sown = 0;
  let harvested = 0;
  for (const event of events) {
    if (event.kind === 'reminder' && !event.done) {
      openTasks += 1;
      if (event.date < today) overdue += 1;
    }
    if (event.kind === 'plant-out-due' || event.kind === 'succession') openTasks += 1;
    if (event.kind === 'harvest-expected' && event.date >= today) upcomingHarvests += 1;
    if (event.kind === 'sown') sown += 1;
    if (event.kind === 'harvested') harvested += 1;
  }
  return { openTasks, overdue, upcomingHarvests, sown, harvested };
}

// ─── iCal-export ──────────────────────────────────────────────────────────

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** RFC 5545: rader längre än 75 oktetter viks, utan att dela ett UTF-8-tecken. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
      limit = 74; // fortsättningsrader börjar med ett mellanslag
    }
    current += char;
    bytes += size;
  }
  if (current) parts.push(current);
  return parts.join('\r\n ');
}

function icsDate(key: string): string {
  return key.replace(/-/g, '');
}

function icsStamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Exporterar händelserna som en iCal-fil som går att importera i Google
 * Kalender, Apple Kalender och Outlook. Heldagshändelser; uppgifter får en
 * avisering klockan 08.00 samma dag.
 */
export function buildIcs(events: CalendarEvent[], { calendarName = 'Odlingsdagboken', now = new Date() }: { calendarName?: string; now?: Date } = {}): string {
  const stamp = icsStamp(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Odlingsdagboken//Odlingskalender//SV',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(calendarName)}`,
    'X-WR-TIMEZONE:Europe/Stockholm',
  ];
  for (const event of events) {
    if (!isDateKey(event.date)) continue;
    const summary = event.kind === 'reminder' && event.done ? `✓ ${event.title}` : event.title;
    const description = [EVENT_KIND_LABEL[event.kind], event.detail, event.warning].filter(Boolean).join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcs(event.id)}@odlingsdagboken.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(event.date)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(event.date, 1))}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      `CATEGORIES:${escapeIcs(EVENT_KIND_LABEL[event.kind])}`,
      'TRANSP:TRANSPARENT',
    );
    const actionable = (event.kind === 'reminder' && !event.done) || event.kind === 'plant-out-due' || event.kind === 'succession';
    if (actionable) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(event.title)}`, 'TRIGGER:PT8H', 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

// ─── Väder ────────────────────────────────────────────────────────────────

export type DayWeather = { date: string; min: number | null; max: number | null; precip: number | null; code: number | null };

type ForecastLike = {
  daily?: {
    time?: string[];
    temperature_2m_min?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    precipitation_sum?: (number | null)[];
    weather_code?: (number | null)[];
  };
} | null | undefined;

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** Open-Meteo-prognosen som dag → väder. */
export function forecastByDate(forecast: ForecastLike): Map<string, DayWeather> {
  const map = new Map<string, DayWeather>();
  const daily = forecast?.daily;
  if (!daily?.time?.length) return map;
  daily.time.forEach((date, i) => {
    if (!isDateKey(date)) return;
    map.set(date, {
      date,
      min: num(daily.temperature_2m_min?.[i]),
      max: num(daily.temperature_2m_max?.[i]),
      precip: num(daily.precipitation_sum?.[i]),
      code: num(daily.weather_code?.[i]),
    });
  });
  return map;
}

/** Grödor som tar skada redan vid någon minusgrad. */
export const FROST_SENSITIVE_CROPS = new Set(['Tomat', 'Chili', 'Gurka', 'Squash', 'Pumpa', 'Majs', 'Bönor', 'Basilika', 'Potatis']);

/** Platser vars namn säger att de är skyddade – bäddar saknar typ, så namnet får räcka. */
const PROTECTED_PLACE = /v[äa]xthus|drivhus|inomhus|f[öo]nster|orangeri|uterum/i;

/** Frostkänsliga sådder som står ute just nu. */
export function exposedToFrost(sowings: CalendarSowing[]): CalendarSowing[] {
  return sowings.filter((sowing) => {
    if (!isActive(sowing.status) || normalizePlantKind(sowing.plant_kind) === 'ornamental') return false;
    if (sowing.beds?.name && PROTECTED_PLACE.test(sowing.beds.name)) return false;
    const crop = cropNameForSowing(sowing);
    if (!crop || !FROST_SENSITIVE_CROPS.has(crop)) return false;
    const outside = sowing.status === 'transplanted' || sowing.status === 'harvesting' || !!sowing.transplant_date || sowing.type === 'direct';
    return outside;
  });
}

/**
 * Prognosens kalla nätter som kalenderhändelser, med namnen på de plantor som
 * faktiskt står ute och behöver skydd. ≤0 °C är frost, ≤2 °C är risk.
 */
export function buildForecastFrostEvents(forecast: ForecastLike, sowings: CalendarSowing[] = []): CalendarEvent[] {
  const exposed = exposedToFrost(sowings);
  const names = [...new Set(exposed.map((s) => s.variety))];
  const events: CalendarEvent[] = [];
  for (const day of forecastByDate(forecast).values()) {
    if (day.min == null || day.min > 2) continue;
    const frost = day.min <= 0;
    const temp = `${Math.round(day.min)} °C`.replace('-', '−');
    events.push({
      id: `forecast-frost:${day.date}`,
      kind: 'frost',
      date: day.date,
      title: frost ? `Frostnatt väntas · ${temp}` : `Risk för frost · ${temp}`,
      detail: names.length
        ? `Täck med fiberduk eller ta in: ${names.slice(0, 5).join(', ')}${names.length > 5 ? ` och ${names.length - 5} till` : ''}.`
        : 'Vänta med att plantera ut frostkänsligt och täck det som redan står ute.',
      warning: frost && names.length ? `${names.length} ${names.length === 1 ? 'frostkänslig planta står' : 'frostkänsliga plantor står'} ute.` : undefined,
    });
  }
  return events;
}

// ─── Säsongsplan ──────────────────────────────────────────────────────────

export type SeasonPlanStep = 'forodla' | 'direktsa' | 'planteraUt' | 'skorda';

export type SeasonPlanItem = {
  /** Stabil nyckel så att samma plan aldrig skapas två gånger. */
  key: string;
  crop: string;
  step: SeasonPlanStep;
  title: string;
  date: string;
  type: 'sowing' | 'transplant' | 'other';
};

const PLAN_TITLE: Record<SeasonPlanStep, (crop: string) => string> = {
  forodla: (c) => `Förodla ${c.toLowerCase()}`,
  direktsa: (c) => `Direktså ${c.toLowerCase()}`,
  planteraUt: (c) => `Plantera ut ${c.toLowerCase()}`,
  skorda: (c) => `Skördetid för ${c.toLowerCase()} – kolla mognaden`,
};

/**
 * Gör om valda grödor till datumsatta påminnelser för ett helt år, enligt
 * zonens såmatris. Steg som redan passerat hoppas över.
 */
export function buildSeasonPlan(crops: string[], zone: number, year: number, today: string): SeasonPlanItem[] {
  const z = safeZone(zone);
  const items: SeasonPlanItem[] = [];
  for (const crop of [...new Set(crops)]) {
    const timing = timingFor(crop, z);
    if (!timing) continue;
    const steps: [SeasonPlanStep, number | null, SeasonPlanItem['type']][] = [
      ['forodla', timing.preStart, 'sowing'],
      ['direktsa', timing.directSowStart, 'sowing'],
      // Utplantering utan förodling = köpta plantor eller sättlök – också värt en påminnelse.
      ['planteraUt', timing.plantOutStart, 'transplant'],
      ['skorda', timing.harvestStart, 'other'],
    ];
    for (const [step, week, type] of steps) {
      if (week == null) continue;
      const date = isoWeekMonday(year, week);
      if (date < today) continue;
      items.push({ key: `season-plan:${year}:${crop}:${step}`, crop, step, title: PLAN_TITLE[step](crop), date, type });
    }
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.crop.localeCompare(b.crop, 'sv'));
}

// ─── Minnen ───────────────────────────────────────────────────────────────

/** Det du gjorde samma vecka förra året – sådder, utplanteringar, skördar och klara uppgifter. */
export function lastYearSameWeek(events: CalendarEvent[], date: string): CalendarEvent[] {
  const week = isoWeekOfKey(date);
  const lastYear = Number(date.slice(0, 4)) - 1;
  const monday = isoWeekMonday(lastYear, week);
  const sunday = addDays(monday, 6);
  return events.filter((e) =>
    e.date >= monday && e.date <= sunday
    && (e.kind === 'sown' || e.kind === 'transplanted' || e.kind === 'harvested' || (e.kind === 'reminder' && e.done)));
}

/**
 * Det kalendern själv räknat fram för de närmaste dagarna – utplantering,
 * omgångssådd, skördestart och frostnätter. Påminnelser visas redan i Pulsen
 * på startsidan och tas därför inte med här.
 */
export function upcomingCalendarHighlights(events: CalendarEvent[], today: string, days = 7): CalendarEvent[] {
  const end = addDays(today, days - 1);
  return events.filter((e) =>
    e.date >= today && e.date <= end
    && (e.kind === 'plant-out-due' || e.kind === 'succession' || e.kind === 'harvest-expected' || e.id.startsWith('forecast-frost:')));
}
