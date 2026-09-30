import { useState } from 'react';
import { AlertTriangle, Bell, Check, ChevronRight, CloudSun, History, Plus, Sprout } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  EVENT_KIND_LABEL,
  GUIDE_ACTIVITY_LABEL,
  formatLongDate,
  isoWeekOfKey,
  type CalendarEvent,
  type DayWeather,
  type GuideActivity,
  type WeekGuide,
} from '@/lib/gardenCalendar';
import { EVENT_STYLE, GUIDE_STYLE } from './calendarStyles';

export type DayPanelActions = {
  toggleReminder: (reminderId: string) => void;
  addReminder: (title: string, date: string, extra?: { type?: 'sowing' | 'transplant' | 'watering' | 'other'; sowing_id?: string }) => Promise<boolean>;
  markTransplanted: (sowingId: string) => void;
  openSowing: (sowingId: string) => void;
  logSowing: (crop: string, date: string, type: 'indoor' | 'direct') => void;
  logHarvest: (event: CalendarEvent) => void;
  busy: boolean;
};

type Props = {
  date: string | null;
  today: string;
  events: CalendarEvent[];
  guide: WeekGuide | null;
  weather?: DayWeather | null;
  /** Samma vecka förra året. */
  memories?: CalendarEvent[];
  showGuide: boolean;
  onClose: () => void;
  actions: DayPanelActions;
};

const GUIDE_ORDER: GuideActivity[] = ['forodla', 'direktsa', 'planteraUt', 'skorda'];

export default function CalendarDayPanel({ date, today, events, guide, weather, memories = [], showGuide, onClose, actions }: Props) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  if (!date) return null;
  const week = isoWeekOfKey(date);
  const isPast = date < today;
  const sowDate = isPast ? today : date;

  const submit = async () => {
    const text = title.trim();
    if (!text || saving) return;
    setSaving(true);
    const ok = await actions.addReminder(text, date);
    setSaving(false);
    if (ok) setTitle('');
  };

  return (
    <Sheet open={!!date} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">Vecka {week}{date === today ? ' · Idag' : ''}</span>
          <SheetTitle className="font-serif text-2xl first-letter:uppercase">{formatLongDate(date)}</SheetTitle>
          <SheetDescription>Allt som hänt, ska hända och brukar hända i din trädgård den här dagen.</SheetDescription>
        </SheetHeader>

        {weather && (
          <div className={`mt-4 flex items-center gap-3 rounded-2xl p-3 text-sm ${weather.min != null && weather.min <= 2 ? 'bg-blue-500/10 text-blue-900 dark:text-blue-200' : 'bg-muted/40'}`}>
            <CloudSun className="h-5 w-5 shrink-0" />
            <span>
              Prognos {weather.min != null ? `${Math.round(weather.min)}°`.replace('-', '−') : '–'} till {weather.max != null ? `${Math.round(weather.max)}°`.replace('-', '−') : '–'}
              {weather.precip ? ` · ${weather.precip.toLocaleString('sv-SE')} mm nederbörd` : ' · uppehåll'}
            </span>
          </div>
        )}

        <section className="mt-6 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">I din odling</h3>
          {events.length === 0 && <p className="rounded-2xl bg-muted/40 p-4 text-sm text-muted-foreground">Inget inplanerat. Lägg till en egen uppgift nedan{showGuide ? ' eller välj något ur veckans såguide' : ''}.</p>}
          {events.map((event) => {
            const style = EVENT_STYLE[event.kind];
            const Icon = style.icon;
            return (
              <div key={event.id} className={`rounded-2xl border border-border/60 bg-card/80 p-3 ${event.done ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  {event.kind === 'reminder' && event.reminderId ? (
                    <button
                      type="button"
                      onClick={() => actions.toggleReminder(event.reminderId!)}
                      disabled={actions.busy}
                      aria-label={event.done ? `Markera ${event.title} som ej klar` : `Markera ${event.title} som klar`}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${event.done ? 'border-primary bg-primary/15' : 'border-border hover:border-primary'}`}
                    >
                      {event.done && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  ) : (
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${style.chip}`}><Icon className="h-3.5 w-3.5" /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold ${event.done ? 'line-through' : ''}`}>{event.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {EVENT_KIND_LABEL[event.kind]}{event.estimated ? ' · beräknat' : ''}
                    </p>
                    {event.detail && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{event.detail}</p>}
                    {event.warning && (
                      <p className="mt-2 flex gap-1.5 rounded-xl bg-destructive/8 p-2 text-xs text-destructive"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{event.warning}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {event.kind === 'plant-out-due' && event.sowingId && (
                        <>
                          <Button size="sm" className="h-7 text-xs" disabled={actions.busy} onClick={() => actions.markTransplanted(event.sowingId!)}>Utplanterad idag</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actions.busy} onClick={() => void actions.addReminder(event.title, event.date, { type: 'transplant', sowing_id: event.sowingId })}><Bell className="h-3 w-3" /> Påminn mig</Button>
                        </>
                      )}
                      {event.kind === 'succession' && event.cropName && (
                        <>
                          <Button size="sm" className="h-7 text-xs" onClick={() => actions.logSowing(event.cropName!, event.date < today ? today : event.date, 'direct')}><Sprout className="h-3 w-3" /> Logga sådd</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={actions.busy} onClick={() => void actions.addReminder(event.title, event.date, { type: 'sowing' })}><Bell className="h-3 w-3" /> Påminn mig</Button>
                        </>
                      )}
                      {event.kind === 'harvest-expected' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => actions.logHarvest(event)}>Logga skörd</Button>
                      )}
                      {event.sowingId && event.kind !== 'plant-out-due' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => actions.openSowing(event.sowingId!)}>Öppna sådden <ChevronRight className="h-3 w-3" /></Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {memories.length > 0 && (
          <section className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.04] p-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-primary"><History className="h-3.5 w-3.5" /> Samma vecka förra året</h3>
            <ul className="mt-2 space-y-1">
              {memories.map((memory) => (
                <li key={memory.id} className="flex gap-2 text-sm">
                  <span className="shrink-0 tabular-nums text-muted-foreground">{Number(memory.date.slice(8, 10))}/{Number(memory.date.slice(5, 7))}</span>
                  <span className="min-w-0">{memory.title}{memory.detail ? <span className="text-muted-foreground"> · {memory.detail}</span> : null}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-5">
          <label htmlFor="calendar-quick-reminder" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ny uppgift den här dagen</label>
          <div className="mt-2 flex gap-2">
            <Input
              id="calendar-quick-reminder"
              maxLength={300}
              placeholder="T.ex. Gödsla tomaterna"
              value={title}
              disabled={saving}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            />
            <Button onClick={() => void submit()} disabled={!title.trim() || saving} aria-label="Lägg till uppgift"><Plus className="h-4 w-4" /></Button>
          </div>
        </section>

        {showGuide && guide && guide.total > 0 && (
          <section className="mt-7 space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Såguide v.{guide.week} · zon {guide.zone}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Från Odlingsdagbokens såmatris. Kontrollera alltid fröpåsen och jordtemperaturen.</p>
            </div>
            {GUIDE_ORDER.map((activity) => {
              const crops = guide[activity];
              if (!crops.length) return null;
              const canSow = activity === 'forodla' || activity === 'direktsa';
              if (activity === 'skorda') {
                return (
                  <div key={activity}>
                    <p className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${GUIDE_STYLE[activity].soft}`}>{GUIDE_ACTIVITY_LABEL[activity]} · {crops.length}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {crops.map((crop) => (
                        <span key={crop.name} className="rounded-full border border-border/70 px-2 py-0.5 text-xs" title={`v.${crop.startWeek}–${crop.endWeek}`}>{crop.name}</span>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <div key={activity}>
                  <p className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${GUIDE_STYLE[activity].soft}`}>{GUIDE_ACTIVITY_LABEL[activity]} · {crops.length}</p>
                  <div className="space-y-1.5">
                    {crops.map((crop) => (
                      <div key={`${activity}-${crop.name}`} className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            {crop.name}
                            {crop.closesNow && <Badge variant="destructive" className="h-4 px-1.5 text-[9px]">Sista veckan</Badge>}
                            {crop.opensNow && !crop.closesNow && <Badge className="h-4 px-1.5 text-[9px]">Startar nu</Badge>}
                          </div>
                          <p className="text-[11px] text-muted-foreground">v.{crop.startWeek}–{crop.endWeek}</p>
                        </div>
                        {canSow && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => actions.logSowing(crop.name, sowDate, activity === 'forodla' ? 'indoor' : 'direct')}>
                            <Sprout className="h-3 w-3" /> Så
                          </Button>
                        )}
                        {canSow && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={actions.busy}
                            aria-label={`Påminn mig att ${activity === 'forodla' ? 'förodla' : 'så'} ${crop.name.toLowerCase()}`}
                            onClick={() => void actions.addReminder(`${activity === 'forodla' ? 'Förodla' : 'Så'} ${crop.name.toLowerCase()}`, sowDate, { type: 'sowing' })}
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </SheetContent>
    </Sheet>
  );
}
