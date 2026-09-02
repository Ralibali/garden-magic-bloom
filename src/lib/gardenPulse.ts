/**
 * Garden Pulse — groups existing gardenToday actions into
 * IDAG / DEN HÄR VECKAN / SAKER SOM ÄR SENA.
 *
 * No new tables. Reads sowings, beds, reminders, my_plants, weather.
 * Week-ahead reminders are included even when gardenToday ignores future dates.
 */

import {
  addDaysToDateKey,
  buildGardenActions,
  GardenAction,
  GardenActionState,
  GardenReminder,
  localDateKey,
  visibleGardenActions,
  type GardenActionKind,
} from '@/lib/gardenToday';

export type PulseBucket = 'late' | 'today' | 'week';

export interface PulseItem {
  id: string;
  title: string;
  description: string;
  bucket: PulseBucket;
  kind: GardenActionKind;
  actionPath: string;
  actionLabel: string;
  groPrompt: string;
  reminderType: GardenAction['reminderType'];
  sourceReminderId?: string;
}

export interface GardenPulseInput {
  reminders?: GardenReminder[];
  sowings?: any[];
  overduePlants?: any[];
  beds?: any[];
  weather?: any;
  rainData?: { dryDays: number; totalPrecipitation: number } | null;
  climateZone: number;
  actionState?: Record<string, GardenActionState>;
  today?: string;
}

export interface GardenPulseResult {
  late: PulseItem[];
  today: PulseItem[];
  week: PulseItem[];
  empty: boolean;
}

function daysUntil(dateString: string, today: string) {
  const [ty, tm, td] = dateString.split('-').map(Number);
  const [oy, om, od] = today.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(oy, om - 1, od)) / 86400000);
}

function actionToItem(action: GardenAction, bucket: PulseBucket): PulseItem {
  return {
    id: action.id,
    title: action.title,
    description: action.description,
    bucket,
    kind: action.kind,
    actionPath: action.actionPath,
    actionLabel: action.actionLabel,
    groPrompt: action.groPrompt,
    reminderType: action.reminderType,
    sourceReminderId: action.sourceReminderId,
  };
}

function upcomingWeekActions(reminders: GardenReminder[], today: string): GardenAction[] {
  const weekEnd = addDaysToDateKey(today, 6);
  return reminders
    .filter((reminder) => !reminder.done && reminder.date > today && reminder.date <= weekEnd)
    .map((reminder) => {
      const inDays = daysUntil(reminder.date, today);
      return {
        id: `upcoming-${reminder.id}`,
        title: reminder.title,
        description: inDays === 1 ? 'Planerad till imorgon.' : `Planerad om ${inDays} dagar.`,
        priority: 'soon' as const,
        kind: 'reminder' as const,
        actionPath: '/app/reminders',
        actionLabel: 'Öppna påminnelser',
        groPrompt: `Hjälp mig förbereda uppgiften "${reminder.title}" som är planerad ${reminder.date}.`,
        reminderType: reminder.type,
        sourceReminderId: reminder.id,
      };
    });
}

export function groupPulseBuckets(
  actions: GardenAction[],
): Pick<GardenPulseResult, 'late' | 'today' | 'week'> {
  const late: PulseItem[] = [];
  const todayItems: PulseItem[] = [];
  const week: PulseItem[] = [];
  const seen = new Set<string>();

  for (const action of actions) {
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    if (action.priority === 'urgent') {
      late.push(actionToItem(action, 'late'));
    } else if (action.priority === 'today') {
      todayItems.push(actionToItem(action, 'today'));
    } else {
      week.push(actionToItem(action, 'week'));
    }
  }

  return { late, today: todayItems, week };
}

function isWeatherKind(kind: GardenActionKind) {
  return kind === 'weather' || kind === 'frost';
}

function openMeteoDrivesGardenToday(input: GardenPulseInput) {
  return Boolean(input.weather) || Boolean(input.rainData);
}

export function buildGardenPulse(input: GardenPulseInput): GardenPulseResult {
  const today = input.today || localDateKey();
  const reminders = input.reminders || [];
  const generated = buildGardenActions({
    reminders,
    sowings: input.sowings,
    overduePlants: input.overduePlants,
    beds: input.beds,
    weather: input.weather,
    rainData: input.rainData,
    climateZone: input.climateZone,
  });
  const honest = generated.filter((action) => {
    if (action.kind === 'start') return false;
    if (isWeatherKind(action.kind) && !openMeteoDrivesGardenToday(input)) return false;
    return true;
  });
  const visible = visibleGardenActions(honest, input.actionState);
  const alreadyCovered = new Set(
    visible.map((action) => action.sourceReminderId).filter(Boolean) as string[],
  );
  const upcoming = upcomingWeekActions(reminders, today).filter((action) => {
    if (!action.sourceReminderId) return true;
    if (alreadyCovered.has(action.sourceReminderId)) return false;
    return true;
  });
  const buckets = groupPulseBuckets([...visible, ...upcoming]);
  const empty = buckets.late.length + buckets.today.length + buckets.week.length === 0;
  return { ...buckets, empty };
}
