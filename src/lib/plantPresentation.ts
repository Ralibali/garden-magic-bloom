import { getCropTiming } from '@/data/sowingMatrix';
import { guideCropForVaxt } from '@/lib/sowingGuide';
import { formatMonthRange } from '@/lib/seoData';

type PlantTimingInput = { slug: string; name: string; sow_indoor_start?: number | null; sow_indoor_end?: number | null; sow_outdoor_start?: number | null; sow_outdoor_end?: number | null };
export type PlantTiming = { sowIndoor: string | null; sowOutdoor: string | null; plantingTime: string | null; note: string; source?: string };
const perennialPlanting: Record<string, string> = {
  blabar: 'Vår–höst, när jorden går att bearbeta',
  druva: 'Vår efter den sista frosten',
  fikon: 'Vår efter den sista frosten; välj ett varmt, skyddat läge',
  krusbar: 'Vår eller höst i tjälfri jord',
  hallon: 'Vår eller höst i tjälfri jord',
  vinbar: 'Vår eller höst i tjälfri jord',
};
const weekRange = (start: number | null, end: number | null) => start == null ? null : `vecka ${start}${end && end !== start ? `–${end}` : ''}`;
/** SEO rows previously used January as an empty value. Use the public calendar's
 * reviewed zone data for annual crops and explicitly model planting for shrubs.
 * Times describe purchased plants for berries/vines, not propagation from seed. */
export function plantTiming(plant: PlantTimingInput, zone = 3): PlantTiming {
  if (perennialPlanting[plant.slug]) return {
    sowIndoor: null, sowOutdoor: null, plantingTime: perennialPlanting[plant.slug],
    note: 'Avser plantering av en färdig planta. Anpassa efter sort, väder och ditt lokala klimat.',
    source: plant.slug === 'blabar' ? 'https://www.blomsterlandet.se/tips-rad/tradgard/barbuskar/blabar-sa-har-planterar-du/' : undefined,
  };
  const crop = guideCropForVaxt(plant);
  const timing = crop ? getCropTiming(crop.name, zone) : null;
  if (timing) return {
    sowIndoor: weekRange(timing.preStart, timing.preEnd),
    sowOutdoor: weekRange(timing.directSowStart, timing.directSowEnd),
    plantingTime: weekRange(timing.plantOutStart, timing.plantOutEnd),
    note: `Riktvärden för zon ${zone}. Välj din zon i såkalendern och följ sortens anvisningar. ${timing.note || ''}`,
  };
  const valid = (start?: number | null, end?: number | null) => start === 1 && (!end || end === 1) ? null : formatMonthRange(start ?? null, end ?? null);
  return { sowIndoor: valid(plant.sow_indoor_start, plant.sow_indoor_end), sowOutdoor: valid(plant.sow_outdoor_start, plant.sow_outdoor_end), plantingTime: null, note: 'Tiderna beror på sort, väder och odlingszon. Följ fröpåsens anvisningar.' };
}
