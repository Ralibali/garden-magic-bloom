import React, { useMemo, useState } from 'react';
import { Activity, ArrowRightLeft, Brain, CheckCircle2, Droplets, Flame, Flower2, Leaf, Scissors, Sparkles, Sprout, StickyNote, Sun } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import PlantCareCheckIn from '@/components/PlantCareCheckIn';
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
  urgent: 'border-destructive/25 bg-destructive/7 text-destructive',
  due: 'border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300',
  soon: 'border-primary/20 bg-primary/7 text-primary',
  good: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300',
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
    return [...careItems, ...legacyItems]
      .sort((a, b) => new Date(b.timeline_at).getTime() - new Date(a.timeline_at).getTime())
      .slice(0, 50);
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        <div className="botanical-panel relative overflow-hidden p-5 sm:p-6">
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full border border-white/10" />
          <DialogHeader className="relative text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lime-100"><Flower2 className="h-6 w-6" /></div>
              <div className="min-w-0"><DialogTitle className="font-serif text-2xl text-white">{plantName}</DialogTitle>{plant.location && <p className="mt-1 text-sm text-white/60">{plant.location}</p>}<div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline" className="border-white/15 bg-white/[0.08] text-white">{profile.confidenceLabel}</Badge>{profile.careStreak >= 2 && <Badge variant="outline" className="border-amber-300/20 bg-amber-300/10 text-amber-100"><Flame className="h-3 w-3 mr-1" /> {profile.careStreak} i rytm</Badge>}</div></div>
            </div>
          </DialogHeader>

          <div className="relative mt-6 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><p className="text-2xl font-bold text-white">{profile.healthScore}</p><p className="text-[10px] text-white/50">hälsopoäng</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><p className="text-2xl font-bold text-white">{profile.recommendedIntervalDays}</p><p className="text-[10px] text-white/50">dagars rytm</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><p className="text-2xl font-bold text-white">{profile.wateringsCount + profile.observationsCount}</p><p className="text-[10px] text-white/50">lärpunkter</p></div>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <section className="rounded-[1.35rem] border border-border/70 bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div><Badge variant="outline" className={STATUS_CLASSES[profile.status]}>{profile.statusLabel}</Badge><h2 className="mt-3 font-serif text-xl">{profile.healthLabel}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{profile.reason}</p></div>
              <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 ${profile.healthScore >= 85 ? 'border-emerald-500/25 bg-emerald-500/8' : profile.healthScore >= 60 ? 'border-primary/20 bg-primary/7' : 'border-destructive/25 bg-destructive/7'}`}><span className="text-xl font-bold">{profile.healthScore}</span></div>
            </div>
            <div className="mt-4 rounded-2xl bg-primary/6 p-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Droplets className="h-3.5 w-3.5" /> {dueLabel}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{profile.recommendation}</p></div>
            <PlantCareCheckIn plant={plant} plantName={plantName} profile={profile} trigger={<Button className="mt-4 w-full gap-2"><HeartPulseIcon /> Kolla jord och hälsa</Button>} />
          </section>

          <section className="rounded-[1.35rem] border border-border/70 p-4">
            <div className="flex items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-semibold"><Brain className="h-4 w-4 text-primary" /> Växtens personliga rytm</p><p className="mt-1 text-xs text-muted-foreground">Appen väger ihop art, placering, årstid och dina faktiska observationer.</p></div><span className="text-sm font-bold text-primary">Nivå {profile.knowledgeLevel}</span></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400" style={{ width: `${profile.knowledgeProgress}%` }} /></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-muted/45 p-3"><p className="text-muted-foreground">Artens startvärde</p><p className="mt-1 font-semibold">{profile.baseIntervalDays} dagar</p></div><div className="rounded-xl bg-muted/45 p-3"><p className="text-muted-foreground">Historiskt hos dig</p><p className="mt-1 font-semibold">{profile.historicalIntervalDays ? `${profile.historicalIntervalDays} dagar` : 'Lär sig fortfarande'}</p></div></div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> {profile.knowledgeLabel}: {profile.observationsCount} hälsokontroller och {profile.wateringsCount} registrerade vattningar.</p>
          </section>

          <section className="rounded-[1.35rem] border border-border/70 p-4">
            <p className="text-sm font-semibold">Lägg till en annan händelse</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]"><Select value={logType} onValueChange={setLogType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LOG_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select><Input placeholder="Kort anteckning (valfritt)" value={logNote} onChange={event => setLogNote(event.target.value)} /><Button onClick={() => addLogMutation.mutate()} disabled={addLogMutation.isPending}><CheckCircle2 className="h-4 w-4" /> Spara</Button></div>
          </section>

          <section>
            <div className="flex items-center justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-primary" /> Omsorgshistorik</p><p className="mt-1 text-xs text-muted-foreground">Här syns vad växten reagerat bra eller dåligt på över tid.</p></div><span className="text-xs text-muted-foreground">{timeline.length} händelser</span></div>
            {!timeline.length ? <div className="mt-4 rounded-2xl border border-dashed p-6 text-center"><Leaf className="h-6 w-6 text-primary mx-auto" /><p className="mt-2 text-sm font-medium">Ingen historik ännu</p><p className="mt-1 text-xs text-muted-foreground">Den första kontrollen startar växtens personliga minne.</p></div> : <div className="mt-4 space-y-2">{timeline.map((event: any) => <div key={`${event.source}-${event.id}`} className="flex items-start gap-3 rounded-2xl border border-border/55 p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-sm">{LOG_EMOJI[event.event_type || event.log_type] || '📝'}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{eventTitle(event)}</p>{event.source === 'care' && <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">{event.soil_moisture && <span className="rounded-full bg-muted px-2 py-0.5">Jord: {String(event.soil_moisture).replace('_', ' ')}</span>}{event.health_rating && <span className="rounded-full bg-muted px-2 py-0.5">Mående: {event.health_rating}/5</span>}{Array.isArray(event.symptoms) && event.symptoms.length > 0 && <span className="rounded-full bg-destructive/7 px-2 py-0.5 text-destructive">{event.symptoms.length} symtom</span>}</div>}{event.note && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{event.note}</p>}</div><span className="shrink-0 text-[10px] text-muted-foreground">{dateLabel(event.timeline_at)}</span></div>)}</div>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HeartPulseIcon() {
  return <Activity className="h-4 w-4" />;
}
