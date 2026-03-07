import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Package, Plus, Trash2, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

const SeedInventory = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ variety: '', brand: '', quantity: '', expiry_date: '', notes: '' });

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
        variety: form.variety,
        brand: form.brand || null,
        quantity: form.quantity || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seed-inventory'] });
      setDialogOpen(false);
      setForm({ variety: '', brand: '', quantity: '', expiry_date: '', notes: '' });
      toast({ title: 'Frö tillagt! 🌱' });
    },
    onError: () => toast({ title: 'Kunde inte spara', variant: 'destructive' }),
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

  const q = search.toLowerCase();
  const filtered = seeds?.filter(s =>
    s.variety?.toLowerCase().includes(q) || s.brand?.toLowerCase().includes(q)
  );

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fröförråd</h1>
          <p className="text-muted-foreground text-sm">Håll koll på dina frön – sort, märke och bäst-före.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 w-fit">
          <Plus className="h-4 w-4" /> Lägg till frö
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Sök sort eller märke..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Laddar...</p>
      ) : !filtered?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{search ? 'Inga frön matchade sökningen.' : 'Du har inga frön ännu. Lägg till ditt första!'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(seed => (
            <Card key={seed.id} className={isExpired(seed.expiry_date) ? 'border-destructive/40 bg-destructive/5' : ''}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <span className="truncate">{seed.variety}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(seed.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                {seed.brand && <p>Märke: <span className="text-foreground">{seed.brand}</span></p>}
                {seed.quantity && <p>Antal: <span className="text-foreground">{seed.quantity}</span></p>}
                {seed.expiry_date && (
                  <p className={isExpired(seed.expiry_date) ? 'text-destructive font-medium' : ''}>
                    {isExpired(seed.expiry_date) ? '⚠️ Utgånget' : 'Bäst före'}: <span className="text-foreground">{seed.expiry_date}</span>
                  </p>
                )}
                {seed.notes && <p className="pt-1 italic">{seed.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lägg till frö</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Sort *" value={form.variety} onChange={e => setForm(f => ({ ...f, variety: e.target.value }))} />
            <Input placeholder="Märke (t.ex. Impecta, Nelson Garden)" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
            <Input placeholder="Antal / mängd" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
            <Input type="date" placeholder="Bäst före" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
            <Input placeholder="Anteckningar" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <Button onClick={() => createMutation.mutate()} disabled={!form.variety.trim() || createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeedInventory;
