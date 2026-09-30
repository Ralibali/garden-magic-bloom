import { useMemo, useState, type DragEvent, type KeyboardEvent } from 'react';
import { Sprout } from 'lucide-react';
import { buildMonthGrid, formatLongDate, getWeekGuide, WEEKDAYS_SV, type CalendarEvent, type DayWeather } from '@/lib/gardenCalendar';
import { EVENT_STYLE } from './calendarStyles';

type Props = {
  year: number;
  month: number;
  zone: number;
  today: string;
  eventsByDate: Map<string, CalendarEvent[]>;
  weatherByDate?: Map<string, DayWeather>;
  showGuide: boolean;
  selectedDay: string | null;
  onSelectDay: (key: string) => void;
  /** Flytta en påminnelse genom att dra den till en annan dag. */
  onMoveReminder?: (reminderId: string, date: string) => void;
};

const MAX_CHIPS = 3;
const DRAG_TYPE = 'application/x-odlingsdagboken-reminder';

function temp(value: number | null) {
  return value == null ? '–' : `${Math.round(value)}°`.replace('-', '−');
}

export default function CalendarMonthView({ year, month, zone, today, eventsByDate, weatherByDate, showGuide, selectedDay, onSelectDay, onMoveReminder }: Props) {
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const sowCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const week of grid) {
      const guide = getWeekGuide(zone, week.week);
      counts.set(week.week, guide.forodla.length + guide.direktsa.length);
    }
    return counts;
  }, [grid, zone]);

  const onKey = (event: KeyboardEvent, key: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectDay(key);
    }
  };

  const onDrop = (event: DragEvent, key: string) => {
    const reminderId = event.dataTransfer.getData(DRAG_TYPE);
    setDropTarget(null);
    if (!reminderId || !onMoveReminder) return;
    event.preventDefault();
    onMoveReminder(reminderId, key);
  };

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
              const weather = weatherByDate?.get(day.key);
              const cold = weather?.min != null && weather.min <= 2;
              const isToday = day.key === today;
              const isSelected = day.key === selectedDay;
              const isDropTarget = dropTarget === day.key;
              const hidden = Math.max(0, events.length - MAX_CHIPS);
              return (
                <div
                  key={day.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectDay(day.key)}
                  onKeyDown={(e) => onKey(e, day.key)}
                  onDragOver={(e) => { if (onMoveReminder && e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); setDropTarget(day.key); } }}
                  onDragLeave={() => setDropTarget((current) => (current === day.key ? null : current))}
                  onDrop={(e) => onDrop(e, day.key)}
                  aria-label={`${formatLongDate(day.key)}${events.length ? ` – ${events.length} ${events.length === 1 ? 'händelse' : 'händelser'}` : ''}`}
                  aria-pressed={isSelected}
                  className={`group relative flex min-h-[64px] cursor-pointer flex-col items-stretch gap-1 border-r border-border/40 p-1 text-left outline-none transition-colors last:border-r-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:min-h-[104px] sm:p-1.5 ${day.inMonth ? 'bg-transparent' : 'bg-muted/25 text-muted-foreground/60'} ${isSelected ? 'bg-primary/10 ring-2 ring-inset ring-primary/50' : 'hover:bg-primary/5'} ${isDropTarget ? 'bg-sky-500/10 ring-2 ring-inset ring-sky-500/60' : ''}`}
                >
                  <span className="flex items-start justify-between gap-1">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${isToday ? 'bg-primary text-primary-foreground shadow-sm' : ''}`}>
                      {day.day}
                    </span>
                    {weather && (
                      <span
                        className={`rounded-md px-1 text-[9px] font-semibold leading-5 sm:text-[10px] ${cold ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300' : 'text-muted-foreground'}`}
                        title={`Prognos: ${temp(weather.min)} till ${temp(weather.max)}${weather.precip ? `, ${weather.precip.toLocaleString('sv-SE')} mm` : ''}`}
                      >
                        <span className="hidden sm:inline">{temp(weather.max)}/</span>{temp(weather.min)}
                      </span>
                    )}
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
                      const draggable = !!onMoveReminder && event.kind === 'reminder' && !!event.reminderId && !event.done;
                      return (
                        <span
                          key={event.id}
                          draggable={draggable}
                          onDragStart={draggable ? (e) => { e.stopPropagation(); e.dataTransfer.setData(DRAG_TYPE, event.reminderId!); e.dataTransfer.effectAllowed = 'move'; } : undefined}
                          onDragEnd={() => setDropTarget(null)}
                          title={draggable ? `${event.title} – dra till en annan dag för att flytta` : event.title}
                          className={`flex items-center gap-1 truncate rounded-md px-1 py-0.5 text-[10px] font-medium leading-tight ${style.chip} ${event.done ? 'line-through opacity-50' : ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
                        >
                          <Icon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{event.title}</span>
                        </span>
                      );
                    })}
                    {hidden > 0 && <span className="px-1 text-[10px] font-medium text-muted-foreground">+{hidden} till</span>}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
