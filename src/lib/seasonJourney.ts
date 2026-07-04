export interface SeasonJourneyInput {
  sowings?: any[];
  harvests?: any[];
  remindersData?: any;
  photos?: any[];
  now?: Date;
}

export interface SeasonMilestone {
  id: string;
  label: string;
  reached: boolean;
  progressLabel: string;
}

export interface SeasonJourney {
  streakDays: number;
  activeDaysThisSeason: number;
  milestones: SeasonMilestone[];
  reachedMilestones: number;
  shareText: string;
}

function dateKey(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function startOfYear(date: Date): string {
  return `${date.getFullYear()}-01-01`;
}

function collectActivityDates(input: SeasonJourneyInput): Set<string> {
  const dates = new Set<string>();
  const seasonStart = startOfYear(input.now ?? new Date());
  const add = (value?: string | null) => {
    const key = dateKey(value);
    if (key && key >= seasonStart) dates.add(key);
  };

  input.sowings?.forEach((item) => add(item.sow_date || item.created_at));
  input.harvests?.forEach((item) => add(item.harvest_date || item.created_at));
  input.photos?.forEach((item) => add(item.taken_at || item.created_at));

  const settings = (input.remindersData?.settings as any) || {};
  const reminders = settings.reminders || [];
  const smartState = settings.smart_action_state || {};
  reminders.forEach((item: any) => item.done && add(item.completed_at));
  Object.entries(smartState).forEach(([, item]: any) => add(item?.completedAt));

  return dates;
}

function streakFromDates(dates: Set<string>, now = new Date()): number {
  let cursor = new Date(now);
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const key = cursor.toISOString().slice(0, 10);
    if (!dates.has(key)) {
      if (streak === 0 && i === 0) {
        cursor.setDate(cursor.getDate() - 1);
        continue;
      }
      break;
    }
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function totalHarvestKg(harvests: any[] = []): number {
  return harvests.reduce((sum, item) => sum + Number(item.weight_grams || 0), 0) / 1000;
}

export function buildSeasonJourney(input: SeasonJourneyInput): SeasonJourney {
  const dates = collectActivityDates(input);
  const streakDays = streakFromDates(dates, input.now ?? new Date());
  const sowingCount = input.sowings?.length ?? 0;
  const harvestCount = input.harvests?.length ?? 0;
  const photoCount = input.photos?.length ?? 0;
  const harvestKg = totalHarvestKg(input.harvests);

  const milestones: SeasonMilestone[] = [
    { id: 'first-sowing', label: 'Första sådden', reached: sowingCount >= 1, progressLabel: `${sowingCount}/1` },
    { id: 'five-sowings', label: '5 sådder', reached: sowingCount >= 5, progressLabel: `${Math.min(sowingCount, 5)}/5` },
    { id: 'first-harvest', label: 'Första skörden', reached: harvestCount >= 1, progressLabel: `${harvestCount}/1` },
    { id: 'ten-kg', label: '10 kg skörd', reached: harvestKg >= 10, progressLabel: `${Math.min(harvestKg, 10).toFixed(1)}/10 kg` },
    { id: 'five-photos', label: '5 bilder', reached: photoCount >= 5, progressLabel: `${Math.min(photoCount, 5)}/5` },
    { id: 'three-day-streak', label: '3 dagars streak', reached: streakDays >= 3, progressLabel: `${Math.min(streakDays, 3)}/3` },
    { id: 'seven-day-streak', label: '7 dagars streak', reached: streakDays >= 7, progressLabel: `${Math.min(streakDays, 7)}/7` },
  ];

  const reachedMilestones = milestones.filter((item) => item.reached).length;
  const shareText = `Min säsongsresa i Odlingsdagboken: ${streakDays} dagars odlingsstreak, ${reachedMilestones}/${milestones.length} milstolpar och ${harvestKg.toFixed(1)} kg registrerad skörd i år. 🌱`;

  return {
    streakDays,
    activeDaysThisSeason: dates.size,
    milestones,
    reachedMilestones,
    shareText,
  };
}
