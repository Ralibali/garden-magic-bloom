/**
 * Livscykel för en sådd: sown → indoor → transplanted → harvesting → done.
 * Delad logik för såloggen så att statusflödet är konsekvent överallt.
 */

export type SowingStatus = 'sown' | 'indoor' | 'transplanted' | 'harvesting' | 'done';

export const SOWING_STATUS_ORDER: SowingStatus[] = ['sown', 'indoor', 'transplanted', 'harvesting', 'done'];

export const SOWING_STATUS_META: Record<SowingStatus, { label: string; short: string; description: string }> = {
  sown: { label: 'Sådd', short: 'Sådd', description: 'Fröet är i jorden' },
  indoor: { label: 'Förodlad', short: 'Förodling', description: 'Plantan växer inomhus eller i växthus' },
  transplanted: { label: 'Utplanterad', short: 'Utplanterad', description: 'Plantan är på sin slutliga växtplats' },
  harvesting: { label: 'Skörd', short: 'Ger skörd', description: 'Plantan producerar och kan skördas' },
  done: { label: 'Avslutad', short: 'Avslutad', description: 'Säsongen är över för den här sådden' },
};

/** Normaliserar okända/saknade statusvärden till närmaste giltiga steg. */
export function normalizeSowingStatus(status: string | null | undefined): SowingStatus {
  if (status && (SOWING_STATUS_ORDER as string[]).includes(status)) return status as SowingStatus;
  return 'sown';
}

/** Nästa steg i livscykeln, eller null om sådden är avslutad. */
export function nextSowingStatus(status: string | null | undefined): SowingStatus | null {
  const current = normalizeSowingStatus(status);
  const idx = SOWING_STATUS_ORDER.indexOf(current);
  return idx < SOWING_STATUS_ORDER.length - 1 ? SOWING_STATUS_ORDER[idx + 1] : null;
}

/** Föregående steg i livscykeln, eller null om sådden är i första steget. */
export function previousSowingStatus(status: string | null | undefined): SowingStatus | null {
  const current = normalizeSowingStatus(status);
  const idx = SOWING_STATUS_ORDER.indexOf(current);
  return idx > 0 ? SOWING_STATUS_ORDER[idx - 1] : null;
}

/** Stegindex (0–4) för progressvisning. */
export function sowingStatusIndex(status: string | null | undefined): number {
  return SOWING_STATUS_ORDER.indexOf(normalizeSowingStatus(status));
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
