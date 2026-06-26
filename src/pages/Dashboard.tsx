import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sprout, Carrot, LayoutGrid, Plus, Thermometer, CalendarDays, Leaf, Crown, ArrowRight, Hand, CloudSun, MapPin, Camera } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import OnboardingFlow from '@/components/OnboardingFlow';
import GettingStartedGuide from '@/components/GettingStartedGuide';
import DashboardActionCenter from '@/components/DashboardActionCenter';
import HarvestValueLine from '@/components/HarvestValueLine';
import TodayInGarden from '@/components/TodayInGarden';
import WeeklyGardenSummary from '@/components/WeeklyGardenSummary';
import { GardenCategory } from '@/lib/gardenModules';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';
import { getGardenForecast, weatherDescription } from '@/lib/gardenWeather';

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
  const { data: overduePlants = [] } = useQuery({
    queryKey: ['overdue-plants'],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.from('my_plants').select('*, plants(name_sv)').order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).filter((plant: any) => {
        if (!plant.last_watered) return true;
        const daysAgo = Math.floor((Date.now() - new Date(plant.last_watered).getTime()) / 86400000);
        return daysAgo >= (plant.watering_interval_days || 7);
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

  const isNewUser = !isLoading && (stats?.active_beds ?? 0) === 0 && (stats?.sowings_this_year ?? 0) === 0;
  const rawName = profile?.display_name?.trim();
  const displayName = rawName ? rawName.split(' ')[0] : '';
  const preferences = ((profile?.preferences as any) || {}) as Record<string, any>;
  const lastActivityValue = preferences.last_active_at || profile?.updated_at;
  const daysSinceLastActivity = lastActivityValue ? Math.floor((Date.now() - new Date(lastActivityValue).getTime()) / 86400000) : null;
  const showWelcomeBack = daysSinceLastActivity !== null && daysSinceLastActivity >= 7;
  const temp = weather?.current?.temperature_2m;
  const minTemp = weather?.daily?.temperature_2m_min?.[0];
  const maxTemp = weather?.daily?.temperature_2m_max?.[0];
  const rainChance = weather?.daily?.precipitation_probability_max?.[0];
  const trialDaysLeft = (() => {
    if (!profile?.premium_expires_at || (profile as any).subscription_status !== 'premium') return null;
    const days = Math.ceil((new Date(profile.premium_expires_at).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 5 ? days : null;
  })();
  const recentSowings = sowings.slice(0, 5);

  return (
    <div className="space-y-6">
      {trialDaysLeft !== null && (
        <FadeIn><Card className="border-accent/25 bg-gradient-to-r from-accent/8 via-card to-primary/8"><CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-accent/12 flex items-center justify-center shrink-0"><Crown className="h-5 w-5 text-accent" /></div><div><p className="font-semibold text-sm">{trialDaysLeft === 0 ? 'Din provperiod går ut idag' : `Din provperiod går ut om ${trialDaysLeft} ${trialDaysLeft === 1 ? 'dag' : 'dagar'}`}</p><p className="text-xs text-muted-foreground mt-0.5">Behåll obegränsad historik, mer Gro och full statistik.</p></div></div><Button size="sm" onClick={() => navigate('/app/premium')}><Crown className="h-4 w-4" /> Behåll Plus <ArrowRight className="h-3.5 w-3.5" /></Button></CardContent></Card></FadeIn>
      )}

      {showWelcomeBack && (
        <FadeIn><Card className="border-primary/20 bg-primary/5"><CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-primary/12 flex items-center justify-center"><Hand className="h-5 w-5 text-primary" /></div><div><p className="font-semibold text-sm">Välkommen tillbaka{displayName ? `, ${displayName}` : ''}</p><p className="text-xs text-muted-foreground mt-0.5">Det har gått {daysSinceLastActivity} dagar. Dagens lista hjälper dig hitta tillbaka utan att läsa ikapp allt.</p></div></div><Button size="sm" variant="outline" onClick={() => navigate('/app/timeline')}><Leaf className="h-4 w-4" /> Se vad som hänt</Button></CardContent></Card></FadeIn>
      )}

      <FadeIn>
        <section className="premium-panel p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><span className="section-kicker mb-3"><MapPin className="h-3.5 w-3.5" /> Klimatzon {climateZone}</span><h1 className="page-title">{displayName ? `Din odling, ${displayName}` : 'Din odling just nu'}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{MONTH_TIPS[currentMonth]}</p></div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-border/65 bg-card/75 px-3.5 py-3"><Thermometer className="h-4 w-4 text-primary" /><p className="mt-2 text-lg font-bold">{temp !== undefined ? `${Math.round(temp)}°` : '–'}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">just nu</p></div>
              <div className="rounded-2xl border border-border/65 bg-card/75 px-3.5 py-3"><CloudSun className="h-4 w-4 text-accent" /><p className="mt-2 text-sm font-bold">{weatherDescription(weather?.current?.weather_code)}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">väder</p></div>
              <div className="rounded-2xl border border-border/65 bg-card/75 px-3.5 py-3"><Thermometer className="h-4 w-4 text-primary" /><p className="mt-2 text-sm font-bold">{minTemp !== undefined && maxTemp !== undefined ? `${Math.round(minTemp)}–${Math.round(maxTemp)}°` : '–'}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">dygn</p></div>
              <div className="rounded-2xl border border-border/65 bg-card/75 px-3.5 py-3"><CloudSun className="h-4 w-4 text-accent" /><p className="mt-2 text-lg font-bold">{rainChance !== undefined ? `${Math.round(rainChance)}%` : '–'}</p><p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground">regnrisk</p></div>
            </div>
          </div>
        </section>
      </FadeIn>

      <TodayInGarden weather={weather} rainData={rainData} climateZone={climateZone} remindersData={remindersData} sowings={sowings} overduePlants={overduePlants} beds={beds} displayName={displayName} />

      {isNewUser ? (
        <GettingStartedGuide />
      ) : (
        <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {isLoading ? [1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-[1.35rem]" />) : <>
            <StaggerItem><Card className="metric-card cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]" onClick={() => navigate('/app/beds')}><CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-primary" /> Aktiva bäddar</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats?.active_beds ?? 0}</p></CardContent></Card></StaggerItem>
            <StaggerItem><Card className="metric-card cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]" onClick={() => navigate('/app/sowings')}><CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><Sprout className="h-4 w-4 text-primary" /> Sådder i år</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats?.sowings_this_year ?? 0}</p></CardContent></Card></StaggerItem>
            <StaggerItem><Card className="metric-card cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)]" onClick={() => navigate('/app/harvests')}><CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><Carrot className="h-4 w-4 text-accent" /> Skörd i år</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{(stats?.harvest_kg ?? 0).toFixed(1)} kg</p></CardContent></Card></StaggerItem>
          </>}
        </StaggerContainer>
      )}

      <WeeklyGardenSummary sowings={sowings} harvests={harvests} remindersData={remindersData} photos={photos} />

      <DashboardActionCenter climateZone={climateZone} currentMonth={currentMonth} isNewUser={!!isNewUser} onNavigate={navigate} />

      <HarvestValueLine />

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        {recentSowings.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Senaste sådder</CardTitle></CardHeader><CardContent><div className="space-y-2.5">{recentSowings.map((sowing: any) => <button key={sowing.id} onClick={() => navigate('/app/sowings')} className="flex w-full items-center justify-between gap-3 rounded-xl p-2 text-left hover:bg-primary/5"><div className="flex min-w-0 items-center gap-2"><Sprout className="h-3.5 w-3.5 text-primary shrink-0" /><span className="font-medium text-sm truncate">{sowing.variety}</span>{sowing.beds?.name && <span className="text-xs text-muted-foreground truncate">· {sowing.beds.name}</span>}</div><span className="text-xs text-muted-foreground shrink-0">{sowing.sow_date}</span></button>)}</div></CardContent></Card>}
        <div className="flex flex-row flex-wrap gap-2 lg:w-48 lg:flex-col"><Button onClick={() => navigate('/app/sowings')} className="gap-2 lg:w-full"><Plus className="h-4 w-4" /> Ny sådd</Button><Button variant="outline" onClick={() => navigate('/app/harvests')} className="gap-2 lg:w-full"><Carrot className="h-4 w-4" /> Logga skörd</Button><Button variant="outline" onClick={() => navigate('/app/photos')} className="gap-2 lg:w-full"><Camera className="h-4 w-4" /> Lägg till foto</Button></div>
      </div>

      {showSeasonWrap && <Card className="border-accent/25 bg-accent/5"><CardContent className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><Leaf className="h-5 w-5 text-accent" /><div><p className="font-semibold text-sm">Dags att summera säsongen</p><p className="text-xs text-muted-foreground mt-0.5">Spara lärdomarna medan du fortfarande minns detaljerna.</p></div></div><Button size="sm" onClick={() => setWrapOpen(true)}><Leaf className="h-4 w-4" /> Summera säsongen</Button></CardContent></Card>}

      <SeasonWrapDialog open={wrapOpen} onOpenChange={setWrapOpen} beds={beds} year={currentYear} />
    </div>
  );
};

function SeasonWrapDialog({ open, onOpenChange, beds, year }: { open: boolean; onOpenChange: (open: boolean) => void; beds: any[]; year: number }) {
  const queryClient = useQueryClient();
  const [currentBedIndex, setCurrentBedIndex] = useState(0);
  const [forms, setForms] = useState<Record<string, { went_well: string; didnt_work: string; grow_again: string; learnings: string }>>({});
  const saveMutation = useMutation({ mutationFn: async () => { for (const bed of beds) { const form = forms[bed.id]; if (!form) continue; await api.upsertSeasonSummary({ bed_id: bed.id, year, went_well: form.went_well, didnt_work: form.didnt_work, grow_again: form.grow_again, learnings: form.learnings }); } }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['season-summaries'] }); toast({ title: 'Säsongssammanfattningen är sparad 🍂' }); onOpenChange(false); }, onError: () => toast({ title: 'Kunde inte spara', variant: 'destructive' }) });
  if (!beds.length) return null;
  const bed = beds[currentBedIndex];
  const form = forms[bed?.id] || { went_well: '', didnt_work: '', grow_again: '', learnings: '' };
  const updateForm = (field: string, value: string) => setForms((previous) => ({ ...previous, [bed.id]: { ...form, [field]: value } }));
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><Leaf className="h-5 w-5 text-accent" /> Säsongsavslut {year} – {bed?.name}</DialogTitle><p className="text-xs text-muted-foreground">Bädd {currentBedIndex + 1} av {beds.length}</p></DialogHeader><div className="space-y-4"><div><label className="text-sm font-medium mb-1.5 block">Vad gick bra?</label><Textarea placeholder="Till exempel: tomaterna gav jämn och tidig skörd" value={form.went_well} onChange={(event) => updateForm('went_well', event.target.value)} /></div><div><label className="text-sm font-medium mb-1.5 block">Vad fungerade inte?</label><Textarea placeholder="Till exempel: morötterna blev små och ojämna" value={form.didnt_work} onChange={(event) => updateForm('didnt_work', event.target.value)} /></div><div><label className="text-sm font-medium mb-1.5 block">Odla samma saker här nästa år?</label><Select value={form.grow_again} onValueChange={(value) => updateForm('grow_again', value)}><SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger><SelectContent><SelectItem value="yes">Ja</SelectItem><SelectItem value="no">Nej</SelectItem><SelectItem value="partly">Delvis</SelectItem></SelectContent></Select></div><div><label className="text-sm font-medium mb-1.5 block">Viktigaste lärdomen</label><Textarea placeholder="Vad vill du att nästa års version av dig ska komma ihåg?" value={form.learnings} onChange={(event) => updateForm('learnings', event.target.value)} /></div><div className="flex items-center justify-between pt-2"><Button variant="outline" size="sm" disabled={currentBedIndex === 0} onClick={() => setCurrentBedIndex((index) => index - 1)}>Föregående</Button>{currentBedIndex < beds.length - 1 ? <Button size="sm" onClick={() => setCurrentBedIndex((index) => index + 1)}>Nästa bädd</Button> : <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Sparar…' : 'Spara allt'}</Button>}</div></div></DialogContent></Dialog>;
}

export default Dashboard;
