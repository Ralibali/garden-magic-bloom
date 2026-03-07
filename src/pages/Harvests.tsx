import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Carrot } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

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

  const totalKg = (harvests || []).reduce((s: number, h: any) => s + (h.weight_grams || 0), 0) / 1000;

  const createMutation = useMutation({
    mutationFn: () => api.createHarvest({
      variety,
      bed_id: bedId || undefined,
      harvest_date: harvestDate,
      weight_grams: parseInt(weightGrams) || 0,
      notes: notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      setOpen(false);
      setVariety('');
      setBedId('');
      setWeightGrams('');
      setNotes('');
      toast({ title: 'Skörd registrerad! 🥕' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteHarvest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      toast({ title: 'Skörd borttagen' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Carrot className="h-6 w-6" /> Skördlogg</h1>
          <p className="text-muted-foreground">Totalt skördat i år: {totalKg.toFixed(1)} kg</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Registrera skörd</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrera skörd</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Sort (t.ex. Tomat – Sungold)" value={variety} onChange={e => setVariety(e.target.value)} />
              <Select value={bedId} onValueChange={setBedId}>
                <SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger>
                <SelectContent>
                  {(beds || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={harvestDate} onChange={e => setHarvestDate(e.target.value)} />
              <Input type="number" placeholder="Vikt i gram" value={weightGrams} onChange={e => setWeightGrams(e.target.value)} />
              <Textarea placeholder="Anteckningar (valfritt)" value={notes} onChange={e => setNotes(e.target.value)} />
              <Button onClick={() => createMutation.mutate()} disabled={!variety.trim() || createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Sparar...' : 'Spara'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !harvests?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Ingen skörd registrerad ännu – snart är det dags! 🥕
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {harvests.map((h: any) => (
            <Card key={h.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{h.variety}</p>
                  <p className="text-sm text-muted-foreground">
                    {h.harvest_date} · {h.weight_grams}g · {h.beds?.name || 'Ingen bädd'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(h.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Harvests;
