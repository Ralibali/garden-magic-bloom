import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck2, Camera, Carrot, CheckCircle2, Sparkles, Sprout, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfCurrentWeek } from '@/lib/gardenToday';

interface WeeklyGardenSummaryProps { sowings?: any[]; harvests?: any[]; remindersData?: any; photos?: any[]; }

function isThisWeek(value?: string | null) {
  return !!value && new Date(value).getTime() >= startOfCurrentWeek().getTime();
}

function isoWeekNumber(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - start.getTime()) / 86400000) + 1) / 7);
}

const nextSteps: Record<number, string> = {
  1: 'Välj årets sorter och kontrollera fröförrådet.', 2: 'Prioritera långsamma sådder och kontrollera extraljus.',
  3: 'Planera plats för tomat, kål och tidiga direktsådder.', 4: 'Följ jordtemperaturen och förbered utplantering.',
  5: 'Härda plantor och håll extra koll på nattkylan.', 6: 'Fokusera på jämn vattning, stöd och successionssådd.',
  7: 'Skörda ofta och fyll luckor med nya snabba sådder.', 8: 'Dokumentera skörden och så sensommarens grödor.',
  9: 'Sammanfatta lärdomar och planera höstplantering.', 10: 'Täck jorden och avsluta bäddarna med tydliga anteckningar.',
  11: 'Jämför säsongen och bygg nästa års växtföljd.', 12: 'Välj vad du vill upprepa, förbättra och sluta göra.',
};

export default function WeeklyGardenSummary({ sowings = [], harvests = [], remindersData, photos = [] }: WeeklyGardenSummaryProps) {
  const navigate = useNavigate();
  const settings = (remindersData?.settings as any) || {};
  const reminders = settings.reminders || [];
  const smartState = settings.smart_action_state || {};
  const summary = useMemo(() => {
    const weekHarvests = harvests.filter((item) => isThisWeek(item.harvest_date));
    const reminderCount = reminders.filter((item: any) => item.done && isThisWeek(item.completed_at)).length;
    const smartCount = Object.entries(smartState).filter(([id, item]: any) => !id.startsWith('reminder-') && isThisWeek(item?.completedAt)).length;
    return {
      sowings: sowings.filter((item) => isThisWeek(item.sow_date)).length,
      harvestKg: weekHarvests.reduce((sum, item) => sum + (item.weight_grams || 0), 0) / 1000,
      completed: reminderCount + smartCount,
      photos: photos.filter((item) => isThisWeek(item.taken_at || item.created_at)).length,
    };
  }, [sowings, harvests, reminders, smartState, photos]);
  const hasActivity = summary.sowings + summary.harvestKg + summary.completed + summary.photos > 0;
  const metrics = [
    { value: summary.sowings, label: 'nya sådder', icon: Sprout, path: '/app/sowings', tone: 'text-primary' },
    { value: `${summary.harvestKg.toFixed(1)} kg`, label: 'skördat', icon: Carrot, path: '/app/harvests', tone: 'text-accent' },
    { value: summary.completed, label: 'saker klara', icon: CheckCircle2, path: '/app/reminders', tone: 'text-primary' },
    { value: summary.photos, label: 'nya bilder', icon: Camera, path: '/app/photos', tone: 'text-accent' },
  ];
  return <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
    <div className="premium-panel p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><span className="section-kicker mb-3"><CalendarCheck2 className="h-3.5 w-3.5" /> Vecka {isoWeekNumber()}</span><h2 className="font-serif text-2xl sm:text-3xl">Din odlingsvecka</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{hasActivity ? 'Små registreringar blir till värdefull kunskap när de samlas över tid.' : 'Veckan är fortfarande tom. En enda registrering räcker för att börja bygga historiken.'}</p></div><Button variant="outline" size="sm" onClick={() => navigate('/app/timeline')}>Öppna tidslinjen <ArrowRight className="h-4 w-4" /></Button></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{metrics.map(({ value, label, icon: Icon, path, tone }) => <button key={label} onClick={() => navigate(path)} className="metric-card p-4 text-left hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]"><Icon className={`h-4 w-4 ${tone}`} /><p className="mt-3 text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.11em] text-muted-foreground">{label}</p></button>)}</div>
    </div>
    <div className="botanical-panel relative overflow-hidden rounded-[1.5rem] p-5 sm:p-6"><div className="absolute -right-12 -top-12 h-36 w-36 rounded-full border border-white/10" /><div className="relative flex h-full flex-col justify-between gap-8"><div><span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-lime-200"><Sparkles className="h-3.5 w-3.5" /> Blicka framåt</span><h3 className="mt-4 font-serif text-2xl text-white">Nästa smarta steg</h3><p className="mt-3 text-sm leading-relaxed text-white/65">{nextSteps[new Date().getMonth() + 1]}</p></div><Button className="w-full bg-white text-emerald-950 hover:bg-white/92" onClick={() => navigate('/app/calendar')}><TrendingUp className="h-4 w-4" /> Planera nästa vecka</Button></div></div>
  </section>;
}
