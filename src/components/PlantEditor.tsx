import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ManagedPlant } from '@/lib/cultivations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

export default function PlantEditor({ plant }: { plant: ManagedPlant }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [interval, setInterval] = useState('7');
  const [fertilizing, setFertilizing] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const mutation = useMutation({ mutationFn: async () => {
    if ((!name.trim() && !plant.plant_id) || name.trim().length > 120) throw new Error('Ge växten ett namn med högst 120 tecken.');
    if (!Number.isInteger(Number(interval)) || Number(interval) < 2 || Number(interval) > 30) throw new Error('Startintervallet ska vara ett heltal mellan 2 och 30 dagar.');
    if (fertilizing && (!Number.isInteger(Number(fertilizing)) || Number(fertilizing) < 1 || Number(fertilizing) > 365)) throw new Error('Gödslingsintervallet ska vara 1–365 dagar eller tomt.');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Logga in igen för att spara.');
    const { data, error: saveError } = await supabase.from('my_plants').update({ custom_name: name.trim() || null, location: location.trim() || null, watering_interval_days: Number(interval), fertilizing_interval_days: fertilizing ? Number(fertilizing) : null, notes: notes.trim() || null }).eq('id', plant.id).eq('user_id', user.id).select('id').single();
    if (saveError || !data) throw new Error('Ändringarna kunde inte sparas. Din text finns kvar.');
  }, onSuccess: () => {
    for (const key of ['my-plants', 'adaptive-care-plants', 'plant-weekly-summary', 'photo-plants', 'plant-photos', 'garden-diary', 'cultivations']) void queryClient.invalidateQueries({ queryKey: [key] });
    toast({ title: 'Växten är uppdaterad' }); setOpen(false);
  }, onError: e => setError(e.message) });
  const openChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next && dirty) { setDiscard(true); return; }
    if (next) { setName(plant.custom_name || ''); setLocation(plant.location || ''); setInterval(String(plant.watering_interval_days || 7)); setFertilizing(plant.fertilizing_interval_days ? String(plant.fertilizing_interval_days) : ''); setNotes(plant.notes || ''); setDirty(false); setDiscard(false); setError(''); }
    setOpen(next);
  };
  return <Dialog open={open} onOpenChange={openChange}><DialogTrigger asChild><Button variant="outline"><Pencil className="mr-2 h-4 w-4" />Redigera växt</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>En växt som följer med livet</DialogTitle><DialogDescription>Uppdatera namn, placering och skötsel. Startintervallet hjälper appen uppskatta nästa jordkontroll.</DialogDescription></DialogHeader><form onSubmit={e => { e.preventDefault(); setError(''); mutation.mutate(); }} onChange={() => setDirty(true)}><fieldset disabled={mutation.isPending} className="space-y-4"><div><Label htmlFor="edit-plant-name">Namn</Label><Input id="edit-plant-name" maxLength={120} value={name} onChange={e => setName(e.target.value)} required={!plant.plant_id} placeholder={plant.plants?.name_sv} /></div><div><Label htmlFor="edit-plant-location">Placering</Label><Input id="edit-plant-location" value={location} maxLength={200} onChange={e => setLocation(e.target.value)} placeholder="Till exempel köksfönstret" /></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="edit-plant-interval">Jordkontroll, dagar</Label><Input id="edit-plant-interval" type="number" min={2} max={30} step={1} value={interval} onChange={e => setInterval(e.target.value)} required /></div><div><Label htmlFor="edit-plant-feed">Gödsling, dagar</Label><Input id="edit-plant-feed" type="number" min={1} max={365} step={1} value={fertilizing} onChange={e => setFertilizing(e.target.value)} placeholder="Valfritt" /></div></div><div><Label htmlFor="edit-plant-notes">Mina anteckningar</Label><Textarea id="edit-plant-notes" maxLength={5000} rows={4} value={notes} onChange={e => setNotes(e.target.value)} /></div>{error && <p className="text-sm text-destructive" role="alert">{error}</p>}{discard ? <div className="rounded-xl border bg-muted p-3"><p className="text-sm">Stänga utan att spara ändringarna?</p><div className="mt-3 flex gap-2"><Button type="button" variant="outline" onClick={() => setDiscard(false)}>Fortsätt redigera</Button><Button type="button" variant="destructive" onClick={() => setOpen(false)}>Kasta ändringarna</Button></div></div> : <Button type="submit" className="w-full">{mutation.isPending ? 'Sparar…' : 'Spara ändringar'}</Button>}</fieldset></form></DialogContent></Dialog>;
}
