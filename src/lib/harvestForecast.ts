/**
 * Smarta skördeförslag: matchar en sådd mot såmatrisens grödor och
 * räknar ut skördefönstret för användarens klimatzon.
 */
import { sowingMatrix } from '@/data/sowingMatrix';
import { deriveCropIdentity, fold, UNKNOWN_CROP_KEY } from '@/lib/cropIdentity';

export type HarvestHintKind = 'now' | 'upcoming' | 'past' | 'unknown';

export interface HarvestHint {
  kind: HarvestHintKind;
  cropName: string;
  /** ISO-vecka då skörden börjar/slutar i användarens zon */
  startWeek: number;
  endWeek: number;
  /** Färdigformaterad svensk text, t.ex. "Skördeläge nu – fram till v. 40" */
  label: string;
  /** Kort etikett för chips, t.ex. "Skördeläge nu" */
  shortLabel: string;
}

/** Extraherar basgrödan ur ett sortnamn, t.ex. "Tomat – Sungold" → "tomat". */
function catalogueNameForKey(cropKey: string): string | null {
  const compact = cropKey.replace(/-/g, '');
  const crop = sowingMatrix.find((entry) => fold(entry.name).replace(/\s+/g, '') === compact);
  return crop?.name ?? null;
}

export function findCropForVariety(variety: string | null | undefined): string | null {
  const identity = deriveCropIdentity(variety);
  if (identity.crop_key === UNKNOWN_CROP_KEY) return null;
  return catalogueNameForKey(identity.crop_key);
}

/** ISO-veckonummer för ett datum (svensk/ISO 8601-räkning). */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/**
 * Beräknar skördehint för en sådd i en given zon.
 * Returnerar null om grödan inte matchar såmatrisen eller saknar skördefönster i zonen.
 */
export function getHarvestHint(
  variety: string | null | undefined,
  climateZone: number,
  today: Date = new Date(),
): HarvestHint | null {
  const cropName = findCropForVariety(variety);
  if (!cropName) return null;
  const crop = sowingMatrix.find((c) => c.name === cropName);
  const timing = crop?.zones[climateZone];
  if (!timing || timing.harvestStart === null || timing.harvestEnd === null) return null;

  const currentWeek = isoWeek(today);
  const { harvestStart, harvestEnd } = timing;

  if (currentWeek >= harvestStart && currentWeek <= harvestEnd) {
    return {
      kind: 'now',
      cropName,
      startWeek: harvestStart,
      endWeek: harvestEnd,
      shortLabel: 'Skördeläge nu',
      label: `Skördeläge nu – fram till v. ${harvestEnd}`,
    };
  }
  if (currentWeek < harvestStart) {
    const weeksLeft = harvestStart - currentWeek;
    return {
      kind: 'upcoming',
      cropName,
      startWeek: harvestStart,
      endWeek: harvestEnd,
      shortLabel: `Skörd från v. ${harvestStart}`,
      label: weeksLeft <= 2
        ? `Skörd närmar sig – beräknat från v. ${harvestStart}`
        : `Beräknad skörd från v. ${harvestStart}`,
    };
  }
  return {
    kind: 'past',
    cropName,
    startWeek: harvestStart,
    endWeek: harvestEnd,
    shortLabel: 'Skördesäsongen är slut',
    label: `Skördesäsongen passerade v. ${harvestEnd} – dags att avsluta sådden`,
  };
}
