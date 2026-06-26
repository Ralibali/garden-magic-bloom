export type GardenActionPriority = 'urgent' | 'today' | 'soon';
export type GardenActionKind = 'reminder' | 'watering' | 'weather' | 'frost' | 'sowing' | 'harvest' | 'start';

export interface GardenAction {
  id: string;
  title: string;
  description: string;
  priority: GardenActionPriority;
  kind: GardenActionKind;
  actionPath: string;
  actionLabel: string;
  groPrompt: string;
  reminderType: 'sowing' | 'transplant' | 'watering' | 'other';
  sourceReminderId?: string;
}

export interface GardenActionState {
  completedAt?: string;
  snoozedUntil?: string;
}

export interface GardenReminder {
  id: string;
  title: string;
  type: 'sowing' | 'transplant' | 'watering' | 'other';
  date: string;
  done: boolean;
  bed?: string;
  created_at?: string;
  completed_at?: string | null;
  source_action_id?: string;
}

interface GardenTodayInput {
  reminders?: GardenReminder[];
  sowings?: any[];
  overduePlants?: any[];
  beds?: any[];
  weather?: any;
  rainData?: { dryDays: number; totalPrecipitation: number } | null;
  climateZone: number;
}

export function localDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function addDaysToDateKey(dateString: string, days: number) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function daysBetween(dateString: string, now = new Date()) {
  const today = localDateKey(now);
  const [targetYear, targetMonth, targetDay] = dateString.split('-').map(Number);
  const [todayYear, todayMonth, todayDay] = today.split('-').map(Number);
  const targetUtc = Date.UTC(targetYear, targetMonth - 1, targetDay);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);
  return Math.floor((todayUtc - targetUtc) / 86400000);
}

function priorityWeight(priority: GardenActionPriority) {
  return priority === 'urgent' ? 0 : priority === 'today' ? 1 : 2;
}

function uniqueActions(actions: GardenAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  });
}

export function buildGardenActions({ reminders = [], sowings = [], overduePlants = [], beds = [], weather, rainData, climateZone }: GardenTodayInput): GardenAction[] {
  const today = localDateKey();
  const actions: GardenAction[] = [];

  reminders
    .filter((reminder) => !reminder.done && reminder.date <= today)
    .slice(0, 3)
    .forEach((reminder) => {
      const lateBy = Math.max(0, daysBetween(reminder.date));
      actions.push({
        id: `reminder-${reminder.id}`,
        title: reminder.title,
        description: lateBy > 0 ? `Påminnelsen är ${lateBy} ${lateBy === 1 ? 'dag' : 'dagar'} försenad.` : 'Den här uppgiften är planerad till idag.',
        priority: lateBy > 0 ? 'urgent' : 'today',
        kind: 'reminder',
        actionPath: '/app/reminders',
        actionLabel: 'Öppna påminnelser',
        groPrompt: `Hjälp mig genomföra uppgiften "${reminder.title}" i min odling idag. Ge mig en kort steg-för-steg-plan.`,
        reminderType: reminder.type,
        sourceReminderId: reminder.id,
      });
    });

  overduePlants.slice(0, 2).forEach((plant: any) => {
    const name = plant.custom_name || plant.plants?.name_sv || 'En växt';
    const interval = plant.watering_interval_days || 7;
    const daysAgo = plant.last_watered ? daysBetween(String(plant.last_watered).slice(0, 10)) : null;
    actions.push({
      id: `water-${plant.id}-${today}`,
      title: `Kontrollera ${name}`,
      description: daysAgo === null ? 'Ingen vattning är registrerad ännu. Kontrollera jorden innan du vattnar.' : `Senast vattnad för ${daysAgo} dagar sedan. Normalt intervall är cirka ${interval} dagar.`,
      priority: daysAgo !== null && daysAgo >= interval + 3 ? 'urgent' : 'today',
      kind: 'watering',
      actionPath: '/app/my-plants',
      actionLabel: 'Öppna växten',
      groPrompt: `Min växt ${name} har inte vattnats på ${daysAgo ?? 'okänt antal'} dagar. Hur kontrollerar jag om den behöver vatten och hur vattnar jag rätt?`,
      reminderType: 'watering',
    });
  });

  const nextRain = weather?.daily?.precipitation_sum?.slice(0, 2)?.reduce((sum: number, value: number) => sum + (value || 0), 0) || 0;
  const minTemp = weather?.daily?.temperature_2m_min?.[0];
  const maxWind = weather?.daily?.wind_speed_10m_max?.[0];

  if (typeof minTemp === 'number' && minTemp <= 2) {
    actions.push({
      id: `frost-${today}`,
      title: minTemp <= 0 ? 'Skydda frostkänsliga plantor' : 'Kall natt väntas',
      description: `Prognosen visar omkring ${Math.round(minTemp)} °C som lägst. Täck, flytta in eller vänta med utplantering.`,
      priority: minTemp <= 0 ? 'urgent' : 'today',
      kind: 'frost',
      actionPath: '/app/my-plants',
      actionLabel: 'Se mina växter',
      groPrompt: `Det väntas cirka ${Math.round(minTemp)} grader i natt i klimatzon ${climateZone}. Vilka av mina växter behöver skydd och hur gör jag?`,
      reminderType: 'other',
    });
  }

  if (typeof maxWind === 'number' && maxWind >= 35) {
    actions.push({
      id: `wind-${today}`,
      title: 'Säkra känsliga plantor och stöd',
      description: `Vinden kan nå omkring ${Math.round(maxWind)} km/h. Kontrollera tomatstöd, fiberduk och lätta krukor.`,
      priority: maxWind >= 55 ? 'urgent' : 'today',
      kind: 'weather',
      actionPath: '/app/beds',
      actionLabel: 'Se mina bäddar',
      groPrompt: `Det väntas vindar på omkring ${Math.round(maxWind)} km/h idag. Hjälp mig prioritera vad jag ska säkra i min odling.`,
      reminderType: 'other',
    });
  }

  if (rainData && rainData.dryDays >= 3) {
    if (nextRain >= 5) {
      actions.push({
        id: `rain-wait-${today}`,
        title: 'Vänta med större vattning',
        description: `Det har varit torrt i ${rainData.dryDays} dagar, men cirka ${Math.round(nextRain)} mm regn väntas inom två dygn. Kontrollera krukor och växthus separat.`,
        priority: 'soon',
        kind: 'weather',
        actionPath: '/app/beds',
        actionLabel: 'Kontrollera bäddarna',
        groPrompt: `Det har varit torrt i ${rainData.dryDays} dagar men regn väntas. Vad bör jag ändå vattna idag?`,
        reminderType: 'watering',
      });
    } else {
      actions.push({
        id: `dry-${today}`,
        title: 'Kontrollera fukten i bäddar och krukor',
        description: `Det har varit torrt i ${rainData.dryDays} dagar och inget större regn väntas. Känn fem centimeter ner innan du vattnar.`,
        priority: rainData.dryDays >= 6 ? 'urgent' : 'today',
        kind: 'watering',
        actionPath: '/app/beds',
        actionLabel: 'Se bäddarna',
        groPrompt: `Det har varit torrt i ${rainData.dryDays} dagar i min odling. Hur prioriterar jag vattningen idag?`,
        reminderType: 'watering',
      });
    }
  }

  sowings.slice(0, 20).forEach((sowing: any) => {
    if (!sowing.sow_date || sowing.status === 'done') return;
    const age = daysBetween(String(sowing.sow_date).slice(0, 10));
    if (age < 0) return;
    const name = sowing.variety || 'sådden';
    const status = sowing.status || 'sown';
    const isIndoor = sowing.type === 'indoor' || status === 'indoor';

    if (isIndoor && age >= 35 && age <= 75) {
      actions.push({
        id: `harden-${sowing.id}`,
        title: `Bedöm om ${name} ska härdas`,
        description: `Sådd för ${age} dagar sedan. Kontrollera plantstorlek, nattemperatur och om rötterna fyller krukan.`,
        priority: age >= 55 ? 'today' : 'soon',
        kind: 'sowing',
        actionPath: '/app/sowings',
        actionLabel: 'Öppna sådden',
        groPrompt: `${name} såddes för ${age} dagar sedan och förodlas inomhus. Är det dags att härda eller plantera om den i klimatzon ${climateZone}?`,
        reminderType: 'transplant',
      });
    } else if (age >= 7 && age <= 18 && status === 'sown') {
      actions.push({
        id: `emergence-${sowing.id}`,
        title: `Kontrollera groningen av ${name}`,
        description: `Det har gått ${age} dagar sedan sådd. Kontrollera fukt, temperatur och om något behöver gallras.`,
        priority: age >= 14 ? 'today' : 'soon',
        kind: 'sowing',
        actionPath: '/app/sowings',
        actionLabel: 'Öppna såloggen',
        groPrompt: `${name} såddes för ${age} dagar sedan. Vad bör jag kontrollera nu och när är utebliven groning ett problem?`,
        reminderType: 'sowing',
      });
    } else if (age >= 70 && age <= 150 && (sowing.type === 'direct' || status === 'transplanted' || status === 'harvesting')) {
      actions.push({
        id: `harvest-check-${sowing.id}`,
        title: `Kontrollera skördeläget för ${name}`,
        description: `Sådd för ${age} dagar sedan. Leta efter sortens mognadstecken och skörda hellre i flera omgångar.`,
        priority: 'soon',
        kind: 'harvest',
        actionPath: '/app/harvests',
        actionLabel: 'Logga skörd',
        groPrompt: `${name} såddes för ${age} dagar sedan. Vilka mognadstecken ska jag leta efter och hur skördar jag bäst?`,
        reminderType: 'other',
      });
    }
  });

  if (!beds.length) {
    actions.push({
      id: 'start-first-bed',
      title: 'Skapa din första odlingsplats',
      description: 'Lägg in en pallkrage, ett växthus, en balkong eller en frilandsbädd så kan appen börja koppla ihop historiken.',
      priority: 'today',
      kind: 'start',
      actionPath: '/app/beds',
      actionLabel: 'Skapa plats',
      groPrompt: 'Hjälp mig välja hur jag ska dela upp mina odlingsplatser i Odlingsdagboken.',
      reminderType: 'other',
    });
  } else if (!sowings.length) {
    actions.push({
      id: 'start-first-sowing',
      title: 'Logga din första sådd',
      description: 'När sort och datum finns kan appen börja ge tidsbaserade råd och bygga din säsongshistorik.',
      priority: 'today',
      kind: 'start',
      actionPath: '/app/sowings',
      actionLabel: 'Lägg till sådd',
      groPrompt: 'Hjälp mig välja vilken av mina aktuella sådder jag bör lägga in först.',
      reminderType: 'sowing',
    });
  }

  return uniqueActions(actions)
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))
    .slice(0, 8);
}

export function visibleGardenActions(actions: GardenAction[], state: Record<string, GardenActionState> = {}) {
  const today = localDateKey();
  return actions.filter((action) => {
    const actionState = state[action.id];
    if (actionState?.completedAt && localDateKey(new Date(actionState.completedAt)) === today) return false;
    if (actionState?.snoozedUntil && actionState.snoozedUntil > today) return false;
    return true;
  });
}

export function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}
