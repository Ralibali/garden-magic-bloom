import React, { useState } from 'react';
import { Activity, Check, Droplets, Leaf, Loader2, Sparkles } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { recordProductActivity } from '@/lib/analytics';
import type { PlantCareProfile } from '@/lib/plantCareIntelligence';

const SOIL_OPTIONS = [
  { value: 'very_dry', label: 'Mycket torr', emoji: '🏜️', help: 'Torr långt ner i krukan' },
  { value: 'dry', label: 'Torr', emoji: '🌵', help: 'Översta centimetrarna är torra' },
  { value: 'moist', label: 'Lagom fuktig', emoji: '🌿', help: 'Jorden känns sval och lätt fuktig' },
  { value: 'wet', label: 'Blöt', emoji: '💦', help: 'Jorden är tydligt våt' },
];

const HEALTH_OPTIONS = [
  { value: 5, label: 'Pigg', emoji: '✨' },
  { value: 4, label: 'Ser bra ut', emoji: '🌱' },
  { value: 3, label: 'Lite trött', emoji: '😐' },
  { value: 2, label: 'Mår dåligt', emoji: '🆘' },
];

const SYMPTOMS = [
  { value: 'wilting', label: 'Slokar' },
  { value: 'yellow_leaves', label: 'Gula blad' },
  { value: 'dry_edges', label: 'Torra kanter' },
  { value: 'spots', label: 'Fläckar' },
  { value: 'pests', label: 'Skadedjur' },
  { value: 'soft_stem', label: 'Mjuk stjälk' },
];

interface PlantCareCheckInProps {
  plant: any;
  plantName: string;
  profile: PlantCareProfile;
  trigger: React.ReactNode;
  onSaved?: () => void;
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Du behöver vara inloggad.');
  return user.id;
}

export default function PlantCareCheckIn({ plant, plantName, profile, trigger, onSaved }: PlantCareCheckInProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [soil, setSoil] = useState('');
  const [health, setHealth] = useState<number | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [waterAmount, setWaterAmount] = useState('normal');
  const [note, setNote] = useState('');

  const reset = () => {
    setSoil('');
    setHealth(null);
    setSymptoms([]);
    setWaterAmount('normal');
    setNote('');
  };

  const saveMutation = useMutation({
    mutationFn: async (watered: boolean) => {
      if (!soil || !health) throw new Error('Välj hur jorden känns och hur växten mår.');
      const userId = await getUserId();
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const eventType = watered ? 'watered' : 'health_check';
      const summary = `${SOIL_OPTIONS.find(option => option.value === soil)?.label || soil}; ${HEALTH_OPTIONS.find(option => option.value === health)?.label || health}${symptoms.length ? `; ${symptoms.join(', ')}` : ''}`;

      if (watered) {
        const { error: updateError } = await supabase.from('my_plants').update({ last_watered: today }).eq('id', plant.id);
        if (updateError) throw updateError;

        const { error: wateringError } = await supabase.from('watering_log').insert({ user_id: userId, plant_id: plant.id, watered_at: now.toISOString() } as any);
        if (wateringError) throw wateringError;
      }

      const { error: eventError } = await supabase.from('plant_care_events' as any).insert({
        user_id: userId,
        plant_id: plant.id,
        event_type: eventType,
        occurred_at: now.toISOString(),
        soil_moisture: soil,
        health_rating: health,
        symptoms,
        water_amount: watered ? waterAmount : null,
        note: note.trim() || null,
        metadata: {
          recommended_interval_days: profile.recommendedIntervalDays,
          confidence: profile.confidence,
          health_score_before: profile.healthScore,
        },
      } as any);

      // Keep the existing timeline useful even before the new migration has reached every environment.
      const fallbackNote = note.trim() || summary;
      const { error: logError } = await supabase.from('plant_logs').insert({
        user_id: userId,
        plant_id: plant.id,
        log_type: eventType,
        note: fallbackNote,
      } as any);
      if (logError) throw logError;

      if (eventError) console.warn('[plant_care_events]', eventError);
      void recordProductActivity(watered ? 'plant_watered_with_checkin' : 'plant_health_checked', {
        plant_id: plant.id,
        soil_moisture: soil,
        health_rating: health,
        symptoms_count: symptoms.length,
      });
    },
    onSuccess: (_, watered) => {
      queryClient.invalidateQueries({ queryKey: ['my-plants'] });
      queryClient.invalidateQueries({ queryKey: ['plant-care-events'] });
      queryClient.invalidateQueries({ queryKey: ['watering-log'] });
      queryClient.invalidateQueries({ queryKey: ['plant-logs', plant.id] });
      toast({
        title: watered ? `${plantName} är vattnad 💧` : `Hälsokollen är sparad 🌿`,
        description: watered
          ? 'Nästa vattningsråd anpassas efter hur jorden och växten mådde idag.'
          : 'Bra! Varje kontroll gör rekommendationerna mer personliga.',
      });
      setOpen(false);
      reset();
      onSaved?.();
    },
    onError: (error: any) => toast({ title: 'Kunde inte spara kontrollen', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const toggleSymptom = (value: string) => {
    setSymptoms(current => current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };

  const shouldWait = soil === 'moist' || soil === 'wet';

  return (
    <Dialog open={open} onOpenChange={next => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Hur mår {plantName}?</DialogTitle>
          <p className="text-sm text-muted-foreground">En kontroll tar under 20 sekunder och lär appen vad just den här växten behöver.</p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Just nu</p><p className="font-medium mt-1">{profile.statusLabel}</p></div>
              <div className="text-right"><p className="text-2xl font-bold">{profile.healthScore}</p><p className="text-[10px] text-muted-foreground">hälsopoäng</p></div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{profile.recommendation}</p>
          </div>

          <section>
            <p className="text-sm font-semibold mb-2">1. Hur känns jorden?</p>
            <div className="grid grid-cols-2 gap-2">
              {SOIL_OPTIONS.map(option => (
                <button key={option.value} type="button" onClick={() => setSoil(option.value)} className={`rounded-2xl border p-3 text-left transition-all ${soil === option.value ? 'border-primary bg-primary/8 ring-1 ring-primary/20' : 'border-border hover:border-primary/30'}`}>
                  <div className="flex items-center justify-between"><span className="text-lg">{option.emoji}</span>{soil === option.value && <Check className="h-4 w-4 text-primary" />}</div>
                  <p className="mt-1 text-sm font-medium">{option.label}</p><p className="text-[10px] text-muted-foreground mt-0.5">{option.help}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold mb-2">2. Hur ser växten ut?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {HEALTH_OPTIONS.map(option => (
                <button key={option.value} type="button" onClick={() => setHealth(option.value)} className={`rounded-2xl border px-2 py-3 text-center transition-all ${health === option.value ? 'border-primary bg-primary/8 ring-1 ring-primary/20' : 'border-border hover:border-primary/30'}`}>
                  <span className="text-xl">{option.emoji}</span><p className="mt-1 text-xs font-medium">{option.label}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold mb-2">Ser du något särskilt? <span className="font-normal text-muted-foreground">Valfritt</span></p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map(symptom => (
                <button key={symptom.value} type="button" onClick={() => toggleSymptom(symptom.value)} className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${symptoms.includes(symptom.value) ? 'border-destructive/30 bg-destructive/8 text-destructive' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {symptom.label}
                </button>
              ))}
            </div>
          </section>

          {!shouldWait && soil && (
            <section>
              <p className="text-sm font-semibold mb-2">Hur mycket vatten gav du?</p>
              <div className="grid grid-cols-3 gap-2">
                {[['little', 'Lite'], ['normal', 'Lagom'], ['thorough', 'Ordentligt']].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => setWaterAmount(value)} className={`rounded-xl border px-3 py-2 text-xs ${waterAmount === value ? 'border-primary bg-primary/8 text-primary' : 'border-border'}`}>{label}</button>
                ))}
              </div>
            </section>
          )}

          <Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Egen anteckning, till exempel nya blad eller ändrad placering (valfritt)" />

          {shouldWait && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-3 text-sm">
              <p className="font-medium">Jorden är fortfarande fuktig</p>
              <p className="mt-1 text-xs text-muted-foreground">Spara hellre kontrollen utan att vattna. Appen flyttar då fram nästa rekommendation.</p>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => saveMutation.mutate(false)} disabled={!soil || !health || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Leaf className="h-4 w-4" />} Spara kontroll
            </Button>
            <Button onClick={() => saveMutation.mutate(true)} disabled={!soil || !health || saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : shouldWait ? <Sparkles className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
              {shouldWait ? 'Vattna ändå' : 'Vattnad nu'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
