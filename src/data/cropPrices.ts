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

export type CropPriceOverrides = Record<string, number>;

export function cropPriceKey(variety: string): string {
  const value = variety.trim().toLocaleLowerCase('sv-SE');
  // Most specific match first: vitlök must not inherit lök's price.
  const matches = CROP_PRICES.flatMap(crop => crop.keywords
    .filter(keyword => value.includes(keyword))
    .map(keyword => ({ crop, length: keyword.length })));
  matches.sort((a, b) => b.length - a.length);
  return (matches[0]?.crop.label ?? value).toLocaleLowerCase('sv-SE');
}

export function cropPricesFromPreferences(preferences: unknown): CropPriceOverrides {
  const raw = (preferences as { crop_prices?: unknown } | null)?.crop_prices;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([key, price]) =>
    key.length > 0 && key.length <= 120 && typeof price === 'number' && Number.isFinite(price) && price >= 0 && price <= 100000));
}

export function pricePerKgFor(variety: string, overrides: CropPriceOverrides = {}): number {
  const key = cropPriceKey(variety);
  const custom = overrides[key];
  if (typeof custom === 'number' && Number.isFinite(custom) && custom >= 0) return custom;
  return CROP_PRICES.find(crop => crop.label.toLocaleLowerCase('sv-SE') === key)?.pricePerKg ?? DEFAULT_PRICE_PER_KG;
}

export function valueForHarvest(variety: string, weightGrams: number, overrides: CropPriceOverrides = {}): number {
  return (weightGrams / 1000) * pricePerKgFor(variety, overrides);
}
