// Prenumererbar odlingskalender. Ren logik utan Supabase-beroenden så att den
// går att testa från vitest; index.ts i calendar-feed kopplar in databasen.
import * as bundle from './gardenCalendar.bundle.js';

// Den genererade filen är JS; här är de signaturer servern använder. Beteendet
// testas mot den riktiga koden i src/test/calendarFeed.test.ts.
interface CalendarLib {
  addDays(key: string, days: number): string;
  buildCalendarEvents(input: {
    zone: number;
    from: string;
    to: string;
    today: string;
    sowings?: unknown[];
    harvests?: unknown[];
    reminders?: unknown[];
  }): unknown[];
  buildIcs(events: unknown[], options?: { calendarName?: string; now?: Date; refreshHours?: number }): string;
}
const { addDays, buildCalendarEvents, buildIcs } = bundle as unknown as CalendarLib;

export interface FeedGarden {
  zone: number | null;
  sowings: unknown[];
  harvests: unknown[];
  reminders: unknown[];
}

export interface FeedDeps {
  /** Ägaren till en token-hash, eller null om länken inte finns. */
  resolveOwner(tokenHash: string): Promise<string | null>;
  loadGarden(userId: string): Promise<FeedGarden>;
  now?: () => Date;
}

const TOKEN = /^[a-f0-9]{64}$/;
/** Så långt bakåt och framåt prenumerationen sträcker sig. */
const PAST_DAYS = 365;
const FUTURE_DAYS = 548;
export const FEED_REFRESH_HOURS = 6;

const TEXT_HEADERS = { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Dagens datum i Sverige som YYYY-MM-DD. */
export function stockholmDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export async function handleCalendarFeed(req: Request, deps: FeedDeps): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { ...TEXT_HEADERS, Allow: 'GET, HEAD' } });
  }
  const token = new URL(req.url).searchParams.get('token') ?? '';
  // Samma svar för felformaterad, okänd och avstängd länk – avslöjar inget.
  const notFound = () => new Response('Kalenderlänken finns inte eller har stängts av.', { status: 404, headers: TEXT_HEADERS });
  if (!TOKEN.test(token)) return notFound();

  const owner = await deps.resolveOwner(await sha256Hex(token));
  if (!owner) return notFound();

  const garden = await deps.loadGarden(owner);
  const now = deps.now?.() ?? new Date();
  const today = stockholmDateKey(now);
  const zone = garden.zone ?? 3;
  const events = buildCalendarEvents({
    zone,
    from: addDays(today, -PAST_DAYS),
    to: addDays(today, FUTURE_DAYS),
    today,
    sowings: garden.sowings,
    harvests: garden.harvests,
    reminders: garden.reminders,
  });
  const body = buildIcs(events, { calendarName: `Odlingsdagboken – zon ${zone}`, now, refreshHours: FEED_REFRESH_HOURS });
  return new Response(req.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="odlingsdagboken.ics"',
      'Cache-Control': 'private, max-age=900',
      'X-Robots-Tag': 'noindex',
    },
  });
}
