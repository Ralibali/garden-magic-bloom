import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Carrot, Scale, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import AppEmptyState from '@/components/AppEmptyState';
import { recordProductActivity } from '@/lib/analytics';

const Harvests = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [variety, setVariety] = useState('');
  const [bedId, setBedId] = useState('');
  const [harvestDate, setHarvestDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weightGrams, setWeightGrams] = useState('');
  const [notes, setNotes] = useState('');

  const { data: harvests, isLoading } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });
  const { data: beds } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const totalKg = (harvests || []).reduce((sum: number, harvest: any) => sum + (harvest.weight_grams || 0), 0) / 1000;

  const createMutation = useMutation({
    mutationFn: () => api.createHarvest({ variety: variety.trim(), bed_id: bedId || undefined, harvest_date: harvestDate, weight_grams: Number.parseInt(weightGrams, 10) || 0, notes: notes.trim() || undefined }),
    onSuccess: (harvest) => {
      const wasFirst = (harvests?.length ?? 0) === 0;
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      setOpen(false); setVariety(''); setBedId(''); setWeightGrams(''); setNotes('');
      void recordProductActivity(wasFirst ? 'first_harvest_created' : 'harvest_created', { harvest_id: harvest.id, weight_grams: harvest.weight_grams });
      toast({ title: 'Skörd registrerad! 🥕' });
    },
    onError: (error: any) => toast({ title: 'Kunde inte registrera skörden', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteHarvest,
    onSuccess: (_, id) => { queryClient.invalidateQueries({ queryKey: ['harvests'] }); queryClient.invalidateQueries({ queryKey: ['summary-stats'] }); void recordProductActivity('harvest_deleted', { harvest_id: id }); toast({ title: 'Skörd borttagen' }); },
    onError: (error: any) => toast({ title: 'Kunde inte ta bort skörden', description: error?.message, variant: 'destructive' }),
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Resultatet av säsongen</span><h1 className="page-title">Skördelogg</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Registrera skörden direkt och se hur din odling växer till riktig statistik.</p></div>
          <Button className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Registrera skörd</Button>
        </div>
        <div className="metric-card relative mt-6 max-w-xs p-4"><div className="flex items-center justify-between"><p className="data-label">Totalt skördat i år</p><Scale className="h-4 w-4 text-primary" /></div><p className="mt-2 text-3xl font-bold tracking-tight">{totalKg.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">kg</span></p></div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Registrera skörd</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Sort, till exempel Tomat – Sungold" value={variety} onChange={(event) => setVariety(event.target.value)} /><Select value={bedId} onValueChange={setBedId}><SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger><SelectContent>{(beds || []).map((bed) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent></Select><Input type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} /><Input type="number" min="0" placeholder="Vikt i gram" value={weightGrams} onChange={(event) => setWeightGrams(event.target.value)} /><Textarea placeholder="Anteckningar (valfritt)" value={notes} onChange={(event) => setNotes(event.target.value)} /><Button onClick={() => createMutation.mutate()} disabled={!variety.trim() || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Sparar…' : 'Spara skörd'}</Button></div></DialogContent></Dialog>

      {isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 rounded-[1.35rem]" />)}</div> : !harvests?.length ? <AppEmptyState icon={Carrot} eyebrow="Första resultatet" title="Logga din första skörd" description="En ungefärlig vikt räcker. När skörden finns kan du börja jämföra grödor, bäddar och säsonger." actionLabel="Registrera första skörden" onAction={() => setOpen(true)} secondaryLabel="Se mina sådder" onSecondary={() => navigate('/app/sowings')} /> : <div className="grid gap-3">{harvests.map((harvest: any) => <Card key={harvest.id} className="hover:-translate-y-0.5 hover:border-accent/20 hover:shadow-[var(--card-shadow-hover)]"><CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Carrot className="h-5 w-5" /></div><div className="min-w-0"><p className="font-semibold truncate">{harvest.variety}</p><p className="mt-1 text-xs text-muted-foreground truncate">{harvest.harvest_date} · {harvest.beds?.name || 'Ingen bädd'}</p></div></div><div className="flex items-center gap-3 shrink-0"><p className="text-lg font-bold tabular-nums">{harvest.weight_grams} g</p><ConfirmDeleteButton itemName={`skörden ${harvest.variety}`} description="Skörden tas bort permanent ur din statistik och odlingshistorik." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(harvest.id)} /></div></CardContent></Card>)}</div>}
    </div>
  );
};

export default Harvests;
