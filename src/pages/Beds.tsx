import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, LayoutGrid, BookOpen, Save, Loader2, Leaf, Crown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';
import { FreeLimitBadge } from '@/components/PremiumGate';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import { recordProductActivity } from '@/lib/analytics';

const FREE_BED_LIMIT = 3;

const Beds = () => {
  const { user } = useAuth();
  const isPremium = user?.subscription_status === 'premium';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  const { data: beds, isLoading } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const { data: seasonSummaries } = useQuery({ queryKey: ['season-summaries'], queryFn: () => api.getSeasonSummaries() });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!isPremium && (beds?.length ?? 0) >= FREE_BED_LIMIT) throw new Error('BED_LIMIT');
      return api.createBed({ name: name.trim(), description: description.trim() || undefined });
    },
    onSuccess: (bed) => {
      const wasFirst = (beds?.length ?? 0) === 0;
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      setOpen(false);
      setName('');
      setDescription('');
      void recordProductActivity(wasFirst ? 'first_bed_created' : 'bed_created', { bed_id: bed.id });
      toast({ title: 'Bädd skapad! 🌱' });
    },
    onError: (error: any) => {
      const limitReached = error?.message === 'BED_LIMIT' || String(error?.message || '').includes('FREE_BED_LIMIT');
      toast({
        title: limitReached ? 'Du har nått gratisgränsen' : 'Kunde inte skapa bädden',
        description: limitReached ? 'Gratisversionen innehåller tre bäddar. Plus ger obegränsat antal.' : error?.message || 'Försök igen.',
        variant: 'destructive',
        action: limitReached ? <Button size="sm" variant="outline" onClick={() => navigate('/app/premium')}><Crown className="h-3 w-3 mr-1" /> Visa Plus</Button> : undefined,
      });
      if (limitReached) setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteBed,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      queryClient.invalidateQueries({ queryKey: ['summary-stats'] });
      void recordProductActivity('bed_deleted', { bed_id: id });
      toast({ title: 'Bädd borttagen' });
    },
    onError: (error: any) => toast({ title: 'Kunde inte ta bort bädden', description: error?.message, variant: 'destructive' }),
  });

  const handleSaveNotes = async (bedId: string) => {
    setSavingNotes(bedId);
    try {
      await api.updateBed(bedId, { season_notes: editingNotes[bedId] ?? '' });
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      void recordProductActivity('bed_notes_saved', { bed_id: bedId });
      toast({ title: 'Anteckningar sparade! 📝' });
      setEditingNotes((previous) => { const next = { ...previous }; delete next[bedId]; return next; });
    } catch {
      toast({ title: 'Kunde inte spara', variant: 'destructive' });
    } finally {
      setSavingNotes(null);
    }
  };

  const getLatestSummary = (bedId: string) => {
    const summaries = (seasonSummaries || []).filter((summary: any) => summary.bed_id === bedId);
    return summaries.sort((a: any, b: any) => b.year - a.year)[0] || null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FadeIn><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h1 className="text-2xl sm:text-3xl font-serif flex items-center gap-2"><LayoutGrid className="h-6 w-6 text-primary" /> Mina bäddar</h1><p className="text-muted-foreground text-sm mt-1">Hantera odlingsplatser och säsongsanteckningar</p></div><div className="flex items-center gap-2"><FreeLimitBadge current={beds?.length || 0} limit={FREE_BED_LIMIT} label="bäddar" /><Dialog open={open} onOpenChange={(nextOpen) => { if (nextOpen && !isPremium && (beds?.length || 0) >= FREE_BED_LIMIT) { toast({ title: 'Gratisgränsen är nådd', description: 'Plus ger obegränsat antal bäddar.', variant: 'destructive' }); return; } setOpen(nextOpen); }}><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Ny bädd</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle className="font-serif">Lägg till bädd</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Namn, till exempel Växthuset" value={name} onChange={(event) => setName(event.target.value)} /><Textarea placeholder="Beskrivning (valfritt)" value={description} onChange={(event) => setDescription(event.target.value)} /><Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Sparar…' : 'Spara'}</Button></div></DialogContent></Dialog></div></div></FadeIn>

      {isLoading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-48" />)}</div> : !beds?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground">Inga bäddar ännu. Skapa din första odlingsplats för att komma igång! 🌱</CardContent></Card> : <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{beds.map((bed: any) => { const isEditing = editingNotes[bed.id] !== undefined; const notesValue = isEditing ? editingNotes[bed.id] : (bed.season_notes || ''); const lastSummary = getLatestSummary(bed.id); return <StaggerItem key={bed.id}><Card className="bg-card border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"><CardHeader className="pb-2 flex flex-row items-center justify-between"><CardTitle className="text-lg font-serif">{bed.name}</CardTitle><ConfirmDeleteButton itemName={bed.name} description="Bädden tas bort. Kontrollera först om sådder eller skördar är kopplade till den." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(bed.id)} /></CardHeader><CardContent className="space-y-3">{bed.description && <p className="text-sm text-muted-foreground">{bed.description}</p>}{lastSummary && <div className="bg-accent/5 border border-accent/20 rounded-lg p-2.5"><div className="flex items-center gap-1.5 mb-1"><Leaf className="h-3 w-3 text-accent" /><span className="text-[10px] font-semibold text-accent uppercase tracking-wide">Förra säsongen ({lastSummary.year})</span></div>{lastSummary.went_well && <p className="text-xs line-clamp-2">✓ {lastSummary.went_well}</p>}{lastSummary.learnings && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">💡 {lastSummary.learnings}</p>}</div>}<div><div className="flex items-center gap-1.5 mb-1.5"><BookOpen className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-medium">Säsongsanteckningar</span></div><Textarea placeholder="Vad fungerade? Vad vill du ändra?" className="text-xs min-h-[60px] resize-none" value={notesValue} onChange={(event) => setEditingNotes((previous) => ({ ...previous, [bed.id]: event.target.value }))} />{isEditing && <Button size="sm" className="mt-2 gap-1.5 w-full" onClick={() => handleSaveNotes(bed.id)} disabled={savingNotes === bed.id}>{savingNotes === bed.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Spara anteckningar</Button>}</div></CardContent></Card></StaggerItem>; })}</StaggerContainer>}
    </div>
  );
};

export default Beds;
