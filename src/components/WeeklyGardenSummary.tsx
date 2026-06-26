import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck2, Camera, Carrot, CheckCircle2, Sparkles, Sprout, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfCurrentWeek } from '@/lib/gardenToday';

interface WeeklyGardenSummaryProps {
  sowings?: any[];
  harvests?: any[];
  remindersData?: any;
  photos?: any[];
}

function isThisWeek(dateString?: string | null) {
  if (!dateString) return false;
  return new Date(dateString).getTime() >= startOfCurrentWeek().getTime();
}

const monthlyNextSteps: Record<number, string> = {
  1: 'Välj årets sorter och kontrollera fröförrådet.',
  2: 'Prioritera långsamma sådder och kontrollera extraljus.',
  3: 'Planera plats för tomat, kål och tidiga direktsådder.',
  4: 'Följ jordtemperaturen och förbered utplantering.',
  5: 'Härda plantor och håll extra koll på nattkylan.',
  6: 'Fokusera på jämn vattning, stöd och successionssådd.',
  7: 'Skörda ofta och fyll luckor med nya snabba sådder.',
  8: 'Dokumentera skörden och så sensommarens grödor.',
  9: 'Sammanfatta lärdomar och planera höstplantering.',
  10: 'Täck jorden och avsluta bäddarna med tydliga anteckningar.',
  11: 'Jämför säsongen och bygg nästa års växtföljd.',
  12: 'Välj vad du vill upprepa, förbättra och sluta göra.',
};

export default function WeeklyGardenSummary({ sowings = [], harvests = [], remindersData, photos = [] }: WeeklyGardenSummaryProps) {
  const navigate = useNavigate();
  const settings = (remindersData?.settings as any) || {};
  const reminders = settings.reminders || [];
  const smartState = settings.smart_action_state || {};

  const summary = useMemo(() => {
    const weekSowings = sowings.filter((item) => isThisWeek(item.sow_date));
    const weekHarvests = harvests.filter((item) => isThisWeek(item.harvest_date));
    const weekHarvestGrams = weekHarvests.reduce((sum, item) => sum + (item.weight_grams || 0), 0);
    const reminderCompletions = reminders.filter((item: any) => item.done && isThisWeek(item.completed_at)).length;
    const smartCompletions = Object.values(smartState).filter((item: any) => isThisWeek(item?.completedAt)).length;
    const weekPhotos = photos.filter((item) => isThisWeek(item.taken_at || item.created_at));
    return {
      sowings: weekSowings.length,
      harvests: weekHarvests.length,
      harvestKg: weekHarvestGrams / 1000,
      completed: reminderCompletions + smartCompletions,
      photos: weekPhotos.length,
    };
  }, [sowings, harvests, reminders, smartState, photos]);

  const hasActivity = summary.sowings + summary.harvests + summary.completed + summary.photos > 0;
  const weekNumber = Number(new Intl.DateTimeFormat('sv-SE', { week: 'numeric' } as any).format?.(new Date()).replace(/\D/g, '')) || Math.ceil((((new Date() as any) - (new Date(new Date().getFullYear(), 0, 1) as any)) / 86400000 + new Date(new Date().getFullYear(), 0, 1).getDay() + 1) / 7);

  return (
    <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
      <div className="premium-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div><span className="section-kicker mb-3"><CalendarCheck2 className="h-3.5 w-3.5" /> Vecka {weekNumber}</span><h2 className="font-serif text-2xl sm:text-3xl">Din odlingsvecka</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{hasActivity ? 'Små registreringar blir till värdefull kunskap när de samlas över tid.' : 'Veckan är fortfarande tom. En enda sådd, skörd, uppgift eller bild räcker för att börja bygga historiken.'}</p></div>
          <Button variant="outline" size="sm" onClick={() => navigate('/app/timeline')}>Öppna tidslinjen <ArrowRight className="h-4 w-4" /></Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button onClick={() => navigate('/app/sowings')} className="metric-card p-4 text-left hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]"><Sprout className="h-4 w-4 text-primary" /><p className="mt-3 text-2xl font-bold tabular-nums">{summary.sowings}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">nya sådder</p></button>
          <button onClick={() => navigate('/app/harvests')} className="metric-card p-4 text-left hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]"><Carrot className="h-4 w-4 text-accent" /><p className="mt-3 text-2xl font-bold tabular-nums">{summary.harvestKg.toFixed(1)} kg</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">skördat</p></button>
          <button onClick={() => navigate('/app/reminders')} className="metric-card p-4 text-left hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]"><CheckCircle2 className="h-4 w-4 text-primary" /><p className="mt-3 text-2xl font-bold tabular-nums">{summary.completed}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">saker klara</p></button>
          <button onClick={() => navigate('/app/photos')} className="metric-card p-4 text-left hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]"><Camera className="h-4 w-4 text-accent" /><p className="mt-3 text-2xl font-bold tabular-nums">{summary.photos}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">nya bilder</p></button>
        </div>
      </div>

      <div className="botanical-panel relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6">
        <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full border border-white/10" />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div><span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-lime-200"><Sparkles className="h-3.5 w-3.5" /> Blicka framåt</span><h3 className="mt-4 font-serif text-2xl text-white">Nästa smarta steg</h3><p className="mt-3 text-sm leading-relaxed text-white/65">{monthlyNextSteps[new Date().getMonth() + 1]}</p></div>
          <Button className="w-full bg-white text-emerald-950 hover:bg-white/92" onClick={() => navigate('/app/calendar')}><TrendingUp className="h-4 w-4" /> Planera nästa vecka</Button>
        </div>
      </div>
    </section>
  );
}
