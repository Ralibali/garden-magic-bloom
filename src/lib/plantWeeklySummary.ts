import { buildPlantCareProfile, PlantCareProfile } from './plantCareIntelligence';

export interface PlantWeeklySummary {
  healthChecks: number;
  waterings: number;
  photos: number;
  improved: Array<{ id: string; name: string }>;
  stable: Array<{ id: string; name: string }>;
  declining: Array<{ id: string; name: string }>;
  upcoming: Array<{ id: string; name: string; daysUntil: number; status: PlantCareProfile['status'] }>;
  insight: string | null;
  hasData: boolean;
}

const DAY_MS = 86_400_000;

function within(days: number, iso?: string | null, now = Date.now()) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return now - time <= days * DAY_MS && time <= now;
}

function plantName(plant: any) {
  return plant?.name || plant?.plants?.name_sv || 'Namnlös växt';
}

export interface WeeklySummaryInputs {
  plants: any[]; // my_plants rows joined with plants(name_sv)
  eventsByPlant: Map<string, any[]>; // plant_care_events keyed by plant.id
  wateringsByPlant: Map<string, any[]>; // watering_log keyed by plant.id
  photos: Array<{ id: string; my_plant_id?: string | null; taken_at?: string | null; created_at?: string | null }>;
  now?: Date;
}

export function buildPlantWeeklySummary({ plants, eventsByPlant, wateringsByPlant, photos, now = new Date() }: WeeklySummaryInputs): PlantWeeklySummary {
  const nowMs = now.getTime();
  let healthChecks = 0;
  let waterings = 0;
  const improved: PlantWeeklySummary['improved'] = [];
  const stable: PlantWeeklySummary['stable'] = [];
  const declining: PlantWeeklySummary['declining'] = [];
  const upcoming: PlantWeeklySummary['upcoming'] = [];

  for (const plant of plants) {
    const events = eventsByPlant.get(plant.id) || [];
    const waters = wateringsByPlant.get(plant.id) || [];
    for (const event of events) {
      if (event.event_type === 'health_check' && within(7, event.occurred_at, nowMs)) healthChecks += 1;
      if (event.event_type === 'watered' && within(7, event.occurred_at, nowMs)) waterings += 1;
    }
    for (const water of waters) {
      if (within(7, water.watered_at, nowMs)) waterings += 1;
    }
    const merged = [...events, ...waters.map((w: any) => ({ ...w, event_type: 'watered', occurred_at: w.watered_at }))];
    const profile = buildPlantCareProfile(plant, merged, now);
    const bucket = { id: plant.id, name: plantName(plant) };
    if (profile.trend === 'improving') improved.push(bucket);
    else if (profile.trend === 'declining') declining.push(bucket);
    else if (profile.trend === 'stable') stable.push(bucket);

    if (profile.daysUntilWater !== null && profile.daysUntilWater <= 3 && profile.status !== 'good') {
      upcoming.push({ ...bucket, daysUntil: Math.max(0, profile.daysUntilWater), status: profile.status });
    } else if (profile.status === 'urgent') {
      upcoming.push({ ...bucket, daysUntil: 0, status: profile.status });
    }
  }

  const photoCount = photos.filter(photo => {
    const iso = photo.taken_at || photo.created_at || null;
    return photo.my_plant_id && within(7, iso, nowMs);
  }).length;

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil);

  // One concrete insight app has learned
  let insight: string | null = null;
  const personalRhythms = plants.filter(plant => {
    const events = eventsByPlant.get(plant.id) || [];
    const waters = wateringsByPlant.get(plant.id) || [];
    const profile = buildPlantCareProfile(plant, [...events, ...waters.map((w: any) => ({ ...w, event_type: 'watered', occurred_at: w.watered_at }))], now);
    return profile.confidence === 'personal';
  });
  if (personalRhythms.length > 0) {
    const first = personalRhythms[0];
    insight = `Appen har lärt sig en personlig rytm för ${plantName(first)}${personalRhythms.length > 1 ? ` och ${personalRhythms.length - 1} till` : ''}.`;
  } else if (improved.length > declining.length && improved.length > 0) {
    insight = `Flera växter har trendat uppåt den senaste veckan — det du gör fungerar.`;
  } else if (declining.length > 0) {
    insight = `${declining[0].name} har trendat neråt — värt en extra kontroll de närmaste dagarna.`;
  } else if (waterings === 0 && healthChecks === 0 && photoCount === 0 && plants.length > 0) {
    insight = 'Ingen registrering på sju dagar — en enda snabb jordkontroll räcker för att appen ska lära sig mer.';
  } else if (waterings + healthChecks >= 5) {
    insight = 'Regelbundna kontroller är det som gör rekommendationerna personliga.';
  }

  const hasData = plants.length > 0 && (healthChecks + waterings + photoCount + improved.length + declining.length + upcoming.length > 0);

  return {
    healthChecks,
    waterings,
    photos: photoCount,
    improved,
    stable,
    declining,
    upcoming: upcoming.slice(0, 5),
    insight,
    hasData,
  };
}
