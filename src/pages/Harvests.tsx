import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Carrot, Sparkles, Search, Pencil, Scale, TrendingUp, CalendarDays, Sprout } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import AppEmptyState from '@/components/AppEmptyState';
import { recordProductActivity } from '@/lib/analytics';
import SeasonHarvestTicker from '@/components/SeasonHarvestTicker';
import { normalizeSowingStatus } from '@/lib/sowingLifecycle';
import { FadeIn } from '@/components/animations';

const formatWeight = (grams: number) => {
  if (grams >= 1000) return `${(grams / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} kg`;
  return `${grams.toLocaleString('sv-SE')} g`;
};

const Harvests = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as any)?.prefill;
  const [open, setOpen] = useState(!!prefill);
  const [variety, setVariety] = useState(prefill?.variety || '');
  const [bedId, setBedId] = useState(prefill?.bed_id || '');
  const [sowingId, setSowingId] = useState(prefill?.sowing_id || '');
  const [harvestDate, setHarvestDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weightGrams, setWeightGrams] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => { if (prefill) window.history.replaceState({}, document.title); }, [prefill]);

  const { data: harvests, isLoading } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });
  const { data: beds } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const { data: sowings } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });

  // Sådder som går att skörda ifrån (inte avslutade), för kopplingsväljaren
  const harvestableSowings = useMemo(
    () => (sowings || []).filter((s: any) => normalizeSowingStatus(s.status) !== 'done'),
    [sowings],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return harvests;
    return harvests?.filter((h: any) =>
      h.variety?.toLowerCase().includes(query) ||
      h.beds?.name?.toLowerCase().includes(query) ||
      h.sowings?.variety?.toLowerCase().includes(query),
    );
  }, [harvests, search]);

  const yearSummary = useMemo(() => {
    const year = new Date().getFullYear();
    const thisYear = (harvests || []).filter((h: any) => String(h.harvest_date || '').startsWith(String(year)));
    const totalGrams = thisYear.reduce((sum: number, h: any) => sum + (h.weight_grams || 0), 0);
    const byVariety = new Map<string, number>();
    for (const h of thisYear) {
      const key = h.variety || 'Okänd';
      byVariety.set(key, (byVariety.get(key) || 0) + (h.weight_grams || 0));
    }
    let topVariety: string | null = null;
    let topGrams = 0;
    for (const [name, grams] of byVariety) {
      if (grams > topGrams) { topVariety = name; topGrams = grams; }
    }
    return { count: thisYear.length, totalGrams, topVariety, topGrams };
  }, [harvests]);

  const resetForm = () => { setVariety(''); setBedId(''); setSowingId(''); setWeightGrams(''); setNotes(''); };

  const createMutation = useMutation({
    mutationFn: () => api.createHarvest({ variety: variety.trim(), bed_id: bedId || undefined, sowing_id: sowingId || undefined, harvest_date: harvestDate, weight_grams: Number.parseInt(weightGrams, 10) || 0, notes: notes.trim() || undefined }),
    onSuccess: (harvest) => {
      const wasFirst = (harvests?.length ?? 0) === 0;
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      setOpen(false); resetForm();
      void recordProductActivity(wasFirst ? 'first_harvest_created' : 'harvest_created', { harvest_id: harvest.id, weight_grams: harvest.weight_grams });
      toast({ title: 'Skörd registrerad! 🥕' });
    },
    onError: (error: any) => toast({ title: 'Kunde inte registrera skörden', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const editMutation = useMutation({
    mutationFn: () => api.updateHarvest(editing.id, {
      variety: editing.variety.trim(),
      bed_id: editing.bed_id || null,
      sowing_id: editing.sowing_id || null,
      harvest_date: editing.harvest_date,
      weight_grams: Number.parseInt(editing.weight_grams, 10) || 0,
      notes: editing.notes?.trim() || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      setEditing(null);
      toast({ title: 'Skörden uppdaterad ✏️' });
    },
    onError: (error: any) => toast({ title: 'Kunde inte spara ändringarna', description: error?.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteHarvest,
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ['harvests'] }); queryClient.invalidateQueries({ queryKey: ['summary-stats'] }); void recordProductActivity('harvest_deleted', { harvest_id: id }); toast({ title: 'Skörd borttagen' }); },
    onError: (error: any) => toast({ title: 'Kunde inte ta bort skörden', description: error?.message, variant: 'destructive' }),
  });

  // När en sådd väljs i formuläret: föreslå sort + bädd automatiskt
  const pickSowing = (id: string, target: 'create' | 'edit') => {
    if (target === 'create') {
      setSowingId(id);
      const sowing = harvestableSowings.find((s: any) => s.id === id);
      if (sowing) {
        if (!variety.trim()) setVariety(sowing.variety || '');
        if (!bedId && sowing.bed_id) setBedId(sowing.bed_id);
      }
    } else {
      setEditing((prev: any) => ({ ...prev, sowing_id: id }));
    }
  };

  const harvestForm = (
    <div className="space-y-4">
      <Input placeholder="Sort, till exempel Tomat – Sungold" value={variety} onChange={(event) => setVariety(event.target.value)} />
      {harvestableSowings.length > 0 && (
        <Select value={sowingId} onValueChange={(v) => pickSowing(v, 'create')}>
          <SelectTrigger><SelectValue placeholder="Koppla till en sådd (valfritt)" /></SelectTrigger>
          <SelectContent>
            {harvestableSowings.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.variety} · {s.sow_date}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Select value={bedId} onValueChange={setBedId}><SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger><SelectContent>{(beds || []).map((bed) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent></Select>
      <Input type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} />
      <Input type="number" min="0" placeholder="Vikt i gram" value={weightGrams} onChange={(event) => setWeightGrams(event.target.value)} />
      <Textarea placeholder="Anteckningar (valfritt)" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <Button onClick={() => createMutation.mutate()} disabled={!variety.trim() || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Sparar…' : 'Spara skörd'}</Button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div><span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Resultatet av säsongen</span><h1 className="page-title">Skördelogg</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Registrera skörden direkt — koppla den till sådden och se hur din odling växer till riktig statistik.</p></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Sök sort eller bädd…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10 w-full sm:w-56" /></div>
              <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Registrera skörd</Button>
            </div>
          </div>
          <SeasonHarvestTicker harvests={harvests || []} />
        </section>
      </FadeIn>

      {!isLoading && (harvests?.length ?? 0) > 0 && (
        <FadeIn delay={0.05}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className="border-accent/15"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Scale className="h-5 w-5" /></div><div><p className="text-xl font-bold tabular-nums">{formatWeight(yearSummary.totalGrams)}</p><p className="text-xs text-muted-foreground">Skördat i år</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/9 text-primary"><CalendarDays className="h-5 w-5" /></div><div><p className="text-xl font-bold tabular-nums">{yearSummary.count}</p><p className="text-xs text-muted-foreground">Skördetillfällen i år</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/9 text-primary"><TrendingUp className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-xl font-bold">{yearSummary.topVariety || '–'}</p><p className="text-xs text-muted-foreground">Årets toppgröda{yearSummary.topVariety ? ` · ${formatWeight(yearSummary.topGrams)}` : ''}</p></div></CardContent></Card>
          </div>
        </FadeIn>
      )}

      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Registrera skörd</DialogTitle></DialogHeader>{harvestForm}</DialogContent></Dialog>

      {/* Redigeringsdialog */}
      <Dialog open={!!editing} onOpenChange={(isOpen) => !isOpen && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redigera skörd</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <Input placeholder="Sort" value={editing.variety} onChange={(e) => setEditing({ ...editing, variety: e.target.value })} />
              {(sowings?.length ?? 0) > 0 && (
                <Select value={editing.sowing_id || ''} onValueChange={(v) => pickSowing(v, 'edit')}>
                  <SelectTrigger><SelectValue placeholder="Koppla till en sådd (valfritt)" /></SelectTrigger>
                  <SelectContent>{(sowings || []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.variety} · {s.sow_date}</SelectItem>)}</SelectContent>
                </Select>
              )}
              <Select value={editing.bed_id || ''} onValueChange={(v) => setEditing({ ...editing, bed_id: v })}>
                <SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger>
                <SelectContent>{(beds || []).map((bed) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="date" value={editing.harvest_date} onChange={(e) => setEditing({ ...editing, harvest_date: e.target.value })} />
              <Input type="number" min="0" placeholder="Vikt i gram" value={String(editing.weight_grams ?? '')} onChange={(e) => setEditing({ ...editing, weight_grams: e.target.value })} />
              <Textarea placeholder="Anteckningar (valfritt)" value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              <Button onClick={() => editMutation.mutate()} disabled={!editing.variety?.trim() || editMutation.isPending} className="w-full">{editMutation.isPending ? 'Sparar…' : 'Spara ändringar'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 rounded-[1.35rem]" />)}</div>
      ) : !filtered?.length ? (
        <AppEmptyState
          icon={Carrot}
          eyebrow="Första resultatet"
          title={search ? 'Ingen skörd matchar sökningen' : 'Logga din första skörd'}
          description={search ? 'Prova ett annat sortnamn eller bäddnamn.' : 'En ungefärlig vikt räcker. När skörden finns kan du börja jämföra grödor, bäddar och säsonger.'}
          actionLabel={search ? 'Rensa sökningen' : 'Registrera första skörden'}
          onAction={() => (search ? setSearch('') : setOpen(true))}
          secondaryLabel={!search ? 'Se mina sådder' : undefined}
          onSecondary={!search ? () => navigate('/app/sowings') : undefined}
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((harvest: any) => (
            <Card key={harvest.id} className="hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-[var(--card-shadow-hover)]">
              <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Carrot className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{harvest.variety}</p>
                    <p className="mt-1 text-xs text-muted-foreground truncate">
                      {harvest.harvest_date} · {harvest.beds?.name || 'Ingen bädd'}
                      {harvest.sowings?.variety && <span className="inline-flex items-center gap-1"> · <Sprout className="inline h-3 w-3" />{harvest.sowings.variety}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-lg font-bold tabular-nums">{formatWeight(harvest.weight_grams || 0)}</p>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditing({ ...harvest, sowing_id: harvest.sowing_id || '' })} aria-label={`Redigera skörden ${harvest.variety}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <ConfirmDeleteButton itemName={`skörden ${harvest.variety}`} description="Skörden tas bort permanent ur din statistik och odlingshistorik." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(harvest.id)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Harvests;
