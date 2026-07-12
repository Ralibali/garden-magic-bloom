import React, { useMemo, useState } from 'react';
import { Activity, Brain, ChevronRight, Droplets, Filter, Flame, Flower2, HeartPulse, MapPin, Plus, Search, Sparkles, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import PlantDetail from '@/components/PlantDetail';
import PlantCareCheckIn from '@/components/PlantCareCheckIn';
import PlantHealthRing from '@/components/PlantHealthRing';
import PlantMoodAvatar from '@/components/PlantMoodAvatar';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import AppEmptyState from '@/components/AppEmptyState';
import { buildPlantCareProfile, PlantCareProfile, PlantCareStatus } from '@/lib/plantCareIntelligence';
import { recordProductActivity } from '@/lib/analytics';

const LOCATION_SUGGESTIONS = ['Fönsterbräda sovrum', 'Vardagsrum', 'Kök', 'Balkong', 'Växthus', 'Uteplats'];
type FilterMode = 'alla' | 'behover-vatten' | 'snart-vatten' | 'ok';

const STATUS_PRIORITY: Record<PlantCareStatus, number> = { urgent: 0, due: 1, soon: 2, good: 3 };
const STATUS_CLASSES: Record<PlantCareStatus, string> = {
  urgent: 'border-rose-300/40 bg-rose-100/65 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/35 dark:text-rose-300',
  due: 'border-amber-300/45 bg-amber-100/65 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-300',
  soon: 'border-lime-300/45 bg-lime-100/60 text-lime-800 dark:border-lime-800/50 dark:bg-lime-950/30 dark:text-lime-300',
  good: 'border-emerald-300/45 bg-emerald-100/60 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300',
};

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Du behöver vara inloggad.');
  return user.id;
}

function filterStatus(profile: PlantCareProfile): FilterMode {
  if (profile.status === 'urgent' || profile.status === 'due') return 'behover-vatten';
  if (profile.status === 'soon') return 'snart-vatten';
  return 'ok';
}

const MyPlants = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [plantId, setPlantId] = useState('');
  const [loc, setLoc] = useState('');
  const [interval, setInterval] = useState('7');
  const [fertInterval, setFertInterval] = useState('');
  const [notes, setNotes] = useState('');
  const [detailPlant, setDetailPlant] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('alla');
  const [filterLocation, setFilterLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: myPlants = [], isLoading } = useQuery({
    queryKey: ['my-plants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('my_plants').select('*, plants(name_sv, water, light, watering_interval_days)').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: careEvents = [] } = useQuery({
    queryKey: ['plant-care-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plant_care_events' as any).select('*').order('occurred_at', { ascending: false }).limit(1000);
      if (error) { console.warn('[plant_care_events]', error); return []; }
      return (data || []) as any[];
    },
  });

  const { data: wateringLogs = [] } = useQuery({
    queryKey: ['watering-log'],
    queryFn: async () => {
      const { data, error } = await supabase.from('watering_log').select('*').order('watered_at', { ascending: false }).limit(1000);
      if (error) return [];
      return data || [];
    },
  });

  const { data: plantLibrary = [] } = useQuery({
    queryKey: ['plant-library-options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('id, name_sv, category, water, light, watering_interval_days').order('name_sv');
      if (error) return [];
      return data || [];
    },
    staleTime: 3_600_000,
  });

  const plantName = (plant: any) => plant.custom_name || plant.plants?.name_sv || 'Okänd växt';

  const eventsByPlant = useMemo(() => {
    const map = new Map<string, any[]>();
    const add = (plantIdValue: string | null, event: any) => {
      if (!plantIdValue) return;
      const current = map.get(plantIdValue) || [];
      current.push(event);
      map.set(plantIdValue, current);
    };
    careEvents.forEach((event: any) => add(event.plant_id, event));
    wateringLogs.forEach((event: any) => add(event.plant_id, { ...event, event_type: 'watered' }));
    return map;
  }, [careEvents, wateringLogs]);

  const profiles = useMemo(() => {
    const map = new Map<string, PlantCareProfile>();
    myPlants.forEach((plant: any) => map.set(plant.id, buildPlantCareProfile(plant, eventsByPlant.get(plant.id) || [])));
    return map;
  }, [myPlants, eventsByPlant]);

  const uniqueLocations = useMemo(() => [...new Set(myPlants.map((plant: any) => plant.location).filter(Boolean) as string[])].sort(), [myPlants]);

  const filteredPlants = useMemo(() => myPlants
    .filter((plant: any) => {
      const profile = profiles.get(plant.id)!;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!plantName(plant).toLowerCase().includes(query) && !String(plant.location || '').toLowerCase().includes(query)) return false;
      }
      if (filterLocation && plant.location !== filterLocation) return false;
      if (filterMode !== 'alla' && filterStatus(profile) !== filterMode) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const aProfile = profiles.get(a.id)!;
      const bProfile = profiles.get(b.id)!;
      return STATUS_PRIORITY[aProfile.status] - STATUS_PRIORITY[bProfile.status] || aProfile.healthScore - bProfile.healthScore;
    }), [myPlants, profiles, searchQuery, filterLocation, filterMode]);

  const selectedSpecies = plantLibrary.find((plant: any) => plant.id === plantId);
  const attentionCount = myPlants.filter((plant: any) => ['urgent', 'due'].includes(profiles.get(plant.id)?.status || '')).length;
  const thrivingCount = myPlants.filter((plant: any) => (profiles.get(plant.id)?.healthScore || 0) >= 85).length;
  const personalCount = myPlants.filter((plant: any) => profiles.get(plant.id)?.confidence === 'personal').length;
  const bestStreak = Math.max(0, ...myPlants.map((plant: any) => profiles.get(plant.id)?.careStreak || 0));
  const activeFilterCount = [filterMode !== 'alla', Boolean(filterLocation)].filter(Boolean).length;
  const averageHealth = myPlants.length ? Math.round(myPlants.reduce((sum: number, plant: any) => sum + (profiles.get(plant.id)?.healthScore || 0), 0) / myPlants.length) : 0;

  const createMutation = useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase.from('my_plants').insert({
        user_id: userId,
        plant_id: plantId || null,
        custom_name: customName.trim() || null,
        location: loc.trim() || null,
        watering_interval_days: Number.parseInt(interval, 10) || selectedSpecies?.watering_interval_days || 7,
        fertilizing_interval_days: fertInterval ? Number.parseInt(fertInterval, 10) : null,
        last_watered: null,
        notes: notes.trim() || null,
      } as any).select('*, plants(name_sv, water, light, watering_interval_days)').single();
      if (error) throw error;
      return data;
    },
    onSuccess: plant => {
      queryClient.invalidateQueries({ queryKey: ['my-plants'] });
      setOpen(false);
      setCustomName(''); setPlantId(''); setLoc(''); setInterval('7'); setFertInterval(''); setNotes('');
      toast({ title: 'Växten är tillagd 🌿', description: 'Gör en första snabbkontroll så börjar appen lära sig växtens rytm.' });
      void recordProductActivity('plant_added_for_adaptive_care', { plant_id: plant.id, species_selected: Boolean(plantId) });
      setDetailPlant(plant);
    },
    onError: (error: any) => toast({ title: 'Kunde inte lägga till växten', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('my_plants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-plants'] });
      toast({ title: 'Växt borttagen' });
    },
  });

  const handleSpecies = (value: string) => {
    if (value === 'custom') { setPlantId(''); return; }
    setPlantId(value);
    const species = plantLibrary.find((plant: any) => plant.id === value);
    if (species?.watering_interval_days) setInterval(String(species.watering_interval_days));
  };

  const clearFilters = () => { setSearchQuery(''); setFilterMode('alla'); setFilterLocation(''); };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_18%_15%,rgba(190,242,100,.18),transparent_28%),radial-gradient(circle_at_84%_20%,rgba(52,211,153,.2),transparent_34%),linear-gradient(135deg,#0f3d2c_0%,#123f32_52%,#1d5c46_100%)] p-5 shadow-[0_28px_80px_-34px_rgba(15,61,44,.72)] sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/10" />
        <div className="absolute -bottom-24 left-[34%] h-56 w-56 rounded-full bg-lime-300/8 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.08fr_.92fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.07] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/75"><HeartPulse className="h-3.5 w-3.5 text-lime-200" /> Din levande växtsamling</span>
            <h1 className="mt-5 max-w-2xl font-serif text-4xl leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl">{attentionCount ? `${attentionCount} ${attentionCount === 1 ? 'växt vill ha' : 'växter vill ha'} din uppmärksamhet` : myPlants.length ? 'Dina växter är i fin rytm' : 'Lär känna varje växt på riktigt'}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/68 sm:text-base">Varje kontroll bygger ett personligt minne. Appen lär sig hur jorden, ljuset och din omsorg påverkar just varje exemplar hemma hos dig.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {attentionCount > 0 && <Button className="bg-white text-emerald-950 shadow-xl hover:bg-white/92" onClick={() => setFilterMode('behover-vatten')}><Droplets className="h-4 w-4" /> Visa dagens växter</Button>}
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button className={attentionCount ? 'border border-white/15 bg-white/[0.08] text-white shadow-none hover:bg-white/[0.14]' : 'bg-white text-emerald-950 shadow-xl hover:bg-white/92'}><Plus className="h-4 w-4" /> Lägg till växt</Button></DialogTrigger>
                <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-[1.8rem]">
                  <DialogHeader><DialogTitle>Lägg till en växt</DialogTitle><p className="text-sm text-muted-foreground">Välj art när du kan. Då får appen ett bättre startvärde och lär sig sedan just ditt exemplar.</p></DialogHeader>
                  <div className="space-y-4">
                    <div><label className="text-xs font-medium text-muted-foreground">Art eller grundprofil</label><Select value={plantId || 'custom'} onValueChange={handleSpecies}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="custom">Egen eller okänd växt</SelectItem>{plantLibrary.map((plant: any) => <SelectItem key={plant.id} value={plant.id}>{plant.name_sv}</SelectItem>)}</SelectContent></Select></div>
                    <Input placeholder={selectedSpecies ? `Smeknamn, till exempel Min ${selectedSpecies.name_sv}` : 'Namn, till exempel Monstera eller Bosse'} value={customName} onChange={event => setCustomName(event.target.value)} />
                    <div><label className="text-xs font-medium text-muted-foreground">Placering</label><Input className="mt-1.5" list="plant-locations" placeholder="Till exempel vardagsrum eller balkong" value={loc} onChange={event => setLoc(event.target.value)} /><datalist id="plant-locations">{LOCATION_SUGGESTIONS.map(location => <option key={location} value={location} />)}</datalist></div>
                    {selectedSpecies && <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3 text-xs"><p className="font-semibold text-primary">Artens startprofil</p><p className="mt-1 text-muted-foreground">{selectedSpecies.water || 'Kontrollera jorden före vattning.'} {selectedSpecies.light ? `Ljus: ${selectedSpecies.light}.` : ''}</p></div>}
                    <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-muted-foreground">Startintervall</label><Input type="number" value={interval} onChange={event => setInterval(event.target.value)} min="2" max="30" /></div><div><label className="text-xs text-muted-foreground">Gödsling, dagar</label><Input type="number" value={fertInterval} onChange={event => setFertInterval(event.target.value)} placeholder="Valfritt" /></div></div>
                    <p className="-mt-2 text-[11px] text-muted-foreground">Startintervallet är bara en hypotes. Det justeras efter dina kontroller.</p>
                    <Textarea placeholder="Anteckningar, till exempel krukstorlek eller när den köptes (valfritt)" value={notes} onChange={event => setNotes(event.target.value)} />
                    <Button onClick={() => createMutation.mutate()} disabled={(!customName.trim() && !plantId) || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Skapar växtprofil…' : 'Skapa växtprofil'}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] items-center gap-5 rounded-[1.75rem] border border-white/10 bg-black/10 p-4 backdrop-blur-sm sm:p-5">
            <PlantHealthRing score={averageHealth} size="lg" label="samlad hälsa" />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><Activity className="h-4 w-4 text-lime-200" /><p className="mt-2 text-2xl font-bold text-white">{thrivingCount}</p><p className="text-[10px] text-white/50">mår riktigt bra</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><Brain className="h-4 w-4 text-lime-200" /><p className="mt-2 text-2xl font-bold text-white">{personalCount}</p><p className="text-[10px] text-white/50">personliga rytmer</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><Flame className="h-4 w-4 text-amber-200" /><p className="mt-2 text-2xl font-bold text-white">{bestStreak}</p><p className="text-[10px] text-white/50">bästa omsorgsserie</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3"><Flower2 className="h-4 w-4 text-lime-200" /><p className="mt-2 text-2xl font-bold text-white">{myPlants.length}</p><p className="text-[10px] text-white/50">växtprofiler</p></div>
            </div>
          </div>
        </div>
      </section>

      {myPlants.length > 0 && (
        <div className="space-y-3 rounded-[1.5rem] border border-border/60 bg-card/72 p-3 shadow-sm backdrop-blur-xl sm:p-4">
          <div className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Sök växt eller plats…" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="h-11 rounded-xl border-border/60 bg-background/70 pl-9 pr-9" />{searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>}</div>
            <Button variant={showFilters ? 'default' : 'outline'} size="icon" onClick={() => setShowFilters(current => !current)} className="relative h-11 w-11 rounded-xl"><Filter className="h-4 w-4" />{activeFilterCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">{activeFilterCount}</span>}</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {[['alla', 'Alla'], ['behover-vatten', `Behöver dig${attentionCount ? ` · ${attentionCount}` : ''}`], ['snart-vatten', 'Snart'], ['ok', 'I bra rytm']].map(([value, label]) => <button key={value} onClick={() => setFilterMode(value as FilterMode)} className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${filterMode === value ? 'border-primary/30 bg-primary/10 text-primary shadow-sm' : 'border-border/70 bg-background/60 text-muted-foreground hover:border-primary/25 hover:text-foreground'}`}>{label}</button>)}
          </div>
          {showFilters && <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-muted/25 p-3"><div><label className="mb-1 block text-xs text-muted-foreground">Placering</label><Select value={filterLocation || 'all'} onValueChange={value => setFilterLocation(value === 'all' ? '' : value)}><SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alla placeringar</SelectItem>{uniqueLocations.map(location => <SelectItem key={location} value={location}>{location}</SelectItem>)}</SelectContent></Select></div>{activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Rensa</Button>}</div>}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-[390px] rounded-[1.8rem]" />)}</div>
      ) : !myPlants.length ? (
        <AppEmptyState icon={Flower2} title="Lägg till din första växt" description="Skapa en profil, gör en snabb jord- och hälsokontroll och låt appen börja lära sig när just din växt behöver vatten." actionLabel="Lägg till växt" onAction={() => setOpen(true)} secondaryLabel="Öppna växtbiblioteket" onSecondary={() => navigate('/app/plants')} />
      ) : !filteredPlants.length ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">Inga växter matchar filtret.</p><Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">Rensa filter</Button></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPlants.map((plant: any) => {
            const profile = profiles.get(plant.id)!;
            return (
              <Card key={plant.id} className={`group relative overflow-hidden rounded-[1.8rem] border bg-card/88 shadow-[0_18px_45px_-32px_rgba(16,85,48,.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_-28px_rgba(16,85,48,.4)] ${profile.status === 'urgent' ? 'border-rose-300/50' : 'border-border/65'}`}>
                <div className={`h-1.5 w-full ${profile.status === 'urgent' ? 'bg-gradient-to-r from-rose-400 via-orange-400 to-amber-300' : profile.status === 'due' ? 'bg-gradient-to-r from-amber-400 to-lime-400' : 'bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-300'}`} />
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <button onClick={() => setDetailPlant(plant)}><PlantMoodAvatar score={profile.healthScore} status={profile.status} /></button>
                    <button className="min-w-0 flex-1 pt-1 text-left" onClick={() => setDetailPlant(plant)}><div className="flex items-center gap-1"><h2 className="truncate font-serif text-xl">{plantName(plant)}</h2><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></div>{plant.location && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {plant.location}</p>}<Badge variant="outline" className={`mt-2 ${STATUS_CLASSES[profile.status]}`}>{profile.statusLabel}</Badge></button>
                    <ConfirmDeleteButton itemName={plantName(plant)} description="Växtprofilen och dess omsorgshistorik tas bort." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(plant.id)} />
                  </div>

                  <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-[1.35rem] border border-border/55 bg-gradient-to-br from-muted/38 to-background/55 p-3.5">
                    <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Just nu</p><p className="mt-1 font-medium">{profile.healthLabel}</p><p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{profile.reason}</p></div>
                    <PlantHealthRing score={profile.healthScore} size="md" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-2xl border border-border/55 bg-background/60 p-3"><Droplets className="h-4 w-4 text-sky-500" /><p className="mt-2 font-semibold">{profile.recommendedIntervalDays} dagar</p><p className="text-[10px] text-muted-foreground">lärd kontrollrytm</p></div>
                    <div className="rounded-2xl border border-border/55 bg-background/60 p-3"><Brain className="h-4 w-4 text-violet-500" /><p className="mt-2 font-semibold">Nivå {profile.knowledgeLevel}</p><p className="text-[10px] text-muted-foreground">{profile.knowledgeLabel}</p></div>
                  </div>

                  <div className="rounded-2xl bg-muted/28 p-3"><div className="mb-2 flex items-center justify-between text-[10px]"><span className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">Växtkännedom</span><span className="font-medium text-primary">{profile.confidenceLabel}</span></div><div className="h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-lime-400 to-amber-300 transition-all duration-700" style={{ width: `${profile.knowledgeProgress}%` }} /></div>{profile.careStreak >= 2 && <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-300"><Flame className="h-3 w-3" /> {profile.careStreak} vattningar i stabil rytm</p>}</div>

                  <div className="flex gap-2">
                    <PlantCareCheckIn plant={plant} plantName={plantName(plant)} profile={profile} trigger={<Button className="flex-1 gap-2 rounded-xl shadow-sm"><HeartPulse className="h-4 w-4" /> Kolla & vattna</Button>} />
                    <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setDetailPlant(plant)} aria-label={`Öppna ${plantName(plant)}`}><Sparkles className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {detailPlant && <PlantDetail plant={detailPlant} plantName={plantName(detailPlant)} open={Boolean(detailPlant)} onClose={() => setDetailPlant(null)} />}
    </div>
  );
};

export default MyPlants;
