import { useId, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CROP_PRICES, cropPriceKey, cropPricesFromPreferences, pricePerKgFor } from '@/data/cropPrices';
import { useCropPrices } from '@/hooks/useCropPrices';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

export default function CropPriceEditor({ varieties }: { varieties: string[] }) {
  const queryClient = useQueryClient();
  const prices = useCropPrices();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const crops = [...new Map([...CROP_PRICES.map(crop => crop.label), ...varieties]
    .map(name => [cropPriceKey(name), name])).entries()];
  const save = useMutation({
    mutationFn: async () => {
      const changes: Record<string, number | null> = {};
      for (const [key, text] of Object.entries(draft)) {
        const value = text.trim() === '' ? null : Number(text.trim().replace(',', '.'));
        if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100000)) {
          throw new Error('Ange ett pris mellan 0 och 100 000 kr/kg. Använd komma för decimaler.');
        }
        changes[key] = value;
      }
      const profile = await api.getProfile();
      const prefs = profile?.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences) ? profile.preferences : {};
      const merged = cropPricesFromPreferences(prefs);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) delete merged[key];
        else merged[key] = value;
      }
      await api.updateProfile({ preferences: { ...prefs, crop_prices: merged } });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
      toast({ title: 'Dina grödpriser är sparade', description: 'Skördens uppskattade värde har räknats om.' });
    },
    onError: (error: Error) => setError(error.message || 'Kunde inte spara priserna. Försök igen.'),
  });
  return <>
    <Button variant="outline" onClick={() => { setDraft(Object.fromEntries(Object.entries(prices).map(([key, price]) => [key, price.toLocaleString('sv-SE', { useGrouping: false })]))); setError(''); setOpen(true); }}>Ändra grödpriser</Button>
    <Dialog open={open} onOpenChange={value => { if (!save.isPending) setOpen(value); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Dina priser per gröda</DialogTitle><DialogDescription>Ange ditt uppskattade pris per kilo. Tomt fält använder standardpriset. Priset gäller grödans alla skördar, även tidigare år.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
        {crops.map(([key, name], index) => <div key={key} className="grid grid-cols-[1fr_8rem] items-center gap-3"><label htmlFor={`${id}-${index}`} className="text-sm font-medium">{name}<span className="block text-xs font-normal text-muted-foreground">Standard: {pricePerKgFor(name).toLocaleString('sv-SE')} kr/kg</span></label><Input id={`${id}-${index}`} inputMode="decimal" aria-label={`Pris per kilo ${name}`} value={draft[key] ?? ''} disabled={save.isPending} placeholder="Standard" onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} /></div>)}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Sparar…' : 'Spara priser'}</Button><Button type="button" variant="outline" disabled={save.isPending} onClick={() => setOpen(false)}>Avbryt</Button></div>
      </form>
    </DialogContent></Dialog>
  </>;
}
