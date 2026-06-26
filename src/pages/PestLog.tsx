import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bot, Bug, Check, Plus, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import AppEmptyState from '@/components/AppEmptyState';
import { recordProductActivity } from '@/lib/analytics';
import { addDaysToDateKey, localDateKey } from '@/lib/gardenToday';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Inte inloggad');
  return user.id;
}

const severityMap: Record<string, { label: string; className: string }> = {
  low: { label: 'Låg', className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200' },
  medium: { label: 'Medel', className: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-200' },
  high: { label: 'Hög', className: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200' },
};

export default function PestLog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ pest_name: '', bed_id: '', severity: 'medium', treatment: '', observed_date: localDateKey(), notes: '' });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['pest-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pest_logs').select('*, beds(name)').order('observed_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  const { data: beds = [] } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });
  const openProblems = logs.filter((log: any) => !log.resolved);
  const resolvedProblems = logs.filter((log: any) => log.resolved);

  const createMutation = useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      const severity = form.severity;
      const pestName = form.pest_name.trim();
      const { data, error } = await supabase.from('pest_logs').insert({
        user_id: userId,
        pest_name: pestName,
        bed_id: form.bed_id || null,
        severity,
        treatment: form.treatment.trim() || null,
        observed_date: form.observed_date,
        notes: form.notes.trim() || null,
      }).select('id').single();
      if (error) throw error;

      let followUpCreated = false;
      try {
        const reminderSettings = await api.getReminderSettings();
        const settings = ((reminderSettings?.settings as any) || {}) as Record<string, any>;
        const reminders = settings.reminders || [];
        const reminder = {
          id: crypto.randomUUID(),
          title: `Följ upp ${pestName}`,
          type: 'other',
          date: addDaysToDateKey(localDateKey(), severity === 'high' ? 2 : 3),
          done: false,
          created_at: new Date().toISOString(),
          completed_at: null,
          source_pest_log_id: data.id,
        };
        await api.updateReminderSettings({ settings: { ...settings, reminders: [...reminders, reminder] } });
        followUpCreated = true;
      } catch (followUpError) {
        console.error('Kunde inte skapa automatisk uppföljning', followUpError);
      }

      return { id: data.id, severity, followUpCreated };
    },
    onSuccess: ({ id, severity, followUpCreated }) => {
      queryClient.invalidateQueries({ queryKey: ['pest-logs'] });
      queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
      setDialogOpen(false);
      setForm({ pest_name: '', bed_id: '', severity: 'medium', treatment: '', observed_date: localDateKey(), notes: '' });
      void recordProductActivity('pest_problem_logged', { pest_log_id: id, severity, follow_up_created: followUpCreated });
      toast({
        title: 'Problemet är loggat',
        description: followUpCreated ? 'En automatisk uppföljning har lagts in om några dagar.' : 'Problemet sparades, men uppföljningen kunde inte skapas. Lägg gärna till en påminnelse manuellt.',
      });
    },
    onError: (error: any) => toast({ title: 'Kunde inte spara problemet', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const toggleResolved = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase.from('pest_logs').update({ resolved: !resolved }).eq('id', id);
      if (error) throw error;
      return { id, resolved: !resolved };
    },
    onSuccess: ({ id, resolved }) => {
      queryClient.invalidateQueries({ queryKey: ['pest-logs'] });
      void recordProductActivity(resolved ? 'pest_problem_resolved' : 'pest_problem_reopened', { pest_log_id: id });
    },
    onError: (error: any) => toast({ title: 'Kunde inte uppdatera problemet', description: error?.message || 'Försök igen.', variant: 'destructive' }),
  });

  const askGro = (log: any) => {
    const bedName = log.beds?.name ? ` i bädden ${log.beds.name}` : '';
    const prompt = `Jag har loggat problemet "${log.pest_name}"${bedName}. Allvarlighetsgrad: ${severityMap[log.severity]?.label || log.severity}. Observerat ${log.observed_date}.${log.treatment ? ` Jag har provat behandlingen: ${log.treatment}.` : ''}${log.notes ? ` Mina anteckningar: ${log.notes}.` : ''} Hjälp mig bedöma nästa steg, vad jag ska kontrollera och när jag bör följa upp.`;
    void recordProductActivity('pest_problem_opened_in_gro', { pest_log_id: log.id, severity: log.severity });
    navigate('/app/gro', { state: { prompt, source: 'pest_log' } });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="premium-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-destructive/8 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><span className="section-kicker mb-3"><Sparkles className="h-3.5 w-3.5" /> Upptäck · åtgärda · följ upp</span><h1 className="page-title">Skadedjur och sjukdomar</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Dokumentera problemet, behandlingen och resultatet. Gro använder historiken när samma symtom eller bädd dyker upp igen.</p></div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Logga problem</Button>
        </div>
        <div className="relative mt-6 grid max-w-md grid-cols-2 gap-3"><div className="metric-card p-4"><p className="text-3xl font-bold text-destructive">{openProblems.length}</p><p className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">öppna problem</p></div><div className="metric-card p-4"><p className="text-3xl font-bold text-primary">{resolvedProblems.length}</p><p className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">lösta problem</p></div></div>
      </section>

      {isLoading ? <Card><CardContent className="p-8 text-sm text-muted-foreground">Laddar problemboken…</CardContent></Card> : !logs.length ? <AppEmptyState icon={Bug} eyebrow="Bra utgångsläge" title="Inga problem är loggade" description="När något ser fel ut kan du spara symtom, behandling och bilder. Då kan nästa bedömning bygga på vad som faktiskt hänt i din odling." actionLabel="Logga ett problem" onAction={() => setDialogOpen(true)} secondaryLabel="Fråga Gro" onSecondary={() => navigate('/app/gro')} /> : <div className="space-y-3">{logs.map((log: any) => { const severity = severityMap[log.severity] || severityMap.medium; return <Card key={log.id} className={log.resolved ? 'opacity-65' : 'hover:border-destructive/20 hover:shadow-[var(--card-shadow-hover)]'}><CardContent className="p-4 sm:p-5"><div className="flex items-start gap-3"><button onClick={() => toggleResolved.mutate({ id: log.id, resolved: !!log.resolved })} className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${log.resolved ? 'border-primary bg-primary/15' : 'border-border hover:border-primary'}`} aria-label={log.resolved ? 'Öppna problemet igen' : 'Markera problemet som löst'}>{log.resolved && <Check className="h-3.5 w-3.5 text-primary" />}</button><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className={`font-semibold ${log.resolved ? 'line-through' : ''}`}>{log.pest_name}</h2><Badge variant="outline" className={severity.className}>{severity.label}</Badge>{log.beds?.name && <span className="text-xs text-muted-foreground">· {log.beds.name}</span>}</div><p className="mt-1 text-xs text-muted-foreground">Observerat {log.observed_date}</p>{log.treatment && <p className="mt-2 text-sm"><strong>Behandling:</strong> {log.treatment}</p>}{log.notes && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{log.notes}</p>}</div><Button variant="outline" size="sm" onClick={() => askGro(log)}><Bot className="h-3.5 w-3.5" /> Fråga Gro</Button></div></CardContent></Card>; })}</div>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>Logga problem</DialogTitle></DialogHeader><div className="space-y-4"><Input placeholder="Skadedjur, sjukdom eller symtom" value={form.pest_name} onChange={(event) => setForm((current) => ({ ...current, pest_name: event.target.value }))} /><Select value={form.bed_id} onValueChange={(value) => setForm((current) => ({ ...current, bed_id: value }))}><SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger><SelectContent>{beds.map((bed: any) => <SelectItem key={bed.id} value={bed.id}>{bed.name}</SelectItem>)}</SelectContent></Select><Select value={form.severity} onValueChange={(value) => setForm((current) => ({ ...current, severity: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Låg allvarlighetsgrad</SelectItem><SelectItem value="medium">Medel</SelectItem><SelectItem value="high">Hög</SelectItem></SelectContent></Select><Input type="date" value={form.observed_date} onChange={(event) => setForm((current) => ({ ...current, observed_date: event.target.value }))} /><Input placeholder="Behandling du redan provat" value={form.treatment} onChange={(event) => setForm((current) => ({ ...current, treatment: event.target.value }))} /><Textarea placeholder="Beskriv symtom, omfattning och förändring över tid" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /><div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs text-muted-foreground"><AlertTriangle className="mr-1.5 inline h-3.5 w-3.5 text-primary" /> En uppföljning skapas automatiskt om 2–3 dagar.</div><Button onClick={() => createMutation.mutate()} disabled={!form.pest_name.trim() || createMutation.isPending} className="w-full">{createMutation.isPending ? 'Sparar…' : 'Spara och skapa uppföljning'}</Button></div></DialogContent></Dialog>
    </div>
  );
}
