import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

type SeasonForm = { went_well: string; didnt_work: string; grow_again: string; learnings: string };
const EMPTY: SeasonForm = { went_well: '', didnt_work: '', grow_again: '', learnings: '' };
export default function SeasonWrapDialog({ open, onOpenChange, beds, year }: { open: boolean; onOpenChange: (open: boolean) => void; beds: { id: string; name: string }[]; year: number }) {
  const queryClient = useQueryClient();
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Partial<SeasonForm>>>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const summaries = useQuery({ queryKey: ['season-summaries', year], queryFn: () => api.getSeasonSummaries(year), enabled: open, staleTime: 0 });
  useEffect(() => { if (open) { setDrafts({}); setIndex(0); setConfirmDiscard(false); } }, [open, year]);
  const formFor = (bedId: string): SeasonForm => {
    const saved = summaries.data?.find(record => record.bed_id === bedId);
    return { went_well: saved?.went_well || '', didnt_work: saved?.didnt_work || '', grow_again: saved?.grow_again || '', learnings: saved?.learnings || '', ...drafts[bedId] };
  };
  const save = useMutation({
    mutationFn: async () => {
      if (summaries.isError || !summaries.data) throw new Error('Tidigare anteckningar kunde inte hämtas.');
      for (const bed of beds) if (drafts[bed.id]) await api.upsertSeasonSummary({ bed_id: bed.id, year, ...formFor(bed.id) });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['season-summaries'] });
      void queryClient.invalidateQueries({ queryKey: ['garden-diary'] });
      toast({ title: 'Säsongens lärdomar är sparade' }); onOpenChange(false);
    },
    onError: () => toast({ title: 'Kunde inte spara', description: 'Dina ändringar finns kvar. Försök igen.', variant: 'destructive' }),
  });
  const bed = beds[Math.min(index, beds.length - 1)];
  const form = bed ? formFor(bed.id) : EMPTY;
  const update = (field: keyof SeasonForm, value: string) => setDrafts(previous => ({ ...previous, [bed.id]: { ...previous[bed.id], [field]: value } }));
  const busy = save.isPending || summaries.isFetching;
  return <Dialog open={open} onOpenChange={next => { if (save.isPending) return; if (!next && Object.keys(drafts).length) { setConfirmDiscard(true); return; } onOpenChange(next); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle className="flex items-center gap-2"><Leaf className="h-5 w-5 text-accent" />Säsongens lärdomar {year}</DialogTitle><DialogDescription>{bed ? `${bed.name} · plats ${Math.min(index + 1, beds.length)} av ${beds.length}` : 'Lägg till en odlingsplats för att sammanfatta säsongen.'}</DialogDescription></DialogHeader>
    {summaries.isPending ? <p role="status">Hämtar dina tidigare lärdomar…</p> : summaries.isError ? <div role="alert"><p>Vi kunde inte hämta dina tidigare anteckningar.</p><Button variant="outline" className="mt-3" onClick={() => void summaries.refetch()}>Försök igen</Button></div> : bed && <div className="space-y-4">
      <div><Label htmlFor="season-well">Vad gick bra?</Label><Textarea id="season-well" className="mt-1.5" value={form.went_well} onChange={event => update('went_well', event.target.value)} disabled={busy} placeholder="Tomaterna gav jämn och tidig skörd…" /></div>
      <div><Label htmlFor="season-improve">Vad fungerade inte?</Label><Textarea id="season-improve" className="mt-1.5" value={form.didnt_work} onChange={event => update('didnt_work', event.target.value)} disabled={busy} /></div>
      <div><Label htmlFor="season-again">Odla samma saker här nästa år?</Label><Select value={form.grow_again} onValueChange={value => update('grow_again', value)} disabled={busy}><SelectTrigger id="season-again" className="mt-1.5"><SelectValue placeholder="Välj" /></SelectTrigger><SelectContent><SelectItem value="yes">Ja</SelectItem><SelectItem value="no">Nej</SelectItem><SelectItem value="partly">Delvis</SelectItem></SelectContent></Select></div>
      <div><Label htmlFor="season-learning">Viktigaste lärdomen</Label><Textarea id="season-learning" className="mt-1.5" value={form.learnings} onChange={event => update('learnings', event.target.value)} disabled={busy} placeholder="Det här vill jag komma ihåg nästa år…" /></div>
      {confirmDiscard && <div role="alert" className="rounded-xl border border-amber-500/40 p-3"><p className="text-sm">Du har osparade ändringar.</p><div className="mt-2 flex gap-2"><Button variant="outline" size="sm" onClick={() => setConfirmDiscard(false)}>Fortsätt skriva</Button><Button variant="destructive" size="sm" onClick={() => onOpenChange(false)}>Kasta ändringar</Button></div></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2"><div className="flex gap-2"><Button variant="outline" size="sm" disabled={index === 0 || busy} onClick={() => setIndex(value => value - 1)}>Föregående</Button>{index < beds.length - 1 && <Button variant="outline" size="sm" disabled={busy} onClick={() => setIndex(value => value + 1)}>Nästa plats</Button>}</div><Button size="sm" onClick={() => save.mutate()} disabled={busy || !Object.keys(drafts).length}>{save.isPending ? 'Sparar…' : 'Spara lärdomarna'}</Button></div>
    </div>}
  </DialogContent></Dialog>;
}
