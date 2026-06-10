export const CROP_PRICES: { keywords: string[]; pricePerKg: number; label: string }[] = [
  { keywords: ['tomat'], pricePerKg: 45, label: 'Tomat' },
  { keywords: ['gurka'], pricePerKg: 30, label: 'Gurka' },
  { keywords: ['morot', 'morötter'], pricePerKg: 18, label: 'Morot' },
  { keywords: ['potatis'], pricePerKg: 15, label: 'Potatis' },
  { keywords: ['sallat', 'sallad'], pricePerKg: 90, label: 'Sallat' },
  { keywords: ['jordgubb'], pricePerKg: 85, label: 'Jordgubbar' },
  { keywords: ['lök'], pricePerKg: 18, label: 'Lök' },
  { keywords: ['vitlök'], pricePerKg: 160, label: 'Vitlök' },
  { keywords: ['chili'], pricePerKg: 220, label: 'Chili' },
  { keywords: ['paprika'], pricePerKg: 60, label: 'Paprika' },
  { keywords: ['basilika'], pricePerKg: 300, label: 'Basilika' },
  { keywords: ['ärt', 'ärtor'], pricePerKg: 70, label: 'Ärtor' },
  { keywords: ['böna', 'bönor'], pricePerKg: 75, label: 'Bönor' },
  { keywords: ['squash', 'zucchini'], pricePerKg: 30, label: 'Squash' },
  { keywords: ['pumpa'], pricePerKg: 25, label: 'Pumpa' },
  { keywords: ['rödbet', 'rödbetor'], pricePerKg: 20, label: 'Rödbetor' },
  { keywords: ['kål'], pricePerKg: 25, label: 'Kål' },
  { keywords: ['hallon'], pricePerKg: 120, label: 'Hallon' },
];

export const DEFAULT_PRICE_PER_KG = 35;

export function pricePerKgFor(variety: string): number {
  const v = (variety || '').toLowerCase();
  for (const p of CROP_PRICES) {
    if (p.keywords.some(k => v.includes(k))) return p.pricePerKg;
  }
  return DEFAULT_PRICE_PER_KG;
}

export function valueForHarvest(variety: string, weightGrams: number): number {
  return (weightGrams / 1000) * pricePerKgFor(variety);
}
