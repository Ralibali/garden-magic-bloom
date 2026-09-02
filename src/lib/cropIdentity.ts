/**
 * Canonical crop identity. Preserves the user’s original variety text.
 * crop_key is a stable slug; UNKNOWN when we cannot match a catalogue crop.
 */

export const UNKNOWN_CROP_KEY = 'unknown';

export type CropIdentitySource = 'catalogue' | 'custom' | 'unknown';

export interface CropIdentity {
  crop_key: string;
  variety_name: string;
  display_text: string;
  source: CropIdentitySource;
}

const CATALOGUE: { key: string; names: string[] }[] = [
  { key: 'tomat', names: ['tomat', 'tomato', 'tomater', 'cherry tomato', 'körsbärstomat'] },
  { key: 'chili', names: ['chili', 'chilli', 'paprika'] },
  { key: 'gurka', names: ['gurka', 'cucumber'] },
  { key: 'squash', names: ['squash', 'zucchini', 'courgette'] },
  { key: 'pumpa', names: ['pumpa', 'pumpkin'] },
  { key: 'majs', names: ['majs', 'corn'] },
  { key: 'morot', names: ['morot', 'morötter', 'carrot'] },
  { key: 'rodbeta', names: ['rödbeta', 'rodbeta', 'rödbetor', 'beet'] },
  { key: 'palsternacka', names: ['palsternacka'] },
  { key: 'kalrot', names: ['kålrot', 'kalrot'] },
  { key: 'radisa', names: ['rädisa', 'rädisor', 'radish'] },
  { key: 'potatis', names: ['potatis', 'potato'] },
  { key: 'jordartskocka', names: ['jordärtskocka'] },
  { key: 'lok', names: ['lök', 'lok', 'onion'] },
  { key: 'vitlok', names: ['vitlök', 'garlic'] },
  { key: 'purjolok', names: ['purjolök'] },
  { key: 'graslok', names: ['gräslök'] },
  { key: 'broccoli', names: ['broccoli'] },
  { key: 'blomkal', names: ['blomkål'] },
  { key: 'vitkal', names: ['vitkål'] },
  { key: 'gronkal', names: ['grönkål'] },
  { key: 'brysselkal', names: ['brysselkål'] },
  { key: 'pakchoi', names: ['pak choi', 'pakchoi'] },
  { key: 'sallat', names: ['sallat', 'sallad', 'lettuce'] },
  { key: 'spenat', names: ['spenat', 'spinach'] },
  { key: 'mangold', names: ['mangold'] },
  { key: 'ruccola', names: ['ruccola', 'rucola', 'rucola'] },
  { key: 'selleri', names: ['selleri'] },
  { key: 'artor', names: ['ärtor', 'ärta', 'peas'] },
  { key: 'sockerart', names: ['sockerärt'] },
  { key: 'bonor', names: ['bönor', 'böna', 'beans'] },
  { key: 'bondbona', names: ['bondböna'] },
  { key: 'basilika', names: ['basilika', 'basil'] },
  { key: 'dill', names: ['dill'] },
  { key: 'persilja', names: ['persilja'] },
  { key: 'koriander', names: ['koriander'] },
  { key: 'timjan', names: ['timjan'] },
  { key: 'oregano', names: ['oregano'] },
  { key: 'jordgubbar', names: ['jordgubbar', 'jordgubbe'] },
  { key: 'hallon', names: ['hallon'] },
  { key: 'vinbar', names: ['vinbär'] },
  { key: 'krusbar', names: ['krusbär'] },
  { key: 'rabarber', names: ['rabarber'] },
  { key: 'sparris', names: ['sparris'] },
  { key: 'kal', names: ['kål'] },
];

const NAME_INDEX = CATALOGUE
  .flatMap((crop) => crop.names.map((name) => ({ key: crop.key, name: fold(name) })))
  .sort((a, b) => b.name.length - a.name.length);

export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function splitDisplay(display: string): { cropPart: string; varietyPart: string } {
  const match = display.split(/\s+[–—-]\s+|,\s+/);
  if (match.length >= 2) {
    return { cropPart: match[0].trim(), varietyPart: match.slice(1).join(' – ').trim() };
  }
  return { cropPart: display.trim(), varietyPart: '' };
}

function matchCatalogue(text: string): { key: string; matched: string } | null {
  const folded = fold(text);
  if (!folded) return null;
  for (const entry of NAME_INDEX) {
    if (folded === entry.name || folded.startsWith(`${entry.name} `) || folded.endsWith(` ${entry.name}`) || folded.includes(` ${entry.name} `)) {
      return { key: entry.key, matched: entry.name };
    }
  }
  return null;
}

/** Derive identity from user-entered text. Never mutates the original string. */
export function deriveCropIdentity(displayText: string | null | undefined): CropIdentity {
  const display_text = String(displayText ?? '').trim();
  if (!display_text) {
    return { crop_key: UNKNOWN_CROP_KEY, variety_name: '', display_text: '', source: 'unknown' };
  }

  const split = splitDisplay(display_text);
  const hit = matchCatalogue(display_text) || matchCatalogue(split.cropPart);
  if (!hit) {
    return {
      crop_key: UNKNOWN_CROP_KEY,
      variety_name: display_text,
      display_text,
      source: 'unknown',
    };
  }

  const variety_name = split.varietyPart || (fold(split.cropPart) === hit.matched ? '' : split.cropPart);
  return {
    crop_key: hit.key,
    variety_name,
    display_text,
    source: variety_name ? 'custom' : 'catalogue',
  };
}

export function identityFromSowing(sowing: {
  variety?: string | null;
  crop_key?: string | null;
  variety_name?: string | null;
}): CropIdentity {
  const display_text = String(sowing.variety ?? '').trim();
  if (sowing.crop_key && sowing.crop_key !== UNKNOWN_CROP_KEY) {
    return {
      crop_key: sowing.crop_key,
      variety_name: sowing.variety_name ?? deriveCropIdentity(display_text).variety_name,
      display_text,
      source: sowing.variety_name ? 'custom' : 'catalogue',
    };
  }
  return deriveCropIdentity(display_text);
}

export function sowingPayloadFromVariety<T extends object>(variety: string, extra: T = {} as T) {
  const identity = deriveCropIdentity(variety);
  return {
    variety,
    crop_key: identity.crop_key,
    variety_name: identity.variety_name || null,
    ...extra,
  };
}
