import type { Tables } from '@/integrations/supabase/types';
import { buildPlantCareProfile, type PlantCareProfile } from '@/lib/plantCareIntelligence';
import { buildGardenActions, localDateKey, visibleGardenActions, type GardenActionState, type GardenReminder } from '@/lib/gardenToday';
import { normalizeSowingStatus, SOWING_STATUS_META } from '@/lib/sowingLifecycle';
import { diaryDate, isDiaryDate } from '@/lib/diary';

export type ManagedPlant = Tables<'my_plants'> & { plants: { name_sv: string; watering_interval_days: number | null; water: string | null; light: string | null } | null };
export interface CultivationSources {
  beds: Tables<'beds'>[];
  sowings: Tables<'sowings'>[];
  plants: ManagedPlant[];
  care: Tables<'plant_care_events'>[];
  waterings: Tables<'watering_log'>[];
  photos: Tables<'plant_photos'>[];
  harvests: Tables<'harvests'>[];
  pests: Tables<'pest_logs'>[];
  reminders: GardenReminder[];
  actionState?: Record<string, GardenActionState>;
}
export type CultivationStatus = 'attention' | 'growing' | 'planned' | 'done';
export interface Cultivation {
  id: string;
  source: 'sowing' | 'plant';
  name: string;
  subtitle: string;
  placeId: string;
  place: string;
  status: CultivationStatus;
  stage: string;
  reasons: { title: string; detail: string; href: string; inferred?: boolean }[];
  dueReminders: GardenReminder[];
  upcomingReminders: GardenReminder[];
  photoCount: number;
  latestPhoto?: Tables<'plant_photos'>;
  harvestedGrams: number;
  sowing?: Tables<'sowings'>;
  plant?: ManagedPlant;
  profile?: PlantCareProfile;
  lastActivity: string;
}

export function buildCultivations(data: CultivationSources, now = new Date()): Cultivation[] {
  const today = localDateKey(now);
  const bedNames = new Map(data.beds.map(b => [b.id, b.name]));
  const actions = visibleGardenActions(buildGardenActions({ sowings: data.sowings, beds: data.beds, climateZone: 3, today }), data.actionState, today);
  const careByPlant = new Map<string, (Tables<'plant_care_events'> | Tables<'watering_log'>)[]>();
  for (const event of [...data.care, ...data.waterings]) {
    const list = careByPlant.get(event.plant_id) || [];
    list.push(event); careByPlant.set(event.plant_id, list);
  }
  const visibleReminders = data.reminders.filter(r => {
    const state = data.actionState?.[`reminder-${r.id}`] || data.actionState?.[`upcoming-${r.id}`];
    return !r.done && isDiaryDate(r.date) && !state?.completedAt && !state?.dismissedAt && (!state?.snoozedUntil || state.snoozedUntil <= today);
  });
  const result: Cultivation[] = [];
  for (const sowing of data.sowings) {
    const stage = normalizeSowingStatus(sowing.status, sowing.plant_kind);
    const planned = isDiaryDate(sowing.sow_date) && sowing.sow_date > today;
    const dueReminders = visibleReminders.filter(r => r.sowing_id === sowing.id && r.date <= today);
    const upcomingReminders = visibleReminders.filter(r => r.sowing_id === sowing.id && r.date > today).sort((a, b) => a.date.localeCompare(b.date));
    const reasons: Cultivation['reasons'] = dueReminders.map(r => ({ title: r.title, detail: `${r.date < today ? 'Försenad' : 'Idag'} · din påminnelse`, href: '/app/reminders' }));
    if (stage !== 'done' && !planned) {
      for (const pest of data.pests.filter(p => p.sowing_id === sowing.id && !p.resolved && p.observed_date <= today)) {
        reasons.push({ title: `Följ upp ${pest.pest_name.toLocaleLowerCase('sv-SE')}`, detail: pest.treatment ? `Registrerad åtgärd: ${pest.treatment}` : 'Du har en observation som ännu inte är markerad som löst.', href: '/app/pests' });
      }
      for (const action of actions.filter(a => a.sourceSowingId === sowing.id && a.priority !== 'soon')) {
        reasons.push({ title: action.title, detail: action.description, href: action.actionPath, inferred: true });
      }
    }
    const photos = data.photos.filter(p => p.sowing_id === sowing.id).sort((a, b) => b.taken_at.localeCompare(a.taken_at));
    const harvests = data.harvests.filter(h => h.sowing_id === sowing.id);
    result.push({
      id: `sowing:${sowing.id}`, source: 'sowing', sowing, name: sowing.variety,
      subtitle: sowing.plant_kind === 'ornamental' ? 'Blommor & prydnad' : 'Sådd & odling',
      placeId: sowing.bed_id ? `bed:${sowing.bed_id}` : 'unplaced', place: bedNames.get(sowing.bed_id || '') || 'Ingen plats vald',
      status: stage === 'done' ? 'done' : reasons.length ? 'attention' : planned ? 'planned' : 'growing',
      stage: planned && stage !== 'done' ? 'Planerad sådd' : SOWING_STATUS_META[stage].label,
      reasons: stage === 'done' ? [] : reasons, dueReminders, upcomingReminders,
      photoCount: photos.length, latestPhoto: photos[0], harvestedGrams: harvests.reduce((sum, h) => sum + h.weight_grams, 0),
      lastActivity: [sowing.sow_date, sowing.transplant_date, ...photos.map(p => diaryDate(p.taken_at)), ...harvests.map(h => h.harvest_date)].filter((d): d is string => !!d && d <= today).sort().at(-1) || '',
    });
  }
  for (const plant of data.plants) {
    const events = careByPlant.get(plant.id) || [];
    const profile = buildPlantCareProfile(plant, events, now);
    const dueReminders = visibleReminders.filter(r => r.plant_id === plant.id && r.date <= today);
    const upcomingReminders = visibleReminders.filter(r => r.plant_id === plant.id && r.date > today).sort((a, b) => a.date.localeCompare(b.date));
    const reasons: Cultivation['reasons'] = dueReminders.map(r => ({ title: r.title, detail: `${r.date < today ? 'Försenad' : 'Idag'} · din påminnelse`, href: '/app/reminders' }));
    if (profile.status === 'urgent' || profile.status === 'due' || !profile.observationsCount) {
      reasons.push({ title: !profile.observationsCount ? 'Gör en första jordkontroll' : profile.statusLabel, detail: profile.reason, href: '/app/my-plants', inferred: true });
    }
    const photos = data.photos.filter(p => p.my_plant_id === plant.id).sort((a, b) => b.taken_at.localeCompare(a.taken_at));
    const name = plant.custom_name || plant.plants?.name_sv || 'Min växt';
    result.push({
      id: `plant:${plant.id}`, source: 'plant', plant, profile, name, subtitle: plant.plants?.name_sv || 'Egen växt',
      placeId: plant.location?.trim() ? `location:${plant.location.trim()}` : 'unplaced', place: plant.location?.trim() || 'Ingen plats vald',
      status: reasons.length ? 'attention' : 'growing', stage: profile.observationsCount ? profile.statusLabel : 'Ny bekantskap',
      reasons, dueReminders, upcomingReminders, photoCount: photos.length, latestPhoto: photos[0], harvestedGrams: 0,
      lastActivity: [...events.map(e => diaryDate('occurred_at' in e ? e.occurred_at : e.watered_at)), ...photos.map(p => diaryDate(p.taken_at))].filter(d => d && d <= today).sort().at(-1) || '',
    });
  }
  const priority = { attention: 0, growing: 1, planned: 2, done: 3 };
  return result.sort((a, b) => priority[a.status] - priority[b.status] || b.dueReminders.length - a.dueReminders.length || a.name.localeCompare(b.name, 'sv-SE'));
}

export interface CultivationFilters { query: string; status: CultivationStatus | 'all' | 'active'; type: 'all' | 'sowing' | 'plant'; place: string }
export function filterCultivations(items: Cultivation[], filters: CultivationFilters) {
  const words = filters.query.toLocaleLowerCase('sv-SE').trim().split(/\s+/).filter(Boolean);
  return items.filter(item => (filters.status === 'all' || (filters.status === 'active' ? item.status !== 'done' : item.status === filters.status))
    && (filters.type === 'all' || filters.type === item.source)
    && (filters.place === 'all' || filters.place === item.placeId)
    && words.every(word => `${item.name} ${item.subtitle} ${item.place} ${item.sowing?.notes || item.plant?.notes || ''}`.toLocaleLowerCase('sv-SE').includes(word)));
}
