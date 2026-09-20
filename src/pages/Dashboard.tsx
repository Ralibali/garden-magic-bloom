import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Camera, Carrot, ChevronDown, CloudSun, Flower2, MapPin, NotebookPen, Plus, Snowflake, Sparkles, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getCultivationData } from '@/lib/cultivationApi';
import { buildCultivations } from '@/lib/cultivations';
import { getDiary } from '@/lib/diaryApi';
import { DIARY_LABELS } from '@/lib/diary';
import { localDateKey } from '@/lib/gardenToday';
import { getGardenForecast, weatherDescription } from '@/lib/gardenWeather';
import { getFrostWarning } from '@/lib/frostWarning';
import type { GardenCategory } from '@/lib/gardenModules';
import OnboardingFlow from '@/components/OnboardingFlow';
import GardenPulse from '@/components/GardenPulse';
import CultivationImage from '@/components/CultivationImage';
import SeasonWrapDialog from '@/components/SeasonWrapDialog';
import gardenImage from '@/assets/hero-harvest-hands.jpg';

const AchievementsSection = lazy(() => import('@/components/AchievementsSection'));
const WeeklyGardenSummary = lazy(() => import('@/components/WeeklyGardenSummary'));
const PlantWeeklyCareSummary = lazy(() => import('@/components/PlantWeeklyCareSummary'));

const dateLabel = (date: string) => new Intl.DateTimeFormat('sv-SE', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));

export default function Dashboard() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [wrapOpen, setWrapOpen] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const profile = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const garden = useQuery({ queryKey: ['cultivations', user?.id], queryFn: getCultivationData, enabled: !!user?.id });
  const diary = useQuery({ queryKey: ['garden-diary', user?.id], queryFn: getDiary, enabled: !!user?.id });
  const reminders = useQuery({ queryKey: ['reminder-settings'], queryFn: api.getReminderSettings });
  const climateZone = profile.data?.climate_zone ?? 3;
  const lat = profile.data?.location_lat;
  const lon = profile.data?.location_lon;
  const weather = useQuery({
    queryKey: ['garden-forecast', climateZone, lat, lon],
    queryFn: () => getGardenForecast(climateZone, { lat, lon }),
    enabled: profile.isSuccess, staleTime: 600_000, retry: 1,
  });
  const rain = useQuery({
    queryKey: ['rain-history', climateZone, lat, lon],
    queryFn: () => api.getRainHistory(climateZone, { lat, lon }),
    enabled: profile.isSuccess, staleTime: 600_000, retry: 1,
  });
  const items = useMemo(() => garden.data ? buildCultivations(garden.data) : [], [garden.data]);
  const active = items.filter(item => item.status !== 'done');
  const overduePlants = items.filter(item => item.plant && item.profile && ['urgent', 'due'].includes(item.profile.status)).map(item => ({ ...item.plant, care_profile: item.profile }));
  const prefs = (profile.data?.preferences || {}) as { garden_categories?: GardenCategory[] };
  const plantOnly = !!prefs.garden_categories?.length && prefs.garden_categories.every(category => category === 'krukvaxter');
  const firstName = profile.data?.display_name?.trim().split(' ')[0];
  const today = localDateKey();
  const year = new Date().getFullYear();
  const recent = (diary.data || []).filter(event => event.date <= today).slice(0, 3);
  const harvested = garden.data?.harvests.filter(h => h.harvest_date.startsWith(String(year))).reduce((sum, h) => sum + h.weight_grams, 0) ?? 0;
  const frost = plantOnly ? null : getFrostWarning(weather.data);
  const temperature = weather.data?.current?.temperature_2m;
  const hasLocation = lat != null && lon != null;

  const completeOnboarding = async (data: { categories: GardenCategory[]; climateZone: number }) => {
    await api.updateProfile({ climate_zone: data.climateZone, preferences: { ...prefs, garden_categories: data.categories }, onboarding_completed: true });
    await client.invalidateQueries({ queryKey: ['profile'] });
  };
  if (profile.data && !(profile.data as { onboarding_completed?: boolean }).onboarding_completed) return <OnboardingFlow onComplete={completeOnboarding} />;

  return (
    <div className="garden-home mx-auto max-w-6xl space-y-7 sm:space-y-9">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="garden-eyebrow">{new Intl.DateTimeFormat('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
          <h1 className="mt-2 text-3xl sm:text-[2.75rem]">{firstName ? `Din odling, ${firstName}.` : 'Din odling.'}</h1>
          <p className="mt-2 text-base text-muted-foreground">{plantOnly ? 'En liten stund med dina växter.' : 'En liten stund i det gröna.'}</p>
        </div>
        <Button asChild className="min-h-11 gap-2 rounded-full px-5"><Link to="/app/timeline" state={{ openEditor: true }}><NotebookPen className="h-4 w-4" />Skriv i dagboken</Link></Button>
      </header>

      <nav aria-label="Lägg till i odlingen" className="garden-quick-actions">
        <Link to={plantOnly ? '/app/my-plants' : '/app/sowings'} state={plantOnly ? { openCreate: true } : { prefill: {} }}><Plus />{plantOnly ? 'Ny växt' : 'Ny sådd'}</Link>
        <Link to="/app/photos" state={{ openUpload: true }}><Camera />Lägg till foto</Link>
        <Link to={plantOnly ? '/app/my-plants' : '/app/harvests'} state={plantOnly ? undefined : { prefill: {} }}>{plantOnly ? <Flower2 /> : <Carrot />}{plantOnly ? 'Titta till växter' : 'Logga skörd'}</Link>
        <Link to="/app/gro"><Sparkles />Fråga Gro</Link>
      </nav>

      {frost && <section role="status" className="flex items-start gap-3 rounded-2xl border border-sky-300/60 bg-sky-50 p-4 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100"><Snowflake className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-sans text-base font-semibold text-inherit">{frost.headline}</h2><p className="mt-1 text-sm">{frost.advice}</p></div></section>}

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="growing-heading">
            <div className="garden-section-heading"><h2 id="growing-heading">Här växer det</h2><Link to="/app/odlingar">Alla odlingar <ArrowRight /></Link></div>
            {garden.isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3" aria-label="Hämtar odlingar" aria-busy="true">{[1, 2, 3].map(n => <Skeleton key={n} className="h-60 rounded-2xl last:hidden sm:last:block" />)}</div>
              : garden.isError ? <div className="garden-paper p-6" role="alert"><h3 className="text-xl">Odlingarna kunde inte hämtas</h3><p className="mt-2 text-sm text-muted-foreground">Försök igen för att se dina sparade växter och sådder.</p><Button variant="outline" className="mt-4" onClick={() => void garden.refetch()}>Försök igen</Button></div>
              : active.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">{active.slice(0, 3).map(item => <Link key={item.id} to="/app/odlingar" state={{ cultivationId: item.id }} className="garden-plant-card group">
                <CultivationImage item={item} />
                <div className="p-3 sm:p-4"><p className="truncate text-xs text-muted-foreground">{item.place}</p><h3 className="mt-1 break-words text-xl leading-snug group-hover:text-primary">{item.name}</h3><p className="mt-3 flex items-start gap-1.5 text-sm"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${item.status === 'attention' ? 'bg-amber-600' : 'bg-primary'}`} /><span>{item.status === 'attention' ? 'Dags för en titt' : item.stage}</span></p></div>
              </Link>)}</div>
              : <div className="garden-welcome grid overflow-hidden rounded-2xl sm:grid-cols-[1fr_180px]"><div className="p-6 sm:p-8"><Sprout className="h-7 w-7 text-primary" /><h3 className="mt-4 text-2xl">{items.length ? 'Vad vill du odla härnäst?' : 'Det börjar med något litet.'}</h3><p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">{items.length ? 'Dina avslutade odlingar finns kvar i historiken. Börja en ny när du vill.' : 'En kruka i fönstret eller en hel köksträdgård. Lägg till det du odlar, så får det en egen historia.'}</p><Button asChild className="mt-5"><Link to={plantOnly ? '/app/my-plants' : '/app/sowings'} state={plantOnly ? { openCreate: true } : { prefill: {} }}><Plus className="mr-2 h-4 w-4" />{plantOnly ? 'Lägg till en växt' : 'Lägg till en sådd'}</Link></Button></div><img src={gardenImage} alt="Händer med nyskördade grönsaker" className="hidden h-full w-full object-cover sm:block" /></div>}
          </section>

          <section aria-labelledby="diary-heading">
            <div className="garden-section-heading"><h2 id="diary-heading">Senast i din dagbok</h2><Link to="/app/timeline">Öppna dagboken <ArrowRight /></Link></div>
            <div className="garden-paper overflow-hidden">
              {diary.isLoading ? <div className="space-y-4 p-5" aria-busy="true" aria-label="Hämtar dagboken"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
                : diary.isError ? <div role="alert" className="p-5"><p>Dagboken kunde inte hämtas.</p><Button variant="link" className="mt-2 px-0" onClick={() => void diary.refetch()}>Försök igen</Button></div>
                : recent.length ? <div className="divide-y divide-border/60">{recent.map(event => <Link key={event.id} to="/app/timeline" state={{ ...(event.subjectId ? { subjectId: event.subjectId } : {}), eventId: event.id }} className="group flex items-start gap-4 p-4 transition-colors hover:bg-muted/40 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">{event.kind === 'photo' ? <Camera className="h-5 w-5" /> : event.kind === 'harvest' ? <Carrot className="h-5 w-5" /> : event.kind === 'note' ? <NotebookPen className="h-5 w-5" /> : <Sprout className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><p className="text-xs text-muted-foreground">{dateLabel(event.date)} · {DIARY_LABELS[event.kind]}</p><h3 className="mt-1 text-lg leading-snug group-hover:text-primary">{event.title}</h3>{event.body && <p className="mt-1 line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">{event.body}</p>}</div><ArrowRight className="mt-3 h-4 w-4 shrink-0 text-muted-foreground" /></Link>)}</div>
                : <div className="p-6"><BookOpen className="h-6 w-6 text-primary" /><h3 className="mt-3 text-xl">Vad vill du minnas från idag?</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Ett nytt blad, något som grott eller en idé till nästa år.</p><Button asChild variant="link" className="mt-3 h-auto p-0"><Link to="/app/timeline" state={{ openEditor: true }}>Skriv dina första rader <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div>}
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-5">
          <div className="garden-section-heading"><h2>En stund idag</h2><Link to="/app/reminders" aria-label="Alla påminnelser"><ArrowRight /></Link></div>
          <GardenPulse weather={weather.data} rainData={rain.data} climateZone={climateZone} remindersData={reminders.data} sowings={garden.data?.sowings} beds={garden.data?.beds} overduePlants={overduePlants} isLoading={garden.isLoading || reminders.isLoading} isError={garden.isError || reminders.isError} compact />
          <section className="garden-weather" aria-label="Väder vid odlingen"><div className="flex items-center gap-3"><CloudSun className="h-8 w-8 text-primary" /><div><p className="text-sm font-medium">{temperature != null ? `${Math.round(temperature)}° · ${weatherDescription(weather.data?.current?.weather_code)}` : weather.isError ? 'Vädret kunde inte hämtas' : 'Hämtar vädret…'}</p><p className="mt-1 text-xs text-muted-foreground">{hasLocation ? 'Vid din sparade plats' : `Ungefärligt väder · zon ${climateZone}`}</p></div></div><Link to="/app/settings" className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary"><MapPin className="h-3.5 w-3.5" />{hasLocation ? 'Ändra plats' : 'Ange din plats'}</Link></section>
          <div className="border-t border-border/70 pt-5"><p className="garden-eyebrow">Din säsong {year}</p><div className="mt-3 flex gap-6"><Link to="/app/odlingar" className="text-sm text-muted-foreground"><strong className="mb-1 block font-serif text-3xl font-normal text-foreground">{garden.isPending || garden.isError ? '–' : active.length}</strong>aktiva odlingar</Link><Link to={plantOnly ? '/app/photos' : '/app/harvests'} className="text-sm text-muted-foreground"><strong className="mb-1 block font-serif text-3xl font-normal text-foreground">{garden.isPending || garden.isError ? '–' : plantOnly ? garden.data?.photos.filter(photo => photo.taken_at.startsWith(String(year))).length : (harvested / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })}</strong>{plantOnly ? 'foton i år' : 'kg skördat i år'}</Link></div><Link to="/app/statistics" className="mt-4 inline-flex items-center gap-2 text-sm text-primary">Se din statistik <ArrowRight className="h-3.5 w-3.5" /></Link></div>
        </aside>
      </div>
      {new Date().getMonth() >= 8 && new Date().getMonth() <= 9 && !!garden.data?.beds.length && <section className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-6"><div><h2 className="text-xl">Ta med dig det som fungerade.</h2><p className="mt-1 text-sm text-muted-foreground">Spara säsongens lärdomar inför nästa år.</p></div><Button variant="outline" className="rounded-full" onClick={() => setWrapOpen(true)}>Summera säsongen <ArrowRight className="ml-2 h-4 w-4" /></Button></section>}
      <section className="border-t border-border/70 pt-5"><button type="button" aria-expanded={showProgress} aria-controls="garden-progress" onClick={() => setShowProgress(value => !value)} className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm font-medium">Veckan & dina framsteg<ChevronDown className={`h-4 w-4 transition-transform ${showProgress ? 'rotate-180' : ''}`} /></button>{showProgress && <div id="garden-progress" className="mt-4 space-y-4"><Suspense fallback={<Skeleton className="h-32 rounded-2xl" />}>{plantOnly ? <PlantWeeklyCareSummary variant="compact" /> : <><WeeklyGardenSummary sowings={garden.data?.sowings || []} harvests={garden.data?.harvests || []} photos={garden.data?.photos || []} remindersData={reminders.data} /><AchievementsSection /></>}</Suspense></div>}</section>
      <SeasonWrapDialog open={wrapOpen} onOpenChange={setWrapOpen} beds={garden.data?.beds || []} year={year} />
    </div>
  );
}
