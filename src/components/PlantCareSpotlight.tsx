import { Activity, ArrowRight, Brain, Droplets, HeartPulse } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PlantCareCheckIn from '@/components/PlantCareCheckIn';
import PlantHealthRing from '@/components/PlantHealthRing';
import PlantMoodAvatar from '@/components/PlantMoodAvatar';
import type { PlantCareProfile, PlantCareStatus } from '@/lib/plantCareIntelligence';

const STATUS_CLASSES: Record<PlantCareStatus, string> = {
  urgent: 'border-rose-300/40 bg-rose-100/65 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/35 dark:text-rose-300',
  due: 'border-amber-300/45 bg-amber-100/65 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-300',
  soon: 'border-lime-300/45 bg-lime-100/60 text-lime-800 dark:border-lime-800/50 dark:bg-lime-950/30 dark:text-lime-300',
  good: 'border-emerald-300/45 bg-emerald-100/60 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300',
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
  const averageHealth = Math.round(plants.reduce((sum, plant) => sum + plant.care_profile.healthScore, 0) / plants.length);
  const name = (plant: CarePlant) => plant.custom_name || plant.plants?.name_sv || 'Din växt';
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adaptive-care-plants'] });

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-[radial-gradient(circle_at_10%_0%,hsl(var(--primary)/.1),transparent_30%),hsl(var(--card)/.92)] shadow-[0_24px_70px_-44px_rgba(16,85,48,.55)]">
      <div className="flex flex-col gap-4 border-b border-border/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <PlantHealthRing score={averageHealth} size="sm" label="samlat" />
          <div><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-primary"><HeartPulse className="h-3.5 w-3.5" /> Växtpulsen</p><h2 className="mt-1 font-serif text-2xl sm:text-3xl">{urgent ? `${urgent} ${urgent === 1 ? 'växt behöver' : 'växter behöver'} en snabb koll` : 'Dina växter är i rytm'}</h2><p className="mt-1 text-xs text-muted-foreground">Prioriterat efter mående, jord och historiken hemma hos dig.</p></div>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => navigate('/app/my-plants')}>Alla växter <ArrowRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-3">
        {visible.map(plant => {
          const profile = plant.care_profile;
          return (
            <article key={plant.id} className="group rounded-[1.5rem] border border-border/55 bg-card/75 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_45px_-30px_rgba(16,85,48,.45)]">
              <div className="flex items-start gap-3">
                <PlantMoodAvatar score={profile.healthScore} status={profile.status} size="sm" />
                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="truncate font-serif text-lg">{name(plant)}</h3>{plant.location && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{plant.location}</p>}</div><PlantHealthRing score={profile.healthScore} size="sm" label="hälsa" showHeart={false} /></div><Badge variant="outline" className={`mt-2 ${STATUS_CLASSES[profile.status]}`}>{profile.statusLabel}</Badge></div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{profile.reason}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted/28 p-2.5 text-[10px]"><span className="flex items-center gap-1"><Droplets className="h-3 w-3 text-sky-500" /> {profile.recommendedIntervalDays} dagar</span><span className="flex items-center gap-1"><Brain className="h-3 w-3 text-violet-500" /> {profile.confidenceLabel}</span></div>
              <PlantCareCheckIn plant={plant} plantName={name(plant)} profile={profile} onSaved={refresh} trigger={<Button size="sm" className="mt-3 w-full rounded-xl"><Activity className="h-3.5 w-3.5" /> Snabbkoll</Button>} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
