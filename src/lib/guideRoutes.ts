/**
 * Lätta hjälpare för länkar till de publika guiderna. Inga beroenden på
 * såmatrisen, så startsidan och andra sidor som laddas direkt kan länka hit
 * utan att dra in kalenderlogiken i första JavaScript-paketet.
 */
export const SATIDER_PATH = '/satider';
export const FROST_PATH = '/sista-frost';

/** "Rödbeta" → "rodbeta", "Pak choi" → "pak-choi". Samma regel som växtbibliotekets sluggar. */
export function cropSlug(name: string): string {
  return name.toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Hur folk söker: "när ska man så tomater", inte "så tomat". */
export const QUERY_NAME: Record<string, string> = {
  Tomat: 'tomater',
  Morot: 'morötter',
  Rödbeta: 'rödbetor',
  Rädisa: 'rädisor',
  Sockerärt: 'sockerärtor',
  Bondböna: 'bondbönor',
};

/** Potatis och lök sätts, bär och perenner planteras – resten sås. */
export const VERB: Record<string, 'sätta' | 'plantera'> = {
  Potatis: 'sätta',
  Lök: 'sätta',
  Vitlök: 'sätta',
  Jordärtskocka: 'sätta',
  Jordgubbar: 'plantera',
  Hallon: 'plantera',
  Vinbär: 'plantera',
  Krusbär: 'plantera',
  Rabarber: 'plantera',
  Sparris: 'plantera',
};

export function queryName(crop: string): string {
  return QUERY_NAME[crop] ?? crop.toLowerCase();
}

export function verbFor(crop: string): 'så' | 'sätta' | 'plantera' {
  return VERB[crop] ?? 'så';
}

/** Startsidans urval: de mest sökta grödorna. Namnen måste finnas i såmatrisen (testas). */
export const POPULAR_CROP_NAMES = ['Tomat', 'Potatis', 'Morot', 'Gurka', 'Chili', 'Vitlök', 'Sallat', 'Squash', 'Lök', 'Jordgubbar'];

export function satiderHref(crop: string): string {
  return `${SATIDER_PATH}/${cropSlug(crop)}`;
}
