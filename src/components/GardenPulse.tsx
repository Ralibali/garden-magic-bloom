import React, { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bot, CalendarDays, Check, ChevronRight, Clock3, Leaf, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { buildGardenPulse, type PulseBucket, type PulseItem } from '@/lib/gardenPulse';

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
  };
}

function PulseRow({
  item,
  onComplete,
  onSnooze,
  onAskGro,
  pending,
}: {
  item: PulseItem;
  onComplete: (item: PulseItem) => void;
  onSnooze: (item: PulseItem) => void;
  onAskGro: (item: PulseItem) => void;
  pending: boolean;
}) {
  const navigate = useNavigate();
  return (
    <article className="rounded-2xl border border-border/65 bg-card/80 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{item.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{item.description}</p>
        </div>
        {item.bucket === 'late' && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => onComplete(item)} disabled={pending}><Check className="h-3.5 w-3.5" /> Klar</Button>
        <Button size="sm" variant="ghost" onClick={() => onSnooze(item)} disabled={pending}><Clock3 className="h-3.5 w-3.5" /> Imorgon</Button>
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
}: GardenPulseProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
    mutationFn: (nextSettings: any) => api.updateReminderSettings({ settings: { ...settings, ...nextSettings } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminder-settings'] }),
    onError: (error: any) => toast({ title: 'Kunde inte spara ändringen', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const completeItem = (item: PulseItem) => {
    const action = toAction(item);
    const now = new Date().toISOString();
    const nextState = { ...actionState, [action.id]: { ...actionState[action.id], completedAt: now, snoozedUntil: undefined } };
    const nextReminders = action.sourceReminderId
      ? reminders.map((reminder) => reminder.id === action.sourceReminderId ? { ...reminder, done: true, completed_at: now } : reminder)
      : reminders;
    saveMutation.mutate({ smart_action_state: nextState, reminders: nextReminders });
    void recordProductActivity('smart_action_completed', { action_id: action.id, kind: action.kind });
    toast({ title: 'Klart', description: action.title });
  };

  const snoozeItem = (item: PulseItem) => {
    const action = toAction(item);
    const nextState = { ...actionState, [action.id]: { ...actionState[action.id], snoozedUntil: addDaysToDateKey(localDateKey(), 1) } };
    saveMutation.mutate({ smart_action_state: nextState });
    void recordProductActivity('smart_action_snoozed', { action_id: action.id, kind: action.kind });
    toast({ title: 'Flyttad till imorgon', description: action.title });
  };

  const askGro = (item: PulseItem) => {
    void recordProductActivity('smart_action_opened_in_gro', { action_id: item.id, kind: item.kind });
    navigate('/app/gro', { state: { prompt: item.groPrompt, source: 'garden_pulse' } });
  };

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
                {items.map((item) => (
                  <PulseRow
                    key={item.id}
                    item={item}
                    onComplete={completeItem}
                    onSnooze={snoozeItem}
                    onAskGro={askGro}
                    pending={saveMutation.isPending}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
