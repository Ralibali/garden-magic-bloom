import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sprout, Carrot, LayoutGrid, Plus, Thermometer, CalendarDays, Leaf, Snowflake, AlertTriangle, CheckCircle, Info, Droplets, Flower2, CloudRain, Crown, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { getTemperatureTips, getFrostCountdown } from '@/lib/weatherTips';
import { Progress } from '@/components/ui/progress';
import OnboardingFlow from '@/components/OnboardingFlow';
import GettingStartedGuide from '@/components/GettingStartedGuide';
import { GardenCategory } from '@/lib/gardenModules';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';

const MONTH_TIPS: Record<number, string> = {
  1: 'Beställ frön och planera årets odling. Rita en bäddplan!',
  2: 'Dags att förodla chili och paprika inomhus.',
  3: 'Förodla tomater, squash och kål. Börja härda av tidiga plantor.',
  4: 'Direktså rädisor, spenat och ärtor utomhus. Plantera ut lök.',
  5: 'Plantera ut tomater (efter sista frost). Så bönor och gurka.',
  6: 'Gallra, vattna och börja skörda sallat och rädisor.',
  7: 'Full skördesäsong! Bra tid för gallring, ogräsrensning och successionssådd.',
  8: 'Skörda och konservera. Så vintervicker som gröngödsling.',
  9: 'Sista skördarna. Plantera vitlök och höstlök.',
  10: 'Rensa bäddar. Täck med löv eller halm för vintern.',
  11: 'Kompostera och planera nästa säsong. Beställ frökataloger.',
  12: 'Vila! Bläddra i frökataloger och drömma om våren.',
};

const TIP_ICONS = {
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};
const TIP_COLORS = {
  warning: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300',
  success: 'text-green-700 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800 dark:text-green-300',
  info: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const showSeasonWrap = currentMonth === 9 || currentMonth === 10;

  const [wrapOpen, setWrapOpen] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['summary-stats'],
    queryFn: api.getSummaryStats,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: api.getProfile,
  });

  const climateZone = profile?.climate_zone ?? 3;

  const { data: weather } = useQuery({
    queryKey: ['weather', climateZone],
    queryFn: () => api.getWeather(climateZone),
    staleTime: 600_000,
    retry: 1,
  });

  const { data: rainData } = useQuery({
    queryKey: ['rain-history', climateZone],
    queryFn: () => api.getRainHistory(climateZone),
    staleTime: 600_000,
    retry: 1,
  });

  const { data: beds } = useQuery({
    queryKey: ['beds'],
    queryFn: api.getBeds,
  });

  const { data: recentSowings } = useQuery({
    queryKey: ['sowings'],
    queryFn: api.getSowings,
    select: (data) => data?.slice(0, 5),
  });

  const { data: overduePlants } = useQuery({
    queryKey: ['overdue-plants'],
    queryFn: async () => {
      const { data, error } = await (await import('@/integrations/supabase/client')).supabase
        .from('my_plants').select('*, plants(name_sv)').order('created_at', { ascending: false });
      if (error) return [];
      return (data || []).filter((p: any) => {
        if (!p.last_watered) return true;
        const ago = Math.floor((Date.now() - new Date(p.last_watered).getTime()) / 86400000);
        return ago >= (p.watering_interval_days || 7);
      });
    },
  });

  const showOnboarding = !profileLoading && profile && !(profile as any).onboarding_completed;

  const handleOnboardingComplete = async (data: { categories: GardenCategory[]; climateZone: number }) => {
    const currentPrefs = (profile?.preferences as any) || {};
    await api.updateProfile({
      climate_zone: data.climateZone,
      preferences: { ...currentPrefs, garden_categories: data.categories },
      onboarding_completed: true,
    });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  // Show onboarding if not completed
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  const isNewUser = !isLoading && stats && (stats.active_beds ?? 0) === 0 && (stats.sowings_this_year ?? 0) === 0;

  // Use first name only from display_name
  const rawName = profile?.display_name?.trim();
  const firstName = rawName ? rawName.split(' ')[0] : '';
  const displayName = firstName;
  const temp = weather?.current?.temperature_2m;

  // Temperature-based tips
  const weatherTips = temp !== undefined ? getTemperatureTips(temp, climateZone, currentMonth) : [];

  // Frost countdown
  const frost = getFrostCountdown(climateZone);

  return (
    <div className="space-y-6">
      {/* Greeting + weather */}
      <FadeIn>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{displayName ? `God säsong, ${displayName}!` : 'God säsong!'} 🌱</h1>
            <p className="text-muted-foreground">Klimatzon {climateZone} · {MONTH_TIPS[currentMonth]}</p>
          </div>
          {temp !== undefined && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-xl px-4 py-2 w-fit">
              <Thermometer className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">{Math.round(temp)}°C</span>
              <span>just nu</span>
            </div>
          )}
        </div>
      </FadeIn>

      {/* Temperature-based sowing tips */}
      {weatherTips.length > 0 && (
        <div className="space-y-2">
          {weatherTips.map((tip, i) => {
            const Icon = TIP_ICONS[tip.type];
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${TIP_COLORS[tip.type]}`}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{tip.message}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Frost countdown */}
      {frost && !frost.passed && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
          <CardContent className="p-4 flex items-center gap-4">
            <Snowflake className="h-5 w-5 text-blue-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                Sista frost om ca <strong>{frost.daysUntil} dagar</strong>
              </p>
              <p className="text-xs text-muted-foreground">Beräknat datum: {frost.dateStr} (zon {climateZone})</p>
              <Progress value={Math.max(0, 100 - (frost.daysUntil / 90 * 100))} className="mt-2 h-1.5" />
            </div>
          </CardContent>
        </Card>
      )}
      {frost?.passed && currentMonth >= 5 && currentMonth <= 8 && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Sista frosten har passerat – säkert att plantera ut frostkänsliga grödor! 🌿</span>
        </div>
      )}

      {/* Rain-based watering alert */}
      {rainData && rainData.dryDays >= 3 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
          <CardContent className="p-4 flex items-start gap-3">
            <CloudRain className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Inget regn på {rainData.dryDays} dagar – dags att vattna! 💧
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {rainData.totalPrecipitation < 1
                  ? 'Ingen nederbörd alls den senaste veckan.'
                  : `Bara ${rainData.totalPrecipitation.toFixed(1)} mm nederbörd senaste 7 dagarna.`}
                {' '}Ge dina bäddar och krukväxter extra kärlek.
              </p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate('/app/my-plants')}>
                  <Flower2 className="h-3.5 w-3.5" /> Mina växter
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => navigate('/app/beds')}>
                  <LayoutGrid className="h-3.5 w-3.5" /> Mina bäddar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Season wrap-up banner */}
      {showSeasonWrap && (
        <Card className="bg-accent/5 border-accent/30 shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Leaf className="h-5 w-5 text-accent shrink-0" />
              <div>
                <p className="font-medium text-foreground text-sm">Dags att summera säsongen! Vad lärde du dig i år? 🍂</p>
                <p className="text-xs text-muted-foreground mt-0.5">Skriv ner vad som funkade och vad du vill ändra till nästa år.</p>
              </div>
            </div>
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setWrapOpen(true)}>
              <Leaf className="h-4 w-4" /> Summera säsongen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Getting started guide for new users OR Stats cards */}
      {isNewUser ? (
        <GettingStartedGuide />
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {isLoading ? (
            <>{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</>
          ) : (
            <>
              <StaggerItem>
                <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" onClick={() => navigate('/app/beds')}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" /> Aktiva bäddar
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-3xl font-bold">{stats?.active_beds ?? 0}</p></CardContent>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" onClick={() => navigate('/app/sowings')}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Sprout className="h-4 w-4" /> Sådder i år
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-3xl font-bold">{stats?.sowings_this_year ?? 0}</p></CardContent>
                </Card>
              </StaggerItem>
              <StaggerItem>
                <Card className="cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200" onClick={() => navigate('/app/harvests')}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Carrot className="h-4 w-4" /> Skörd i år
                    </CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-3xl font-bold">{(stats?.harvest_kg ?? 0).toFixed(1)} kg</p></CardContent>
                </Card>
              </StaggerItem>
            </>
          )}
        </StaggerContainer>
      )}

      {/* Recent sowings */}
      {recentSowings && recentSowings.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Senaste sådder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSowings.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-sm gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sprout className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{s.variety}</span>
                    {s.beds?.name && <span className="text-muted-foreground shrink-0">· {s.beds.name}</span>}
                  </div>
                  <span className="text-muted-foreground text-xs shrink-0">{s.sow_date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue watering alert */}
      {overduePlants && overduePlants.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <Droplets className="h-4 w-4" /> Behöver vatten idag 💧
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {overduePlants.slice(0, 5).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{p.custom_name || (p.plants as any)?.name_sv}</span>
                  <span className="text-xs text-muted-foreground">{p.location}</span>
                </div>
              ))}
              {overduePlants.length > 5 && <p className="text-xs text-muted-foreground">+{overduePlants.length - 5} till</p>}
            </div>
            <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => navigate('/app/my-plants')}>
              <Flower2 className="h-3.5 w-3.5" /> Visa alla växter
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate('/app/sowings')} className="gap-2">
          <Plus className="h-4 w-4" /> Ny sådning
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/harvests')} className="gap-2">
          <Carrot className="h-4 w-4" /> Logga skörd
        </Button>
        <Button variant="outline" onClick={() => navigate('/app/calendar')} className="gap-2">
          <CalendarDays className="h-4 w-4" /> Såkalender
        </Button>
      </div>

      {/* Season wrap-up dialog */}
      <SeasonWrapDialog open={wrapOpen} onOpenChange={setWrapOpen} beds={beds || []} year={currentYear} />
    </div>
  );
};

function SeasonWrapDialog({ open, onOpenChange, beds, year }: { open: boolean; onOpenChange: (o: boolean) => void; beds: any[]; year: number }) {
  const queryClient = useQueryClient();
  const [currentBedIndex, setCurrentBedIndex] = useState(0);
  const [forms, setForms] = useState<Record<string, { went_well: string; didnt_work: string; grow_again: string; learnings: string }>>({});

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const bed of beds) {
        const form = forms[bed.id];
        if (!form) continue;
        await api.upsertSeasonSummary({
          bed_id: bed.id,
          year,
          went_well: form.went_well,
          didnt_work: form.didnt_work,
          grow_again: form.grow_again,
          learnings: form.learnings,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['season-summaries'] });
      toast({ title: 'Säsongssammanfattning sparad! 🍂' });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Kunde inte spara', variant: 'destructive' });
    },
  });

  if (!beds.length) return null;

  const bed = beds[currentBedIndex];
  const form = forms[bed?.id] || { went_well: '', didnt_work: '', grow_again: '', learnings: '' };

  const updateForm = (field: string, value: string) => {
    setForms(prev => ({ ...prev, [bed.id]: { ...form, [field]: value } }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Leaf className="h-5 w-5 text-accent" />
            Säsongsavslut {year} – {bed?.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">Bädd {currentBedIndex + 1} av {beds.length}</p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Vad gick bra i den här bädden?</label>
            <Textarea placeholder="T.ex. tomaterna gav jättebra skörd..." value={form.went_well} onChange={e => updateForm('went_well', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Vad funkade inte?</label>
            <Textarea placeholder="T.ex. morötterna blev för små..." value={form.didnt_work} onChange={e => updateForm('didnt_work', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Odla samma saker här nästa år?</label>
            <Select value={form.grow_again} onValueChange={v => updateForm('grow_again', v)}>
              <SelectTrigger><SelectValue placeholder="Välj..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Ja</SelectItem>
                <SelectItem value="no">Nej</SelectItem>
                <SelectItem value="partly">Delvis</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Vad lärde jag mig i år?</label>
            <Textarea placeholder="Fritt fält – skriv ner dina insikter" value={form.learnings} onChange={e => updateForm('learnings', e.target.value)} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" disabled={currentBedIndex === 0} onClick={() => setCurrentBedIndex(i => i - 1)}>
              Föregående
            </Button>
            {currentBedIndex < beds.length - 1 ? (
              <Button size="sm" onClick={() => setCurrentBedIndex(i => i + 1)}>
                Nästa bädd →
              </Button>
            ) : (
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Sparar...' : 'Spara allt 🍂'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Dashboard;
