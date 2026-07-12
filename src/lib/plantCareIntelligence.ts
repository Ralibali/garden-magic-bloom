export type PlantCareStatus = 'urgent' | 'due' | 'soon' | 'good';
export type PlantCareConfidence = 'starter' | 'learning' | 'personal';

export interface PlantCareProfile {
  recommendedIntervalDays: number;
  baseIntervalDays: number;
  historicalIntervalDays: number | null;
  lastWateredAt: string | null;
  nextWaterAt: string | null;
  daysUntilWater: number | null;
  status: PlantCareStatus;
  statusLabel: string;
  healthScore: number;
  healthLabel: string;
  reason: string;
  recommendation: string;
  confidence: PlantCareConfidence;
  confidenceLabel: string;
  careStreak: number;
  knowledgeLevel: number;
  knowledgeLabel: string;
  knowledgeProgress: number;
  observationsCount: number;
  wateringsCount: number;
}

const DAY_MS = 86_400_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function eventDate(event: any): Date | null {
  return toDate(event?.occurred_at || event?.watered_at || event?.created_at);
}

function eventType(event: any): string {
  if (event?.event_type) return String(event.event_type);
  if (event?.watered_at) return 'watered';
  return String(event?.log_type || '');
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function localDayDifference(later: Date, earlier: Date) {
  const laterDay = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const earlierDay = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.round((laterDay - earlierDay) / DAY_MS);
}

function uniqueDates(values: Date[]) {
  const seen = new Set<string>();
  return values.filter(date => {
    const key = date.toISOString().slice(0, 10);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function symptomAdjustment(symptoms: string[]) {
  let adjustment = 0;
  for (const symptom of symptoms) {
    if (['wilting', 'dry_edges', 'crispy'].includes(symptom)) adjustment -= 1;
    if (['yellow_leaves', 'soft_stem', 'mold', 'root_rot'].includes(symptom)) adjustment += 1.5;
  }
  return clamp(adjustment, -2, 3);
}

function healthFromObservation(observation: any | null) {
  if (!observation) return { score: 72, label: 'Behöver en snabb koll' };

  let score = typeof observation.health_rating === 'number'
    ? observation.health_rating * 20
    : 72;
  const symptoms = Array.isArray(observation.symptoms) ? observation.symptoms : [];

  for (const symptom of symptoms) {
    if (['wilting', 'yellow_leaves', 'dry_edges'].includes(symptom)) score -= 8;
    if (['spots', 'pests'].includes(symptom)) score -= 12;
    if (['soft_stem', 'mold', 'root_rot'].includes(symptom)) score -= 18;
  }

  score = clamp(Math.round(score), 15, 100);
  const label = score >= 88 ? 'Mår riktigt bra' : score >= 70 ? 'Ser stabil ut' : score >= 50 ? 'Behöver lite omsorg' : 'Behöver din uppmärksamhet';
  return { score, label };
}

function statusMeta(status: PlantCareStatus) {
  if (status === 'urgent') return 'Behöver dig idag';
  if (status === 'due') return 'Dags att kontrollera';
  if (status === 'soon') return 'Snart dags';
  return 'I bra rytm';
}

export function buildPlantCareProfile(plant: any, events: any[] = [], now = new Date()): PlantCareProfile {
  const baseInterval = clamp(Number(plant?.watering_interval_days || plant?.plants?.watering_interval_days || 7), 2, 30);
  const sortedEvents = [...events]
    .filter(event => eventDate(event))
    .sort((a, b) => (eventDate(a)?.getTime() || 0) - (eventDate(b)?.getTime() || 0));

  const wateringDates = uniqueDates([
    ...sortedEvents.filter(event => eventType(event) === 'watered').map(event => eventDate(event)!).filter(Boolean),
    ...(plant?.last_watered ? [toDate(plant.last_watered)!].filter(Boolean) : []),
  ]).sort((a, b) => a.getTime() - b.getTime());

  const wateringIntervals = wateringDates
    .slice(1)
    .map((date, index) => localDayDifference(date, wateringDates[index]))
    .filter(days => days >= 1 && days <= 60);
  const historicalInterval = median(wateringIntervals);

  const observations = sortedEvents
    .filter(event => event.soil_moisture || event.health_rating || (Array.isArray(event.symptoms) && event.symptoms.length))
    .sort((a, b) => (eventDate(b)?.getTime() || 0) - (eventDate(a)?.getTime() || 0));
  const latestObservation = observations[0] || null;

  const soilAdjustments = observations.slice(0, 5).map(event => {
    if (event.soil_moisture === 'wet') return 2;
    if (event.soil_moisture === 'moist') return 1;
    if (event.soil_moisture === 'very_dry') return -2;
    if (event.soil_moisture === 'dry') return -0.5;
    return 0;
  });
  const soilAdjustment = soilAdjustments.length
    ? soilAdjustments.reduce((sum, value) => sum + value, 0) / soilAdjustments.length
    : 0;

  const latestSymptoms = Array.isArray(latestObservation?.symptoms) ? latestObservation.symptoms : [];
  const symptomDelta = symptomAdjustment(latestSymptoms);
  const month = now.getMonth() + 1;
  const winterAdjustment = month === 11 || month === 12 || month <= 2 ? 1.5 : 0;
  const summerAdjustment = month >= 6 && month <= 8 ? -0.5 : 0;
  const location = String(plant?.location || '').toLowerCase();
  const exposedAdjustment = month >= 5 && month <= 9 && (location.includes('balkong') || location.includes('växthus')) ? -0.5 : 0;

  const historyWeight = historicalInterval === null ? 0 : Math.min(0.45, 0.2 + wateringIntervals.length * 0.05);
  const baseWeight = 1 - historyWeight;
  const learnedInterval = historicalInterval === null
    ? baseInterval
    : baseInterval * baseWeight + historicalInterval * historyWeight;

  const recommendedInterval = clamp(
    Math.round(learnedInterval + soilAdjustment + symptomDelta + winterAdjustment + summerAdjustment + exposedAdjustment),
    2,
    30,
  );

  const lastWatered = wateringDates.length ? wateringDates[wateringDates.length - 1] : null;
  const daysSinceWatered = lastWatered ? Math.max(0, localDayDifference(now, lastWatered)) : null;
  let daysUntilWater = daysSinceWatered === null ? null : recommendedInterval - daysSinceWatered;

  const health = healthFromObservation(latestObservation);
  const latestSoil = latestObservation?.soil_moisture;
  let status: PlantCareStatus;
  if (health.score < 48) status = 'urgent';
  else if (!lastWatered) status = 'due';
  else if (latestSoil === 'wet' && daysUntilWater !== null && daysUntilWater <= 0) {
    status = 'soon';
    daysUntilWater = 2;
  } else if ((daysUntilWater ?? 99) <= -2) status = 'urgent';
  else if ((daysUntilWater ?? 99) <= 0) status = 'due';
  else if ((daysUntilWater ?? 99) <= 2) status = 'soon';
  else status = 'good';

  const nextWaterDate = lastWatered
    ? new Date(lastWatered.getTime() + recommendedInterval * DAY_MS)
    : null;

  const dataPoints = observations.length + wateringDates.length;
  const confidence: PlantCareConfidence = dataPoints >= 8 ? 'personal' : dataPoints >= 3 ? 'learning' : 'starter';
  const confidenceLabel = confidence === 'personal' ? 'Personlig rytm' : confidence === 'learning' ? 'Lär sig din växt' : 'Startrekommendation';

  const levels = [0, 3, 8, 15];
  let knowledgeLevel = 1;
  if (dataPoints >= levels[3]) knowledgeLevel = 4;
  else if (dataPoints >= levels[2]) knowledgeLevel = 3;
  else if (dataPoints >= levels[1]) knowledgeLevel = 2;
  const labels = ['Ny bekantskap', 'Lär känna', 'Personlig rytm', 'Växtkännare'];
  const currentFloor = levels[knowledgeLevel - 1];
  const nextGoal = levels[knowledgeLevel] ?? currentFloor;
  const knowledgeProgress = knowledgeLevel === 4
    ? 100
    : clamp(Math.round(((dataPoints - currentFloor) / (nextGoal - currentFloor)) * 100), 0, 100);

  const tolerance = Math.max(2, Math.round(recommendedInterval * 0.35));
  let careStreak = wateringDates.length ? 1 : 0;
  for (let index = wateringIntervals.length - 1; index >= 0; index -= 1) {
    const interval = wateringIntervals[index];
    if (Math.abs(interval - recommendedInterval) <= tolerance) careStreak += 1;
    else break;
  }

  let reason: string;
  let recommendation: string;
  if (!lastWatered) {
    reason = 'Gör en första jordkontroll så börjar appen lära sig den här växtens rytm.';
    recommendation = 'Känn två till tre centimeter ner i jorden innan du bestämmer om den ska vattnas.';
  } else if (latestSoil === 'wet') {
    reason = 'Jorden registrerades som fuktig eller blöt senast, därför skjuts nästa vattning fram.';
    recommendation = 'Vänta tills den översta jorden har torkat och kontrollera igen om ett par dagar.';
  } else if (status === 'urgent') {
    reason = health.score < 48
      ? 'Den senaste hälsokollen visar tecken på stress.'
      : `Det har gått ${daysSinceWatered} dagar. Din växt brukar behöva en kontroll efter cirka ${recommendedInterval} dagar.`;
    recommendation = 'Kontrollera jord, blad och stjälkar idag. Vattna bara om jorden faktiskt känns torr.';
  } else if (status === 'due') {
    reason = `Historiken pekar mot ungefär ${recommendedInterval} dagar mellan kontrollerna.`;
    recommendation = 'Känn på jorden idag och registrera hur den känns. Det gör nästa rekommendation säkrare.';
  } else if (status === 'soon') {
    reason = `Nästa kontroll väntas inom ungefär ${Math.max(1, daysUntilWater || 1)} dagar.`;
    recommendation = 'Ingen panik. Titta på blad och jord när du ändå går förbi växten.';
  } else {
    reason = confidence === 'personal'
      ? `Rekommendationen bygger på ${wateringDates.length} vattningar och ${observations.length} hälsokontroller.`
      : `Startintervallet är ${baseInterval} dagar och justeras när du checkar in.`;
    recommendation = 'Låt växten stå i fred och gör nästa kontroll när appen säger till.';
  }

  return {
    recommendedIntervalDays: recommendedInterval,
    baseIntervalDays: baseInterval,
    historicalIntervalDays: historicalInterval === null ? null : Math.round(historicalInterval),
    lastWateredAt: lastWatered?.toISOString() || null,
    nextWaterAt: nextWaterDate?.toISOString() || null,
    daysUntilWater,
    status,
    statusLabel: statusMeta(status),
    healthScore: health.score,
    healthLabel: health.label,
    reason,
    recommendation,
    confidence,
    confidenceLabel,
    careStreak,
    knowledgeLevel,
    knowledgeLabel: labels[knowledgeLevel - 1],
    knowledgeProgress,
    observationsCount: observations.length,
    wateringsCount: wateringDates.length,
  };
}
