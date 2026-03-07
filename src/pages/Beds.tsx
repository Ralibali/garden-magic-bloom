import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, LayoutGrid, BookOpen, Save, Loader2, Leaf } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animations';
import { FreeLimitBadge } from '@/components/PremiumGate';
import { useAuth } from '@/hooks/useAuth';

const FREE_BED_LIMIT = 3;

const Beds = () => {
  const { user } = useAuth();
  const isPremium = user?.subscription_status === 'premium';
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  const { data: beds, isLoading } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const { data: seasonSummaries } = useQuery({
    queryKey: ['season-summaries'],
    queryFn: () => api.getSeasonSummaries(),
  });

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

  const handleSaveNotes = async (bedId: string) => {
    setSavingNotes(bedId);
    try {
      await api.updateBed(bedId, { season_notes: editingNotes[bedId] ?? '' });
      queryClient.invalidateQueries({ queryKey: ['beds'] });
      toast({ title: 'Anteckningar sparade! 📝' });
      setEditingNotes(prev => { const n = { ...prev }; delete n[bedId]; return n; });
    } catch {
      toast({ title: 'Kunde inte spara', variant: 'destructive' });
    } finally {
      setSavingNotes(null);
    }
  };

  // Get the latest season summary for a bed
  const getLatestSummary = (bedId: string) => {
    if (!seasonSummaries?.length) return null;
    const summaries = seasonSummaries.filter((s: any) => s.bed_id === bedId);
    if (!summaries.length) return null;
    return summaries.sort((a: any, b: any) => b.year - a.year)[0];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif flex items-center gap-2"><LayoutGrid className="h-6 w-6 text-primary" /> Mina bäddar</h1>
            <p className="text-muted-foreground text-sm mt-1">Hantera dina odlingsbäddar och säsongsanteckningar</p>
          </div>
          <div className="flex items-center gap-2">
            <FreeLimitBadge current={beds?.length || 0} limit={FREE_BED_LIMIT} label="bäddar" />
            <Dialog open={open} onOpenChange={(o) => {
              if (o && !isPremium && (beds?.length || 0) >= FREE_BED_LIMIT) {
                toast({ title: 'Begränsning', description: `Max ${FREE_BED_LIMIT} bäddar i gratisversionen. Uppgradera till Plus!`, variant: 'destructive' });
                return;
              }
              setOpen(o);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Ny bädd</Button>
              </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">Lägg till bädd</DialogTitle></DialogHeader>
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
        </div>
      </FadeIn>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : !beds?.length ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Inga bäddar ännu. Skapa din första bädd för att komma igång! 🌱
        </CardContent></Card>
      ) : (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {beds.map((bed: any) => {
            const isEditing = editingNotes[bed.id] !== undefined;
            const notesValue = isEditing ? editingNotes[bed.id] : (bed.season_notes || '');
            const lastSummary = getLatestSummary(bed.id);
            return (
              <StaggerItem key={bed.id}>
                <Card className="bg-card border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-serif">{bed.name}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(bed.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {bed.description && <p className="text-sm text-muted-foreground">{bed.description}</p>}
                    {lastSummary && (
                      <div className="bg-accent/5 border border-accent/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Leaf className="h-3 w-3 text-accent" />
                          <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">Förra säsongen ({lastSummary.year})</span>
                        </div>
                        {lastSummary.went_well && <p className="text-xs text-foreground line-clamp-2">✓ {lastSummary.went_well}</p>}
                        {lastSummary.learnings && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">💡 {lastSummary.learnings}</p>}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-foreground">Säsongsanteckningar</span>
                      </div>
                      <Textarea
                        placeholder="Vad lärde du dig i år? Vad funkade bra?"
                        className="text-xs min-h-[60px] resize-none"
                        value={notesValue}
                        onChange={e => setEditingNotes(prev => ({ ...prev, [bed.id]: e.target.value }))}
                      />
                      {isEditing && (
                        <Button size="sm" className="mt-2 gap-1.5 w-full" onClick={() => handleSaveNotes(bed.id)} disabled={savingNotes === bed.id}>
                          {savingNotes === bed.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Spara anteckningar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
};

export default Beds;
