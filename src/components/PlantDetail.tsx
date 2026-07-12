import React, { useMemo, useState } from 'react';
import { Activity, ArrowRightLeft, Brain, CheckCircle2, Droplets, Flame, Leaf, Scissors, Sparkles, Sprout, StickyNote, Sun } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import PlantCareCheckIn from '@/components/PlantCareCheckIn';
import PlantHealthRing from '@/components/PlantHealthRing';
import PlantMoodAvatar from '@/components/PlantMoodAvatar';
import { buildPlantCareProfile, PlantCareStatus } from '@/lib/plantCareIntelligence';
import { recordProductActivity } from '@/lib/analytics';

const LOG_TYPES = [
  { value: 'fertilized', label: '🌱 Gödslade', icon: Sprout },
  { value: 'repotted', label: '🪴 Planterade om', icon: ArrowRightLeft },
  { value: 'pruned', label: '✂️ Beskar', icon: Scissors },
  { value: 'moved', label: '🔆 Flyttade växten', icon: Sun },
  { value: 'note', label: '📝 Anteckning', icon: StickyNote },
];

const LOG_EMOJI: Record<string, string> = {
  watered: '💧', health_check: '🩺', fertilized: '🌱', repotted: '🪴', pruned: '✂️', moved: '🔆', note: '📝',
};

const STATUS_CLASSES: Record<PlantCareStatus, string> = {
  urgent: 'border-rose-300/40 bg-rose-100/65 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/35 dark:text-rose-300',
  due: 'border-amber-300/45 bg-amber-100/65 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-300',
  soon: 'border-lime-300/45 bg-lime-100/60 text-lime-800 dark:border-lime-800/50 dark:bg-lime-950/30 dark:text-lime-300',
  good: 'border-emerald-300/45 bg-emerald-100/60 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300',
};

interface PlantDetailProps {
  plant: any;
  plantName: string;
  open: boolean;
  onClose: () => void;
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Du behöver vara inloggad.');
  return user.id;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function eventTitle(event: any) {
  if (event.event_type === 'watered' || event.log_type === 'watered') return 'Vattnade efter jordkontroll';
  if (event.event_type === 'health_check' || event.log_type === 'health_check') return 'Kontrollerade hälsan';
  return LOG_TYPES.find(type => type.value === (event.event_type || event.log_type))?.label.replace(/^\S+\s/, '') || event.event_type || event.log_type || 'Anteckning';
}

function healthMessage(score: number) {
  if (score >= 88) return 'Mår fantastiskt';
  if (score >= 70) return 'Mår stabilt';
  if (score >= 50) return 'Behöver lite extra omsorg';
  return 'Behöver din uppmärksamhet';
}

export default function PlantDetail({ plant, plantName, open, onClose }: PlantDetailProps) {
  const queryClient = useQueryClient();
  const [logType, setLogType] = useState('note');
  const [logNote, setLogNote] = useState('');

  const { data: careEvents = [] } = useQuery({
    queryKey: ['plant-care-events', plant.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('plant_care_events' as any).select('*').eq('plant_id', plant.id).order('occurred_at', { ascending: false }).limit(100);
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: open,
  });

  const { data: wateringLogs = [] } = useQuery({
    queryKey: ['watering-log', plant.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('watering_log').select('*').eq('plant_id', plant.id).order('watered_at', { ascending: false }).limit(100);
      if (error) return [];
      return data || [];
    },
    enabled: open,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['plant-logs', plant.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('plant_logs').select('*').eq('plant_id', plant.id).order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const profile = useMemo(() => buildPlantCareProfile(plant, [
    ...careEvents,
    ...wateringLogs.map((event: any) => ({ ...event, event_type: 'watered' })),
  ]), [plant, careEvents, wateringLogs]);

  const timeline = useMemo(() => {
    const careItems = careEvents.map((event: any) => ({ ...event, timeline_at: event.occurred_at || event.created_at, source: 'care' }));
    const legacyItems = logs
      .filter((event: any) => !careEvents.length || !['watered', 'health_check'].includes(event.log_type))
      .map((event: any) => ({ ...event, timeline_at: event.created_at, source: 'legacy' }));
    return [...careItems, ...legacyItems].sort((a, b) => new Date(b.timeline_at).getTime() - new Date(a.timeline_at).getTime()).slice(0, 50);
  }, [careEvents, logs]);

  const addLogMutation = useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      const { error } = await supabase.from('plant_logs').insert({ user_id: userId, plant_id: plant.id, log_type: logType, note: logNote.trim() || null } as any);
      if (error) throw error;
      if (logType === 'fertilized') await supabase.from('my_plants').update({ last_fertilized: new Date().toISOString().slice(0, 10) }).eq('id', plant.id);
      void recordProductActivity('plant_care_note_added', { plant_id: plant.id, log_type: logType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-logs', plant.id] });
      queryClient.invalidateQueries({ queryKey: ['my-plants'] });
      setLogNote('');
      toast({ title: 'Händelsen är sparad' });
    },
    onError: (error: any) => toast({ title: 'Kunde inte spara', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const dueLabel = profile.daysUntilWater === null
    ? 'Gör första kontrollen'
    : profile.daysUntilWater <= 0
      ? 'Kontrollera idag'
      : `Nästa kontroll om cirka ${profile.daysUntilWater} ${profile.daysUntilWater === 1 ? 'dag' : 'dagar'}`;

  return (
    <Dialog open={open} onOpenChange={next => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[94vh] max-w-3xl overflow-y-auto rounded-[2rem] p-0">
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_20%_15%,rgba(190,242,100,.2),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(52,211,153,.22),transparent_36%),linear-gradient(135deg,#0e3a2a_0%,#174b38_54%,#24664d_100%)] p-5 sm:p-7">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <DialogHeader className="relative text-left">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <PlantMoodAvatar score={profile.healthScore} status={profile.status} size="lg" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-lime-200/75">Min levande profil</p>
                  <DialogTitle className="mt-1 font-serif text-3xl text-white sm:text-4xl">{plantName}</DialogTitle>
                  {plant.location && <p className="mt-1 text-sm text-white/58">{plant.location}</p>}
                  <div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline" className="border-white/15 bg-white/[0.08] text-white">{profile.confidenceLabel}</Badge>{profile.careStreak >= 2 && <Badge variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-100"><Flame className="mr-1 h-3 w-3" /> {profile.careStreak} i rytm</Badge>}</div>
                </div>
              </div>
              <PlantHealthRing score={profile.healthScore} size="lg" label="hälsa" />
            </div>
          </DialogHeader>

          <div className="relative mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.065] p-3 backdrop-blur-sm"><p className="text-xl font-bold text-white sm:text-2xl">{profile.recommendedIntervalDays}</p><p className="text-[9px] uppercase tracking-[0.12em] text-white/45">dagars rytm</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.065] p-3 backdrop-blur-sm"><p className="text-xl font-bold text-white sm:text-2xl">{profile.wateringsCount + profile.observationsCount}</p><p className="text-[9px] uppercase tracking-[0.12em] text-white/45">lärpunkter</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.065] p-3 backdrop-blur-sm"><p className="text-xl font-bold text-white sm:text-2xl">{profile.knowledgeLevel}</p><p className="text-[9px] uppercase tracking-[0.12em] text-white/45">kunskapsnivå</p></div>
          </div>
        </div>

        <div className="space-y-5 bg-[radial-gradient(circle_at_10%_0%,hsl(var(--primary)/.06),transparent_32%),hsl(var(--background))] p-5 sm:p-7">
          <section className="grid gap-4 rounded-[1.6rem] border border-border/60 bg-card/82 p-4 shadow-[0_18px_44px_-32px_rgba(16,85,48,.4)] sm:grid-cols-[1fr_auto] sm:p-5">
            <div>
              <Badge variant="outline" className={STATUS_CLASSES[profile.status]}>{profile.statusLabel}</Badge>
              <h2 className="mt-3 font-serif text-2xl">{healthMessage(profile.healthScore)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{profile.reason}</p>
              <div className="mt-4 rounded-2xl border border-primary/12 bg-primary/6 p-3.5"><p className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Droplets className="h-3.5 w-3.5" /> {dueLabel}</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{profile.recommendation}</p></div>
              <PlantCareCheckIn plant={plant} plantName={plantName} profile={profile} trigger={<Button className="mt-4 w-full gap-2 rounded-xl shadow-sm sm:w-auto"><Activity className="h-4 w-4" /> Kolla jord och hälsa</Button>} />
            </div>
            <div className="hidden items-center sm:flex"><PlantHealthRing score={profile.healthScore} size="md" /></div>
          </section>

          <section className="rounded-[1.6rem] border border-border/60 bg-card/72 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold"><Brain className="h-4 w-4 text-violet-500" /> Växtens personliga rytm</p><p className="mt-1 text-xs text-muted-foreground">Art, placering, årstid och dina observationer vägs ihop.</p></div><span className="rounded-full bg-primary/9 px-3 py-1 text-xs font-bold text-primary">Nivå {profile.knowledgeLevel}</span></div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 to-amber-300 transition-all duration-700" style={{ width: `${profile.knowledgeProgress}%` }} /></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-2xl border border-border/50 bg-muted/28 p-3"><p className="text-muted-foreground">Artens startvärde</p><p className="mt-1 font-semibold">{profile.baseIntervalDays} dagar</p></div><div className="rounded-2xl border border-border/50 bg-muted/28 p-3"><p className="text-muted-foreground">Historiskt hos dig</p><p className="mt-1 font-semibold">{profile.historicalIntervalDays ? `${profile.historicalIntervalDays} dagar` : 'Lär sig fortfarande'}</p></div></div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> {profile.knowledgeLabel}: {profile.observationsCount} hälsokontroller och {profile.wateringsCount} registrerade vattningar.</p>
          </section>

          <section className="rounded-[1.6rem] border border-border/60 bg-card/72 p-4 sm:p-5">
            <p className="text-sm font-semibold">Lägg till en annan händelse</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]"><Select value={logType} onValueChange={setLogType}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{LOG_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select><Input className="rounded-xl" placeholder="Kort anteckning (valfritt)" value={logNote} onChange={event => setLogNote(event.target.value)} /><Button className="rounded-xl" onClick={() => addLogMutation.mutate()} disabled={addLogMutation.isPending}><CheckCircle2 className="h-4 w-4" /> Spara</Button></div>
          </section>

          <section>
            <div className="flex items-center justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> Omsorgshistorik</p><p className="mt-1 text-xs text-muted-foreground">Växtens egen berättelse, kontroll för kontroll.</p></div><span className="text-xs text-muted-foreground">{timeline.length} händelser</span></div>
            {!timeline.length ? (
              <div className="mt-4 rounded-[1.6rem] border border-dashed p-7 text-center"><Leaf className="mx-auto h-7 w-7 text-primary" /><p className="mt-3 font-serif text-xl">Ingen historik ännu</p><p className="mt-1 text-xs text-muted-foreground">Den första kontrollen startar växtens personliga minne.</p></div>
            ) : (
              <div className="relative mt-5 space-y-0 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-gradient-to-b before:from-primary/35 before:via-border before:to-transparent">
                {timeline.map((event: any, index: number) => (
                  <div key={`${event.source}-${event.id}`} className="relative flex gap-4 pb-4">
                    <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/12 bg-card text-base shadow-sm">{LOG_EMOJI[event.event_type || event.log_type] || '📝'}</div>
                    <div className="min-w-0 flex-1 rounded-[1.25rem] border border-border/55 bg-card/72 p-3.5 shadow-sm">
                      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{eventTitle(event)}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{index === 0 ? 'Senaste händelsen' : 'Tidigare'}</p></div><span className="shrink-0 text-[10px] text-muted-foreground">{dateLabel(event.timeline_at)}</span></div>
                      {event.source === 'care' && <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">{event.soil_moisture && <span className="rounded-full bg-sky-500/8 px-2 py-0.5 text-sky-700 dark:text-sky-300">Jord: {String(event.soil_moisture).replace('_', ' ')}</span>}{event.health_rating && <span className="rounded-full bg-emerald-500/8 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">Mående: {event.health_rating}/5</span>}{Array.isArray(event.symptoms) && event.symptoms.length > 0 && <span className="rounded-full bg-destructive/7 px-2 py-0.5 text-destructive">{event.symptoms.length} symtom</span>}</div>}
                      {event.note && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{event.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
