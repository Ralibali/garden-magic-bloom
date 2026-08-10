import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Sprout, Search, Crown, Sparkles, CalendarDays, ArrowRight, ArrowLeft, Pencil, Carrot, MapPin, Camera, BellPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';
import { FreeLimitBadge } from '@/components/PremiumGate';
import { useAuth } from '@/hooks/useAuth';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import AppEmptyState from '@/components/AppEmptyState';
import { recordProductActivity } from '@/lib/analytics';
import { trackOnce } from '@/lib/plausible';
import {
  SOWING_STATUS_ORDER,
  SOWING_STATUS_META,
  SowingStatus,
  buildStatusPatch,
  nextSowingStatus,
  normalizeSowingStatus,
  previousSowingStatus,
  sowingAgeLabel,
  sowingStatusIndex,
} from '@/lib/sowingLifecycle';
import { getHarvestHint } from '@/lib/harvestForecast';
import { addReminder } from '@/lib/reminders';
import AskGroButton from '@/components/AskGroButton';
import { cn } from '@/lib/utils';

const FREE_SOWING_LIMIT = 10;
const SEED_BRAND_SUGGESTIONS = ['Impecta', 'Nelson Garden', 'Runåbergs fröer', 'Lindbloms frö', 'Pelargonia', 'Blomsterlandet', 'Egna frön', 'Annat'];

type StatusFilter = 'alla' | 'aktiva' | SowingStatus;

/** Visuell stegindikator för såddens livscykel. */
const LifecycleProgress = ({ status, plantKind }: { status: string; plantKind?: string }) => {
  const activeIdx = sowingStatusIndex(status, plantKind);
  const order = getSowingStatusOrder(plantKind);
  return (
    <div className="flex items-center gap-1" aria-label={`Status: ${SOWING_STATUS_META[normalizeSowingStatus(status, plantKind)].label}`}>
      {order.map((step, idx) => (
        <div
          key={step}
          title={SOWING_STATUS_META[step].label}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            idx <= activeIdx ? 'bg-primary' : 'bg-muted',
            step === 'done' && idx === activeIdx && 'bg-muted-foreground/60',
          )}
        />
      ))}
    </div>
  );
};


const Sowings = () => {
  const { user } = useAuth();
  const isPremium = user?.subscription_status === 'premium';
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state as any)?.prefill;
  const presetFilter = (location.state as any)?.statusFilter as StatusFilter | undefined;
  const [open, setOpen] = useState(!!prefill);
  const [variety, setVariety] = useState(prefill?.variety || '');
  const [bedId, setBedId] = useState('');
  const [sowDate, setSowDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState('direct');
  const [notes, setNotes] = useState('');
  const [seedBrand, setSeedBrand] = useState(prefill?.brand || prefill?.seed_brand || '');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(presetFilter || 'aktiva');
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (prefill || presetFilter) window.history.replaceState({}, document.title); }, [prefill, presetFilter]);
  useEffect(() => { const handler = (event: MouseEvent) => { if (brandRef.current && !brandRef.current.contains(event.target as Node)) setShowBrandSuggestions(false); }; document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler); }, []);

  const { data: sowingsRaw, isLoading } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: beds } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  const climateZone = profile?.climate_zone ?? 3;

  // Antal foton per sådd — visas som badge på korten
  const { data: photoCounts = {} } = useQuery({
    queryKey: ['sowing-photo-counts'],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data, error } = await supabase.from('plant_photos').select('sowing_id').not('sowing_id', 'is', null);
      if (error) return {};
      const counts: Record<string, number> = {};
      for (const row of data || []) {
        if (row.sowing_id) counts[row.sowing_id] = (counts[row.sowing_id] || 0) + 1;
      }
      return counts;
    },
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { alla: sowingsRaw?.length ?? 0, aktiva: 0 };
    for (const s of sowingsRaw || []) {
      const st = normalizeSowingStatus(s.status);
      counts[st] = (counts[st] || 0) + 1;
      if (st !== 'done') counts.aktiva += 1;
    }
    return counts;
  }, [sowingsRaw]);

  const sowings = useMemo(() => {
    return sowingsRaw?.filter((sowing: any) => {
      const query = search.trim().toLowerCase();
      const matchesQuery = !query || sowing.variety?.toLowerCase().includes(query) || sowing.seed_brand?.toLowerCase().includes(query);
      if (!matchesQuery) return false;
      const st = normalizeSowingStatus(sowing.status);
      if (statusFilter === 'alla') return true;
      if (statusFilter === 'aktiva') return st !== 'done';
      return st === statusFilter;
    });
  }, [sowingsRaw, search, statusFilter]);

  const filteredBrands = SEED_BRAND_SUGGESTIONS.filter((brand) => !seedBrand || brand.toLowerCase().includes(seedBrand.toLowerCase()));

  const createMutation = useMutation({
    mutationFn: () => {
      if (!isPremium && (sowingsRaw?.length ?? 0) >= FREE_SOWING_LIMIT) throw new Error('SOWING_LIMIT');
      return api.createSowing({ variety: variety.trim(), bed_id: bedId || undefined, sow_date: sowDate, type, notes: notes.trim() || undefined, seed_brand: seedBrand.trim() || undefined });
    },
    onSuccess: (sowing) => {
      const wasFirst = (sowingsRaw?.length ?? 0) === 0;
      queryClient.invalidateQueries({ queryKey: ['sowings'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      setOpen(false); setVariety(''); setBedId(''); setNotes(''); setSeedBrand('');
      void recordProductActivity(wasFirst ? 'first_sowing_created' : 'sowing_created', { sowing_id: sowing.id, type });
      if (wasFirst && user?.id) {
        const cultivationType: 'direct' | 'indoor' = type === 'indoor' ? 'indoor' : 'direct';
        trackOnce('First Cultivation Logged', { cultivation_type: cultivationType }, `first_cultivation:${user.id}`);
      }
      toast({ title: 'Sådd registrerad! 🌱' });
    },
    onError: (error: any) => {
      const limitReached = error?.message === 'SOWING_LIMIT' || String(error?.message || '').includes('FREE_SOWING_LIMIT');
      toast({ title: limitReached ? 'Du har nått gratisgränsen' : 'Kunde inte spara sådden', description: limitReached ? 'Gratisversionen innehåller tio sådder. Plus ger obegränsad sålogg.' : error?.message || 'Försök igen.', variant: 'destructive', action: limitReached ? <Button size="sm" variant="outline" onClick={() => navigate('/app/premium')}><Crown className="h-3 w-3 mr-1" /> Visa Plus</Button> : undefined });
      if (limitReached) setOpen(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, any> }) => api.updateSowing(id, patch),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sowings'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      void recordProductActivity('sowing_status_changed', { sowing_id: vars.id, status: vars.patch.status });
      const meta = SOWING_STATUS_META[vars.patch.status as SowingStatus];
      toast({ title: vars.patch.status === 'done' ? 'Sådden är avslutad 🍂' : `Flyttad till ${meta.label.toLowerCase()} ✅`, description: vars.patch.status === 'harvesting' ? 'Glöm inte att logga skörden under Skördelogg.' : undefined });
    },
    onError: (error: any) => toast({ title: 'Kunde inte uppdatera status', description: error?.message, variant: 'destructive' }),
  });

  const editMutation = useMutation({
    mutationFn: () => api.updateSowing(editing.id, {
      variety: editing.variety.trim(),
      bed_id: editing.bed_id || null,
      sow_date: editing.sow_date,
      type: editing.type,
      notes: editing.notes?.trim() || null,
      seed_brand: editing.seed_brand?.trim() || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sowings'] });
      setEditing(null);
      toast({ title: 'Sådden uppdaterad ✏️' });
    },
    onError: (error: any) => toast({ title: 'Kunde inte spara ändringarna', description: error?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteSowing,
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ['sowings'] }); queryClient.invalidateQueries({ queryKey: ['summary-stats'] }); void recordProductActivity('sowing_deleted', { sowing_id: id }); toast({ title: 'Sådd borttagen' }); },
    onError: (error: any) => toast({ title: 'Kunde inte ta bort sådden', description: error?.message, variant: 'destructive' }),
  });

  const reminderMutation = useMutation({
    mutationFn: async (sowing: any) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const ok = await addReminder({
        title: `Skörda ${sowing.variety}`,
        type: 'other',
        date: tomorrow.toISOString().slice(0, 10),
        bed: sowing.beds?.name,
        source_action_id: `harvest-reminder-${sowing.id}`,
      });
      if (!ok) throw new Error('Kunde inte spara påminnelsen');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
      toast({ title: 'Påminnelse skapad 🔔', description: 'Vi påminner dig att skörda imorgon. Du hittar den under Påminnelser.' });
    },
    onError: () => toast({ title: 'Kunde inte skapa påminnelsen', variant: 'destructive' }),
  });

  const openCreate = () => {
    if (!isPremium && (sowingsRaw?.length || 0) >= FREE_SOWING_LIMIT) {
      toast({ title: 'Gratisgränsen är nådd', description: 'Plus ger obegränsad sålogg.', variant: 'destructive' });
      return;
    }
    setOpen(true);
  };

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: 'aktiva', label: 'Aktiva' },
    { key: 'sown', label: SOWING_STATUS_META.sown.label },
    { key: 'indoor', label: SOWING_STATUS_META.indoor.label },
    { key: 'transplanted', label: SOWING_STATUS_META.transplanted.label },
    { key: 'harvesting', label: SOWING_STATUS_META.harvesting.label },
    { key: 'done', label: SOWING_STATUS_META.done.label },
    { key: 'alla', label: 'Alla' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div><span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Din odlingshistorik</span><h1 className="page-title">Sålogg</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Följ varje sådd från frö till skörd. Flytta den vidare i livscykeln med ett tryck — tidslinjen och statistiken hänger med automatiskt.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><FreeLimitBadge current={sowingsRaw?.length || 0} limit={FREE_SOWING_LIMIT} label="sådder" /><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Sök sort eller märke…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10 w-full sm:w-60" /></div><Button className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> Ny sådd</Button></div>
          </div>
        </section>
      </FadeIn>

      {(sowingsRaw?.length ?? 0) > 0 && (
        <FadeIn delay={0.05}>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {FILTERS.map((filter) => {
              const count = statusCounts[filter.key] ?? 0;
              const active = statusFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  onClick={() => setStatusFilter(filter.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border/70 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                  )}
                >
                  {filter.label}
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] tabular-nums', active ? 'bg-primary-foreground/20' : 'bg-muted')}>{count}</span>
                </button>
              );
            })}
          </div>
        </FadeIn>
      )}

      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Lägg till sådd</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Sort, till exempel Tomat – Sungold" value={variety} onChange={(event) => setVariety(event.target.value)} /><div className="relative" ref={brandRef}><Input placeholder="Frömärke eller leverantör" value={seedBrand} onChange={(event) => { setSeedBrand(event.target.value); setShowBrandSuggestions(true); }} onFocus={() => setShowBrandSuggestions(true)} />{showBrandSuggestions && filteredBrands.length > 0 && <div className="absolute z-50 top-full left-0 right-0 mt-2 rounded-2xl border border-border/70 bg-popover/98 p-1.5 shadow-xl">{filteredBrands.map((brand) => <button key={brand} type="button" className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-primary/8" onClick={() => { setSeedBrand(brand); setShowBrandSuggestions(false); }}>{brand}</button>)}</div>}</div><Select value={bedId} onValueChange={setBedId}><SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger><SelectContent>{(beds || []).map((bed) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent></Select><Input type="date" value={sowDate} onChange={(event) => setSowDate(event.target.value)} /><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">Direktsådd</SelectItem><SelectItem value="indoor">Förodling</SelectItem></SelectContent></Select><Textarea placeholder="Anteckningar (valfritt)" value={notes} onChange={(event) => setNotes(event.target.value)} /><Button onClick={() => createMutation.mutate()} disabled={!variety.trim() || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Sparar…' : 'Spara sådd'}</Button></div></DialogContent></Dialog>

      {/* Redigeringsdialog */}
      <Dialog open={!!editing} onOpenChange={(isOpen) => !isOpen && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redigera sådd</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Input placeholder="Sort" value={editing.variety} onChange={(e) => setEditing({ ...editing, variety: e.target.value })} />
              <Input placeholder="Frömärke eller leverantör" value={editing.seed_brand || ''} onChange={(e) => setEditing({ ...editing, seed_brand: e.target.value })} />
              <Select value={editing.bed_id || ''} onValueChange={(v) => setEditing({ ...editing, bed_id: v })}>
                <SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger>
                <SelectContent>{(beds || []).map((bed) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={editing.sow_date} onChange={(e) => setEditing({ ...editing, sow_date: e.target.value })} />
              <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="direct">Direktsådd</SelectItem><SelectItem value="indoor">Förodling</SelectItem></SelectContent>
              </Select>
              <Textarea placeholder="Anteckningar (valfritt)" value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              <Button onClick={() => editMutation.mutate()} disabled={!editing.variety?.trim() || editMutation.isPending} className="w-full">{editMutation.isPending ? 'Sparar…' : 'Spara ändringar'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 rounded-[1.35rem]" />)}</div>
      ) : !sowings?.length ? (
        <AppEmptyState
          icon={Sprout}
          title={search || statusFilter !== 'aktiva' ? 'Ingen sådd matchar' : 'Logga din första sådd'}
          description={search ? 'Prova ett annat sortnamn eller frömärke.' : statusFilter !== 'aktiva' ? 'Det finns inga sådder med den här statusen ännu.' : 'När första sådden finns kan Odlingsdagboken börja bygga din tidslinje, statistik och personliga säsongshistorik.'}
          actionLabel={search || statusFilter !== 'aktiva' ? 'Visa alla aktiva' : 'Lägg till första sådden'}
          onAction={() => { if (search || statusFilter !== 'aktiva') { setSearch(''); setStatusFilter('aktiva'); } else openCreate(); }}
          secondaryLabel={!search && statusFilter === 'aktiva' ? 'Se såkalendern' : undefined}
          onSecondary={!search && statusFilter === 'aktiva' ? () => navigate('/app/calendar') : undefined}
        />
      ) : (
        <StaggerContainer className="grid gap-3">
          {sowings.map((sowing: any) => {
            const status = normalizeSowingStatus(sowing.status);
            const next = nextSowingStatus(status);
            const prev = previousSowingStatus(status);
            const age = sowingAgeLabel(sowing.sow_date);
            const hint = status === 'done' ? null : getHarvestHint(sowing.variety, climateZone);
            return (
              <StaggerItem key={sowing.id}>
                <Card className="group hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--card-shadow-hover)]">
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors', status === 'done' ? 'bg-muted text-muted-foreground' : status === 'harvesting' ? 'bg-accent/10 text-accent' : 'bg-primary/9 text-primary')}>
                          {status === 'harvesting' ? <Carrot className="h-5 w-5" /> : <Sprout className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className={cn('font-semibold truncate', status === 'done' && 'text-muted-foreground')}>{sowing.variety}</p>
                          <p className="mt-1 text-xs text-muted-foreground truncate">
                            <CalendarDays className="mr-1 inline h-3.5 w-3.5" />{sowing.sow_date}{age && <span className="hidden sm:inline"> · {age}</span>}
                            {sowing.beds?.name && <span> · <MapPin className="inline h-3 w-3 -mt-0.5" /> {sowing.beds.name}</span>}
                            {sowing.seed_brand && <span> · {sowing.seed_brand}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hint && (
                          <span
                            title={hint.label}
                            className={cn(
                              'hidden md:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold',
                              hint.kind === 'now' && 'bg-accent/12 text-accent',
                              hint.kind === 'upcoming' && 'bg-muted text-muted-foreground',
                              hint.kind === 'past' && 'bg-muted/60 text-muted-foreground/70',
                            )}
                          >
                            <Carrot className="h-3 w-3" />
                            {hint.shortLabel}
                          </span>
                        )}
                        {hint?.kind === 'now' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-accent hover:text-accent"
                            title="Påminn mig att skörda imorgon"
                            aria-label="Påminn mig att skörda imorgon"
                            disabled={reminderMutation.isPending}
                            onClick={() => reminderMutation.mutate(sowing)}
                          >
                            <BellPlus className="h-4 w-4" />
                          </Button>
                        )}
                        <Badge variant={status === 'done' ? 'outline' : 'secondary'} className="hidden sm:inline-flex">{SOWING_STATUS_META[status].label}</Badge>
                        <AskGroButton
                          source="sowings"
                          prompt={`Min ${sowing.variety} såddes ${sowing.sow_date}${sowing.beds?.name ? ` i ${sowing.beds.name}` : ''} och är just nu i stadiet "${SOWING_STATUS_META[status].label}". Jag odlar i klimatzon ${climateZone}. Ge mig tre konkreta skötseltips för de närmaste två veckorna.`}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditing({ ...sowing })} aria-label={`Redigera ${sowing.variety}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <ConfirmDeleteButton itemName={`sådden ${sowing.variety}`} description="Sådden tas bort från historiken. Kopplade skördar kan påverkas beroende på databasrelationerna." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(sowing.id)} />
                      </div>
                    </div>

                    <LifecycleProgress status={status} />

                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{SOWING_STATUS_META[status].description}{sowing.transplant_date && status !== 'sown' && status !== 'indoor' ? ` · Utplanterad ${sowing.transplant_date}` : ''}</p>
                        {(photoCounts[sowing.id] ?? 0) > 0 && (
                          <button
                            onClick={() => navigate('/app/photos', { state: { filterSowing: sowing.id } })}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                            title="Se foton kopplade till den här sådden"
                          >
                            <Camera className="h-3 w-3" /> {photoCounts[sowing.id]}
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {prev && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-2.5 text-xs text-muted-foreground"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: sowing.id, patch: buildStatusPatch(sowing, prev) })}
                          >
                            <ArrowLeft className="h-3.5 w-3.5" /> {SOWING_STATUS_META[prev].short}
                          </Button>
                        )}
                        {next ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 px-3 text-xs border-primary/25 text-primary hover:bg-primary/8"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: sowing.id, patch: buildStatusPatch(sowing, next) })}
                          >
                            {next === 'done' ? 'Avsluta' : `Markera som ${SOWING_STATUS_META[next].short.toLowerCase()}`} <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-3 text-xs"
                            onClick={() => navigate('/app/harvests', { state: { prefill: { variety: sowing.variety, bed_id: sowing.bed_id, sowing_id: sowing.id } } })}
                          >
                            <Carrot className="h-3.5 w-3.5" /> Logga skörd
                          </Button>
                        )}
                        {status === 'harvesting' && (
                          <Button
                            size="sm"
                            className="h-8 gap-1 px-3 text-xs"
                            onClick={() => navigate('/app/harvests', { state: { prefill: { variety: sowing.variety, bed_id: sowing.bed_id, sowing_id: sowing.id } } })}
                          >
                            <Carrot className="h-3.5 w-3.5" /> Skörda
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
};

export default Sowings;
