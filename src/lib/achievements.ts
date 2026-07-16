/**
 * Utmärkelser — deterministiskt beräknade ur användarens verkliga odlingsdata.
 */

import { valueForHarvest } from '@/data/cropPrices';

export interface AchievementDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
}

export interface AchievementStatus extends AchievementDef {
  earned: boolean;
  progressLabel?: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'forsta-sadd', emoji: '🌱', title: 'Första sådden', description: 'Du loggade din första sådd.' },
  { id: 'forsta-skord', emoji: '🥕', title: 'Första skörden', description: 'Från jord till bord — första skörden är loggad.' },
  { id: 'kiloklubben', emoji: '⚖️', title: 'Kiloklubben', description: 'Över 1 kg skördat totalt.' },
  { id: 'tiokilosklubben', emoji: '🧺', title: 'Tiokilosklubben', description: 'Över 10 kg skördat totalt.' },
  { id: 'storskordaren', emoji: '🚜', title: 'Storskördaren', description: 'Över 50 kg skördat totalt.' },
  { id: 'hundrakilosklubben', emoji: '🏆', title: 'Hundrakilosklubben', description: 'Över 100 kg skördat totalt. Wow.' },
  { id: 'tusenlappen', emoji: '💰', title: 'Tusenlappen', description: 'Din skörd har passerat 1 000 kr i butiksvärde.' },
  { id: 'sortsamlaren', emoji: '🌈', title: 'Sortsamlaren', description: 'Tio olika sorter sådda.' },
  { id: 'flitmyran', emoji: '✅', title: 'Flitmyran', description: '25 avklarade steg och påminnelser.' },
  { id: 'sasongskronikor', emoji: '📖', title: 'Säsongskrönikör', description: 'Du summerade en säsong — framtida du tackar.' },
  { id: 'veteranen', emoji: '🗓️', title: 'Veteranen', description: 'Aktivitet under minst två olika år.' },
];

export interface AchievementInput {
  sowings?: Array<{ variety?: string | null; sow_date?: string | null }> | null;
  harvests?: Array<{ variety?: string | null; weight_grams?: number | null; harvest_date?: string | null }> | null;
  seasons?: Array<{ year?: number | null }> | null;
  settings?: {
    reminders?: Array<{ done?: boolean }>;
    smart_action_state?: Record<string, { completedAt?: string }>;
  } | null;
}

const formatKg = (kg: number) => kg.toLocaleString('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function computeAchievements(input: AchievementInput): AchievementStatus[] {
  const sowings = input.sowings || [];
  const harvests = input.harvests || [];
  const seasons = input.seasons || [];
  const settings = input.settings || {};

  const totalKg = harvests.reduce((sum, h) => sum + (h.weight_grams || 0), 0) / 1000;
  const totalValue = harvests.reduce((sum, h) => sum + valueForHarvest(h.variety || '', h.weight_grams || 0), 0);

  const varieties = new Set(
    sowings.map((s) => (s.variety || '').trim().toLowerCase()).filter(Boolean),
  );

  const years = new Set<number>();
  for (const s of sowings) {
    const y = s.sow_date ? new Date(s.sow_date).getFullYear() : NaN;
    if (Number.isFinite(y)) years.add(y);
  }
  for (const h of harvests) {
    const y = h.harvest_date ? new Date(h.harvest_date).getFullYear() : NaN;
    if (Number.isFinite(y)) years.add(y);
  }

  const doneReminders = (settings.reminders || []).filter((r) => r?.done).length;
  const doneActions = Object.values(settings.smart_action_state || {}).filter((s) => s?.completedAt).length;
  const completedSteps = doneReminders + doneActions;

  const kgProgress = (target: number) =>
    totalKg >= target ? undefined : `${formatKg(totalKg)} / ${target} kg`;

  const status: Record<string, { earned: boolean; progressLabel?: string }> = {
    'forsta-sadd': { earned: sowings.length >= 1 },
    'forsta-skord': { earned: harvests.length >= 1 },
    'kiloklubben': { earned: totalKg >= 1, progressLabel: kgProgress(1) },
    'tiokilosklubben': { earned: totalKg >= 10, progressLabel: kgProgress(10) },
    'storskordaren': { earned: totalKg >= 50, progressLabel: kgProgress(50) },
    'hundrakilosklubben': { earned: totalKg >= 100, progressLabel: kgProgress(100) },
    'tusenlappen': {
      earned: totalValue >= 1000,
      progressLabel: totalValue >= 1000 ? undefined : `${Math.round(totalValue).toLocaleString('sv-SE')} / 1 000 kr`,
    },
    'sortsamlaren': {
      earned: varieties.size >= 10,
      progressLabel: varieties.size >= 10 ? undefined : `${varieties.size} / 10 sorter`,
    },
    'flitmyran': {
      earned: completedSteps >= 25,
      progressLabel: completedSteps >= 25 ? undefined : `${completedSteps} / 25 steg`,
    },
    'sasongskronikor': { earned: seasons.length >= 1 },
    'veteranen': { earned: years.size >= 2 },
  };

  return ACHIEVEMENTS.map((def) => ({
    ...def,
    earned: status[def.id]?.earned ?? false,
    progressLabel: status[def.id]?.progressLabel,
  }));
}
