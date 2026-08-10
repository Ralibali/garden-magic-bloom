// Zonbaserad sowing matrix för 8 svenska klimatzoner.
// Värden = ISO-vecknummer (1–53). null = ej rekommenderat (t.ex. chili i frilandsodling zon 7–8).
// Kör `node scripts/export-sowing-weeks.mjs` när denna fil ändras så Edge Functions får samma såveckor.

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
  /** Grov gruppering som används i odlingskalendern och växtbiblioteket. */
  category?: 'grönsak' | 'rotfrukt' | 'kål' | 'bladgrönt' | 'krydda' | 'bär' | 'flerårigt';
  zones: Record<number, CropTiming>;
};

// Sista frost ISO-vecka per zon
const LAST_FROST: Record<number, number> = {
  1: 16, 2: 17, 3: 19, 4: 20, 5: 22, 6: 23, 7: 24, 8: 25,
};

const SEASON_END: Record<number, number> = {
  1: 42, 2: 41, 3: 40, 4: 39, 5: 37, 6: 35, 7: 33, 8: 32,
};

export const ZONE_LAST_FROST_WEEK = LAST_FROST;
export const ZONE_SEASON_END_WEEK = SEASON_END;

function clampEnd(zone: number, week: number): number {
  return Math.min(week, SEASON_END[zone]);
}

function build(spec: (zone: number, frost: number) => CropTiming): Record<number, CropTiming> {
  const out: Record<number, CropTiming> = {};
  for (let z = 1; z <= 8; z++) out[z] = spec(z, LAST_FROST[z]);
  return out;
}

type Offsets = {
  /** Veckor relativt sista frost. Negativa tal = före frostrisken är över. */
  pre?: [number, number];
  plantOut?: [number, number];
  direct?: [number, number];
  /** Skördestart relativt frost. Slutet klamras alltid mot säsongsslut. */
  harvest?: [number, number];
  /** Skörden pågår till säsongsslut oavsett offset. */
  harvestToSeasonEnd?: boolean;
  /** Absoluta ISO-veckor (används för höstsatta och fleråriga grödor). */
  absolutePlantOut?: [number, number];
  absoluteHarvest?: [number, number];
  note?: string;
  /** Från och med denna zon rekommenderas grödan bara i växthus. */
  greenhouseFromZone?: number;
  greenhouseNote?: string;
};

function crop(name: string, category: CropEntry['category'], o: Offsets): CropEntry {
  return {
    name,
    category,
    zones: build((z, f) => {
      const greenhouseOnly = o.greenhouseFromZone != null && z >= o.greenhouseFromZone;
      const harvestStart = o.absoluteHarvest
        ? o.absoluteHarvest[0]
        : o.harvest
          ? clampEnd(z, f + o.harvest[0])
          : null;
      const harvestEnd = o.absoluteHarvest
        ? o.absoluteHarvest[1]
        : o.harvest
          ? (o.harvestToSeasonEnd ? SEASON_END[z] : clampEnd(z, f + o.harvest[1]))
          : null;
      const timing: CropTiming = {
        preStart: o.pre ? f + o.pre[0] : null,
        preEnd: o.pre ? f + o.pre[1] : null,
        plantOutStart: o.absolutePlantOut ? o.absolutePlantOut[0] : o.plantOut ? f + o.plantOut[0] : null,
        plantOutEnd: o.absolutePlantOut ? o.absolutePlantOut[1] : o.plantOut ? clampEnd(z, f + o.plantOut[1]) : null,
        directSowStart: o.direct ? f + o.direct[0] : null,
        directSowEnd: o.direct ? clampEnd(z, f + o.direct[1]) : null,
        harvestStart,
        harvestEnd,
        note: o.note,
      };
      if (greenhouseOnly) {
        return {
          ...timing,
          plantOutStart: null,
          plantOutEnd: null,
          directSowStart: null,
          directSowEnd: null,
          harvestStart: null,
          harvestEnd: null,
          note: o.greenhouseNote || 'Rekommenderas bara i växthus eller inomhus i den här zonen.',
        };
      }
      return timing;
    }),
  };
}

export const sowingMatrix: CropEntry[] = [
  // --- Fruktgrönsaker ---
  crop('Tomat', 'grönsak', {
    pre: [-7, -5], plantOut: [1, 3], harvest: [13, 0], harvestToSeasonEnd: true,
    note: 'Förodla varmt och ljust – plantera ut när nätterna är över tio grader.',
  }),
  crop('Chili', 'grönsak', {
    pre: [-12, -10], plantOut: [2, 4], harvest: [14, 0], harvestToSeasonEnd: true,
    greenhouseFromZone: 7, greenhouseNote: 'Rekommenderas bara i uppvärmt växthus i zon sju till åtta.',
    note: 'Behöver lång kultur – sås tidigt under växtbelysning.',
  }),
  crop('Gurka', 'grönsak', {
    pre: [-3, -1], plantOut: [1, 3], direct: [2, 5], harvest: [12, 0], harvestToSeasonEnd: true,
    note: 'Gurka ogillar rotstörning – förodla i stora krukor.',
  }),
  crop('Squash', 'grönsak', {
    pre: [-3, -1], plantOut: [1, 3], direct: [2, 5], harvest: [9, 0], harvestToSeasonEnd: true,
    note: 'Två plantor räcker långt – skörda små frukter ofta.',
  }),
  crop('Pumpa', 'grönsak', {
    pre: [-4, -2], plantOut: [1, 3], direct: [2, 4], harvest: [15, 0], harvestToSeasonEnd: true,
    note: 'Behöver mycket värme, plats och näring. Skörda före första frostnatten.',
  }),
  crop('Majs', 'grönsak', {
    pre: [-4, -2], plantOut: [1, 3], direct: [2, 4], harvest: [13, 0], harvestToSeasonEnd: true,
    greenhouseFromZone: 8, greenhouseNote: 'Säsongen är för kort i zon åtta – välj tidiga sorter i växthus.',
    note: 'Odla i block om minst fyra gånger fyra plantor för god pollinering.',
  }),

  // --- Rotfrukter ---
  crop('Morot', 'rotfrukt', {
    direct: [-1, 8], harvest: [12, 0], harvestToSeasonEnd: true,
    note: 'Morot sås direkt på plats – förodla inte.',
  }),
  crop('Rödbeta', 'rotfrukt', {
    pre: [-4, -2], plantOut: [0, 3], direct: [-1, 7], harvest: [11, 0], harvestToSeasonEnd: true,
    note: 'Gallra tidigt – bladen kan ätas som bladgrönt.',
  }),
  crop('Palsternacka', 'rotfrukt', {
    direct: [-2, 3], harvest: [18, 0], harvestToSeasonEnd: true,
    note: 'Långsam grodd – håll jorden jämnfuktig i tre till fyra veckor.',
  }),
  crop('Kålrot', 'rotfrukt', {
    pre: [-3, -1], plantOut: [1, 4], direct: [0, 4], harvest: [16, 0], harvestToSeasonEnd: true,
    note: 'Blir sötare av en lätt frostnatt innan skörd.',
  }),
  crop('Rädisa', 'rotfrukt', {
    direct: [-3, 10], harvest: [1, 0], harvestToSeasonEnd: true,
    note: 'Klar i tre till fyra veckor – så lite men ofta.',
  }),
  crop('Potatis', 'rotfrukt', {
    pre: [-5, -3], plantOut: [-1, 2], harvest: [10, 0], harvestToSeasonEnd: true,
    note: 'Förgro ljust och svalt innan sättning.',
  }),
  crop('Jordärtskocka', 'flerårigt', {
    plantOut: [-3, 1], absoluteHarvest: [40, 45],
    note: 'Sprider sig kraftigt – odla i avgränsad bädd eller pallkrage.',
  }),

  // --- Lökväxter ---
  crop('Lök', 'grönsak', {
    pre: [-10, -8], plantOut: [0, 3], direct: [0, 3], harvest: [12, 0], harvestToSeasonEnd: true,
    note: 'Sättlök sätts direkt; lök från frö förodlas.',
  }),
  crop('Vitlök', 'grönsak', {
    absolutePlantOut: [38, 44], harvest: [12, 16],
    note: 'Sätts på hösten – skördas året därpå när nedre bladen gulnat.',
  }),
  crop('Purjolök', 'grönsak', {
    pre: [-11, -9], plantOut: [0, 3], harvest: [16, 0], harvestToSeasonEnd: true,
    note: 'Kupa jord runt stammen för längre vit del.',
  }),
  crop('Gräslök', 'krydda', {
    pre: [-6, -4], plantOut: [-1, 4], direct: [-1, 4], harvest: [3, 0], harvestToSeasonEnd: true,
    note: 'Flerårig – dela ruggen var tredje år.',
  }),

  // --- Kål ---
  crop('Broccoli', 'kål', {
    pre: [-6, -4], plantOut: [0, 3], direct: [0, 3], harvest: [12, 0], harvestToSeasonEnd: true,
    note: 'Skydda mot kålfjäril med finmaskigt nät från dag ett.',
  }),
  crop('Blomkål', 'kål', {
    pre: [-6, -4], plantOut: [0, 3], harvest: [13, 0], harvestToSeasonEnd: true,
    note: 'Behöver jämn tillgång på vatten och näring för fina huvuden.',
  }),
  crop('Vitkål', 'kål', {
    pre: [-7, -5], plantOut: [0, 3], harvest: [16, 0], harvestToSeasonEnd: true,
    note: 'Ger stora plantor – räkna med femtio centimeter mellan varje.',
  }),
  crop('Grönkål', 'kål', {
    pre: [-5, -3], plantOut: [0, 5], direct: [0, 5], harvest: [14, 0], harvestToSeasonEnd: true,
    note: 'Tål frost och kan skördas långt in i vintern.',
  }),
  crop('Brysselkål', 'kål', {
    pre: [-7, -5], plantOut: [0, 3], harvest: [20, 0], harvestToSeasonEnd: true,
    note: 'Lång kultur – knopparna blir bäst efter första frostnatten.',
  }),
  crop('Pak choi', 'bladgrönt', {
    pre: [-3, -1], plantOut: [0, 8], direct: [0, 10], harvest: [5, 0], harvestToSeasonEnd: true,
    note: 'Går lätt i blom vid värme och torka – bäst som sen sommarsådd.',
  }),

  // --- Bladgrönt ---
  crop('Sallat', 'bladgrönt', {
    pre: [-4, -2], plantOut: [-1, 12], direct: [-2, 12], harvest: [3, 0], harvestToSeasonEnd: true,
    note: 'Så lite men ofta i flera omgångar.',
  }),
  crop('Spenat', 'bladgrönt', {
    direct: [-4, 10], harvest: [3, 0], harvestToSeasonEnd: true,
    note: 'Trivs svalt – vår- och höstsådd ger bäst blad.',
  }),
  crop('Mangold', 'bladgrönt', {
    pre: [-4, -2], plantOut: [0, 4], direct: [-1, 6], harvest: [8, 0], harvestToSeasonEnd: true,
    note: 'Skörda yttre blad löpande så växer plantan vidare.',
  }),
  crop('Ruccola', 'bladgrönt', {
    direct: [-3, 12], harvest: [3, 0], harvestToSeasonEnd: true,
    note: 'Snabb och tålig – perfekt mellan andra grödor.',
  }),
  crop('Selleri', 'grönsak', {
    pre: [-9, -7], plantOut: [1, 3], harvest: [15, 0], harvestToSeasonEnd: true,
    note: 'Fröna behöver ljus för att gro – täck bara mycket tunt.',
  }),

  // --- Baljväxter ---
  crop('Ärtor', 'grönsak', {
    direct: [-2, 6], harvest: [8, 12],
    note: 'Tål kyla – kan sås tidigt direkt på plats.',
  }),
  crop('Sockerärt', 'grönsak', {
    direct: [-2, 6], harvest: [9, 13],
    note: 'Behöver stöd – sätt nät eller ris redan vid sådd.',
  }),
  crop('Bönor', 'grönsak', {
    direct: [1, 6], harvest: [10, 0], harvestToSeasonEnd: true,
    note: 'Vänta tills jorden är varm (>10 °C).',
  }),
  crop('Bondböna', 'grönsak', {
    direct: [-5, 2], harvest: [12, 16],
    note: 'Härdig – kan sås så snart jorden går att arbeta i.',
  }),

  // --- Kryddor ---
  crop('Basilika', 'krydda', {
    pre: [-6, -4], plantOut: [2, 4], harvest: [8, 0], harvestToSeasonEnd: true,
    note: 'Trivs varmt – plantera ut först när nätterna är varma.',
  }),
  crop('Dill', 'krydda', {
    direct: [-2, 10], harvest: [5, 0], harvestToSeasonEnd: true,
    note: 'Så i omgångar och låt någon planta gå i blom för fröskörd.',
  }),
  crop('Persilja', 'krydda', {
    pre: [-6, -4], plantOut: [0, 4], direct: [-1, 6], harvest: [8, 0], harvestToSeasonEnd: true,
    note: 'Långsam grodd – blötlägg fröna ett dygn först.',
  }),
  crop('Koriander', 'krydda', {
    direct: [-1, 10], harvest: [4, 0], harvestToSeasonEnd: true,
    note: 'Går snabbt i blom i värme – så ofta och lite i skugga.',
  }),
  crop('Timjan', 'krydda', {
    pre: [-7, -5], plantOut: [1, 4], harvest: [6, 0], harvestToSeasonEnd: true,
    note: 'Flerårig i milda lägen – vill ha torrt och soligt.',
  }),
  crop('Oregano', 'krydda', {
    pre: [-7, -5], plantOut: [1, 4], harvest: [6, 0], harvestToSeasonEnd: true,
    note: 'Flerårig – klipp ner efter blomning för nya skott.',
  }),

  // --- Bär och fleråriga ---
  crop('Jordgubbar', 'bär', {
    plantOut: [-1, 3], harvest: [8, 12],
    note: 'Plantor sätts vår eller sensommar (v.32–34).',
  }),
  crop('Hallon', 'bär', {
    plantOut: [-3, 2], harvest: [11, 17],
    note: 'Sätts helst höst eller tidig vår. Beskär gamla skott efter skörd.',
  }),
  crop('Vinbär', 'bär', {
    plantOut: [-4, 2], harvest: [10, 14],
    note: 'Planteras vår eller höst – beskär på vintern.',
  }),
  crop('Krusbär', 'bär', {
    plantOut: [-4, 2], harvest: [10, 14],
    note: 'Luftig beskärning minskar risken för mjöldagg.',
  }),
  crop('Rabarber', 'flerårigt', {
    plantOut: [-4, 2], harvest: [3, 12],
    note: 'Skörda inte första året. Sluta skörda i juli så plantan hinner samla kraft.',
  }),
  crop('Sparris', 'flerårigt', {
    plantOut: [-3, 1], harvest: [1, 7],
    note: 'Skördas först tredje året – men ger sedan i tjugo år.',
  }),
];

// Vecknummer → "början/mitten/slutet av månad"
const MONTHS = ['januari','februari','mars','april','maj','juni','juli','augusti','september','oktober','november','december'];

/** ISO-veckans (approximerade) kalendermånad, 1–12. */
export function weekToMonth(week: number): number {
  const d = new Date(2026, 0, 1 + (week - 1) * 7);
  return d.getMonth() + 1;
}

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
