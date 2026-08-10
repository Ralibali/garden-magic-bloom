import { sowingMatrix, weekToMonth, type CropEntry, type CropTiming } from '@/data/sowingMatrix';
import { getWinterTasks, type SeasonTask } from '@/data/winterTasks';
import { MONTH_NAMES_SV } from '@/lib/seoData';

export type CalendarActivity = 'forodla' | 'direktsa' | 'planteraUt' | 'skorda';

export const ACTIVITY_LABEL: Record<CalendarActivity, string> = {
  forodla: 'Förodla inomhus',
  direktsa: 'Direktså på plats',
  planteraUt: 'Plantera ut',
  skorda: 'Skörda',
};

export type CalendarCrop = {
  name: string;
  category?: CropEntry['category'];
  /** ISO-veckor för aktiviteten i den valda zonen. */
  startWeek: number;
  endWeek: number;
  weekLabel: string;
  note?: string;
};

export type MonthActivities = {
  month: number;
  monthName: string;
  zone: number;
  forodla: CalendarCrop[];
  direktsa: CalendarCrop[];
  planteraUt: CalendarCrop[];
  skorda: CalendarCrop[];
  other: SeasonTask[];
  totalCrops: number;
};

function normalizeWeek(week: number): number {
  if (week < 1) return week + 52;
  if (week > 52) return week - 52;
  return week;
}

/** Sant om ett veckospann (start–slut) överlappar månaden. */
function spanTouchesMonth(start: number, end: number, month: number): boolean {
  const from = normalizeWeek(start);
  const to = normalizeWeek(end);
  const weeks: number[] = [];
  if (from <= to) {
    for (let w = from; w <= to; w++) weeks.push(w);
  } else {
    for (let w = from; w <= 52; w++) weeks.push(w);
    for (let w = 1; w <= to; w++) weeks.push(w);
  }
  return weeks.some(w => weekToMonth(w) === month);
}

function weekLabel(start: number, end: number): string {
  const from = normalizeWeek(start);
  const to = normalizeWeek(end);
  return from === to ? `v.${from}` : `v.${from}–${to}`;
}

function pick(
  crop: CropEntry,
  timing: CropTiming,
  month: number,
  start: number | null,
  end: number | null,
): CalendarCrop | null {
  if (start == null || end == null) return null;
  if (!spanTouchesMonth(start, end, month)) return null;
  return {
    name: crop.name,
    category: crop.category,
    startWeek: normalizeWeek(start),
    endWeek: normalizeWeek(end),
    weekLabel: weekLabel(start, end),
    note: timing.note,
  };
}

/**
 * Vilka grödor som ska förodlas, direktsås, planteras ut och skördas
 * under en given månad i en given klimatzon (1–8).
 */
export function getMonthActivities(monthNumber: number, zone: number): MonthActivities {
  const month = Math.min(12, Math.max(1, Math.round(monthNumber)));
  const safeZone = Math.min(8, Math.max(1, Math.round(zone)));

  const forodla: CalendarCrop[] = [];
  const direktsa: CalendarCrop[] = [];
  const planteraUt: CalendarCrop[] = [];
  const skorda: CalendarCrop[] = [];

  for (const crop of sowingMatrix) {
    const timing = crop.zones[safeZone];
    if (!timing) continue;
    const pre = pick(crop, timing, month, timing.preStart, timing.preEnd);
    if (pre) forodla.push(pre);
    const direct = pick(crop, timing, month, timing.directSowStart, timing.directSowEnd);
    if (direct) direktsa.push(direct);
    const out = pick(crop, timing, month, timing.plantOutStart, timing.plantOutEnd);
    if (out) planteraUt.push(out);
    const harvest = pick(crop, timing, month, timing.harvestStart, timing.harvestEnd);
    if (harvest) skorda.push(harvest);
  }

  const byWeek = (a: CalendarCrop, b: CalendarCrop) =>
    a.startWeek - b.startWeek || a.name.localeCompare(b.name, 'sv');
  forodla.sort(byWeek);
  direktsa.sort(byWeek);
  planteraUt.sort(byWeek);
  skorda.sort(byWeek);

  return {
    month,
    monthName: MONTH_NAMES_SV[month - 1],
    zone: safeZone,
    forodla,
    direktsa,
    planteraUt,
    skorda,
    other: getWinterTasks(month, safeZone),
    totalCrops: forodla.length + direktsa.length + planteraUt.length + skorda.length,
  };
}

export const CALENDAR_SECTIONS: { key: CalendarActivity; heading: (month: string) => string }[] = [
  { key: 'forodla', heading: m => `Förodla inomhus i ${m}` },
  { key: 'direktsa', heading: m => `Direktså i ${m}` },
  { key: 'planteraUt', heading: m => `Plantera ut i ${m}` },
  { key: 'skorda', heading: m => `Skörda i ${m}` },
];

export function activityCrops(data: MonthActivities, key: CalendarActivity): CalendarCrop[] {
  return data[key];
}
