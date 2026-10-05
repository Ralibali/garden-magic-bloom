/**
 * Publika såtidssidor (/satider och /satider/:gröda). Allt innehåll räknas fram
 * ur såmatrisen, så sidorna kan aldrig säga emot appens kalender. Samma modell
 * används av React-sidan och av prerender-steget (scripts/prerender.mjs), som
 * skriver ut fullständig HTML åt sökmotorer och AI-läsare.
 */
import { sowingMatrix, ZONE_LAST_FROST_WEEK, type CropEntry, type CropTiming } from '@/data/sowingMatrix';
import { ZONE_PLACES } from '@/lib/swedishZones';
import { addDays, buildIcs, FROST_SENSITIVE_CROPS, isoWeekMonday, MONTHS_SV, type CalendarEvent } from '@/lib/gardenCalendar';

export const SATIDER_PATH = '/satider';
export const SITE_ORIGIN = 'https://odlingsdagboken.com';
/** Zonen texterna utgår från: flest svenska odlare bor i zon 3 (Mälardalen och Östergötland). */
export const REFERENCE_ZONE = 3;
export const ZONES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * Året sidorna visar datum för. Från november planerar de flesta nästa säsong,
 * så då visas nästa års veckor.
 */
export function guideSeasonYear(date = new Date()): number {
  return date.getMonth() >= 10 ? date.getFullYear() + 1 : date.getFullYear();
}

export type GuideStep = 'forodla' | 'planteraUt' | 'direktsa' | 'skorda';
export const GUIDE_STEPS: GuideStep[] = ['forodla', 'planteraUt', 'direktsa', 'skorda'];

const STEP_FIELDS: Record<GuideStep, [keyof CropTiming, keyof CropTiming]> = {
  forodla: ['preStart', 'preEnd'],
  planteraUt: ['plantOutStart', 'plantOutEnd'],
  direktsa: ['directSowStart', 'directSowEnd'],
  skorda: ['harvestStart', 'harvestEnd'],
};

export const CATEGORY_TITLES: Record<NonNullable<CropEntry['category']>, string> = {
  grönsak: 'Grönsaker',
  rotfrukt: 'Rotfrukter',
  kål: 'Kål',
  bladgrönt: 'Bladgrönt',
  krydda: 'Kryddor',
  bär: 'Bär',
  flerårigt: 'Fleråriga',
};

export const ZONE_REGION: Record<number, string> = {
  1: 'Skåne och sydkusten',
  2: 'Västkusten och södra Götaland',
  3: 'Mälardalen och Östergötland',
  4: 'södra Norrlandskusten och Bergslagen',
  5: 'Dalarna och mellersta Norrland',
  6: 'Jämtland och Västerbotten',
  7: 'Norrbottens kustland',
  8: 'fjällen och Lappland',
};

// ─── Namn och ordval ──────────────────────────────────────────────────────

/** "Rödbeta" → "rodbeta", "Pak choi" → "pak-choi". Samma regel som växtbibliotekets sluggar. */
export function cropSlug(name: string): string {
  return name.toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Hur folk söker: "när ska man så tomater", inte "så tomat". */
const QUERY_NAME: Record<string, string> = {
  Tomat: 'tomater',
  Morot: 'morötter',
  Rödbeta: 'rödbetor',
  Rädisa: 'rädisor',
  Sockerärt: 'sockerärtor',
  Bondböna: 'bondbönor',
};

/** Potatis och lök sätts, bär och perenner planteras – resten sås. */
const VERB: Record<string, 'sätta' | 'plantera'> = {
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

/** Rubriker för stegen när standardorden blir fel för grödan. */
const STEP_LABEL_OVERRIDE: Record<string, Partial<Record<GuideStep, string>>> = {
  Potatis: { forodla: 'Förgro', planteraUt: 'Sätt' },
  Lök: { forodla: 'Förodla från frö', planteraUt: 'Sätt sättlök / plantor' },
  Vitlök: { planteraUt: 'Sätt klyftor' },
  Jordärtskocka: { planteraUt: 'Sätt knölar' },
};

/** Perenner och bärbuskar som inte ger full skörd samma år som de planteras. */
const ESTABLISHES_FIRST = new Set(['Rabarber', 'Sparris', 'Hallon', 'Vinbär', 'Krusbär', 'Jordgubbar']);

export const STEP_LABEL: Record<GuideStep, string> = {
  forodla: 'Förodla inomhus',
  planteraUt: 'Plantera ut',
  direktsa: 'Direktså',
  skorda: 'Skörd',
};

export function queryName(crop: string): string {
  return QUERY_NAME[crop] ?? crop.toLowerCase();
}

export function verbFor(crop: string): 'så' | 'sätta' | 'plantera' {
  return VERB[crop] ?? 'så';
}

export function stepLabel(crop: string, step: GuideStep): string {
  if (step === 'planteraUt' && VERB[crop] === 'plantera') return 'Plantera';
  if (step === 'skorda') {
    const entry = sowingMatrix.find((c) => c.name === crop);
    if (entry && harvestsNextYear(entry)) return 'Skörd året därpå';
  }
  return STEP_LABEL_OVERRIDE[crop]?.[step] ?? STEP_LABEL[step];
}

// ─── Datum ────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['jan', 'feb', 'mars', 'apr', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'];

function dayMonth(key: string, short = true): string {
  const month = Number(key.slice(5, 7)) - 1;
  return `${Number(key.slice(8, 10))} ${short ? MONTH_SHORT[month] : MONTHS_SV[month]}`;
}

export type GuideWindow = {
  start: number;
  end: number;
  /** Måndag i startveckan och söndag i slutveckan, för det valda året. */
  from: string;
  to: string;
  weeks: string;
  dates: string;
};

export function guideWindow(start: number | null, end: number | null, year: number): GuideWindow | null {
  if (start == null || end == null) return null;
  const from = isoWeekMonday(year, start);
  const to = addDays(isoWeekMonday(start <= end ? year : year + 1, end), 6);
  const sameMonth = from.slice(5, 7) === to.slice(5, 7);
  return {
    start,
    end,
    from,
    to,
    weeks: start === end ? `v.${start}` : `v.${start}–${end}`,
    dates: sameMonth ? `${Number(from.slice(8, 10))}–${dayMonth(to)}` : `${dayMonth(from)}–${dayMonth(to)}`,
  };
}

/** Månaden en ISO-vecka "tillhör": den som torsdagen ligger i. */
function weekMonth(monday: string): number {
  return Number(addDays(monday, 3).slice(5, 7));
}

/** "augusti–oktober" eller "juli" för ett fönster. */
export function monthSpan(w: GuideWindow): string {
  const first = weekMonth(w.from);
  const last = weekMonth(addDays(w.to, -6));
  return first === last ? MONTHS_SV[first - 1] : `${MONTHS_SV[first - 1]}–${MONTHS_SV[last - 1]}`;
}

function weeksText(w: GuideWindow): string {
  return w.start === w.end ? `vecka ${w.start}` : `vecka ${w.start}–${w.end}`;
}

// ─── Modell ───────────────────────────────────────────────────────────────

export type GuideCrop = { name: string; slug: string; category: CropEntry['category'] };

export const GUIDE_CROPS: GuideCrop[] = sowingMatrix.map((c) => ({ name: c.name, slug: cropSlug(c.name), category: c.category }));

export function findGuideCrop(slug: string | undefined | null): CropEntry | null {
  if (!slug) return null;
  return sowingMatrix.find((c) => cropSlug(c.name) === slug) ?? null;
}

export function guideCropForName(name: string | null | undefined): GuideCrop | null {
  if (!name) return null;
  const lower = name.trim().toLowerCase();
  return GUIDE_CROPS.find((c) => c.name.toLowerCase() === lower) ?? null;
}

export type ZoneRow = {
  zone: number;
  region: string;
  places: string[];
  steps: Record<GuideStep, GuideWindow | null>;
  /** Grödan rekommenderas bara i växthus/skyddat läge här. */
  protectedOnly: boolean;
  note?: string;
};

export type Faq = { question: string; answer: string };

export type SowingGuide = {
  crop: string;
  slug: string;
  category: CropEntry['category'];
  categoryTitle: string;
  year: number;
  verb: 'så' | 'sätta' | 'plantera';
  query: string;
  title: string;
  h1: string;
  description: string;
  quickAnswer: string;
  tip?: string;
  steps: GuideStep[];
  /** Skörden sker året efter sådd/sättning (t.ex. vitlök). */
  harvestNextYear: boolean;
  rows: ZoneRow[];
  faqs: Faq[];
  /** Månader med något att göra i referenszonen – länkas till odlingskalendern. */
  months: { number: number; name: string }[];
  related: GuideCrop[];
};

/** Höstsatta grödor (vitlök) skördas året efter att de satts. */
export function harvestsNextYear(crop: CropEntry): boolean {
  const timing = crop.zones[REFERENCE_ZONE];
  if (!timing || timing.harvestStart == null) return false;
  const firstStart = [timing.preStart, timing.directSowStart, timing.plantOutStart].filter((w): w is number => w != null);
  return firstStart.length > 0 && timing.harvestStart < Math.min(...firstStart);
}

function rowFor(crop: CropEntry, zone: number, year: number): ZoneRow {
  const timing = crop.zones[zone];
  const nextYearHarvest = harvestsNextYear(crop);
  const steps = Object.fromEntries(GUIDE_STEPS.map((step) => {
    const [s, e] = STEP_FIELDS[step];
    const stepYear = step === 'skorda' && nextYearHarvest ? year + 1 : year;
    return [step, timing ? guideWindow(timing[s] as number | null, timing[e] as number | null, stepYear) : null];
  })) as Record<GuideStep, GuideWindow | null>;
  const protectedOnly = !!timing && steps.skorda === null && (steps.forodla !== null || steps.direktsa !== null || steps.planteraUt !== null);
  return {
    zone,
    region: ZONE_REGION[zone],
    places: ZONE_PLACES.find((z) => z.zone === zone)?.places ?? [],
    steps,
    protectedOnly,
    note: timing?.note,
  };
}

/** Första aktiviteten man gör med grödan: förodla, annars direktså, annars sätta/plantera. */
function primaryStep(row: ZoneRow): GuideStep | null {
  if (row.steps.forodla) return 'forodla';
  if (row.steps.direktsa) return 'direktsa';
  if (row.steps.planteraUt) return 'planteraUt';
  return null;
}

function listPlaces(places: string[]): string {
  const few = places.slice(0, 3);
  return few.length > 1 ? `${few.slice(0, -1).join(', ')} och ${few.at(-1)}` : few[0] ?? '';
}

/** "I zon 3 förodlar du tomater …" – svaret på frågan i rubriken. */
function quickAnswerFor(crop: string, row: ZoneRow, year: number): string {
  const q = queryName(crop);
  const { forodla, planteraUt, direktsa, skorda } = row.steps;
  const verb = verbFor(crop);
  const parts: string[] = [];
  if (forodla) {
    parts.push(crop === 'Potatis'
      ? `förgror du sättpotatisen ${weeksText(forodla)} (${forodla.dates} ${year})`
      : `förodlar du ${q} inomhus ${weeksText(forodla)} (${forodla.dates} ${year})`);
  }
  if (planteraUt) {
    const frost = FROST_SENSITIVE_CROPS.has(crop) ? ' när frostrisken är över' : '';
    if (forodla) {
      const what = crop === 'Potatis' ? 'sätter potatisen' : crop === 'Lök' ? 'sätter ut plantor eller sättlök' : 'planterar ut plantorna';
      parts.push(`${what} ${weeksText(planteraUt)} (${planteraUt.dates})${frost}`);
    } else {
      const doing = verb === 'sätta' ? 'sätter du' : 'planterar du';
      parts.push(`${doing} ${q} ${weeksText(planteraUt)} (${planteraUt.dates} ${year})${frost}`);
    }
  }
  let alternative = '';
  if (direktsa) {
    if (parts.length) alternative = `, eller så sår du direkt på friland ${weeksText(direktsa)} (${direktsa.dates})`;
    else parts.push(`sår du ${q} direkt på friland ${weeksText(direktsa)} (${direktsa.dates} ${year})`);
  }
  const lead = `I zon ${row.zone} – till exempel ${listPlaces(row.places)} – `;
  const sentence = parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(', ')} och ${parts.at(-1)}`;
  let text = `${lead}${sentence}${alternative}.`;
  if (skorda) {
    const startsBefore = (planteraUt ?? direktsa ?? forodla)?.start;
    const nextYear = startsBefore != null && skorda.start < startsBefore;
    text += nextYear
      ? ` Den övervintrar och skördas året därpå, ${weeksText(skorda)} (${monthSpan(skorda)}).`
      : ESTABLISHES_FIRST.has(crop)
        ? ` När plantorna har etablerat sig är skördetiden normalt ${weeksText(skorda)} (${monthSpan(skorda)}).`
        : ` Skördetiden är normalt ${weeksText(skorda)} (${monthSpan(skorda)}).`;
  }
  return text;
}

function zoneSpread(crop: string, rows: ZoneRow[]): string | null {
  const ref = rows.find((r) => r.zone === REFERENCE_ZONE)!;
  const step = primaryStep(ref);
  if (!step) return null;
  const south = rows[0].steps[step];
  const north = rows[7].steps[step];
  const refWindow = ref.steps[step]!;
  const pieces: string[] = [];
  if (south && south.start < refWindow.start) pieces.push(`i ${ZONE_REGION[1]} (zon 1) kan du börja ungefär ${refWindow.start - south.start} veckor tidigare`);
  if (north && north.start > refWindow.start) pieces.push(`i ${ZONE_REGION[8]} (zon 8) ungefär ${north.start - refWindow.start} veckor senare`);
  const northRow = rows[7];
  let text = pieces.length ? `${pieces.join(' och ')}.` : '';
  if (text) text = text.charAt(0).toUpperCase() + text.slice(1);
  if (northRow.protectedOnly || !primaryStep(northRow)) {
    text += `${text ? ' ' : ''}Längst i norr rekommenderas ${queryName(crop)} främst i växthus eller annat skyddat läge.`;
  }
  return text || null;
}

function rangeAcrossZones(rows: ZoneRow[], step: GuideStep): string | null {
  const present = rows.filter((r) => r.steps[step]);
  if (!present.length) return null;
  const first = present[0];
  const last = present.at(-1)!;
  if (first.zone === last.zone) return `${weeksText(first.steps[step]!)} i zon ${first.zone}`;
  const same = present.every((r) => r.steps[step]!.weeks === first.steps[step]!.weeks);
  if (same && present.length === rows.length) return `${weeksText(first.steps[step]!)} i hela landet`;
  return `från ${weeksText(first.steps[step]!)} i zon ${first.zone} till ${weeksText(last.steps[step]!)} i zon ${last.zone}`;
}

function faqsFor(crop: string, rows: ZoneRow[], quickAnswer: string): Faq[] {
  const q = queryName(crop);
  const verb = verbFor(crop);
  const ref = rows.find((r) => r.zone === REFERENCE_ZONE)!;
  const faqs: Faq[] = [{ question: `När ska man ${verb} ${q} i Stockholm?`, answer: quickAnswer.replace(/^I zon 3 – till exempel [^–]+– /, 'Stockholm ligger i odlingszon 3. Där ') }];

  const pre = ref.steps.forodla;
  if (pre && crop !== 'Potatis') {
    const frost = ZONE_LAST_FROST_WEEK[REFERENCE_ZONE];
    const before = [frost - pre.end, frost - pre.start].filter((n) => n > 0);
    if (before.length === 2) {
      faqs.push({
        question: `Hur långt före sista frost ska man förodla ${q}?`,
        answer: `Räkna med ungefär ${before[0]}–${before[1]} veckor före den normala sista frostnatten. I zon 3 brukar frosten vara över runt vecka ${frost}, så förodlingen startar ${weeksText(pre)}. Börjar du tidigare blir plantorna lätt långa och rangliga innan de får komma ut.`,
      });
    }
  }

  const out = rangeAcrossZones(rows, 'planteraUt');
  if (out) {
    const what = verb === 'så' ? `plantera ut ${q}` : verb === 'sätta' ? `sätta ${q}` : `plantera ${q}`;
    faqs.push({
      question: `När kan man ${what}?`,
      answer: `${out.endsWith('i hela landet') ? `Samma tid i hela landet: ${out.replace(' i hela landet', '')}` : `Det beror på var du bor: ${out}`}. ${FROST_SENSITIVE_CROPS.has(crop) ? 'Vänta tills frostnätterna är över och härda av plantorna en vecka först.' : 'Följ jordens temperatur och väderprognosen snarare än exakt datum.'}`,
    });
  }

  const direct = rangeAcrossZones(rows, 'direktsa');
  if (direct) {
    faqs.push({ question: `Kan man så ${q} direkt på friland?`, answer: `Ja. Direktsådd fungerar ${direct}.${ref.steps.forodla ? ` Förodlar du inomhus får du ett försprång på några veckor.` : ''}` });
  } else if (ref.steps.forodla && verb === 'så') {
    faqs.push({ question: `Kan man så ${q} direkt på friland?`, answer: `Inte i svenskt klimat – säsongen är för kort. ${crop} förodlas inomhus och planteras ut när det blivit varmt nog.` });
  }

  const harvest = rangeAcrossZones(rows, 'skorda');
  if (harvest) {
    const refHarvest = ref.steps.skorda;
    faqs.push({
      question: `När skördar man ${q}?`,
      answer: `Skördetiden sträcker sig ${harvest}.${refHarvest ? ` I zon 3 betyder det ungefär ${monthSpan(refHarvest)}.` : ''} Sort, växtplats och väder gör att det kan skilja några veckor.`,
    });
  }

  const north = rows.filter((r) => r.zone >= 7);
  if (north.some((r) => r.protectedOnly || !primaryStep(r))) {
    faqs.push({
      question: `Går det att odla ${q} i norra Sverige?`,
      answer: `Ja, men i zon 7–8 rekommenderas ${q} främst i växthus eller annat skyddat läge. ${north.find((r) => r.note)?.note ?? ''}`.trim(),
    });
  } else if (north.every((r) => primaryStep(r))) {
    const z8 = rows[7];
    const step = primaryStep(z8)!;
    const advice = ESTABLISHES_FIRST.has(crop) || crop === 'Jordärtskocka' ? 'Välj härdiga sorter och ett soligt, skyddat läge.' : 'Välj gärna tidiga sorter och ett varmt, skyddat läge.';
    faqs.push({ question: `Går det att odla ${q} i norra Sverige?`, answer: `Ja. Även i zon 8 går det: ${stepLabel(crop, step).toLowerCase()} ${weeksText(z8.steps[step]!)}. ${advice}` });
  }
  return faqs;
}

function naturalList(items: string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} och ${items.at(-1)}` : items[0] ?? '';
}

function STEP_VERB(crop: string, step: GuideStep): string {
  if (step === 'forodla') return crop === 'Potatis' ? 'förgro' : 'förodla';
  if (step === 'direktsa') return 'så';
  if (step === 'skorda') return 'skörda';
  const verb = verbFor(crop);
  return verb === 'sätta' ? 'sätta' : verb === 'plantera' ? 'plantera' : 'plantera ut';
}

function monthsFor(row: ZoneRow): { number: number; name: string }[] {
  const months = new Set<number>();
  for (const step of ['forodla', 'direktsa', 'planteraUt'] as GuideStep[]) {
    const w = row.steps[step];
    if (!w) continue;
    for (let day = w.from; day <= w.to; day = addDays(day, 7)) months.add(Number(day.slice(5, 7)));
    months.add(Number(w.to.slice(5, 7)));
  }
  return [...months].sort((a, b) => a - b).map((n) => ({ number: n, name: MONTHS_SV[n - 1] }));
}

export function buildSowingGuide(slug: string | undefined | null, year: number): SowingGuide | null {
  const crop = findGuideCrop(slug);
  if (!crop) return null;
  const rows = ZONES.map((z) => rowFor(crop, z, year));
  const ref = rows.find((r) => r.zone === REFERENCE_ZONE)!;
  const steps = GUIDE_STEPS.filter((step) => rows.some((r) => r.steps[step]));
  const verb = verbFor(crop.name);
  const q = queryName(crop.name);
  const spread = zoneSpread(crop.name, rows);
  const quickAnswer = [quickAnswerFor(crop.name, ref, year), spread].filter(Boolean).join(' ');
  return {
    crop: crop.name,
    slug: cropSlug(crop.name),
    category: crop.category,
    categoryTitle: crop.category ? CATEGORY_TITLES[crop.category] : '',
    year,
    verb,
    query: q,
    title: `När ska man ${verb} ${q}? Såtider ${year} för zon 1–8`,
    h1: `När ska man ${verb} ${q}?`,
    description: `Se när du ska ${naturalList(steps.map((s) => STEP_VERB(crop.name, s)))} ${q} i zon 1–8 – vecka för vecka med datum för ${year}. Gratis från Odlingsdagboken.`,
    quickAnswer,
    tip: ref.note,
    steps,
    harvestNextYear: harvestsNextYear(crop),
    rows,
    faqs: faqsFor(crop.name, rows, quickAnswerFor(crop.name, ref, year)),
    months: monthsFor(ref),
    related: GUIDE_CROPS.filter((c) => c.category === crop.category && c.name !== crop.name).slice(0, 6),
  };
}

export type GuideIndexEntry = GuideCrop & { summary: string };

/** Översikten: alla grödor per kategori med referenszonens första steg. */
export function buildSowingGuideIndex(year: number, zone = REFERENCE_ZONE): { category: string; title: string; crops: GuideIndexEntry[] }[] {
  const groups = new Map<string, GuideIndexEntry[]>();
  for (const crop of sowingMatrix) {
    const row = rowFor(crop, zone, year);
    const step = primaryStep(row);
    const summary = step
      ? `${stepLabel(crop.name, step)} ${row.steps[step]!.weeks} (${row.steps[step]!.dates})`
      : 'Rekommenderas i växthus';
    const key = crop.category ?? 'grönsak';
    groups.set(key, [...(groups.get(key) ?? []), { name: crop.name, slug: cropSlug(crop.name), category: crop.category, summary }]);
  }
  return (Object.keys(CATEGORY_TITLES) as (keyof typeof CATEGORY_TITLES)[])
    .filter((key) => groups.has(key))
    .map((key) => ({ category: key, title: CATEGORY_TITLES[key], crops: groups.get(key)! }));
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────

export function sowingGuideJsonLd(guide: SowingGuide) {
  const url = `${SITE_ORIGIN}${SATIDER_PATH}/${guide.slug}`;
  return [
    {
      '@type': 'WebPage',
      '@id': `${url}#page`,
      url,
      name: guide.title,
      description: guide.description,
      inLanguage: 'sv-SE',
      isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
      about: { '@type': 'Thing', name: guide.crop },
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: guide.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Odlingsdagboken', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Såtider', item: `${SITE_ORIGIN}${SATIDER_PATH}` },
        { '@type': 'ListItem', position: 3, name: guide.crop },
      ],
    },
  ];
}

// ─── Kalenderprenumeration per zon ────────────────────────────────────────

export function zoneCalendarPath(zone: number): string {
  return `/kalender/sakalender-zon-${zone}.ics`;
}

export function zoneCalendarLinks(zone: number) {
  const https = `${SITE_ORIGIN}${zoneCalendarPath(zone)}`;
  const webcal = https.replace(/^https:\/\//, 'webcal://');
  return { https, webcal, google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` };
}

/**
 * Zonens såguide som en händelse per vecka där något börjar eller tar slut,
 * t.ex. "Odling v.12: förodla tomat, paprika · så ärtor". Kompakt nog att ha
 * i sin vanliga kalender, och kan prenumereras på utan konto.
 */
export function buildZoneGuideEvents(zone: number, years: number[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const year of years) {
    const byWeek = new Map<number, { opens: Record<GuideStep, string[]>; closes: string[] }>();
    const slot = (week: number) => {
      if (!byWeek.has(week)) byWeek.set(week, { opens: { forodla: [], planteraUt: [], direktsa: [], skorda: [] }, closes: [] });
      return byWeek.get(week)!;
    };
    for (const crop of sowingMatrix) {
      const row = rowFor(crop, zone, year);
      for (const step of GUIDE_STEPS) {
        const w = row.steps[step];
        if (!w) continue;
        slot(w.start).opens[step].push(crop.name.toLowerCase());
        if ((step === 'forodla' || step === 'direktsa') && w.end !== w.start) slot(w.end).closes.push(crop.name.toLowerCase());
      }
    }
    for (const [week, { opens, closes }] of [...byWeek.entries()].sort((a, b) => a[0] - b[0])) {
      const short = (step: GuideStep, verb: string) => {
        const list = opens[step];
        if (!list.length) return null;
        return `${verb} ${list.slice(0, 3).join(', ')}${list.length > 3 ? ` +${list.length - 3}` : ''}`;
      };
      const titleParts = [short('forodla', 'förodla'), short('direktsa', 'så'), short('planteraUt', 'plantera ut')].filter(Boolean);
      if (!titleParts.length && !closes.length && !opens.skorda.length) continue;
      const lines = [
        opens.forodla.length ? `Förodla inomhus: ${opens.forodla.join(', ')}` : '',
        opens.direktsa.length ? `Så på friland: ${opens.direktsa.join(', ')}` : '',
        opens.planteraUt.length ? `Plantera ut / sätt: ${opens.planteraUt.join(', ')}` : '',
        opens.skorda.length ? `Skördetiden börjar: ${opens.skorda.join(', ')}` : '',
        closes.length ? `Sista veckan att så: ${closes.join(', ')}` : '',
        `Såtider per gröda: ${SITE_ORIGIN}${SATIDER_PATH}`,
      ].filter(Boolean);
      events.push({
        id: `guide:zon-${zone}:${year}:v${week}`,
        kind: 'guide',
        date: isoWeekMonday(year, week),
        title: titleParts.length
          ? `Odling v.${week}: ${titleParts.join(' · ')}`
          : opens.skorda.length ? `Odling v.${week}: skördetid för ${opens.skorda.slice(0, 3).join(', ')}` : `Odling v.${week}: sista veckan att så ${closes.slice(0, 3).join(', ')}`,
        detail: lines.join('\n'),
      });
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function buildZoneGuideIcs(zone: number, years: number[], now = new Date()): string {
  return buildIcs(buildZoneGuideEvents(zone, years), {
    calendarName: `Såkalender zon ${zone} – Odlingsdagboken`,
    now,
    refreshHours: 24,
  });
}

// ─── Länkar till befintliga CMS-sidor ─────────────────────────────────────

/** Växtbibliotekets sluggar följer sökorden ("sallad", "bona") – inte såmatrisens namn. */
const VAXT_SLUG_ALIASES: Record<string, string[]> = {
  sallat: ['sallad'],
  ruccola: ['rucola'],
  bonor: ['bona'],
  artor: ['arta'],
  sockerart: ['sockerarta'],
  jordgubbar: ['jordgubbe'],
  squash: ['zucchini'],
};

/** Sluggen till växtbibliotekets sida för grödan, om en sådan är publicerad. */
export function vaxtSlugFor(crop: string, published: { slug: string; name?: string | null }[]): string | null {
  const own = cropSlug(crop);
  const candidates = [own, ...(VAXT_SLUG_ALIASES[own] ?? [])];
  for (const candidate of candidates) {
    const hit = published.find((p) => p.slug === candidate || (p.name && cropSlug(p.name) === candidate));
    if (hit) return hit.slug;
  }
  return null;
}

/** Omvänt: vilken såtidssida hör till en sida i växtbiblioteket? */
export function guideCropForVaxt(plant: { slug: string; name?: string | null }): GuideCrop | null {
  return GUIDE_CROPS.find((crop) => vaxtSlugFor(crop.name, [plant]) === plant.slug) ?? null;
}
