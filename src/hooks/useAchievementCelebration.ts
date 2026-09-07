import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { ACHIEVEMENTS, computeAchievements } from '@/lib/achievements';
import { fireConfetti } from '@/lib/confetti';
import { recordProductActivity } from '@/lib/analytics';

/**
 * Firar nya utmärkelser med konfetti + toast och sparar seen-state i
 * reminder_settings.settings.achievements_seen.
 */
export function useAchievementCelebration() {
  const queryClient = useQueryClient();
  const { data: sowings } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: harvests } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });
  const { data: seasons } = useQuery({ queryKey: ['season-summaries'], queryFn: () => api.getSeasonSummaries() });
  const { data: settingsData } = useQuery({ queryKey: ['reminder-settings'], queryFn: api.getReminderSettings });

  const pendingRef = useRef(false);

  const persistSeen = useMutation({
    mutationFn: (seen: string[]) => {
      const settings = (settingsData?.settings as any) || {};
      return api.updateReminderSettings({ settings: { ...settings, achievements_seen: seen } });
    },
    onSettled: () => {
      pendingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ['reminder-settings'] });
    },
  });

  useEffect(() => {
    if (!sowings || !harvests || !seasons || !settingsData) return;
    if (pendingRef.current) return;

    const settings = (settingsData.settings as any) || {};
    const seen: string[] = Array.isArray(settings.achievements_seen) ? settings.achievements_seen : [];
    const earned = computeAchievements({ sowings, harvests, seasons, settings })
      .filter((a) => a.earned)
      .map((a) => a.id);
    const fresh = earned.filter((id) => !seen.includes(id));
    if (fresh.length === 0) return;

    pendingRef.current = true;

    if (seen.length === 0 && fresh.length > 1) {
      persistSeen.mutate(earned);
      return;
    }

    const defs = fresh
      .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
      .filter(Boolean) as typeof ACHIEVEMENTS;

    fireConfetti();
    if (defs.length === 1) {
      toast({ title: `${defs[0].emoji} Ny utmärkelse: ${defs[0].title}`, description: defs[0].description });
    } else {
      toast({
        title: `🏆 ${defs.length} nya utmärkelser!`,
        description: defs.map((d) => `${d.emoji} ${d.title}`).join(' · '),
      });
    }
    void recordProductActivity('achievement_unlocked', { achievement_ids: fresh });
    persistSeen.mutate([...seen, ...fresh]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sowings, harvests, seasons, settingsData]);
}
