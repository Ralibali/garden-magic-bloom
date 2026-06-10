// Zonbaserad sowing matrix för 8 svenska klimatzoner.
// Värden = ISO-vecknummer (1–53). null = ej rekommenderat (t.ex. chili i frilandsodling zon 7–8).

export type CropTiming = {
  preStart: number | null;
  preEnd: number | null;
  plantOutStart: number | null;
  plantOutEnd: number | null;
  directSowStart: number | null;
  directSowEnd: number | null;
  harvestStart: number | null;
  harvestEnd: number | null;
  /** Visas när tider satts till null eller plantorna behöver skydd */
  note?: string;
};

export type CropEntry = {
  name: string;
  zones: Record<number, CropTiming>;
};

// Sista frost ISO-vecka per zon
const LAST_FROST: Record<number, number> = {
  1: 16, 2: 17, 3: 19, 4: 20, 5: 22, 6: 23, 7: 24, 8: 25,
};

const SEASON_END: Record<number, number> = {
  1: 42, 2: 41, 3: 40, 4: 39, 5: 37, 6: 35, 7: 33, 8: 32,
};

function rng(zone: number, fromOffset: number, toOffset: number): [number, number] {
  const f = LAST_FROST[zone];
  return [f + fromOffset, f + toOffset];
}

function clampEnd(zone: number, week: number): number {
  return Math.min(week, SEASON_END[zone]);
}

function build(spec: (zone: number, frost: number) => Omit<CropTiming, 'note'> & { note?: string }): Record<number, CropTiming> {
  const out: Record<number, CropTiming> = {};
  for (let z = 1; z <= 8; z++) out[z] = spec(z, LAST_FROST[z]) as CropTiming;
  return out;
}

export const sowingMatrix: CropEntry[] = [
  {
    name: 'Tomat',
    zones: build((z, f) => {
      const [ps, pe] = [f - 7, f - 5];
      const [ots, ote] = [f + 1, f + 3];
      const hs = clampEnd(z, f + 13);
      const he = clampEnd(z, SEASON_END[z]);
      if (z >= 7) return { preStart: ps, preEnd: pe, plantOutStart: ots, plantOutEnd: ote, directSowStart: null, directSowEnd: null, harvestStart: hs, harvestEnd: he, note: 'Korta säsongen – välj tidiga sorter och odla helst i växthus.' };
      return { preStart: ps, preEnd: pe, plantOutStart: ots, plantOutEnd: ote, directSowStart: null, directSowEnd: null, harvestStart: hs, harvestEnd: he };
    }),
  },
  {
    name: 'Chili',
    zones: build((z, f) => {
      const [ps, pe] = [f - 12, f - 10];
      const [ots, ote] = [f + 2, f + 4];
      if (z >= 7) return { preStart: ps, preEnd: pe, plantOutStart: null, plantOutEnd: null, directSowStart: null, directSowEnd: null, harvestStart: null, harvestEnd: null, note: 'Rekommenderas bara i uppvärmt växthus i zon 7–8.' };
      return { preStart: ps, preEnd: pe, plantOutStart: ots, plantOutEnd: ote, directSowStart: null, directSowEnd: null, harvestStart: clampEnd(z, f + 14), harvestEnd: clampEnd(z, SEASON_END[z]) };
    }),
  },
  {
    name: 'Gurka',
    zones: build((z, f) => {
      const [ps, pe] = [f - 3, f - 1];
      const [ots, ote] = [f + 1, f + 3];
      const [ds, de] = [f + 2, f + 5];
      return { preStart: ps, preEnd: pe, plantOutStart: ots, plantOutEnd: ote, directSowStart: ds, directSowEnd: de, harvestStart: clampEnd(z, f + 12), harvestEnd: clampEnd(z, SEASON_END[z]) };
    }),
  },
  {
    name: 'Morot',
    zones: build((z, f) => ({
      preStart: null, preEnd: null,
      plantOutStart: null, plantOutEnd: null,
      directSowStart: f - 1, directSowEnd: f + 8,
      harvestStart: clampEnd(z, f + 12), harvestEnd: clampEnd(z, SEASON_END[z]),
      note: 'Morot sås direkt på plats – förodla inte.',
    })),
  },
  {
    name: 'Sallat',
    zones: build((z, f) => ({
      preStart: f - 4, preEnd: f - 2,
      plantOutStart: f - 1, plantOutEnd: clampEnd(z, SEASON_END[z] - 6),
      directSowStart: f - 2, directSowEnd: clampEnd(z, SEASON_END[z] - 6),
      harvestStart: f + 3, harvestEnd: clampEnd(z, SEASON_END[z]),
      note: 'Så lite men ofta i flera omgångar.',
    })),
  },
  {
    name: 'Potatis',
    zones: build((z, f) => ({
      preStart: f - 5, preEnd: f - 3,
      plantOutStart: f - 1, plantOutEnd: f + 2,
      directSowStart: f - 1, directSowEnd: f + 2,
      harvestStart: clampEnd(z, f + 10), harvestEnd: clampEnd(z, SEASON_END[z]),
      note: 'Förgro ljust och svalt innan sättning.',
    })),
  },
  {
    name: 'Lök',
    zones: build((z, f) => ({
      preStart: f - 10, preEnd: f - 8,
      plantOutStart: f, plantOutEnd: f + 3,
      directSowStart: f, directSowEnd: f + 3,
      harvestStart: clampEnd(z, f + 12), harvestEnd: clampEnd(z, SEASON_END[z]),
      note: 'Sättlök sätts direkt; lök från frö förodlas.',
    })),
  },
  {
    name: 'Vitlök',
    zones: build((z, f) => ({
      preStart: null, preEnd: null,
      plantOutStart: 38, plantOutEnd: 44,
      directSowStart: 38, directSowEnd: 44,
      harvestStart: f + 12, harvestEnd: f + 16,
      note: 'Sätts på hösten – skördas året därpå.',
    })),
  },
  {
    name: 'Jordgubbar',
    zones: build((z, f) => ({
      preStart: null, preEnd: null,
      plantOutStart: f - 1, plantOutEnd: f + 3,
      directSowStart: null, directSowEnd: null,
      harvestStart: f + 8, harvestEnd: f + 12,
      note: 'Plantor sätts vår eller sensommar (v.32–34).',
    })),
  },
  {
    name: 'Basilika',
    zones: build((z, f) => ({
      preStart: f - 6, preEnd: f - 4,
      plantOutStart: f + 2, plantOutEnd: f + 4,
      directSowStart: null, directSowEnd: null,
      harvestStart: clampEnd(z, f + 8), harvestEnd: clampEnd(z, SEASON_END[z]),
      note: 'Trivs varmt – plantera ut först när nätterna är varma.',
    })),
  },
  {
    name: 'Ärtor',
    zones: build((z, f) => ({
      preStart: null, preEnd: null,
      plantOutStart: null, plantOutEnd: null,
      directSowStart: f - 2, directSowEnd: f + 6,
      harvestStart: clampEnd(z, f + 8), harvestEnd: clampEnd(z, SEASON_END[z] - 4),
      note: 'Tål kyla – kan sås tidigt direkt på plats.',
    })),
  },
  {
    name: 'Bönor',
    zones: build((z, f) => ({
      preStart: null, preEnd: null,
      plantOutStart: null, plantOutEnd: null,
      directSowStart: f + 1, directSowEnd: f + 6,
      harvestStart: clampEnd(z, f + 10), harvestEnd: clampEnd(z, SEASON_END[z]),
      note: 'Vänta tills jorden är varm (>10 °C).',
    })),
  },
];

// Vecknummer → "början/mitten/slutet av månad"
const MONTHS = ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'];

export function weekToDateLabel(week: number): string {
  // Approximera: vecka * 7 dagar från årets start
  const d = new Date(2026, 0, 1 + (week - 1) * 7);
  const month = MONTHS[d.getMonth()];
  const day = d.getDate();
  const part = day <= 10 ? 'början' : day <= 20 ? 'mitten' : 'slutet';
  return `${part} av ${month}`;
}

export function formatRange(start: number | null, end: number | null): string {
  if (start === null || end === null) return '–';
  if (start === end) return `v.${start} (${weekToDateLabel(start)})`;
  return `v.${start}–${end} (${weekToDateLabel(start)} – ${weekToDateLabel(end)})`;
}

export function getCropTiming(cropName: string, zone: number): CropTiming | null {
  const c = sowingMatrix.find(x => x.name === cropName);
  if (!c) return null;
  return c.zones[zone] ?? null;
}
