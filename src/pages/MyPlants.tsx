import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flower2, Plus, Droplets, Sparkles, Trash2, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useLocation, useNavigate } from 'react-router-dom';
import PlantDetail from '@/components/PlantDetail';

const LOCATION_SUGGESTIONS = ['Fönsterbräda sovrum', 'Vardagsrum', 'Kök', 'Balkong', 'Växthus'];

function daysDiff(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function waterStatus(lastWatered: string | null, interval: number): { label: string; color: string; daysLeft: number | null } {
  const ago = daysDiff(lastWatered);
  if (ago === null) return { label: 'Ej vattnad', color: 'text-destructive', daysLeft: null };
  const left = interval - ago;
  if (left <= 0) return { label: `${Math.abs(left)} dagar sen`, color: 'text-destructive', daysLeft: left };
  if (left <= 2) return { label: `Om ${left} dag${left > 1 ? 'ar' : ''}`, color: 'text-amber-500', daysLeft: left };
  return { label: `Om ${left} dagar`, color: 'text-green-600 dark:text-green-400', daysLeft: left };
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

const MyPlants = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = (location.state as any)?.prefill;

  const [open, setOpen] = useState(!!prefill);
  const [customName, setCustomName] = useState(prefill?.custom_name || '');
  const [plantId, setPlantId] = useState(prefill?.plant_id || '');
  const [loc, setLoc] = useState('');
  const [interval, setInterval] = useState(String(prefill?.watering_interval_days || 7));
  const [fertInterval, setFertInterval] = useState('');
  const [notes, setNotes] = useState('');
  const [detailPlant, setDetailPlant] = useState<any>(null);

  // Clear prefill state
  useEffect(() => {
    if (prefill) window.history.replaceState({}, document.title);
  }, [prefill]);

  const { data: myPlants, isLoading } = useQuery({
    queryKey: ['my-plants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('my_plants').select('*, plants(name_sv)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      const { error } = await supabase.from('my_plants').insert({
        user_id: userId,
        plant_id: plantId || null,
        custom_name: customName || null,
        location: loc || null,
        watering_interval_days: parseInt(interval) || 7,
        fertilizing_interval_days: fertInterval ? parseInt(fertInterval) : null,
        last_watered: new Date().toISOString().split('T')[0],
        notes: notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-plants'] });
      setOpen(false);
      setCustomName(''); setPlantId(''); setLoc(''); setInterval('7'); setFertInterval(''); setNotes('');
      toast({ title: 'Växt tillagd! 🌿' });
    },
  });

  const waterMutation = useMutation({
    mutationFn: async (id: string) => {
      const userId = await getUserId();
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('my_plants').update({ last_watered: today }).eq('id', id);
      await supabase.from('watering_log').insert({ user_id: userId, plant_id: id } as any);
      await supabase.from('plant_logs').insert({ user_id: userId, plant_id: id, log_type: 'watered', note: 'Vattnad' } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-plants'] });
      toast({ title: 'Vattnad! 💧' });
    },
  });

  const fertilizeMutation = useMutation({
    mutationFn: async (id: string) => {
      const userId = await getUserId();
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('my_plants').update({ last_fertilized: today }).eq('id', id);
      await supabase.from('plant_logs').insert({ user_id: userId, plant_id: id, log_type: 'fertilized', note: 'Gödslade' } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-plants'] });
      toast({ title: 'Gödslade! 🌱' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('my_plants').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-plants'] });
      toast({ title: 'Växt borttagen' });
    },
  });

  const plantName = (p: any) => p.custom_name || (p.plants as any)?.name_sv || 'Okänd växt';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Flower2 className="h-6 w-6" /> Mina växter</h1>
          <p className="text-muted-foreground">Krukväxter och inomhusörter</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Ny växt</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Lägg till krukväxt</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Namn (t.ex. Monstera)" value={customName} onChange={e => setCustomName(e.target.value)} />
              <Select value={loc} onValueChange={setLoc}>
                <SelectTrigger><SelectValue placeholder="Plats (valfritt)" /></SelectTrigger>
                <SelectContent>
                  {LOCATION_SUGGESTIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Vattningsintervall (dagar)</label>
                  <Input type="number" value={interval} onChange={e => setInterval(e.target.value)} min="1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Gödslingsintervall (dagar)</label>
                  <Input type="number" value={fertInterval} onChange={e => setFertInterval(e.target.value)} placeholder="Valfritt" />
                </div>
              </div>
              <Textarea placeholder="Anteckningar (valfritt)" value={notes} onChange={e => setNotes(e.target.value)} />
              <Button onClick={() => createMutation.mutate()} disabled={!customName.trim() || createMutation.isPending} className="w-full">
                {createMutation.isPending ? 'Sparar...' : 'Spara'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : !myPlants?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Inga krukväxter ännu. Lägg till din första! 🌿
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {myPlants.map((p: any) => {
            const ws = waterStatus(p.last_watered, p.watering_interval_days || 7);
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="cursor-pointer flex-1" onClick={() => setDetailPlant(p)}>
                      <p className="font-medium text-foreground flex items-center gap-1">{plantName(p)} <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /></p>
                      {p.location && <p className="text-xs text-muted-foreground">{p.location}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(p.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs gap-1 ${ws.color}`}>
                      <Droplets className="h-3 w-3" /> {ws.label}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5 flex-1 text-xs" onClick={() => waterMutation.mutate(p.id)} disabled={waterMutation.isPending}>
                      <Droplets className="h-3.5 w-3.5" /> Vattnad nu
                    </Button>
                    {p.fertilizing_interval_days && (
                      <Button size="sm" variant="outline" className="gap-1.5 flex-1 text-xs" onClick={() => fertilizeMutation.mutate(p.id)} disabled={fertilizeMutation.isPending}>
                        <Sparkles className="h-3.5 w-3.5" /> Gödslade
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Plant detail with log */}
      {detailPlant && (
        <PlantDetail
          plant={detailPlant}
          plantName={plantName(detailPlant)}
          open={!!detailPlant}
          onClose={() => setDetailPlant(null)}
        />
      )}
    </div>
  );
};

export default MyPlants;
