import React, { useState } from 'react';
import { Brain, Camera, Carrot, Crown, ArrowRight, ChevronDown, Hand, HeartPulse, LayoutGrid, Leaf, MapPin, Plus, Sparkles, Sprout, CalendarDays, CloudSun } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import OnboardingFlow from '@/components/OnboardingFlow';
import GettingStartedGuide from '@/components/GettingStartedGuide';
import PlantGettingStartedGuide from '@/components/PlantGettingStartedGuide';
import DashboardActionCenter from '@/components/DashboardActionCenter';
import HarvestValueLine from '@/components/HarvestValueLine';
import TodayInGarden from '@/components/TodayInGarden';
import WeeklyGardenSummary from '@/components/WeeklyGardenSummary';
import PlantWeeklyCareSummary from '@/components/PlantWeeklyCareSummary';
import PlantCareSpotlight from '@/components/PlantCareSpotlight';
import { GardenCategory } from '@/lib/gardenModules';
import { FadeIn } from '@/components/animations';
import { getGardenForecast, weatherDescription } from '@/lib/gardenWeather';
import { buildPlantCareProfile } from '@/lib/plantCareIntelligence';

const MONTH_TIPS: Record<number, string> = {
  1: 'Planera årets sorter och kontrollera fröförrådet.',
  2: 'Starta långsamma sådder och kontrollera extraljuset.',
  3: 'Förodla tomat och kål och planera vårens bäddar.',
  4: 'Direktså tåliga grödor och följ jordtemperaturen.',
  5: 'Härda plantor och låt nattemperaturen styra utplanteringen.',
  6: 'Vattna jämnt, gallra och ge plantorna stöd.',
  7: 'Skörda ofta och fyll luckor med nya snabba sådder.',
  8: 'Dokumentera skörden och så sensommarens grödor.',
  9: 'Sammanfatta lärdomar och planera höstplantering.',
  10: 'Täck jorden och avsluta bäddarna med anteckningar.',
  11: 'Jämför säsongen och bygg nästa års växtföljd.',
  12: 'Välj vad du vill upprepa, förbättra och sluta göra.',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const showSeasonWrap = currentMonth === 9 || currentMonth === 10;
  const [wrapOpen, setWrapOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const { data: stats, isLoading } = useQuery({ queryKey: ['summary-stats'], queryFn: api.getSummaryStats });
  const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const climateZone = profile?.climate_zone ?? 3;
  const { data: weather } = useQuery({ queryKey: ['garden-forecast', climateZone], queryFn: () => getGardenForecast(climateZone), staleTime: 600_000, retry: 1 });
  const { data: rainData } = useQuery({ queryKey: ['rain-history', climateZone], queryFn: () => api.getRainHistory(climateZone), staleTime: 600_000, retry: 1 });
  const { data: beds = [] } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const { data: sowings = [] } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: harvests = [] } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });
  const { data: remindersData } = useQuery({ queryKey: ['reminder-settings'], queryFn: api.getReminderSettings });
  const { data: photos = [] } = useQuery({
    queryKey: ['dashboard-photos'],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.from('plant_photos').select('id, taken_at, created_at').order('taken_at', { ascending: false }).limit(50);
      if (error) return [];
      return data || [];
    },
  });
  const { data: adaptivePlants = [], isLoading: plantsLoading } = useQuery({
    queryKey: ['adaptive-care-plants'],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const [plantsResult, careResult, wateringResult] = await Promise.all([
        supabase.from('my_plants').select('*, plants(name_sv, water, light, watering_interval_days)').order('created_at', { ascending: false }),
        supabase.from('plant_care_events' as any).select('*').order('occurred_at', { ascending: false }).limit(1000),
        supabase.from('watering_log').select('*').order('watered_at', { ascending: false }).limit(1000),
      ]);
      if (plantsResult.error) return [];

      const eventsByPlant = new Map<string, any[]>();
      const add = (plantId: string | null, event: any) => {
        if (!plantId) return;
        const current = eventsByPlant.get(plantId) || [];
        current.push(event);
        eventsByPlant.set(plantId, current);
      };
      ((careResult.data || []) as any[]).forEach(event => add(event.plant_id, event));
      (wateringResult.data || []).forEach((event: any) => add(event.plant_id, { ...event, event_type: 'watered' }));

      return (plantsResult.data || [])
        .map((plant: any) => {
          const careProfile = buildPlantCareProfile(plant, eventsByPlant.get(plant.id) || []);
          return { ...plant, care_profile: careProfile, watering_interval_days: careProfile.recommendedIntervalDays };
        })
        .sort((a: any, b: any) => {
          const order = { urgent: 0, due: 1, soon: 2, good: 3 } as Record<string, number>;
          return order[a.care_profile.status] - order[b.care_profile.status] || a.care_profile.healthScore - b.care_profile.healthScore;
        });
    },
  });

  const showOnboarding = !profileLoading && profile && !(profile as any).onboarding_completed;
  const handleOnboardingComplete = async (data: { categories: GardenCategory[]; climateZone: number }) => {
    const currentPrefs = (profile?.preferences as any) || {};
    await api.updateProfile({ climate_zone: data.climateZone, preferences: { ...currentPrefs, garden_categories: data.categories }, onboarding_completed: true });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  if (showOnboarding) return <OnboardingFlow onComplete={handleOnboardingComplete} />;

  const preferences = ((profile?.preferences as any) || {}) as Record<string, any>;
  const categories = (preferences.garden_categories || []) as GardenCategory[];
  const plantOnly = categories.length > 0 && categories.every(category => category === 'krukvaxter');
  const setupIncomplete = plantOnly
    ? !plantsLoading && adaptivePlants.length === 0
    : !isLoading && ((stats?.active_beds ?? 0) === 0 || (stats?.sowings_this_year ?? 0) === 0);
  const dashboardLoading = isLoading || (plantOnly && plantsLoading);
  const attentionPlants = adaptivePlants.filter((plant: any) => plant.care_profile.status !== 'good');
  const rawName = profile?.display_name?.trim();
  const displayName = rawName ? rawName.split(' ')[0] : '';
  const lastActivityValue = preferences.last_active_at || profile?.updated_at;
  const daysSinceLastActivity = lastActivityValue ? Math.floor((Date.now() - new Date(lastActivityValue).getTime()) / 86400000) : null;
  const showWelcomeBack = !setupIncomplete && daysSinceLastActivity !== null && daysSinceLastActivity >= 7;
  const temp = weather?.current?.temperature_2m;
  const rainChance = weather?.daily?.precipitation_probability_max?.[0];
  const trialDaysLeft = (() => {
    if (!profile?.premium_expires_at || (profile as any).subscription_status !== 'premium') return null;
    const days = Math.ceil((new Date(profile.premium_expires_at).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 5 ? days : null;
  })();
  const recentSowings = sowings.slice(0, 5);
  const primaryMessage = plantOnly
    ? setupIncomplete
      ? 'Lägg till en växt och gör en snabb jordkontroll — därefter börjar appen lära sig.'
      : attentionPlants.length > 0
        ? `${attentionPlants.length} ${attentionPlants.length === 1 ? 'växt behöver' : 'växter behöver'} en snabb koll idag.`
        : 'Dina växter är i rytm — bra jobbat.'
    : setupIncomplete
      ? 'Börja med en plats och en sådd — därefter blir råden personliga.'
      : MONTH_TIPS[currentMonth];

  const heroGreeting = displayName ? `Hej ${displayName}` : 'Hej';
  const weatherLine = temp !== undefined
    ? `${Math.round(temp)}° · ${weatherDescription(weather?.current?.weather_code)}${rainChance !== undefined ? ` · ${Math.round(rainChance)}% regn` : ''}`
    : null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 sm:space-y-8">
      {/* HERO — kompakt, luftig, ett budskap */}
      <FadeIn>
        <section className="pt-2 sm:pt-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Klimatzon {climateZone}</span>
            {weatherLine && <span className="inline-flex items-center gap-1.5"><CloudSun className="h-3.5 w-3.5" /> {weatherLine}</span>}
          </div>
          <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">{heroGreeting}.</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{primaryMessage}</p>
        </section>
      </FadeIn>

      {dashboardLoading ? (
        <Skeleton className="h-64 rounded-[1.8rem]" />
      ) : setupIncomplete ? (
        plantOnly ? <PlantGettingStartedGuide /> : <GettingStartedGuide />
      ) : plantOnly ? (
        <PlantOnlyDashboard
          plants={adaptivePlants as any[]}
          weather={weather}
          rainData={rainData}
          climateZone={climateZone}
          remindersData={remindersData}
          displayName={displayName}
          moreOpen={moreOpen}
          setMoreOpen={setMoreOpen}
          trialDaysLeft={trialDaysLeft}
          showWelcomeBack={showWelcomeBack}
          daysSinceLastActivity={daysSinceLastActivity}
          onNavigate={navigate}
        />
      ) : (
        <>
          {/* IDAG — max 3 åtgärder */}
          <TodayInGarden
            weather={weather}
            rainData={rainData}
            climateZone={climateZone}
            remindersData={remindersData}
            sowings={sowings}
            overduePlants={attentionPlants}
            beds={beds}
            displayName={displayName}
            maxItems={3}
          />

          {/* Växtpuls flyttad in i "Utforska din odling" för att undvika dubblering med TodayInGarden */}

          {/* Veckosammanfattning – komprimerad */}
          {adaptivePlants.length > 0 && <PlantWeeklyCareSummary variant="compact" />}

          {/* Mer från din odling – kollapsbar */}
          <CollapsibleSection open={moreOpen} onToggle={() => setMoreOpen(v => !v)} title="Mer från din odling" subtitle="Statistik, senaste sådder och genvägar">
            {trialDaysLeft !== null && (
              <Card className="border-accent/25 bg-gradient-to-r from-accent/8 via-card to-primary/8">
                <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/12 flex items-center justify-center shrink-0"><Crown className="h-5 w-5 text-accent" /></div>
                    <div>
                      <p className="font-semibold text-sm">{trialDaysLeft === 0 ? 'Din provperiod går ut idag' : `Din provperiod går ut om ${trialDaysLeft} ${trialDaysLeft === 1 ? 'dag' : 'dagar'}`}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Behåll obegränsad historik, mer Gro och full statistik.</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate('/app/premium')}><Crown className="h-4 w-4" /> Behåll Plus <ArrowRight className="h-3.5 w-3.5" /></Button>
                </CardContent>
              </Card>
            )}

            {showWelcomeBack && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/12 flex items-center justify-center"><Hand className="h-5 w-5 text-primary" /></div>
                    <div>
                      <p className="font-semibold text-sm">Välkommen tillbaka{displayName ? `, ${displayName}` : ''}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Det har gått {daysSinceLastActivity} dagar. Idag-listan hjälper dig hitta tillbaka.</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/app/timeline')}><Leaf className="h-4 w-4" /> Se vad som hänt</Button>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => navigate('/app/beds')} className="rounded-2xl border border-border/60 bg-card/70 p-3 text-left transition hover:border-primary/30">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{stats?.active_beds ?? 0}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Platser</p>
              </button>
              <button onClick={() => navigate('/app/sowings')} className="rounded-2xl border border-border/60 bg-card/70 p-3 text-left transition hover:border-primary/30">
                <Sprout className="h-4 w-4 text-primary" />
                <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{stats?.sowings_this_year ?? 0}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Sådder</p>
              </button>
              <button onClick={() => navigate('/app/harvests')} className="rounded-2xl border border-border/60 bg-card/70 p-3 text-left transition hover:border-primary/30">
                <Carrot className="h-4 w-4 text-accent" />
                <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{(stats?.harvest_kg ?? 0).toFixed(1)}<span className="text-sm font-semibold text-muted-foreground"> kg</span></p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Skörd</p>
              </button>
            </div>

            <WeeklyGardenSummary sowings={sowings} harvests={harvests} remindersData={remindersData} photos={photos} />
            <DashboardActionCenter climateZone={climateZone} currentMonth={currentMonth} isNewUser={false} onNavigate={navigate} />
            <HarvestValueLine />

            {recentSowings.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Senaste sådder</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {recentSowings.map((sowing: any) => (
                      <button key={sowing.id} onClick={() => navigate('/app/sowings')} className="flex w-full items-center justify-between gap-3 rounded-xl p-2 text-left hover:bg-primary/5">
                        <div className="flex min-w-0 items-center gap-2"><Sprout className="h-3.5 w-3.5 text-primary shrink-0" /><span className="font-medium text-sm truncate">{sowing.variety}</span>{sowing.beds?.name && <span className="text-xs text-muted-foreground truncate">· {sowing.beds.name}</span>}</div>
                        <span className="text-xs text-muted-foreground shrink-0">{sowing.sow_date}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/app/sowings')}><Plus className="h-4 w-4" /> Ny sådd</Button>
              <Button variant="outline" onClick={() => navigate('/app/harvests')}><Carrot className="h-4 w-4" /> Logga skörd</Button>
              <Button variant="outline" onClick={() => navigate('/app/photos')}><Camera className="h-4 w-4" /> Lägg till foto</Button>
            </div>

            {showSeasonWrap && (
              <Card className="border-accent/25 bg-accent/5">
                <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3"><Leaf className="h-5 w-5 text-accent" /><div><p className="font-semibold text-sm">Dags att summera säsongen</p><p className="text-xs text-muted-foreground mt-0.5">Spara lärdomarna medan du fortfarande minns detaljerna.</p></div></div>
                  <Button size="sm" onClick={() => setWrapOpen(true)}><Leaf className="h-4 w-4" /> Summera säsongen</Button>
                </CardContent>
              </Card>
            )}
          </CollapsibleSection>

          <SeasonWrapDialog open={wrapOpen} onOpenChange={setWrapOpen} beds={beds} year={currentYear} />
        </>
      )}
    </div>
  );
};

function CollapsibleSection({ open, onToggle, title, subtitle, children }: { open: boolean; onToggle: () => void; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.75rem] border border-border/50 bg-card/50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-[1.75rem] px-4 py-3 text-left transition-colors hover:bg-muted/20 sm:px-5 sm:py-4"
      >
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="space-y-4 border-t border-border/40 p-4 sm:p-5">{children}</div>}
    </section>
  );
}

function PlantOnlyDashboard({
  plants,
  weather,
  rainData,
  climateZone,
  remindersData,
  displayName,
  moreOpen,
  setMoreOpen,
  trialDaysLeft,
  showWelcomeBack,
  daysSinceLastActivity,
  onNavigate,
}: {
  plants: any[];
  weather: any;
  rainData: any;
  climateZone: number;
  remindersData: any;
  displayName: string;
  moreOpen: boolean;
  setMoreOpen: (updater: (v: boolean) => boolean) => void;
  trialDaysLeft: number | null;
  showWelcomeBack: boolean;
  daysSinceLastActivity: number | null;
  onNavigate: (path: string) => void;
}) {
  const averageHealth = plants.length ? Math.round(plants.reduce((sum, plant) => sum + plant.care_profile.healthScore, 0) / plants.length) : 0;
  const personalRhythms = plants.filter(plant => plant.care_profile.confidence === 'personal').length;
  const attention = plants.filter(plant => ['urgent', 'due'].includes(plant.care_profile.status)).length;
  const attentionPlants = plants.filter(plant => plant.care_profile.status !== 'good');

  return (
    <>
      <TodayInGarden
        weather={weather}
        rainData={rainData}
        climateZone={climateZone}
        remindersData={remindersData}
        sowings={[]}
        overduePlants={attentionPlants}
        beds={[]}
        displayName={displayName}
        maxItems={3}
      />

      <PlantCareSpotlight plants={attentionPlants} />

      <PlantWeeklyCareSummary variant="compact" />

      <CollapsibleSection open={moreOpen} onToggle={() => setMoreOpen(v => !v)} title="Mer från dina växter" subtitle="Nyckeltal och genvägar">
        {trialDaysLeft !== null && (
          <Card className="border-accent/25 bg-gradient-to-r from-accent/8 via-card to-primary/8">
            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/12 flex items-center justify-center shrink-0"><Crown className="h-5 w-5 text-accent" /></div>
                <div>
                  <p className="font-semibold text-sm">{trialDaysLeft === 0 ? 'Din provperiod går ut idag' : `Din provperiod går ut om ${trialDaysLeft} ${trialDaysLeft === 1 ? 'dag' : 'dagar'}`}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Behåll obegränsad historik och mer Gro.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => onNavigate('/app/premium')}><Crown className="h-4 w-4" /> Behåll Plus</Button>
            </CardContent>
          </Card>
        )}

        {showWelcomeBack && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/12 flex items-center justify-center"><Hand className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="font-semibold text-sm">Välkommen tillbaka{displayName ? `, ${displayName}` : ''}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Det har gått {daysSinceLastActivity} dagar. Börja med en snabbkoll.</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onNavigate('/app/my-plants')}><HeartPulse className="h-4 w-4" /> Se växtpulsen</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => onNavigate('/app/my-plants')} className="rounded-2xl border border-border/60 bg-card/70 p-3 text-left transition hover:border-primary/30">
            <HeartPulse className="h-4 w-4 text-primary" />
            <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{attention}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Behöver koll</p>
          </button>
          <button onClick={() => onNavigate('/app/my-plants')} className="rounded-2xl border border-border/60 bg-card/70 p-3 text-left transition hover:border-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{averageHealth}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Snitthälsa</p>
          </button>
          <button onClick={() => onNavigate('/app/my-plants')} className="rounded-2xl border border-border/60 bg-card/70 p-3 text-left transition hover:border-primary/30">
            <Brain className="h-4 w-4 text-primary" />
            <p className="mt-2 text-2xl font-bold tabular-nums leading-none">{personalRhythms}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Personliga rytmer</p>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onNavigate('/app/my-plants')}><HeartPulse className="h-4 w-4" /> Mina växter</Button>
          <Button variant="outline" onClick={() => onNavigate('/app/photos')}><Camera className="h-4 w-4" /> Lägg till foto</Button>
          <Button variant="outline" onClick={() => onNavigate('/app/gro')}><Sparkles className="h-4 w-4" /> Fråga Gro</Button>
        </div>
      </CollapsibleSection>
    </>
  );
}

function SeasonWrapDialog({ open, onOpenChange, beds, year }: { open: boolean; onOpenChange: (open: boolean) => void; beds: any[]; year: number }) {
  const queryClient = useQueryClient();
  const [currentBedIndex, setCurrentBedIndex] = useState(0);
  const [forms, setForms] = useState<Record<string, { went_well: string; didnt_work: string; grow_again: string; learnings: string }>>({});
  const saveMutation = useMutation({ mutationFn: async () => { for (const bed of beds) { const form = forms[bed.id]; if (!form) continue; await api.upsertSeasonSummary({ bed_id: bed.id, year, went_well: form.went_well, didnt_work: form.didnt_work, grow_again: form.grow_again, learnings: form.learnings }); } }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['season-summaries'] }); toast({ title: 'Säsongssammanfattningen är sparad 🍂' }); onOpenChange(false); }, onError: () => toast({ title: 'Kunde inte spara', variant: 'destructive' }) });
  if (!beds.length) return null;
  const bed = beds[currentBedIndex];
  const form = forms[bed?.id] || { went_well: '', didnt_work: '', grow_again: '', learnings: '' };
  const updateForm = (field: string, value: string) => setForms(previous => ({ ...previous, [bed.id]: { ...form, [field]: value } }));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><Leaf className="h-5 w-5 text-accent" /> Säsongsavslut {year} – {bed?.name}</DialogTitle><p className="text-xs text-muted-foreground">Plats {currentBedIndex + 1} av {beds.length}</p></DialogHeader><div className="space-y-4"><div><label className="text-sm font-medium mb-1.5 block">Vad gick bra?</label><Textarea placeholder="Till exempel: tomaterna gav jämn och tidig skörd" value={form.went_well} onChange={event => updateForm('went_well', event.target.value)} /></div><div><label className="text-sm font-medium mb-1.5 block">Vad fungerade inte?</label><Textarea placeholder="Till exempel: morötterna blev små och ojämna" value={form.didnt_work} onChange={event => updateForm('didnt_work', event.target.value)} /></div><div><label className="text-sm font-medium mb-1.5 block">Odla samma saker här nästa år?</label><Select value={form.grow_again} onValueChange={value => updateForm('grow_again', value)}><SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger><SelectContent><SelectItem value="yes">Ja</SelectItem><SelectItem value="no">Nej</SelectItem><SelectItem value="partly">Delvis</SelectItem></SelectContent></Select></div><div><label className="text-sm font-medium mb-1.5 block">Viktigaste lärdomen</label><Textarea placeholder="Vad vill du att nästa års version av dig ska komma ihåg?" value={form.learnings} onChange={event => updateForm('learnings', event.target.value)} /></div><div className="flex items-center justify-between pt-2"><Button variant="outline" size="sm" disabled={currentBedIndex === 0} onClick={() => setCurrentBedIndex(index => index - 1)}>Föregående</Button>{currentBedIndex < beds.length - 1 ? <Button size="sm" onClick={() => setCurrentBedIndex(index => index + 1)}>Nästa plats</Button> : <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Sparar…' : 'Spara allt'}</Button>}</div></div></DialogContent></Dialog>;
}

export default Dashboard;
