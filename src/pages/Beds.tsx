import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, LayoutGrid, BookOpen, Save, Loader2, Leaf, Crown, Sparkles } from 'lucide-react';
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
import AppEmptyState from '@/components/AppEmptyState';
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
    <div className="max-w-6xl mx-auto space-y-6">
      <FadeIn>
        <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
          <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Din odlingskarta</span><h1 className="page-title">Mina bäddar</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Samla varje odlingsplats, säsongsanteckning och lärdom där den hör hemma.</p></div>
            <div className="flex items-center gap-2"><FreeLimitBadge current={beds?.length || 0} limit={FREE_BED_LIMIT} label="bäddar" /><Dialog open={open} onOpenChange={(nextOpen) => { if (nextOpen && !isPremium && (beds?.length || 0) >= FREE_BED_LIMIT) { toast({ title: 'Gratisgränsen är nådd', description: 'Plus ger obegränsat antal bäddar.', variant: 'destructive' }); return; } setOpen(nextOpen); }}><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Ny bädd</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Lägg till odlingsplats</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Namn, till exempel Växthuset" value={name} onChange={(event) => setName(event.target.value)} /><Textarea placeholder="Beskrivning (valfritt)" value={description} onChange={(event) => setDescription(event.target.value)} /><Button onClick={() => createMutation.mutate()} disabled={!name.trim() || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Sparar…' : 'Skapa bädd'}</Button></div></DialogContent></Dialog></div>
          </div>
        </section>
      </FadeIn>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-64 rounded-[1.35rem]" />)}</div>
      ) : !beds?.length ? (
        <AppEmptyState icon={LayoutGrid} title="Skapa din första odlingsplats" description="En bädd kan vara en pallkrage, ett växthus, en balkonglåda eller en del av friland. När platsen finns kan sådd, skörd och lärdomar börja hänga ihop." actionLabel="Skapa första bädden" onAction={() => setOpen(true)} secondaryLabel="Se såkalendern" onSecondary={() => navigate('/app/calendar')} />
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {beds.map((bed: any) => {
            const isEditing = editingNotes[bed.id] !== undefined;
            const notesValue = isEditing ? editingNotes[bed.id] : (bed.season_notes || '');
            const lastSummary = getLatestSummary(bed.id);
            return <StaggerItem key={bed.id}><Card className="group relative overflow-hidden hover:-translate-y-1 hover:border-primary/20 hover:shadow-[var(--card-shadow-hover)]"><div className="h-1.5 bg-gradient-to-r from-primary via-primary/65 to-accent/70" /><CardHeader className="pb-3 flex flex-row items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.13em] text-primary/70 mb-1">Odlingsplats</p><CardTitle className="text-xl">{bed.name}</CardTitle></div><ConfirmDeleteButton itemName={bed.name} description="Bädden tas bort. Kontrollera först om sådder eller skördar är kopplade till den." disabled={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(bed.id)} /></CardHeader><CardContent className="space-y-4">{bed.description && <p className="text-sm leading-relaxed text-muted-foreground">{bed.description}</p>}{lastSummary && <div className="rounded-2xl border border-accent/15 bg-accent/5 p-3"><div className="flex items-center gap-1.5 mb-1.5"><Leaf className="h-3.5 w-3.5 text-accent" /><span className="text-[10px] font-bold text-accent uppercase tracking-wide">Förra säsongen · {lastSummary.year}</span></div>{lastSummary.went_well && <p className="text-xs line-clamp-2">✓ {lastSummary.went_well}</p>}{lastSummary.learnings && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">💡 {lastSummary.learnings}</p>}</div>}<div><div className="flex items-center gap-1.5 mb-2"><BookOpen className="h-3.5 w-3.5 text-primary" /><span className="text-xs font-semibold">Säsongsanteckningar</span></div><Textarea placeholder="Vad fungerar? Vad vill du ändra?" className="text-xs min-h-[84px] resize-none" value={notesValue} onChange={(event) => setEditingNotes((previous) => ({ ...previous, [bed.id]: event.target.value }))} />{isEditing && <Button size="sm" className="mt-2 gap-1.5 w-full" onClick={() => handleSaveNotes(bed.id)} disabled={savingNotes === bed.id}>{savingNotes === bed.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Spara anteckningar</Button>}</div></CardContent></Card></StaggerItem>;
          })}
        </StaggerContainer>
      )}
    </div>
  );
};

export default Beds;
