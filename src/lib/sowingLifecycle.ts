/**
 * Livscykel för en sådd. Ätbara grödor slutar i skörd, prydnadsväxter
 * i blomning och övervintring.
 *
 * edible:     sown → indoor → transplanted → harvesting → done
 * ornamental: sown → indoor → transplanted → flowering → overwintering → done
 */

import { normalizePlantKind, type PlantKind } from '@/lib/plantKind';

export type SowingStatus =
  | 'sown'
  | 'indoor'
  | 'transplanted'
  | 'harvesting'
  | 'flowering'
  | 'overwintering'
  | 'done';

const EDIBLE_ORDER: SowingStatus[] = ['sown', 'indoor', 'transplanted', 'harvesting', 'done'];
const ORNAMENTAL_ORDER: SowingStatus[] = ['sown', 'indoor', 'transplanted', 'flowering', 'overwintering', 'done'];

/** Bakåtkompatibel export – ordningen för ätbara grödor. */
export const SOWING_STATUS_ORDER: SowingStatus[] = EDIBLE_ORDER;

/** Livscykelns steg för en given växttyp. */
export function getSowingStatusOrder(plantKind: PlantKind | string | null | undefined): SowingStatus[] {
  return normalizePlantKind(plantKind as string) === 'ornamental' ? ORNAMENTAL_ORDER : EDIBLE_ORDER;
}

export const SOWING_STATUS_META: Record<SowingStatus, { label: string; short: string; description: string }> = {
  sown: { label: 'Sådd', short: 'Sådd', description: 'Fröet är i jorden' },
  indoor: { label: 'Förodlad', short: 'Förodling', description: 'Plantan växer inomhus eller i växthus' },
  transplanted: { label: 'Utplanterad', short: 'Utplanterad', description: 'Plantan är på sin slutliga växtplats' },
  harvesting: { label: 'Skörd', short: 'Ger skörd', description: 'Plantan producerar och kan skördas' },
  flowering: { label: 'Blommar', short: 'Blommar', description: 'Plantan blommar nu' },
  overwintering: { label: 'Övervintras', short: 'Övervintring', description: 'Knölar/lökar tas upp eller täcks inför vintern' },
  done: { label: 'Avslutad', short: 'Avslutad', description: 'Säsongen är över för den här sådden' },
};

/** Normaliserar okända/saknade statusvärden till närmaste giltiga steg för växttypen. */
export function normalizeSowingStatus(
  status: string | null | undefined,
  plantKind?: PlantKind | string | null,
): SowingStatus {
  const order = getSowingStatusOrder(plantKind);
  if (status && (order as string[]).includes(status)) return status as SowingStatus;
  // Statusvärde från den andra livscykeln – mappa till motsvarande steg.
  if (status === 'harvesting') return order.includes('flowering') ? 'flowering' : 'harvesting';
  if (status === 'flowering') return order.includes('flowering') ? 'flowering' : 'harvesting';
  if (status === 'overwintering') return order.includes('overwintering') ? 'overwintering' : 'done';
  if (status === 'done') return 'done';
  return 'sown';
}

/** Nästa steg i livscykeln, eller null om sådden är avslutad. */
export function nextSowingStatus(
  status: string | null | undefined,
  plantKind?: PlantKind | string | null,
): SowingStatus | null {
  const order = getSowingStatusOrder(plantKind);
  const idx = order.indexOf(normalizeSowingStatus(status, plantKind));
  return idx < order.length - 1 ? order[idx + 1] : null;
}

/** Föregående steg i livscykeln, eller null om sådden är i första steget. */
export function previousSowingStatus(
  status: string | null | undefined,
  plantKind?: PlantKind | string | null,
): SowingStatus | null {
  const order = getSowingStatusOrder(plantKind);
  const idx = order.indexOf(normalizeSowingStatus(status, plantKind));
  return idx > 0 ? order[idx - 1] : null;
}

/** Stegindex för progressvisning. */
export function sowingStatusIndex(
  status: string | null | undefined,
  plantKind?: PlantKind | string | null,
): number {
  return getSowingStatusOrder(plantKind).indexOf(normalizeSowingStatus(status, plantKind));
}

/** Antal hela dagar sedan ett datum (YYYY-MM-DD). Negativt om datumet ligger i framtiden. */
export function daysSinceDate(dateStr: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  const date = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - date.getTime()) / 86_400_000);
}

/**
 * Bygger patch-objektet för ett statusbyte.
 * När sådden markeras som utplanterad sätts transplant_date automatiskt
 * (om det inte redan finns) så att tidslinjen blir komplett.
 */
export function buildStatusPatch(
  sowing: { status?: string | null; transplant_date?: string | null },
  target: SowingStatus,
  today: string = new Date().toISOString().slice(0, 10),
): { status: SowingStatus; transplant_date?: string } {
  const patch: { status: SowingStatus; transplant_date?: string } = { status: target };
  if (target === 'transplanted' && !sowing.transplant_date) {
    patch.transplant_date = today;
  }
  return patch;
}

/** Åldertext för en sådd, t.ex. "12 dagar sedan" eller "om 5 dagar". */
export function sowingAgeLabel(sowDate: string | null | undefined, now: Date = new Date()): string | null {
  const days = daysSinceDate(sowDate, now);
  if (days === null) return null;
  if (days === 0) return 'Sådd idag';
  if (days === 1) return 'Sådd igår';
  if (days < 0) return days === -1 ? 'Sås imorgon' : `Sås om ${Math.abs(days)} dagar`;
  if (days < 7) return `Sådd för ${days} ${days === 1 ? 'dag' : 'dagar'} sedan`;
  const weeks = Math.floor(days / 7);
  return `Sådd för ${weeks} ${weeks === 1 ? 'vecka' : 'veckor'} sedan`;
}
