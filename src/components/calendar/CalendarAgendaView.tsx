import { useMemo } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import {
  addDays,
  formatLongDate,
  formatWeekRange,
  getWeekGuide,
  isoWeekOfKey,
  mondayOf,
  type CalendarEvent,
  type GuideActivity,
} from '@/lib/gardenCalendar';
import { EVENT_STYLE, GUIDE_STYLE } from './calendarStyles';

type Props = {
  today: string;
  zone: number;
  weeks?: number;
  events: CalendarEvent[];
  showGuide: boolean;
  onSelectDay: (key: string) => void;
};

const GUIDE_ORDER: GuideActivity[] = ['forodla', 'direktsa', 'planteraUt', 'skorda'];

function EventRow({ event, onSelectDay, showDate }: { event: CalendarEvent; onSelectDay: (key: string) => void; showDate?: boolean }) {
  const style = EVENT_STYLE[event.kind];
  const Icon = style.icon;
  return (
    <button
      type="button"
      onClick={() => onSelectDay(event.date)}
      className={`flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 text-left transition-colors hover:border-primary/30 ${event.done ? 'opacity-55' : ''}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.chip}`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${event.done ? 'line-through' : ''}`}>{event.title}</span>
        <span className="block truncate text-[11px] capitalize text-muted-foreground">
          {showDate ? formatLongDate(event.date) : formatLongDate(event.date).split(' ')[0]}
          {event.estimated ? ' · beräknat' : ''}
          {event.detail ? ` · ${event.detail}` : ''}
        </span>
      </span>
      {event.warning && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-label="Varning" />}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export default function CalendarAgendaView({ today, zone, weeks = 8, events, showGuide, onSelectDay }: Props) {
  const overdue = useMemo(
    () => events.filter((e) => e.kind === 'reminder' && !e.done && e.date < today),
    [events, today],
  );

  const blocks = useMemo(() => {
    const start = mondayOf(today);
    return Array.from({ length: weeks }, (_, i) => {
      const monday = addDays(start, i * 7);
      const sunday = addDays(monday, 6);
      const from = i === 0 ? today : monday;
      const week = isoWeekOfKey(monday);
      return {
        monday,
        week,
        events: events.filter((e) => e.date >= from && e.date <= sunday),
        guide: getWeekGuide(zone, week),
      };
    });
  }, [events, today, weeks, zone]);

  return (
    <div className="space-y-5">
      {overdue.length > 0 && (
        <section className="rounded-[1.35rem] border border-destructive/25 bg-destructive/5 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive"><AlertTriangle className="h-4 w-4" /> {overdue.length} {overdue.length === 1 ? 'uppgift är försenad' : 'uppgifter är försenade'}</h3>
          <div className="mt-3 space-y-2">{overdue.map((event) => <EventRow key={event.id} event={event} onSelectDay={onSelectDay} showDate />)}</div>
        </section>
      )}

      {blocks.map((block, index) => (
        <section key={block.monday} className="rounded-[1.35rem] border border-border/70 bg-card/60 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-serif text-lg">
              {index === 0 ? 'Den här veckan' : index === 1 ? 'Nästa vecka' : `Vecka ${block.week}`}
              <span className="ml-2 text-xs font-sans font-medium text-muted-foreground">v.{block.week} · {formatWeekRange(block.monday)}</span>
            </h3>
          </div>

          <div className="mt-3 space-y-2">
            {block.events.length === 0 && <p className="text-sm text-muted-foreground">Inget i din egen odling den här veckan.</p>}
            {block.events.map((event) => <EventRow key={event.id} event={event} onSelectDay={onSelectDay} />)}
          </div>

          {showGuide && block.guide.total > 0 && (
            <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
              {GUIDE_ORDER.map((activity) => {
                const crops = block.guide[activity];
                if (!crops.length) return null;
                return (
                  <div key={activity} className="flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${GUIDE_STYLE[activity].soft}`}>{GUIDE_STYLE[activity].label}</span>
                    {crops.map((crop) => (
                      <button
                        key={crop.name}
                        type="button"
                        onClick={() => onSelectDay(index === 0 ? today : block.monday)}
                        className={`rounded-full border px-2 py-0.5 text-xs transition-colors hover:border-primary/40 ${crop.closesNow ? 'border-destructive/40 text-destructive' : 'border-border/70 text-foreground/80'}`}
                        title={crop.closesNow ? 'Sista veckan i fönstret' : `v.${crop.startWeek}–${crop.endWeek}`}
                      >
                        {crop.name}{crop.closesNow ? ' · sista v.' : ''}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
