import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Download, Eye, EyeOff, ListTodo, MapPin, Snowflake, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Seo } from '@/hooks/useSeo';
import { api } from '@/lib/api';
import { seedRpc } from '@/lib/seedPlans';
import { addReminder } from '@/lib/reminders';
import { localDateKey } from '@/lib/gardenToday';
import { buildStatusPatch } from '@/lib/sowingLifecycle';
import { isNativeApp } from '@/lib/native';
import { getGardenForecast } from '@/lib/gardenWeather';
import { guideCropForName } from '@/lib/sowingGuide';
import { ZONE_LAST_FROST_WEEK, ZONE_SEASON_END_WEEK } from '@/data/sowingMatrix';
import {
  addDays,
  buildCalendarEvents,
  buildForecastFrostEvents,
  buildIcs,
  cropNameForSowing,
  forecastByDate,
  getWeekGuide,
  groupEventsByDate,
  isoWeekOfKey,
  lastYearSameWeek,
  MONTHS_SV,
  summarizeEvents,
  type CalendarEvent,
  type CalendarHarvest,
  type CalendarReminder,
  type CalendarSowing,
  type SeasonPlanItem,
} from '@/lib/gardenCalendar';
import CalendarMonthView from '@/components/calendar/CalendarMonthView';
import CalendarAgendaView from '@/components/calendar/CalendarAgendaView';
import CalendarYearWheel from '@/components/calendar/CalendarYearWheel';
import CalendarDayPanel, { type DayPanelActions } from '@/components/calendar/CalendarDayPanel';
import CalendarSeasonPlanner from '@/components/calendar/CalendarSeasonPlanner';
import CalendarSyncDialog from '@/components/calendar/CalendarSyncDialog';
import { EVENT_STYLE, type CalendarLayer } from '@/components/calendar/calendarStyles';

type View = 'month' | 'agenda' | 'year';

const LAYERS: { key: CalendarLayer; label: string }[] = [
  { key: 'mine', label: 'Min odling' },
  { key: 'tasks', label: 'Uppgifter' },
  { key: 'guide', label: 'Såguide & frost' },
];

const LEGEND: { kind: CalendarEvent['kind']; label: string }[] = [
  { kind: 'sown', label: 'Sådd' },
  { kind: 'transplanted', label: 'Utplanterad' },
  { kind: 'harvested', label: 'Skördat' },
  { kind: 'harvest-expected', label: 'Beräknad skörd' },
  { kind: 'plant-out-due', label: 'Plantera ut' },
  { kind: 'succession', label: 'Nästa omgång' },
  { kind: 'reminder', label: 'Påminnelse' },
  { kind: 'frost', label: 'Frost & säsong' },
];

const VIEW_STORAGE_KEY = 'odlingskalender:view';

function readView(): View {
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'month' || stored === 'agenda' || stored === 'year') return stored;
  } catch { /* privat läge */ }
  return 'month';
}

async function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  if (isNativeApp()) {
    const { shareNativeFile } = await import('@/lib/nativeExport');
    await shareNativeFile(blob, filename);
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SowingCalendar() {
  const navigate = useNavigate();
  const location = useLocation();
  // Från en såtidssida eller zonväljaren: { planCrops?: string[]; zone?: number }.
  const [entryIntent] = useState(() => {
    const state = (location.state ?? {}) as { planCrops?: unknown; zone?: unknown };
    const zone = Number(state.zone);
    const crops = Array.isArray(state.planCrops)
      ? state.planCrops.map((crop) => guideCropForName(String(crop))?.name).filter((crop): crop is string => !!crop)
      : [];
    return { zone: zone >= 1 && zone <= 8 ? Math.round(zone) : null, crops };
  });
  const queryClient = useQueryClient();
  const today = localDateKey();
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }));
  const [view, setViewState] = useState<View>(readView);
  const [layers, setLayers] = useState<Record<CalendarLayer, boolean>>({ mine: true, tasks: true, guide: true });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [zoneOverride, setZoneOverride] = useState<number | null>(entryIntent.zone);
  const [plannerOpen, setPlannerOpen] = useState(entryIntent.crops.length > 0);
  const [syncOpen, setSyncOpen] = useState(false);

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const { data: sowingsRaw, isLoading: loadingSowings } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: harvestsRaw } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });
  const { data: reminderData } = useQuery({ queryKey: ['reminder-settings'], queryFn: api.getReminderSettings });

  const profileZone = profile?.climate_zone ?? null;
  const zone = zoneOverride ?? profileZone ?? 3;
  // Samma nyckel som startsidan, så prognosen delas i cachen.
  const lat = profile?.location_lat;
  const lon = profile?.location_lon;
  const { data: forecast } = useQuery({
    queryKey: ['garden-forecast', profileZone ?? 3, lat, lon],
    queryFn: () => getGardenForecast(profileZone ?? 3, { lat, lon }),
    enabled: !!profile,
    staleTime: 600_000,
    retry: 1,
  });
  const weatherByDate = useMemo(() => forecastByDate(forecast), [forecast]);
  const sowings = useMemo(() => (sowingsRaw ?? []) as unknown as (CalendarSowing & { bed_id?: string | null })[], [sowingsRaw]);
  const harvests = useMemo(() => (harvestsRaw ?? []) as unknown as CalendarHarvest[], [harvestsRaw]);
  const reminders = useMemo(
    () => (((reminderData?.settings as { reminders?: CalendarReminder[] } | null)?.reminders) ?? []).filter((r) => r && r.id),
    [reminderData],
  );

  const setView = (next: View) => {
    setViewState(next);
    try { localStorage.setItem(VIEW_STORAGE_KEY, next); } catch { /* privat läge */ }
  };

  // Ett generöst fönster: hela det visade året plus agendans åtta veckor framåt.
  const range = useMemo(() => {
    const yearEnd = `${cursor.year}-12-31`;
    const agendaEnd = addDays(today, 63);
    return {
      // Förra året följer med så att dagspanelen kan visa "samma vecka förra året".
      from: `${Math.min(cursor.year, Number(today.slice(0, 4))) - 1}-01-01`,
      to: addDays(agendaEnd > yearEnd ? agendaEnd : yearEnd, 7),
    };
  }, [cursor.year, today]);

  const allEvents = useMemo(
    () => [
      ...buildCalendarEvents({ zone, from: range.from, to: range.to, today, sowings, harvests, reminders }),
      ...buildForecastFrostEvents(forecast, sowings),
    ].sort((a, b) => a.date.localeCompare(b.date)),
    [zone, range, today, sowings, harvests, reminders, forecast],
  );

  const visibleEvents = useMemo(
    () => allEvents.filter((event) => {
      const layer = EVENT_STYLE[event.kind].layer;
      return layer === 'climate' ? layers.guide : layers[layer];
    }),
    [allEvents, layers],
  );
  const eventsByDate = useMemo(() => groupEventsByDate(visibleEvents), [visibleEvents]);

  const summary = useMemo(
    () => summarizeEvents(allEvents.filter((e) => e.date.startsWith(String(cursor.year))), today),
    [allEvents, cursor.year, today],
  );

  const closingSoon = useMemo(() => {
    const guide = getWeekGuide(zone, isoWeekOfKey(today));
    return [...guide.forodla, ...guide.direktsa].filter((c) => c.closesNow);
  }, [zone, today]);

  const mySowDates = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const sowing of sowings) {
      const crop = cropNameForSowing(sowing);
      if (!crop || !sowing.sow_date) continue;
      const list = map.get(crop) ?? [];
      if (sowing.sow_date.startsWith(String(cursor.year))) list.push(sowing.sow_date);
      map.set(crop, list);
    }
    return map;
  }, [sowings, cursor.year]);

  const suggestedCrops = useMemo(() => [...new Set([...entryIntent.crops, ...mySowDates.keys()])], [entryIntent.crops, mySowDates]);

  // Avsikten ska bara gälla en gång – inte efter en omladdning eller bakåtknapp.
  useEffect(() => {
    if (entryIntent.zone || entryIntent.crops.length) navigate(location.pathname, { replace: true, state: null });
  }, [entryIntent, navigate, location.pathname]);
  const existingPlanKeys = useMemo(
    () => new Set(reminders.map((r) => (r as { source_action_id?: string }).source_action_id).filter((key): key is string => !!key)),
    [reminders],
  );

  // ─── Mutationer ────────────────────────────────────────────────────────
  const reminderChange = useMutation({
    mutationFn: (change: { action: string; item: Record<string, unknown>; expected?: CalendarReminder }) =>
      seedRpc('change_garden_reminder', { p_action: change.action, p_item: change.item, p_expected: change.expected || null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminder-settings'] }),
    onError: (error: Error) => toast({ title: 'Kunde inte spara', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const transplant = useMutation({
    mutationFn: (sowing: CalendarSowing) => api.updateSowing(sowing.id, buildStatusPatch(sowing, 'transplanted', today)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sowings'] });
      toast({ title: 'Utplanterad 🌱', description: 'Datumet är sparat i sålogg och dagbok.' });
    },
    onError: (error: Error) => toast({ title: 'Kunde inte spara', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const saveZone = useMutation({
    mutationFn: (z: number) => api.updateProfile({ climate_zone: z }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setZoneOverride(null);
      toast({ title: 'Zonen är sparad', description: 'Påminnelser, tips och Gro använder nu samma zon.' });
    },
    onError: (error: Error) => toast({ title: 'Kunde inte spara zonen', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const actions: DayPanelActions = {
    busy: reminderChange.isPending || transplant.isPending,
    toggleReminder: (id) => {
      const target = reminders.find((r) => r.id === id);
      if (!target || reminderChange.isPending) return;
      reminderChange.mutate({ action: 'replace', expected: target, item: { ...target, done: !target.done, completed_at: target.done ? null : new Date().toISOString() } });
    },
    addReminder: async (title, date, extra = {}) => {
      const ok = await addReminder({ title, date, type: extra.type ?? 'other', sowing_id: extra.sowing_id ?? null, source: 'calendar' });
      if (ok) {
        await queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
        toast({ title: 'Påminnelse sparad 🔔', description: `${title} · ${date}` });
      } else {
        toast({ title: 'Kunde inte spara påminnelsen', description: 'Kontrollera anslutningen och försök igen.', variant: 'destructive' });
      }
      return ok;
    },
    markTransplanted: (sowingId) => {
      const sowing = sowings.find((s) => s.id === sowingId);
      if (sowing && !transplant.isPending) transplant.mutate(sowing);
    },
    openSowing: (sowingId) => navigate('/app/sowings', { state: { sowingId } }),
    logSowing: (crop, date, type) => navigate('/app/sowings', { state: { prefill: { variety: crop, sow_date: date, type } } }),
    logHarvest: (event) => {
      const sowing = sowings.find((s) => s.id === event.sowingId);
      navigate('/app/harvests', { state: { prefill: { variety: sowing?.variety ?? event.cropName ?? '', sowing_id: sowing?.id, bed_id: sowing?.bed_id ?? undefined } } });
    },
  };

  const moveReminder = (id: string, date: string) => {
    const target = reminders.find((r) => r.id === id);
    if (!target || target.date === date || reminderChange.isPending) return;
    reminderChange.mutate(
      { action: 'replace', expected: target, item: { ...target, date } },
      { onSuccess: () => toast({ title: 'Påminnelsen är flyttad', description: `${target.title} · ${date}` }) },
    );
  };

  const createSeasonPlan = async (items: SeasonPlanItem[], onProgress: (done: number) => void) => {
    let created = 0;
    for (const item of items) {
      const ok = await addReminder({ title: item.title, date: item.date, type: item.type, source_action_id: item.key, source: 'season-plan' });
      if (!ok) break;
      created += 1;
      onProgress(created);
    }
    await queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
    if (created === items.length) {
      toast({ title: `Säsongen är planerad 🌱`, description: `${created} påminnelser ligger nu i kalendern och påminnelselistan.` });
    } else {
      toast({ title: 'Planen sparades bara delvis', description: `${created} av ${items.length} påminnelser sparades. Försök igen – det som redan finns läggs inte in två gånger.`, variant: 'destructive' });
    }
    return created;
  };

  const exportIcs = useCallback(async () => {
    const events = buildCalendarEvents({ zone, from: `${cursor.year}-01-01`, to: `${cursor.year + 1}-12-31`, today, sowings, harvests, reminders });
    try {
      await downloadFile(buildIcs(events, { calendarName: `Odlingsdagboken – zon ${zone}` }), `odlingskalender-${cursor.year}.ics`, 'text/calendar;charset=utf-8');
      toast({ title: 'Kalenderfil skapad 📅', description: 'Öppna filen för att lägga in sådder, skördar och uppgifter i Google, Apple eller Outlook.' });
    } catch {
      toast({ title: 'Exporten misslyckades', description: 'Försök igen om en stund.', variant: 'destructive' });
    }
  }, [zone, cursor.year, today, sowings, harvests, reminders]);

  const stepMonth = (delta: number) => {
    setCursor(({ year, month }) => {
      const index = year * 12 + (month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
  };
  const goToday = () => setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });

  const selectedEvents = selectedDay ? eventsByDate.get(selectedDay) ?? [] : [];
  const selectedGuide = selectedDay ? getWeekGuide(zone, isoWeekOfKey(selectedDay)) : null;
  const periodLabel = view === 'year' ? String(cursor.year) : `${MONTHS_SV[cursor.month - 1]} ${cursor.year}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in">
      <Seo
        title={`Odlingskalender zon ${zone} – Odlingsdagboken`}
        description={`Din personliga odlingskalender för klimatzon ${zone}: sådder, utplantering, beräknad skörd och påminnelser på ett ställe.`}
        path="/app/calendar"
      />

      <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Din säsong, dag för dag</span>
            <h1 className="page-title">Odlingskalender</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Dina sådder, utplanteringar och skördar tillsammans med påminnelser och zonens såfönster. Datum märkta ”beräknat” räknar kalendern fram från din egen såddag.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(zone)} onValueChange={(v) => setZoneOverride(Number(v))}>
              <SelectTrigger className="w-32" aria-label="Klimatzon"><MapPin className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((z) => <SelectItem key={z} value={String(z)}>Zon {z}</SelectItem>)}
              </SelectContent>
            </Select>
            {zoneOverride != null && zoneOverride !== profileZone && (
              <Button variant="outline" size="sm" disabled={saveZone.isPending} onClick={() => saveZone.mutate(zoneOverride)}>Spara som min zon</Button>
            )}
            <Button className="gap-2" onClick={() => setPlannerOpen(true)}>
              <Wand2 className="h-4 w-4" /> Planera säsongen
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setSyncOpen(true)} disabled={loadingSowings}>
              <Download className="h-4 w-4" /> Till min kalender
            </Button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="metric-card p-3 sm:p-4">
            <p className={`text-2xl font-bold ${summary.overdue ? 'text-destructive' : ''}`}>{summary.openTasks}</p>
            <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">öppna uppgifter{summary.overdue ? ` · ${summary.overdue} sena` : ''}</p>
          </div>
          <div className="metric-card p-3 sm:p-4"><p className="text-2xl font-bold text-primary">{summary.upcomingHarvests}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">skördar på väg</p></div>
          <div className="metric-card p-3 sm:p-4"><p className="text-2xl font-bold">{summary.sown}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">sådder {cursor.year}</p></div>
          <div className="metric-card p-3 sm:p-4"><p className="text-2xl font-bold">{summary.harvested}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">skördetillfällen {cursor.year}</p></div>
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-400/12 px-3 py-1 text-blue-900 dark:text-blue-200">
            <Snowflake className="h-3.5 w-3.5" /> Zon {zone}: frostfritt normalt efter v.{ZONE_LAST_FROST_WEEK[zone]}, säsongen slutar runt v.{ZONE_SEASON_END_WEEK[zone]}
          </span>
          {closingSoon.length > 0 && (
            <button type="button" onClick={() => setSelectedDay(today)} className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 font-medium text-destructive hover:bg-destructive/15">
              Sista veckan att så: {closingSoon.slice(0, 4).map((c) => c.name.toLowerCase()).join(', ')}{closingSoon.length > 4 ? ' …' : ''}
            </button>
          )}
        </div>
      </section>

      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <TabsList>
            <TabsTrigger value="month" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Månad</TabsTrigger>
            <TabsTrigger value="agenda" className="gap-1.5"><ListTodo className="h-4 w-4" /> Agenda</TabsTrigger>
            <TabsTrigger value="year" className="gap-1.5"><CalendarRange className="h-4 w-4" /> Årshjul</TabsTrigger>
          </TabsList>

          {view !== 'agenda' && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => stepMonth(view === 'year' ? -12 : -1)} aria-label="Föregående"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-[9rem] text-center font-serif text-lg first-letter:uppercase">{periodLabel}</span>
              <Button variant="ghost" size="icon" onClick={() => stepMonth(view === 'year' ? 12 : 1)} aria-label="Nästa"><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={goToday}>Idag</Button>
            </div>
          )}
        </div>

        {view !== 'year' && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {LAYERS.map((layer) => (
              <button
                key={layer.key}
                type="button"
                aria-pressed={layers[layer.key]}
                onClick={() => setLayers((prev) => ({ ...prev, [layer.key]: !prev[layer.key] }))}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${layers[layer.key] ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground'}`}
              >
                {layers[layer.key] ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {layer.label}
              </button>
            ))}
          </div>
        )}

        <TabsContent value="month" className="mt-4 space-y-3">
          {loadingSowings ? <Skeleton className="h-[520px] rounded-[1.35rem]" /> : (
            <CalendarMonthView
              year={cursor.year}
              month={cursor.month}
              zone={zone}
              today={today}
              eventsByDate={eventsByDate}
              weatherByDate={weatherByDate}
              showGuide={layers.guide}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onMoveReminder={moveReminder}
            />
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            {LEGEND.map((item) => (
              <span key={item.kind} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${EVENT_STYLE[item.kind].dot}`} /> {item.label}</span>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agenda" className="mt-4">
          {loadingSowings ? <Skeleton className="h-96 rounded-[1.35rem]" /> : (
            <CalendarAgendaView today={today} zone={zone} events={visibleEvents} showGuide={layers.guide} onSelectDay={setSelectedDay} />
          )}
        </TabsContent>

        <TabsContent value="year" className="mt-4">
          <CalendarYearWheel
            year={cursor.year}
            zone={zone}
            today={today}
            mySowDates={mySowDates}
            onPickCrop={(crop) => {
              const indoorNow = getWeekGuide(zone, isoWeekOfKey(today)).forodla.some((c) => c.name === crop);
              actions.logSowing(crop, today, indoorNow ? 'indoor' : 'direct');
            }}
          />
        </TabsContent>
      </Tabs>

      <CalendarDayPanel
        key={selectedDay ?? 'closed'}
        date={selectedDay}
        today={today}
        events={selectedEvents}
        guide={selectedGuide}
        weather={selectedDay ? weatherByDate.get(selectedDay) : null}
        memories={selectedDay ? lastYearSameWeek(allEvents, selectedDay) : []}
        showGuide={layers.guide}
        onClose={() => setSelectedDay(null)}
        actions={actions}
      />

      <CalendarSyncDialog open={syncOpen} onOpenChange={setSyncOpen} onDownload={() => void exportIcs()} />

      {plannerOpen && (
        <CalendarSeasonPlanner
          open={plannerOpen}
          onOpenChange={setPlannerOpen}
          zone={zone}
          today={today}
          suggestedCrops={suggestedCrops}
          existingKeys={existingPlanKeys}
          onCreate={createSeasonPlan}
        />
      )}
    </div>
  );
}
