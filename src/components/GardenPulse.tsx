import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bot, CalendarDays, Check, ChevronRight, Clock3, Leaf, MoreHorizontal, PencilLine, SunMedium, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { recordProductActivity } from '@/lib/analytics';
import {
  addDaysToDateKey,
  GardenAction,
  GardenActionState,
  GardenReminder,
  localDateKey,
} from '@/lib/gardenToday';
import { buildGardenPulse, getPulseLogTarget, type PulseBucket, type PulseItem } from '@/lib/gardenPulse';
import type { PulseWhy } from '@/lib/gardenToday';

const WHY_LABEL: Record<PulseWhy, string> = {
  user_data: 'Varför: din logg',
  weather: 'Varför: väderprognos',
  trusted: 'Varför: känd gröda',
  inference: 'Varför: tidsbaserad slutsats',
};

interface GardenPulseProps {
  weather?: any;
  rainData?: { dryDays: number; totalPrecipitation: number } | null;
  climateZone: number;
  remindersData?: any;
  sowings?: any[];
  overduePlants?: any[];
  beds?: any[];
  isLoading?: boolean;
  isError?: boolean;
  compact?: boolean;
}

const BUCKETS: { key: PulseBucket; title: string }[] = [
  { key: 'late', title: 'Saker som är sena' },
  { key: 'today', title: 'Idag' },
  { key: 'week', title: 'Den här veckan' },
];

function toAction(item: PulseItem): GardenAction {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    priority: item.bucket === 'late' ? 'urgent' : item.bucket === 'today' ? 'today' : 'soon',
    kind: item.kind,
    actionPath: item.actionPath,
    actionLabel: item.actionLabel,
    groPrompt: item.groPrompt,
    reminderType: item.reminderType,
    sourceReminderId: item.sourceReminderId,
    sourceSowingId: item.sourceSowingId,
    sourceBedId: item.sourceBedId,
    why: item.why,
  };
}

function PulseRow({
  item,
  onComplete,
  onSnooze,
  onAskGro,
  onLog,
  onDismiss,
  pending,
  compact = false,
}: {
  item: PulseItem;
  onComplete: (item: PulseItem) => void;
  onSnooze: (item: PulseItem) => void;
  onAskGro: (item: PulseItem) => void;
  onLog: (item: PulseItem) => void;
  onDismiss: (item: PulseItem) => void;
  pending: boolean;
  compact?: boolean;
}) {
  const navigate = useNavigate();
  if (compact) return <article className="border-b border-border/60 py-4 last:border-0">
    <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h3 className="font-sans text-sm font-semibold leading-relaxed">{item.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p></div>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={`Fler val för ${item.title}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuItem disabled={pending} onSelect={() => onSnooze(item)}><Clock3 className="mr-2 h-4 w-4" />Flytta till imorgon</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onLog(item)}><PencilLine className="mr-2 h-4 w-4" />Logga en händelse</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAskGro(item)}><Bot className="mr-2 h-4 w-4" />Fråga Gro</DropdownMenuItem>
        <DropdownMenuItem disabled={pending} onSelect={() => onDismiss(item)}><X className="mr-2 h-4 w-4" />Inte relevant</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" variant="outline" className="rounded-full" disabled={pending} onClick={() => onComplete(item)} aria-label={`Markera klar: ${item.title}`}><Check className="mr-1 h-3.5 w-3.5" />Klar</Button><Button size="sm" variant="ghost" className="h-auto min-h-9 whitespace-normal text-left" onClick={() => navigate(item.actionPath)}>{item.actionLabel}<ChevronRight className="ml-1 h-3.5 w-3.5 shrink-0" /></Button></div>
    <p className="mt-2 text-xs text-muted-foreground">{WHY_LABEL[item.why]}</p>
  </article>;
  return (
    <article className="rounded-2xl border border-border/65 bg-card/80 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{item.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{item.description}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80">{WHY_LABEL[item.why]}</p>
        </div>
        {item.bucket === 'late' && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => onComplete(item)} disabled={pending}><Check className="h-3.5 w-3.5" /> Klar</Button>
        <Button size="sm" variant="ghost" onClick={() => onLog(item)}><PencilLine className="h-3.5 w-3.5" /> Logga</Button>
        <Button size="sm" variant="ghost" onClick={() => onSnooze(item)} disabled={pending}><Clock3 className="h-3.5 w-3.5" /> Imorgon</Button>
        <Button size="sm" variant="ghost" onClick={() => onDismiss(item)} disabled={pending}><X className="h-3.5 w-3.5" /> Inte relevant</Button>
        <Button size="sm" variant="ghost" onClick={() => onAskGro(item)}><Bot className="h-3.5 w-3.5" /> Fråga Gro</Button>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => navigate(item.actionPath)}>
          {item.actionLabel} <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </article>
  );
}

export default function GardenPulse({
  weather,
  rainData,
  climateZone,
  remindersData,
  sowings = [],
  overduePlants = [],
  beds = [],
  isLoading = false,
  isError = false,
  compact = false,
}: GardenPulseProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const settings = (remindersData?.settings as any) || {};
  const reminders = useMemo(() => (settings.reminders || []) as GardenReminder[], [settings.reminders]);
  const actionState = useMemo(
    () => (settings.smart_action_state || {}) as Record<string, GardenActionState>,
    [settings.smart_action_state],
  );

  const pulse = useMemo(
    () => buildGardenPulse({
      reminders,
      sowings,
      overduePlants,
      beds,
      weather,
      rainData,
      climateZone,
      actionState,
    }),
    [reminders, sowings, overduePlants, beds, weather, rainData, climateZone, actionState],
  );

  const saveMutation = useMutation({
    mutationFn: (nextSettings: any) => api.updateReminderSettings({ settings: { ...settings, ...nextSettings } }, settings),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['reminder-settings'] }), queryClient.invalidateQueries({ queryKey: ['cultivations'] })]); },
    onError: (error: any) => toast({ title: 'Kunde inte spara ändringen', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const completeItem = (item: PulseItem) => {
    const action = toAction(item);
    const now = new Date().toISOString();
    const nextState = { ...actionState, [action.id]: { ...actionState[action.id], completedAt: now, snoozedUntil: undefined } };
    const nextReminders = action.sourceReminderId
      ? reminders.map((reminder) => reminder.id === action.sourceReminderId ? { ...reminder, done: true, completed_at: now } : reminder)
      : reminders;
    saveMutation.mutate({ smart_action_state: nextState, reminders: nextReminders }, { onSuccess: () => {
      void recordProductActivity('smart_action_completed', { action_id: action.id, kind: action.kind });
      toast({ title: 'Klart', description: action.title });
    } });
  };

  const snoozeItem = (item: PulseItem) => {
    const action = toAction(item);
    const nextState = { ...actionState, [action.id]: { ...actionState[action.id], snoozedUntil: addDaysToDateKey(localDateKey(), 1) } };
    saveMutation.mutate({ smart_action_state: nextState }, { onSuccess: () => {
      void recordProductActivity('smart_action_snoozed', { action_id: action.id, kind: action.kind });
      toast({ title: 'Flyttad till imorgon', description: action.title });
    } });
  };

  const askGro = (item: PulseItem) => {
    void recordProductActivity('smart_action_opened_in_gro', { action_id: item.id, kind: item.kind });
    navigate('/app/gro', { state: { prompt: item.groPrompt, source: 'garden_pulse' } });
  };

  const logItem = (item: PulseItem) => {
    void recordProductActivity('smart_action_log', { action_id: item.id, kind: item.kind });
    const target = getPulseLogTarget(item, sowings);
    navigate(target.path, { state: target.state });
  };

  const dismissItem = (item: PulseItem) => {
    const nextState = { ...actionState, [item.id]: { ...actionState[item.id], dismissedAt: new Date().toISOString() } };
    saveMutation.mutate({ smart_action_state: nextState }, { onSuccess: () => {
      void recordProductActivity('smart_action_dismissed', { action_id: item.id, kind: item.kind });
      toast({ title: 'Dold', description: item.title });
    } });
  };

  if (compact) {
    const all = [...pulse.late, ...pulse.today, ...pulse.week];
    const visible = expanded ? all : all.slice(0, 3);
    return <section className="garden-paper px-4" aria-label="Dagens uppgifter" aria-busy={isLoading}>
      {isLoading ? <p className="py-5 text-sm text-muted-foreground">Hämtar dagens uppgifter…</p>
        : isError ? <div role="alert" className="py-5"><p className="text-sm">Dagens lista kunde inte hämtas.</p><Button variant="link" className="mt-2 h-auto p-0" onClick={() => { void queryClient.invalidateQueries({ queryKey: ['cultivations'] }); void queryClient.invalidateQueries({ queryKey: ['reminder-settings'] }); }}>Försök igen</Button></div>
        : !all.length ? <div className="py-5"><Check className="mb-3 h-5 w-5 text-primary" /><h3 className="text-xl">En lugn stund.</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Inga uppgifter i din lista just nu. Titta till det som växer eller spara ett ögonblick i dagboken.</p></div>
        : <><p className="border-b border-border/60 py-3 text-xs text-muted-foreground">{all.length} {all.length === 1 ? 'uppgift' : 'uppgifter'} · idag och kommande veckan</p>{visible.map(item => <div key={item.id}><p className="pt-4 text-xs font-medium text-muted-foreground">{item.bucket === 'late' ? 'Att följa upp' : item.bucket === 'today' ? 'Idag' : 'Den här veckan'}</p><PulseRow item={item} onComplete={completeItem} onSnooze={snoozeItem} onAskGro={askGro} onLog={logItem} onDismiss={dismissItem} pending={saveMutation.isPending} compact /></div>)}{all.length > 3 && <Button variant="ghost" className="my-3 w-full" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? 'Visa färre' : `Visa alla ${all.length} uppgifter`}</Button>}</>}
    </section>;
  }

  if (isLoading) {
    return (
      <section className="premium-panel p-5 sm:p-6" aria-label="Garden Pulse" aria-busy="true">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Garden Pulse</p>
        <p className="mt-2 text-sm text-muted-foreground">Hämtar din odling…</p>
        <div className="mt-3 space-y-2">
          <div className="h-16 animate-pulse rounded-2xl bg-muted/60" />
          <div className="h-16 animate-pulse rounded-2xl bg-muted/40" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="premium-panel p-5 sm:p-6" aria-label="Garden Pulse">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Garden Pulse</p>
        <h2 className="mt-1 font-serif text-2xl leading-tight">Kunde inte läsa dagens lista.</h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Inget är påhittat. Öppna såloggen eller påminnelserna om du vill kolla manuellt.
        </p>
      </section>
    );
  }

  if (pulse.empty) {
    return (
      <section className="premium-panel p-5 sm:p-6" aria-label="Garden Pulse">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Check className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Garden Pulse</p>
            <h2 className="mt-1 font-serif text-2xl leading-tight">Inget viktigt just nu.</h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Inget är sent, inget måste göras idag, och inget är inbokat den här veckan. Dokumentera en förändring om du vill, eller låt trädgården vara.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/app/photos')}><Leaf className="h-4 w-4" /> Lägg till foto</Button>
              <Button size="sm" variant="ghost" onClick={() => navigate('/app/gro')}><Bot className="h-4 w-4" /> Fråga Gro</Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="premium-panel overflow-hidden" aria-label="Garden Pulse">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4 sm:px-6">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <SunMedium className="h-3.5 w-3.5" /> Garden Pulse
          </p>
          <h2 className="mt-1 font-serif text-2xl leading-tight">Vad som gäller nu</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{pulse.late.length} sena · {pulse.today.length} idag · {pulse.week.length} i veckan</span>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {BUCKETS.map((bucket) => {
          const items = pulse[bucket.key];
          if (!items.length) return null;
          return (
            <div key={bucket.key}>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{bucket.title}</h3>
              <div className="space-y-2">
                {(expanded ? items : items.slice(0, 4)).map((item) => (
                  <PulseRow
                    key={item.id}
                    item={item}
                    onComplete={completeItem}
                    onSnooze={snoozeItem}
                    onAskGro={askGro}
                    onLog={logItem}
                    onDismiss={dismissItem}
                    pending={saveMutation.isPending}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!expanded && [pulse.late, pulse.today, pulse.week].some(items => items.length > 4) && <Button variant="ghost" className="mb-4 ml-5" onClick={() => setExpanded(true)}>Visa alla uppgifter</Button>}
    </section>
  );
}
