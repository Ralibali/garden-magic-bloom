import { useQuery } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { api } from '@/lib/api';
import { computeAchievements } from '@/lib/achievements';

/**
 * Utmärkelsegalleri. Intjänade badges lyser, låsta visar ärlig progress.
 */
export default function AchievementsSection() {
  const { data: sowings } = useQuery({ queryKey: ['sowings'], queryFn: api.getSowings });
  const { data: harvests } = useQuery({ queryKey: ['harvests'], queryFn: api.getHarvests });
  const { data: seasons } = useQuery({ queryKey: ['season-summaries'], queryFn: () => api.getSeasonSummaries() });
  const { data: settingsData } = useQuery({ queryKey: ['reminder-settings'], queryFn: api.getReminderSettings });

  const achievements = computeAchievements({
    sowings: sowings || [],
    harvests: harvests || [],
    seasons: seasons || [],
    settings: (settingsData?.settings as any) || {},
  });
  const earnedCount = achievements.filter((a) => a.earned).length;

  if (!sowings || !harvests) return null;
  if (earnedCount === 0 && sowings.length === 0 && harvests.length === 0) return null;

  return (
    <section className="premium-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <span className="section-kicker mb-2"><Award className="h-3.5 w-3.5" /> Utmärkelser</span>
          <p className="text-sm text-muted-foreground">Milstolpar ur din verkliga odling.</p>
        </div>
        <p className="text-sm font-semibold tabular-nums text-muted-foreground shrink-0">
          {earnedCount}/{achievements.length}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`rounded-2xl border p-4 text-center transition-all ${
              a.earned
                ? 'border-primary/25 bg-primary/5 shadow-[var(--card-shadow)]'
                : 'border-border/60 bg-muted/30 opacity-70'
            }`}
          >
            <div className={`text-3xl mb-2 ${a.earned ? '' : 'grayscale'}`}>{a.emoji}</div>
            <p className="font-semibold text-sm leading-tight">{a.title}</p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-snug">
              {a.earned ? a.description : a.progressLabel || 'Låst ännu'}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
