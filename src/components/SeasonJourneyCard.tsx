import { useMemo } from 'react';
import { BadgeCheck, Flame, Share2, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { buildSeasonJourney } from '@/lib/seasonJourney';
import { trackEvent } from '@/lib/analytics';

interface SeasonJourneyCardProps {
  sowings?: any[];
  harvests?: any[];
  remindersData?: any;
  photos?: any[];
}

export default function SeasonJourneyCard({ sowings = [], harvests = [], remindersData, photos = [] }: SeasonJourneyCardProps) {
  const journey = useMemo(() => buildSeasonJourney({ sowings, harvests, remindersData, photos }), [sowings, harvests, remindersData, photos]);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Min säsongsresa i Odlingsdagboken', text: journey.shareText, url: 'https://odlingsdagboken.com' });
      } else {
        await navigator.clipboard.writeText(`${journey.shareText}\nhttps://odlingsdagboken.com`);
        toast({ title: 'Säsongsresan kopierad' });
      }
      await trackEvent('season_journey_shared', { streak_days: journey.streakDays, milestones: journey.reachedMilestones });
    } catch (error: any) {
      if (error?.name !== 'AbortError') toast({ title: 'Kunde inte dela just nu', variant: 'destructive' });
    }
  };

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-card via-primary/5 to-accent/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5 text-accent" /> Säsongsresan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
            <Flame className="h-5 w-5 text-primary" />
            <p className="mt-3 text-3xl font-bold tabular-nums">{journey.streakDays}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">dagars streak</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <p className="mt-3 text-3xl font-bold tabular-nums">{journey.activeDaysThisSeason}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">aktiva dagar</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/75 p-4 col-span-2 sm:col-span-1">
            <Trophy className="h-5 w-5 text-accent" />
            <p className="mt-3 text-3xl font-bold tabular-nums">{journey.reachedMilestones}/{journey.milestones.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">milstolpar</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {journey.milestones.slice(0, 4).map((milestone) => (
            <div key={milestone.id} className={`rounded-xl border p-3 ${milestone.reached ? 'border-primary/30 bg-primary/10' : 'border-border bg-background/70'}`}>
              <p className="text-sm font-medium">{milestone.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{milestone.progressLabel}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Dela framstegen eller använd dem som motivation att logga nästa lilla steg.</p>
          <Button variant="outline" onClick={handleShare} className="gap-2"><Share2 className="h-4 w-4" /> Dela säsongsresan</Button>
        </div>
      </CardContent>
    </Card>
  );
}
