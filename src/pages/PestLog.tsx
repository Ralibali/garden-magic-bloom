import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bug, Plus, Check, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: 'Låg', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  medium: { label: 'Medel', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  high: { label: 'Hög', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const PestLog = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ pest_name: '', bed_id: '', severity: 'medium', treatment: '', observed_date: new Date().toISOString().split('T')[0], notes: '' });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['pest-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pest_logs').select('*, beds(name)').order('observed_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: beds } = useQuery({ queryKey: ['beds'], queryFn: api.getBeds });

  const createMutation = useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      const { error } = await supabase.from('pest_logs').insert({
        user_id: userId,
        pest_name: form.pest_name,
        bed_id: form.bed_id || null,
        severity: form.severity,
        treatment: form.treatment || null,
        observed_date: form.observed_date,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pest-logs'] });
      setDialogOpen(false);
      setForm({ pest_name: '', bed_id: '', severity: 'medium', treatment: '', observed_date: new Date().toISOString().split('T')[0], notes: '' });
      toast({ title: 'Problem loggat 🐛' });
    },
    onError: () => toast({ title: 'Kunde inte spara', variant: 'destructive' }),
  });

  const toggleResolved = useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await supabase.from('pest_logs').update({ resolved: !resolved }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pest-logs'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Skadedjur & sjukdomar</h1>
          <p className="text-muted-foreground text-sm">Logga problem och behandlingar per bädd.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 w-fit">
          <Plus className="h-4 w-4" /> Logga problem
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Laddar...</p>
      ) : !logs?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bug className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Inga problem loggade – bra jobbat! 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => {
            const sev = SEVERITY_MAP[log.severity] || SEVERITY_MAP.medium;
            return (
              <Card key={log.id} className={log.resolved ? 'opacity-60' : ''}>
                <CardContent className="p-4 flex items-start gap-3">
                  <button onClick={() => toggleResolved.mutate({ id: log.id, resolved: log.resolved })} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${log.resolved ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                    {log.resolved && <Check className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${log.resolved ? 'line-through' : ''}`}>{log.pest_name}</span>
                      <Badge variant="secondary" className={`text-[10px] border-0 ${sev.color}`}>{sev.label}</Badge>
                      {(log as any).beds?.name && <span className="text-xs text-muted-foreground">· {(log as any).beds.name}</span>}
                    </div>
                    {log.treatment && <p className="text-xs text-muted-foreground mt-1">Behandling: {log.treatment}</p>}
                    {log.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{log.notes}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{log.observed_date}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Logga problem</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="Skadedjur/sjukdom *" value={form.pest_name} onChange={e => setForm(f => ({ ...f, pest_name: e.target.value }))} />
            <Select value={form.bed_id} onValueChange={v => setForm(f => ({ ...f, bed_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Välj bädd (valfritt)" /></SelectTrigger>
              <SelectContent>
                {beds?.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
              <SelectTrigger><SelectValue placeholder="Allvarlighetsgrad" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Låg</SelectItem>
                <SelectItem value="medium">Medel</SelectItem>
                <SelectItem value="high">Hög</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={form.observed_date} onChange={e => setForm(f => ({ ...f, observed_date: e.target.value }))} />
            <Input placeholder="Behandling (t.ex. såpa, neem)" value={form.treatment} onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))} />
            <Textarea placeholder="Anteckningar" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <Button onClick={() => createMutation.mutate()} disabled={!form.pest_name.trim() || createMutation.isPending} className="w-full">
              {createMutation.isPending ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PestLog;
