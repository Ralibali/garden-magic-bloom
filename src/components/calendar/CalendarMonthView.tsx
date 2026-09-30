import { useMemo } from 'react';
import { Sprout } from 'lucide-react';
import { buildMonthGrid, formatLongDate, getWeekGuide, WEEKDAYS_SV, type CalendarEvent } from '@/lib/gardenCalendar';
import { EVENT_STYLE } from './calendarStyles';

type Props = {
  year: number;
  month: number;
  zone: number;
  today: string;
  eventsByDate: Map<string, CalendarEvent[]>;
  showGuide: boolean;
  selectedDay: string | null;
  onSelectDay: (key: string) => void;
};

const MAX_CHIPS = 3;

export default function CalendarMonthView({ year, month, zone, today, eventsByDate, showGuide, selectedDay, onSelectDay }: Props) {
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const sowCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const week of grid) {
      const guide = getWeekGuide(zone, week.week);
      counts.set(week.week, guide.forodla.length + guide.direktsa.length);
    }
    return counts;
  }, [grid, zone]);

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/80">
      <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] border-b border-border/70 bg-muted/35 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <div className="px-1 py-2 text-center">V.</div>
        {WEEKDAYS_SV.map((day) => <div key={day} className="px-1 py-2 text-center">{day}</div>)}
      </div>
      {grid.map((week) => {
        const sowCount = sowCounts.get(week.week) ?? 0;
        return (
          <div key={week.days[0].key} className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] border-b border-border/50 last:border-0">
            <button
              type="button"
              onClick={() => onSelectDay(week.days.find((d) => d.inMonth)?.key ?? week.days[0].key)}
              className="flex flex-col items-center gap-1 border-r border-border/50 bg-muted/20 px-0.5 py-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-primary/8 hover:text-primary"
              aria-label={`Vecka ${week.week}${showGuide && sowCount ? `, ${sowCount} grödor att så` : ''}`}
            >
              <span>{week.week}</span>
              {showGuide && sowCount > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/12 px-1 py-0.5 text-[9px] text-primary" title={`${sowCount} grödor att förodla eller så den här veckan`}>
                  <Sprout className="h-2.5 w-2.5" />{sowCount}
                </span>
              )}
            </button>
            {week.days.map((day) => {
              const events = eventsByDate.get(day.key) ?? [];
              const isToday = day.key === today;
              const isSelected = day.key === selectedDay;
              const hidden = Math.max(0, events.length - MAX_CHIPS);
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => onSelectDay(day.key)}
                  aria-label={`${formatLongDate(day.key)}${events.length ? ` – ${events.length} ${events.length === 1 ? 'händelse' : 'händelser'}` : ''}`}
                  aria-pressed={isSelected}
                  className={`group relative flex min-h-[64px] flex-col items-stretch gap-1 border-r border-border/40 p-1 text-left transition-colors last:border-r-0 sm:min-h-[104px] sm:p-1.5 ${day.inMonth ? 'bg-transparent' : 'bg-muted/25 text-muted-foreground/60'} ${isSelected ? 'bg-primary/10 ring-2 ring-inset ring-primary/50' : 'hover:bg-primary/5'}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-semibold ${isToday ? 'bg-primary text-primary-foreground shadow-sm' : ''}`}>
                    {day.day}
                  </span>
                  {/* Mobil: prickar. Större skärmar: små etiketter. */}
                  <span className="flex flex-wrap gap-0.5 sm:hidden">
                    {events.slice(0, 6).map((event) => (
                      <span key={event.id} className={`h-1.5 w-1.5 rounded-full ${EVENT_STYLE[event.kind].dot} ${event.done ? 'opacity-40' : ''}`} />
                    ))}
                  </span>
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {events.slice(0, MAX_CHIPS).map((event) => {
                      const style = EVENT_STYLE[event.kind];
                      const Icon = style.icon;
                      return (
                        <span key={event.id} className={`flex items-center gap-1 truncate rounded-md px-1 py-0.5 text-[10px] font-medium leading-tight ${style.chip} ${event.done ? 'line-through opacity-50' : ''}`}>
                          <Icon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{event.title}</span>
                        </span>
                      );
                    })}
                    {hidden > 0 && <span className="px-1 text-[10px] font-medium text-muted-foreground">+{hidden} till</span>}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
