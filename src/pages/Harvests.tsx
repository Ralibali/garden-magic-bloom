import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Carrot } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import { recordProductActivity } from '@/lib/analytics';

const Harvests = () => {
  const queryClient = useQueryClient();
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h1 className="text-2xl font-bold flex items-center gap-2"><Carrot className="h-6 w-6" /> Skördelogg</h1><p className="text-muted-foreground text-sm">Totalt skördat i år: {totalKg.toFixed(1)} kg</p></div><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Registrera skörd</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Registrera skörd</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Sort, till exempel Tomat – Sungold" value={variety} onChange={(event) => setVariety(event.target.value)} /><Select value={bedId} onValueChange={setBedId}><SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger><SelectContent>{(beds || []).map((bed) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent></Select><Input type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} /><Input type="number" min="0" inputMode="numeric" placeholder="Vikt i gram" value={weightGrams} onChange={(event) => setWeightGrams(event.target.value)} /><Textarea placeholder="Anteckningar (valfritt)" value={notes} onChange={(event) => setNotes(event.target.value)} /><Button onClick={() => createMutation.mutate()} disabled={!variety.trim() || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Sparar…' : 'Spara'}</Button></div></DialogContent></Dialog></div>

      {isLoading ? <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-16" />)}</div> : !harvests?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">Ingen skörd registrerad ännu – snart är det dags! 🥕</CardContent></Card> : <div className="space-y-3">{harvests.map((harvest: any) => <Card key={harvest.id}><CardContent className="py-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium truncate">{harvest.variety}</p><p className="text-sm text-muted-foreground truncate">{harvest.harvest_date} · {harvest.weight_grams} g · {harvest.beds?.name || 'Ingen bädd'}</p></div><ConfirmDeleteButton itemName={`skörden ${harvest.variety}`} description="Skörden tas bort permanent ur din statistik och odlingshistorik." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(harvest.id)} /></CardContent></Card>)}</div>}
    </div>
  );
};

export default Harvests;
