/**
 * Skiljer ätbara grödor från prydnadsväxter så att en dahlia aldrig
 * får skördeuppgifter.
 */

export type PlantKind = 'edible' | 'ornamental';

export const ORNAMENTAL_KEYWORDS = [
  'dahlia', 'georgin', 'tulpan', 'narciss', 'pion', 'ros', 'rosor',
  'lavendel', 'tagetes', 'ringblomma', 'lupin', 'riddarsporre', 'zinnia',
  'cosmos', 'rudbeckia', 'luktärt', 'gladiolus', 'lilja', 'krokus',
  'hyacint', 'iris', 'vallmo', 'pensé', 'penséer', 'viol', 'begonia',
  'pelargon', 'petunia', 'snittblomma', 'sommarblomma', 'solros',
  'sommarflox',
] as const;

// Längsta nyckelord först så att "ringblomma" vinner över "ros".
const SORTED_KEYWORDS = [...ORNAMENTAL_KEYWORDS].sort((a, b) => b.length - a.length);

/** Gissar växttyp utifrån sortnamnet. Default är 'edible'. */
export function guessPlantKind(variety: string | null | undefined): PlantKind {
  const normalized = String(variety ?? '').toLowerCase();
  if (!normalized.trim()) return 'edible';
  return SORTED_KEYWORDS.some((keyword) => normalized.includes(keyword)) ? 'ornamental' : 'edible';
}

/** Normaliserar ett värde från databasen till en giltig växttyp. */
export function normalizePlantKind(value: string | null | undefined): PlantKind {
  return value === 'ornamental' ? 'ornamental' : 'edible';
}

export const PLANT_KIND_LABELS: Record<PlantKind, string> = {
  edible: 'Ätbar gröda',
  ornamental: 'Prydnadsväxt',
};
