import { Mail } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

interface WeeklyEmailSettingsProps {
  enabled: boolean;
  onOptimisticChange: (enabled: boolean) => void;
}

export default function WeeklyEmailSettings({ enabled, onOptimisticChange }: WeeklyEmailSettingsProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (nextEnabled: boolean) => api.updateWeeklyEmailPreference(nextEnabled),
    onMutate: (nextEnabled) => {
      onOptimisticChange(nextEnabled);
    },
    onSuccess: async (_, nextEnabled) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      await trackEvent('weekly_email_toggled', { enabled: nextEnabled });
      toast({ title: nextEnabled ? 'Veckomejlet är påslaget 🌱' : 'Veckomejlet är avstängt' });
    },
    onError: (_error, nextEnabled) => {
      onOptimisticChange(!nextEnabled);
      toast({ title: 'Kunde inte spara mejlinställningen', variant: 'destructive' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Veckomejl</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4">
          <div>
            <p className="font-medium text-foreground">Din odlingsvecka</p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Få ett kort mejl på söndagar med såveckor, aktiva sådder, kommande utplanteringar, skörd och frostläge.
            </p>
          </div>
          <Switch
            checked={enabled}
            disabled={mutation.isPending}
            onCheckedChange={(checked) => mutation.mutate(checked)}
            aria-label="Slå på eller av veckomejl"
          />
        </div>
      </CardContent>
    </Card>
  );
}
