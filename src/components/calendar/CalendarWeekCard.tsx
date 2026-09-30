import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import {
  addDays,
  buildCalendarEvents,
  formatLongDate,
  getWeekGuide,
  isoWeekOfKey,
  upcomingCalendarHighlights,
  type CalendarSowing,
} from '@/lib/gardenCalendar';
import { EVENT_STYLE } from './calendarStyles';

type Props = {
  sowings: CalendarSowing[];
  zone: number;
  today: string;
};

/**
 * Startsidans utdrag ur odlingskalendern: det kalendern själv räknat fram för
 * veckan (utplantering, omgångssådd, skördestart) och grödor vars såfönster
 * stänger nu. Påminnelser och frost visas redan av Pulsen och frostbannern.
 */
export default function CalendarWeekCard({ sowings, zone, today }: Props) {
  const highlights = useMemo(() => {
    const events = buildCalendarEvents({ zone, from: today, to: addDays(today, 6), today, sowings });
    return upcomingCalendarHighlights(events, today).filter((e) => !e.id.startsWith('forecast-frost:'));
  }, [sowings, zone, today]);
  const closing = useMemo(() => {
    const guide = getWeekGuide(zone, isoWeekOfKey(today));
    return [...guide.forodla, ...guide.direktsa].filter((c) => c.closesNow).map((c) => c.name.toLowerCase());
  }, [zone, today]);

  if (!highlights.length && !closing.length) return null;

  return (
    <section aria-labelledby="calendar-week-heading" className="garden-paper p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="calendar-week-heading" className="flex items-center gap-2 font-sans text-sm font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Kalendern den här veckan</h2>
        <Link to="/app/calendar" className="inline-flex items-center gap-1 text-xs text-primary">Öppna <ArrowRight className="h-3 w-3" /></Link>
      </div>
      <ul className="mt-3 space-y-2">
        {highlights.slice(0, 4).map((event) => {
          const style = EVENT_STYLE[event.kind];
          const Icon = style.icon;
          return (
            <li key={event.id}>
              <Link to="/app/calendar" className="flex items-start gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-muted/40">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${style.chip}`}><Icon className="h-3.5 w-3.5" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-snug">{event.title}</span>
                  <span className="block text-xs first-letter:uppercase text-muted-foreground">{event.date === today ? 'Idag' : formatLongDate(event.date)}{event.warning ? (event.kind === 'plant-out-due' ? ' · ⚠︎ fönstret har stängt' : ' · ⚠︎ sen sådd') : ''}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {closing.length > 0 && (
        <p className="mt-3 rounded-xl bg-destructive/8 px-3 py-2 text-xs text-destructive">
          Sista veckan att så {closing.slice(0, 4).join(', ')}{closing.length > 4 ? ' m.fl.' : ''}.
        </p>
      )}
    </section>
  );
}
