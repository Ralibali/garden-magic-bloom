// Typade ingångar till den genererade kopian av appens kalenderlogik
// (gardenCalendar.bundle.js, se scripts/export-calendar-feed.mjs). Beteendet
// testas mot den riktiga koden i src/test/calendarFeed.test.ts och
// src/test/weeklyDigestModel.test.ts.
import * as bundle from './gardenCalendar.bundle.js';

export interface CalendarEventLike {
  id: string;
  kind: string;
  date: string;
  title: string;
  detail?: string;
  warning?: string;
  done?: boolean;
  cropName?: string | null;
}

export interface WeekGuideCrop {
  name: string;
  startWeek: number;
  endWeek: number;
  opensNow: boolean;
  closesNow: boolean;
}

export interface CalendarLib {
  addDays(key: string, days: number): string;
  isoWeekOfKey(key: string): number;
  buildCalendarEvents(input: {
    zone: number;
    from: string;
    to: string;
    today: string;
    sowings?: unknown[];
    harvests?: unknown[];
    reminders?: unknown[];
  }): CalendarEventLike[];
  buildIcs(events: unknown[], options?: { calendarName?: string; now?: Date; refreshHours?: number }): string;
  upcomingCalendarHighlights(events: CalendarEventLike[], today: string, days?: number): CalendarEventLike[];
  getWeekGuide(zone: number, week: number): Record<'forodla' | 'direktsa' | 'planteraUt' | 'skorda', WeekGuideCrop[]>;
}

export const calendarLib = bundle as unknown as CalendarLib;
