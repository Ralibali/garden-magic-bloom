import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Plus, Search, Sparkles, Sprout, Pencil, AlertTriangle, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import AppEmptyState from '@/components/AppEmptyState';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';
import { getExpiryStatus, EXPIRY_LABELS, type ExpiryStatus } from '@/lib/seedExpiry';
import { cn } from '@/lib/utils';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

const EMPTY_FORM = { variety: '', brand: '', quantity: '', expiry_date: '', notes: '' };
type StatusFilter = 'alla' | 'ok' | 'soon' | 'expired';

const SeedInventory = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alla');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editing, setEditing] = useState<any>(null);

  const { data: seeds, isLoading } = useQuery({
    queryKey: ['seed-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase.from('seed_inventory').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      const { error } = await supabase.from('seed_inventory').insert({
        user_id: userId,
        variety: form.variety.trim(),
        brand: form.brand.trim() || null,
        quantity: form.quantity.trim() || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seed-inventory'] });
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
      toast({ title: 'Frö tillagt! 🌱' });
    },
    onError: () => toast({ title: 'Kunde inte spara', variant: 'destructive' }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('seed_inventory').update({
        variety: editing.variety.trim(),
        brand: editing.brand?.trim() || null,
        quantity: editing.quantity?.trim() || null,
        expiry_date: editing.expiry_date || null,
        notes: editing.notes?.trim() || null,
      }).eq('id', editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seed-inventory'] });
      setEditing(null);
      toast({ title: 'Fröet uppdaterat ✏️' });
    },
    onError: () => toast({ title: 'Kunde inte spara ändringarna', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seed_inventory').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seed-inventory'] });
      toast({ title: 'Frö borttaget' });
    },
  });

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return seeds?.filter((s: any) => {
      const matchesQuery = !q || s.variety?.toLowerCase().includes(q) || s.brand?.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (statusFilter === 'alla') return true;
      return getExpiryStatus(s.expiry_date) === statusFilter;
    });
  }, [seeds, q, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { alla: seeds?.length ?? 0, ok: 0, soon: 0, expired: 0 };
    for (const s of seeds || []) {
      const st = getExpiryStatus(s.expiry_date);
      if (st !== 'none') c[st] += 1;
    }
    return c;
  }, [seeds]);

  const seedForm = (state: any, setState: (v: any) => void, onSave: () => void, pending: boolean) => (
    <div className="space-y-3 pt-2">
      <Input placeholder="Sort *" value={state.variety} onChange={e => setState({ ...state, variety: e.target.value })} />
      <Input placeholder="Märke (t.ex. Impecta, Nelson Garden)" value={state.brand || ''} onChange={e => setState({ ...state, brand: e.target.value })} />
      <Input placeholder="Antal / mängd" value={state.quantity || ''} onChange={e => setState({ ...state, quantity: e.target.value })} />
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Bäst före (valfritt)</label>
        <Input type="date" value={state.expiry_date || ''} onChange={e => setState({ ...state, expiry_date: e.target.value })} />
      </div>
      <Textarea placeholder="Anteckningar" value={state.notes || ''} onChange={e => setState({ ...state, notes: e.target.value })} />
      <Button onClick={onSave} disabled={!state.variety?.trim() || pending} className="w-full">
        {pending ? 'Sparar…' : 'Spara'}
      </Button>
    </div>
  );

  const statusChip = (status: ExpiryStatus) => {
    if (status === 'none') return null;
    return (
      <span className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
        status === 'expired' && 'bg-destructive/10 text-destructive',
        status === 'soon' && 'bg-warning/15 text-warning-foreground',
        status === 'ok' && 'bg-primary/8 text-primary',
      )}>
        {status === 'expired' && <AlertTriangle className="h-2.5 w-2.5" />}
        {status === 'soon' && <Clock className="h-2.5 w-2.5" />}
        {EXPIRY_LABELS[status]}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Ditt fröbibliotek</span>
              <h1 className="page-title">Fröförråd</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Håll koll på sort, märke och bäst-före — och så direkt från förrådet med ett tryck.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Sök sort eller märke…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10 w-full sm:w-56" />
              </div>
              <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Lägg till frö</Button>
            </div>
          </div>
        </section>
      </FadeIn>

      {(seeds?.length ?? 0) > 0 && (
        <FadeIn delay={0.05}>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {([['alla', 'Alla'], ['ok', 'Färska'], ['soon', 'Går ut snart'], ['expired', 'Utgångna']] as [StatusFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                  statusFilter === key
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                )}
              >
                {label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] tabular-nums', statusFilter === key ? 'bg-primary-foreground/20' : 'bg-muted')}>{counts[key]}</span>
              </button>
            ))}
          </div>
        </FadeIn>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-[1.35rem]" />)}</div>
      ) : !filtered?.length ? (
        <AppEmptyState
          icon={Package}
          title={search || statusFilter !== 'alla' ? 'Inga frön matchar' : 'Bygg upp ditt fröförråd'}
          description={search ? 'Prova ett annat sortnamn eller märke.' : statusFilter !== 'alla' ? 'Inga frön har den här statusen.' : 'Lägg till dina fröpåsar så vet du vad du har hemma — och så dem direkt härifrån när det är dags.'}
          actionLabel={search || statusFilter !== 'alla' ? 'Visa alla frön' : 'Lägg till första fröet'}
          onAction={() => (search || statusFilter !== 'alla' ? (setSearch(''), setStatusFilter('alla')) : setDialogOpen(true))}
        />
      ) : (
        <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((seed: any) => {
            const status = getExpiryStatus(seed.expiry_date);
            return (
              <StaggerItem key={seed.id}>
                <Card className={cn('group h-full hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[var(--card-shadow-hover)]', status === 'expired' && 'border-destructive/30 bg-destructive/5')}>
                  <CardContent className="flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/9 text-primary"><Package className="h-4 w-4" /></div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{seed.variety}</p>
                          {seed.brand && <p className="truncate text-xs text-muted-foreground">{seed.brand}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing({ ...seed })} aria-label={`Redigera ${seed.variety}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <ConfirmDeleteButton itemName={`fröet ${seed.variety}`} description="Fröet tas bort från ditt förråd." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(seed.id)} />
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {statusChip(status)}
                      {seed.expiry_date && status !== 'none' && <span className="text-[10px] text-muted-foreground">{seed.expiry_date}</span>}
                      {seed.quantity && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{seed.quantity}</span>}
                    </div>

                    {seed.notes && <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground">{seed.notes}</p>}

                    <div className="mt-auto pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1.5 border-primary/25 text-primary hover:bg-primary/8"
                        onClick={() => navigate('/app/sowings', { state: { prefill: { variety: seed.variety, brand: seed.brand || '' } } })}
                      >
                        <Sprout className="h-3.5 w-3.5" /> Så detta frö
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lägg till frö</DialogTitle></DialogHeader>
          {seedForm(form, setForm, () => createMutation.mutate(), createMutation.isPending)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Redigera frö</DialogTitle></DialogHeader>
          {editing && seedForm(editing, setEditing, () => editMutation.mutate(), editMutation.isPending)}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeedInventory;
