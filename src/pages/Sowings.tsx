import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Sprout, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const STATUS_LABELS: Record<string, string> = {
  sown: 'Sådd',
  indoor: 'Förodlad',
  transplanted: 'Utplanterad',
  harvesting: 'Skörd',
  done: 'Avslutad',
};

const Sowings = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [variety, setVariety] = useState('');
  const [bedId, setBedId] = useState('');
  const [sowDate, setSowDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState('direct');
  const [notes, setNotes] = useState('');
  const [seedBrand, setSeedBrand] = useState('');
  const [search, setSearch] = useState('');

  const { data: sowings, isLoading } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: beds } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });

  const createMutation = useMutation({
    mutationFn: () => api.createSowing({ variety, bed_id: bedId || undefined, sow_date: sowDate, type, notes: notes || undefined, seed_brand: seedBrand || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sowings'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      setOpen(false);
      setVariety('');
      setBedId('');
      setNotes('');
      setSeedBrand('');
      toast({ title: 'Sådning registrerad! 🌱' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteSowing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sowings'] });
      toast({ title: 'Sådning borttagen' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sprout className="h-6 w-6" /> Sålogg</h1>
          <p className="text-muted-foreground">Alla dina sådder den här säsongen</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Ny sådning</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Lägg till sådning</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Sort (t.ex. Tomat – Sungold)" value={variety} onChange={e => setVariety(e.target.value)} />
              <Input placeholder="Frömärke/leverantör (t.ex. Impecta, Nelson Garden)" value={seedBrand} onChange={e => setSeedBrand(e.target.value)} />
              <Select value={bedId} onValueChange={setBedId}>
                <SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger>
                <SelectContent>
                  {(beds || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={sowDate} onChange={e => setSowDate(e.target.value)} />
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direktsådd</SelectItem>
                  <SelectItem value="indoor">Förodling</SelectItem>
                </SelectContent>
              </Select>
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
      ) : !sowings?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Inga sådder ännu den här säsongen. Dags att komma igång! 🌱
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {sowings.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.variety}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.sow_date} · {(s as any).beds?.name || 'Ingen bädd'}
                    {s.seed_brand && <span> · {s.seed_brand}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{STATUS_LABELS[s.status] || s.status}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sowings;
