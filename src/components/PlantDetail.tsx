import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Droplets, Sprout, Scissors, Sun, StickyNote, ArrowRightLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const LOG_TYPES = [
  { value: 'watered', label: '💧 Vattnad', icon: Droplets },
  { value: 'fertilized', label: '🌱 Gödslade', icon: Sprout },
  { value: 'repotted', label: '🪴 Omplanterade', icon: ArrowRightLeft },
  { value: 'pruned', label: '✂️ Beskuren', icon: Scissors },
  { value: 'moved', label: '🔆 Flyttad', icon: Sun },
  { value: 'note', label: '📝 Anteckning', icon: StickyNote },
];

const LOG_EMOJI: Record<string, string> = {
  watered: '💧', fertilized: '🌱', repotted: '🪴', pruned: '✂️', moved: '🔆', note: '📝',
};

interface PlantDetailProps {
  plant: any;
  plantName: string;
  open: boolean;
  onClose: () => void;
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export default function PlantDetail({ plant, plantName, open, onClose }: PlantDetailProps) {
  const queryClient = useQueryClient();
  const [logType, setLogType] = useState('note');
  const [logNote, setLogNote] = useState('');

  const { data: logs } = useQuery({
    queryKey: ['plant-logs', plant.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('plant_logs').select('*').eq('plant_id', plant.id).order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const addLogMutation = useMutation({
    mutationFn: async () => {
      const userId = await getUserId();
      await supabase.from('plant_logs').insert({ user_id: userId, plant_id: plant.id, log_type: logType, note: logNote || null } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-logs', plant.id] });
      setLogNote('');
      toast({ title: 'Loggpost tillagd!' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plantName}</DialogTitle>
          {plant.location && <p className="text-sm text-muted-foreground">{plant.location}</p>}
        </DialogHeader>

        <div className="space-y-4">
          {/* Add log entry */}
          <div className="space-y-2 border border-border rounded-xl p-3">
            <p className="text-sm font-medium">Lägg till loggpost</p>
            <Select value={logType} onValueChange={setLogType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOG_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="Anteckning (valfritt)" value={logNote} onChange={e => setLogNote(e.target.value)} />
            <Button size="sm" onClick={() => addLogMutation.mutate()} disabled={addLogMutation.isPending} className="w-full">
              Spara
            </Button>
          </div>

          {/* Activity log */}
          <div>
            <p className="text-sm font-medium mb-2">Aktivitetslogg</p>
            {!logs?.length ? (
              <p className="text-sm text-muted-foreground">Ingen aktivitet ännu.</p>
            ) : (
              <div className="space-y-2">
                {logs.map((l: any) => (
                  <div key={l.id} className="flex items-start gap-2 text-sm">
                    <span>{LOG_EMOJI[l.log_type] || '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">{LOG_TYPES.find(t => t.value === l.log_type)?.label.split(' ').slice(1).join(' ') || l.log_type}</p>
                      {l.note && <p className="text-muted-foreground text-xs">{l.note}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{format(new Date(l.created_at), 'yyyy-MM-dd')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
