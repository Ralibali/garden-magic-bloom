import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, LayoutGrid } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const Beds = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: beds, isLoading } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });

  const createMutation = useMutation({
    mutationFn: () => api.createBed({ name, description: description || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      setOpen(false);
      setName('');
      setDescription('');
      toast({ title: 'Bädd skapad! 🌱' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteBed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      toast({ title: 'Bädd borttagen' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutGrid className="h-6 w-6" /> Mina bäddar</h1>
          <p className="text-muted-foreground">Hantera dina odlingsbäddar</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Ny bädd</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Lägg till bädd</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Namn (t.ex. Bädd 1, Växthuset)" value={name} onChange={e => setName(e.target.value)} />
              <Textarea placeholder="Beskrivning (valfritt)" value={description} onChange={e => setDescription(e.target.value)} />
              <Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Sparar...' : 'Spara'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : !beds?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Inga bäddar ännu. Skapa din första bädd för att komma igång! 🌱
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {beds.map(bed => (
            <Card key={bed.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{bed.name}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(bed.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              {bed.description && <CardContent><p className="text-sm text-muted-foreground">{bed.description}</p></CardContent>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Beds;
