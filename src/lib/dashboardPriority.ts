/**
 * Gemensam dashboard-prioritering.
 * Deterministisk, testbar, ingen generativ AI.
 *
 * Ordning:
 *   1. urgent/due plant care
 *   2. overdue reminder
 *   3. tidskritisk sådd/skörd
 *   4. weather action (endast om verkliga väderdata motiverar)
 *
 * Returnerar exakt en primaryAction, upp till två secondaryActions
 * (deduplicerade per plant/destination), en optional insight, samt
 * ett allDone-state med nästa förväntade kontroll när inget är akut.
 */

import { localDateKey, addDaysToDateKey, GardenReminder } from './gardenToday';

export type PriorityKind = 'plant_care' | 'reminder' | 'sowing' | 'harvest' | 'weather';

export interface PriorityAction {
  id: string;
  kind: PriorityKind;
  title: string;
  description: string;
  actionPath: string;
  actionLabel: string;
  /** Deduplikationsnyckel (plantId, reminderId, destination). */
  dedupeKey: string;
  /** Numeriskt värde för sortering. Lägre = viktigare. */
  weight: number;
}

export interface PriorityInsight {
  id: string;
  text: string;
}

export interface DashboardPriorityInput {
  plants?: Array<{
    id: string;
    display_name?: string | null;
    plants?: { name_sv?: string | null } | null;
    care_profile?: {
      status: 'urgent' | 'due' | 'soon' | 'good';
      daysUntilWater: number | null;
      reason?: string;
      trend?: string;
    };
  }>;
  reminders?: GardenReminder[];
  sowings?: Array<{ id: string; variety?: string; sow_date?: string; expected_harvest_date?: string | null }>;
  harvests?: Array<{ id: string; harvest_date?: string; variety?: string }>;
  weather?: {
    daily?: {
      temperature_2m_min?: number[];
      precipitation_probability_max?: number[];
      time?: string[];
    };
  };
  rainData?: { dryDays: number; totalPrecipitation: number } | null;
  today?: string; // yyyy-mm-dd, för deterministiska tester
  climateZone?: number;
}

export interface DashboardPriorityResult {
  primaryAction: PriorityAction | null;
  secondaryActions: PriorityAction[];
  insight: PriorityInsight | null;
  allDone: boolean;
  nextCheck: { title: string; inDays: number } | null;
}

const plantLabel = (plant: any): string =>
  (plant?.display_name || plant?.plants?.name_sv || 'Växten') as string;

function collectPlantActions(input: DashboardPriorityInput): PriorityAction[] {
  const plants = input.plants || [];
  const actions: PriorityAction[] = [];
  for (const plant of plants) {
    const profile = plant.care_profile;
    if (!profile) continue;
    if (profile.status !== 'urgent' && profile.status !== 'due') continue;
    const name = plantLabel(plant);
    const days = profile.daysUntilWater;
    const desc =
      profile.status === 'urgent'
        ? days != null && days < 0
          ? `${name} är ${Math.abs(days)} ${Math.abs(days) === 1 ? 'dag' : 'dagar'} försenad. Gör en snabb jordkontroll.`
          : `${name} behöver en jordkontroll idag.`
        : `${name} närmar sig sin vattenrytm. Kolla jorden när du är i närheten.`;
    actions.push({
      id: `plant:${plant.id}`,
      kind: 'plant_care',
      title: profile.status === 'urgent' ? `${name} behöver koll` : `${name} närmar sig vattning`,
      description: desc,
      actionPath: `/app/my-plants?plant=${plant.id}`,
      actionLabel: 'Öppna växt',
      dedupeKey: `plant:${plant.id}`,
      weight: profile.status === 'urgent' ? 0 : 1,
    });
  }
  return actions;
}

function collectReminderActions(input: DashboardPriorityInput): PriorityAction[] {
  const reminders = input.reminders || [];
  const today = input.today || localDateKey();
  const actions: PriorityAction[] = [];
  for (const reminder of reminders) {
    if (reminder.done) continue;
    if (!reminder.date) continue;
    if (reminder.date > today) continue; // future
    const overdueDays = daysBetween(reminder.date, today);
    actions.push({
      id: `reminder:${reminder.id}`,
      kind: 'reminder',
      title: reminder.title,
      description:
        overdueDays > 0
          ? `Försenad ${overdueDays} ${overdueDays === 1 ? 'dag' : 'dagar'}.`
          : 'Planerad till idag.',
      actionPath: '/app/reminders',
      actionLabel: 'Öppna påminnelser',
      dedupeKey: `reminder:${reminder.id}`,
      weight: 2 + Math.max(0, 1 - overdueDays / 7),
    });
  }
  return actions;
}

function collectSowingActions(input: DashboardPriorityInput): PriorityAction[] {
  const today = input.today || localDateKey();
  const soon = addDaysToDateKey(today, 5);
  const actions: PriorityAction[] = [];
  for (const sowing of input.sowings || []) {
    const harvest = sowing.expected_harvest_date;
    if (!harvest) continue;
    if (harvest < today || (harvest >= today && harvest <= soon)) {
      actions.push({
        id: `sowing:${sowing.id}`,
        kind: 'harvest',
        title: `Snart skörd: ${sowing.variety || 'sådd'}`,
        description:
          harvest < today
            ? 'Förväntad skörd har passerat — kolla plantan.'
            : `Förväntad skörd inom kort (${harvest}).`,
        actionPath: '/app/harvests',
        actionLabel: 'Logga skörd',
        dedupeKey: `sowing:${sowing.id}`,
        weight: 3,
      });
    }
  }
  return actions;
}

function collectWeatherActions(input: DashboardPriorityInput): PriorityAction[] {
  const actions: PriorityAction[] = [];
  const minTemp = input.weather?.daily?.temperature_2m_min?.[0];
  if (typeof minTemp === 'number' && minTemp <= 0) {
    actions.push({
      id: 'weather:frost',
      kind: 'weather',
      title: 'Frostrisk i natt',
      description: `Prognos ${Math.round(minTemp)}°. Täck känsliga plantor eller ta in krukor.`,
      actionPath: '/app/reminders',
      actionLabel: 'Skapa påminnelse',
      dedupeKey: 'weather:frost',
      weight: 0.5,
    });
  }
  const dry = input.rainData?.dryDays ?? 0;
  const rainChance = input.weather?.daily?.precipitation_probability_max?.[0] ?? 100;
  if (dry >= 4 && rainChance < 30) {
    actions.push({
      id: 'weather:dry',
      kind: 'weather',
      title: `${dry} torra dagar i rad`,
      description: 'Kontrollera jorden på uttorkningskänsliga växter och vattna vid behov.',
      actionPath: '/app/my-plants',
      actionLabel: 'Se växter',
      dedupeKey: 'weather:dry',
      weight: 3.5,
    });
  }
  return actions;
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  return Math.round((b - a) / 86_400_000);
}

function deriveInsight(input: DashboardPriorityInput): PriorityInsight | null {
  // Deterministiska, datadrivna insikter — ingen AI.
  const plants = input.plants || [];
  if (plants.length === 0) return null;

  const good = plants.filter((p) => p.care_profile?.status === 'good').length;
  const total = plants.length;
  if (total >= 3 && good / total >= 0.8) {
    return { id: 'insight:steady', text: `${good} av ${total} växter är i god rytm just nu.` };
  }
  const improving = plants.filter((p) => (p.care_profile?.trend as string) === 'improving').length;
  if (improving >= 2) {
    return { id: 'insight:improving', text: `${improving} växter visar förbättrad trend senaste veckan.` };
  }
  const dry = input.rainData?.dryDays ?? 0;
  if (dry >= 5) {
    return { id: 'insight:dry', text: `Det har inte regnat på ${dry} dagar — håll koll på jordens fukt.` };
  }
  return null;
}

function nextExpectedCheck(input: DashboardPriorityInput): { title: string; inDays: number } | null {
  const plants = input.plants || [];
  let best: { title: string; inDays: number } | null = null;
  for (const plant of plants) {
    const days = plant.care_profile?.daysUntilWater;
    if (typeof days === 'number' && days > 0) {
      if (!best || days < best.inDays) {
        best = { title: plantLabel(plant), inDays: days };
      }
    }
  }
  return best;
}

export function computeDashboardPriority(input: DashboardPriorityInput): DashboardPriorityResult {
  const all: PriorityAction[] = [
    ...collectPlantActions(input),
    ...collectReminderActions(input),
    ...collectSowingActions(input),
    ...collectWeatherActions(input),
  ];

  // Dedup per key, behåll lägsta weight.
  const byKey = new Map<string, PriorityAction>();
  for (const action of all) {
    const existing = byKey.get(action.dedupeKey);
    if (!existing || action.weight < existing.weight) {
      byKey.set(action.dedupeKey, action);
    }
  }
  const sorted = [...byKey.values()].sort((a, b) => a.weight - b.weight);

  const primaryAction = sorted[0] || null;
  const secondaryActions = sorted.slice(1, 3);
  const allDone = primaryAction == null;

  return {
    primaryAction,
    secondaryActions,
    insight: deriveInsight(input),
    allDone,
    nextCheck: allDone ? nextExpectedCheck(input) : null,
  };
}
