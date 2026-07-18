/**
 * Bygger en delbar säsongsrapport (text) för sociala medier och utskrift.
 */

export interface SeasonShareInput {
  year: number;
  totalGrams: number;
  harvestCount: number;
  sowingsCount: number;
  bedsCount: number;
  /** Toppgrödor sorterade fallande efter vikt */
  topCrops: { variety: string; grams: number }[];
  /** Uppskattat butiksvärde i SEK, 0 om okänt */
  valueSek?: number;
  climateZone?: number | null;
}

const fmtKg = (grams: number) =>
  (grams / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 });

/** Bygger den delbara säsongsrapporten som ren text. */
export function buildSeasonSummary(input: SeasonShareInput): string {
  const lines: string[] = [];
  lines.push(`🌱 Min odlingssäsong ${input.year}`);
  lines.push('');

  if (input.totalGrams > 0) {
    lines.push(`🥕 Skördat ${fmtKg(input.totalGrams)} kg över ${input.harvestCount} ${input.harvestCount === 1 ? 'tillfälle' : 'tillfällen'}`);
  }
  if (input.sowingsCount > 0) {
    const bedText = input.bedsCount > 0 ? ` i ${input.bedsCount} ${input.bedsCount === 1 ? 'bädd' : 'bäddar'}` : '';
    lines.push(`🌿 ${input.sowingsCount} ${input.sowingsCount === 1 ? 'sådd' : 'sådder'}${bedText}`);
  }
  const tops = input.topCrops.filter((c) => c.grams > 0).slice(0, 3);
  if (tops.length > 0) {
    lines.push(`🏆 ${tops.map((c) => `${c.variety} ${fmtKg(c.grams)} kg`).join(' · ')}`);
  }
  if (input.valueSek && input.valueSek > 0) {
    lines.push(`💰 Skördens värde: ca ${input.valueSek.toLocaleString('sv-SE')} kr i butikspris`);
  }
  if (input.climateZone) {
    lines.push(`📍 Odlat i klimatzon ${input.climateZone}`);
  }

  lines.push('');
  lines.push('Loggat med Odlingsdagboken 🌿 https://odlingsdagboken.com');
  return lines.join('\n');
}

/** Delar texten via Web Share API om möjligt, annars urklipp. Returnerar hur det delades. */
export async function shareSeasonText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title: 'Min odlingssäsong', text });
      return 'shared';
    }
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch (error: any) {
    // Användaren avbröt delningsdialogen — räkna inte som fel
    if (error?.name === 'AbortError') return 'shared';
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}
