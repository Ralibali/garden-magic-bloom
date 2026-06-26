import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BellPlus,
  Bot,
  Check,
  ChevronRight,
  Clock3,
  CloudSun,
  Droplets,
  Leaf,
  Snowflake,
  Sprout,
  SunMedium,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { recordProductActivity } from '@/lib/analytics';
import {
  addDaysToDateKey,
  buildGardenActions,
  GardenAction,
  GardenActionState,
  GardenReminder,
  localDateKey,
  visibleGardenActions,
} from '@/lib/gardenToday';

interface TodayInGardenProps {
  weather?: any;
  rainData?: { dryDays: number; totalPrecipitation: number } | null;
  climateZone: number;
  remindersData?: any;
  sowings?: any[];
  overduePlants?: any[];
  beds?: any[];
  displayName?: string;
}

const kindIcons = {
  reminder: BellPlus,
  watering: Droplets,
  weather: CloudSun,
  frost: Snowflake,
  sowing: Sprout,
  harvest: Leaf,
  start: SunMedium,
};

const priorityLabels = {
  urgent: 'Viktigt idag',
  today: 'Idag',
  soon: 'Bra att göra snart',
};

const priorityClasses = {
  urgent: 'border-destructive/25 bg-destructive/5 text-destructive',
  today: 'border-primary/20 bg-primary/7 text-primary',
  soon: 'border-border/70 bg-muted/45 text-muted-foreground',
};

export default function TodayInGarden({
  weather,
  rainData,
  climateZone,
  remindersData,
  sowings = [],
  overduePlants = [],
  beds = [],
  displayName,
}: TodayInGardenProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const settings = (remindersData?.settings as any) || {};
  const reminders = (settings.reminders || []) as GardenReminder[];
  const actionState = (settings.smart_action_state || {}) as Record<string, GardenActionState>;
  const today = localDateKey();
  const tomorrow = addDaysToDateKey(today, 1);

  const generatedActions = useMemo(
    () => buildGardenActions({ reminders, sowings, overduePlants, beds, weather, rainData, climateZone }),
    [reminders, sowings, overduePlants, beds, weather, rainData, climateZone],
  );
  const actions = useMemo(() => visibleGardenActions(generatedActions, actionState), [generatedActions, actionState]);
  const completedToday = Object.values(actionState).filter((state) => state.completedAt && localDateKey(new Date(state.completedAt)) === today).length;

  const saveMutation = useMutation({
    mutationFn: (nextSettings: any) => api.updateReminderSettings({ settings: { ...settings, ...nextSettings } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminder-settings'] }),
    onError: (error: any) => toast({ title: 'Kunde inte spara ändringen', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const completeAction = (action: GardenAction) => {
    const now = new Date().toISOString();
    const nextState = { ...actionState, [action.id]: { ...actionState[action.id], completedAt: now, snoozedUntil: undefined } };
    const nextReminders = action.sourceReminderId
      ? reminders.map((reminder) => reminder.id === action.sourceReminderId ? { ...reminder, done: true, completed_at: now } : reminder)
      : reminders;
    saveMutation.mutate({ smart_action_state: nextState, reminders: nextReminders });
    void recordProductActivity('smart_action_completed', { action_id: action.id, kind: action.kind });
    toast({ title: 'Klart för idag! 🌿', description: action.title });
  };

  const snoozeAction = (action: GardenAction) => {
    const nextState = { ...actionState, [action.id]: { ...actionState[action.id], snoozedUntil: tomorrow } };
    saveMutation.mutate({ smart_action_state: nextState });
    void recordProductActivity('smart_action_snoozed', { action_id: action.id, kind: action.kind });
    toast({ title: 'Flyttad till imorgon', description: action.title });
  };

  const addReminder = (action: GardenAction) => {
    const exists = reminders.some((reminder) => reminder.source_action_id === action.id && !reminder.done);
    if (exists) {
      toast({ title: 'Påminnelsen finns redan' });
      return;
    }
    const reminder: GardenReminder = {
      id: crypto.randomUUID(),
      title: action.title,
      type: action.reminderType,
      date: tomorrow,
      done: false,
      created_at: new Date().toISOString(),
      source_action_id: action.id,
    };
    saveMutation.mutate({ reminders: [...reminders, reminder] });
    void recordProductActivity('smart_action_reminder_created', { action_id: action.id, kind: action.kind });
    toast({ title: 'Påminnelse skapad för imorgon 🔔' });
  };

  const askGro = (action: GardenAction) => {
    void recordProductActivity('smart_action_opened_in_gro', { action_id: action.id, kind: action.kind });
    navigate('/app/gro', { state: { prompt: action.groPrompt, source: 'today_in_garden' } });
  };

  const visible = showAll ? actions : actions.slice(0, 4);
  const totalToday = actions.length + completedToday;
  const progress = totalToday ? Math.round((completedToday / totalToday) * 100) : 100;

  return (
    <section className="premium-panel overflow-hidden">
      <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
        <div className="botanical-panel relative p-5 sm:p-7">
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full border border-white/10 translate-x-1/3 -translate-y-1/3" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/70"><SunMedium className="h-3.5 w-3.5 text-lime-200" /> Idag i min odling</span>
              <h2 className="mt-5 font-serif text-3xl leading-tight text-white">{displayName ? `God morgon, ${displayName}.` : 'God morgon.'}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/65">Här är det som ger mest effekt i din odling idag, baserat på väder, historik och vad du redan har loggat.</p>
            </div>

            <div>
              <div className="flex items-end justify-between gap-4"><div><p className="text-4xl font-bold text-white tabular-nums">{completedToday}<span className="text-lg text-white/40">/{totalToday}</span></p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">dagens steg klara</p></div><p className="text-sm font-semibold text-lime-200">{progress}%</p></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-300 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
              <Button className="mt-5 w-full border border-white/12 bg-white/[0.08] text-white shadow-none hover:bg-white/[0.14]" onClick={() => navigate('/app/reminders')}><BellPlus className="h-4 w-4 text-lime-200" /> Se alla påminnelser</Button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {visible.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center px-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-primary/10 text-primary"><Check className="h-7 w-7" /></div>
              <h3 className="mt-5 font-serif text-2xl">Allt viktigt är klart</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Bra jobbat. Du kan dokumentera dagens förändringar med ett foto eller fråga Gro vad som är smartast att planera härnäst.</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button onClick={() => navigate('/app/photos')}><Leaf className="h-4 w-4" /> Lägg till foto</Button><Button variant="outline" onClick={() => navigate('/app/gro')}><Bot className="h-4 w-4" /> Fråga Gro</Button></div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 pb-1"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Prioriterat för dig</p><p className="mt-1 text-sm font-semibold">{actions.length} {actions.length === 1 ? 'sak' : 'saker'} att ta ställning till</p></div>{actions.some((action) => action.priority === 'urgent') && <AlertTriangle className="h-5 w-5 text-destructive" />}</div>

              {visible.map((action) => {
                const Icon = kindIcons[action.kind];
                return (
                  <article key={action.id} className="group rounded-[1.25rem] border border-border/65 bg-card/75 p-3.5 transition-all hover:border-primary/20 hover:shadow-[var(--card-shadow)] sm:p-4">
                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/9 text-primary"><Icon className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold leading-tight">{action.title}</h3><Badge variant="outline" className={priorityClasses[action.priority]}>{priorityLabels[action.priority]}</Badge></div>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">{action.description}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-3">
                      <Button size="sm" onClick={() => completeAction(action)} disabled={saveMutation.isPending}><Check className="h-3.5 w-3.5" /> Klar</Button>
                      <Button size="sm" variant="ghost" onClick={() => snoozeAction(action)} disabled={saveMutation.isPending}><Clock3 className="h-3.5 w-3.5" /> Imorgon</Button>
                      <Button size="sm" variant="ghost" onClick={() => addReminder(action)} disabled={saveMutation.isPending}><BellPlus className="h-3.5 w-3.5" /> Påminn</Button>
                      <Button size="sm" variant="ghost" onClick={() => askGro(action)}><Bot className="h-3.5 w-3.5" /> Fråga Gro</Button>
                      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => navigate(action.actionPath)}>{action.actionLabel} <ChevronRight className="h-3.5 w-3.5" /></Button>
                    </div>
                  </article>
                );
              })}

              {actions.length > 4 && <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowAll((current) => !current)}>{showAll ? 'Visa färre' : `Visa ${actions.length - 4} fler rekommendationer`} <ArrowRight className={`h-4 w-4 transition-transform ${showAll ? '-rotate-90' : 'rotate-90'}`} /></Button>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
