import { Activity, ArrowRight, Brain, Droplets, Flower2, HeartPulse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PlantCareCheckIn from '@/components/PlantCareCheckIn';
import type { PlantCareProfile, PlantCareStatus } from '@/lib/plantCareIntelligence';

const STATUS_CLASSES: Record<PlantCareStatus, string> = {
  urgent: 'border-destructive/25 bg-destructive/7 text-destructive',
  due: 'border-amber-500/25 bg-amber-500/8 text-amber-700 dark:text-amber-300',
  soon: 'border-primary/20 bg-primary/7 text-primary',
  good: 'border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300',
};

interface CarePlant {
  id: string;
  custom_name?: string | null;
  location?: string | null;
  plants?: { name_sv?: string | null } | null;
  care_profile: PlantCareProfile;
  [key: string]: any;
}

export default function PlantCareSpotlight({ plants }: { plants: CarePlant[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  if (!plants.length) return null;

  const visible = plants.slice(0, 3);
  const urgent = plants.filter(plant => ['urgent', 'due'].includes(plant.care_profile.status)).length;
  const name = (plant: CarePlant) => plant.custom_name || plant.plants?.name_sv || 'Din växt';
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adaptive-care-plants'] });

  return (
    <section className="premium-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border/55 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><HeartPulse className="h-5 w-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Växtpulsen</p><h2 className="mt-1 font-serif text-2xl">{urgent ? `${urgent} ${urgent === 1 ? 'växt behöver' : 'växter behöver'} en snabb koll` : 'Dina växter är i rytm'}</h2><p className="mt-1 text-xs text-muted-foreground">Råden bygger på hur varje växt faktiskt har mått hemma hos dig.</p></div></div>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/my-plants')}>Alla växter <ArrowRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-3 sm:p-5">
        {visible.map(plant => {
          const profile = plant.care_profile;
          return <article key={plant.id} className="rounded-[1.25rem] border border-border/65 bg-card/70 p-3.5"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/9 text-primary"><Flower2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h3 className="truncate font-semibold">{name(plant)}</h3><span className="text-sm font-bold">{profile.healthScore}</span></div>{plant.location && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{plant.location}</p>}<Badge variant="outline" className={`mt-2 ${STATUS_CLASSES[profile.status]}`}>{profile.statusLabel}</Badge></div></div><p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{profile.reason}</p><div className="mt-3 flex items-center justify-between rounded-xl bg-muted/35 px-2.5 py-2 text-[10px]"><span className="flex items-center gap-1"><Droplets className="h-3 w-3 text-primary" /> {profile.recommendedIntervalDays} dagar</span><span className="flex items-center gap-1"><Brain className="h-3 w-3 text-primary" /> {profile.confidenceLabel}</span></div><PlantCareCheckIn plant={plant} plantName={name(plant)} profile={profile} onSaved={refresh} trigger={<Button size="sm" className="mt-3 w-full"><Activity className="h-3.5 w-3.5" /> Snabbkoll</Button>} /></article>;
        })}
      </div>
    </section>
  );
}
