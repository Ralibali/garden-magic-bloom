/**
 * Publik sida /sista-frost: normal sista vårfrost och första höstfrost per
 * odlingszon och ort. Bygger på samma zonveckor som såmatrisen, så råden här
 * och i kalendern hänger ihop. Används av React-sidan och av prerender.
 */
import { ZONE_LAST_FROST_WEEK, ZONE_SEASON_END_WEEK } from '@/data/sowingMatrix';
import { ZONE_PLACES, zoneForPlace } from '@/lib/swedishZones';
import { addDays, isoWeekMonday, MONTHS_SV } from '@/lib/gardenCalendar';
import { cropSlug, guideSeasonYear, SATIDER_PATH, SITE_ORIGIN, ZONE_REGION, ZONES } from '@/lib/sowingGuide';

import { FROST_PATH } from '@/lib/guideRoutes';

export { FROST_PATH };

/** Frostkänsliga grödor som besökare oftast undrar om. */
export const FROST_CROPS = ['Tomat', 'Gurka', 'Squash', 'Bönor', 'Basilika', 'Potatis'];

export type FrostZoneRow = {
  zone: number;
  region: string;
  places: string[];
  lastFrostWeek: number;
  /** Måndag–söndag för den normala sista frostveckan. */
  lastFrostDates: string;
  firstFrostWeek: number;
  firstFrostDates: string;
  /** Ungefärligt antal frostfria veckor. */
  frostFreeWeeks: number;
  /** Veckan då frostkänsliga plantor tidigast bör ut. */
  plantOutWeek: number;
};

export type FrostPlace = { place: string; zone: number; lastFrostWeek: number; lastFrostDates: string };

const MONTH_SHORT = ['jan', 'feb', 'mars', 'apr', 'maj', 'juni', 'juli', 'aug', 'sep', 'okt', 'nov', 'dec'];

function weekDates(year: number, week: number): string {
  const from = isoWeekMonday(year, week);
  const to = addDays(from, 6);
  const fm = Number(from.slice(5, 7)) - 1;
  const tm = Number(to.slice(5, 7)) - 1;
  return fm === tm
    ? `${Number(from.slice(8, 10))}–${Number(to.slice(8, 10))} ${MONTH_SHORT[tm]}`
    : `${Number(from.slice(8, 10))} ${MONTH_SHORT[fm]}–${Number(to.slice(8, 10))} ${MONTH_SHORT[tm]}`;
}

function monthOfWeek(year: number, week: number): string {
  return MONTHS_SV[Number(addDays(isoWeekMonday(year, week), 3).slice(5, 7)) - 1];
}

export function frostZoneRows(year: number): FrostZoneRow[] {
  return ZONES.map((zone) => {
    const last = ZONE_LAST_FROST_WEEK[zone];
    const first = ZONE_SEASON_END_WEEK[zone];
    return {
      zone,
      region: ZONE_REGION[zone],
      places: ZONE_PLACES.find((z) => z.zone === zone)?.places ?? [],
      lastFrostWeek: last,
      lastFrostDates: weekDates(year, last),
      firstFrostWeek: first,
      firstFrostDates: weekDates(year, first),
      frostFreeWeeks: first - last,
      plantOutWeek: last + 1,
    };
  });
}

export function frostPlaces(year: number): FrostPlace[] {
  return ZONE_PLACES.flatMap(({ zone, places }) => places.map((place) => ({
    place,
    zone,
    lastFrostWeek: ZONE_LAST_FROST_WEEK[zone],
    lastFrostDates: weekDates(year, ZONE_LAST_FROST_WEEK[zone]),
  }))).sort((a, b) => a.place.localeCompare(b.place, 'sv'));
}

/** Ortsök: känd ort ger zon, annars null. */
export function frostForPlace(place: string, year: number): (FrostZoneRow & { place: string }) | null {
  const zone = zoneForPlace(place);
  if (!zone) return null;
  const row = frostZoneRows(year).find((r) => r.zone === zone)!;
  const known = ZONE_PLACES.flatMap((z) => z.places).find((p) => p.toLowerCase() === place.trim().toLowerCase());
  return { ...row, place: known ?? place.trim() };
}

export type FrostGuide = {
  year: number;
  title: string;
  h1: string;
  description: string;
  quickAnswer: string;
  rows: FrostZoneRow[];
  places: FrostPlace[];
  faqs: { question: string; answer: string }[];
  crops: { name: string; slug: string }[];
};

export function buildFrostGuide(year = guideSeasonYear()): FrostGuide {
  const rows = frostZoneRows(year);
  const places = frostPlaces(year);
  const z1 = rows[0];
  const z3 = rows[2];
  const z8 = rows[7];
  const quickAnswer = `I Stockholm och resten av zon 3 är den sista frostnatten normalt över runt vecka ${z3.lastFrostWeek} (${z3.lastFrostDates} ${year}). I Malmö och Skåne (zon 1) brukar frosten släppa redan vecka ${z1.lastFrostWeek}, medan Kiruna och fjällen (zon 8) får vänta till vecka ${z8.lastFrostWeek}. Frostkänsliga plantor som tomat och gurka planteras ut veckan efter. Enstaka kalla nätter kan komma senare – följ alltid väderprognosen.`;
  const faqs = [
    {
      question: 'När är sista frosten i Stockholm?',
      answer: `Stockholm ligger i odlingszon 3, där den sista frostnatten normalt inträffar runt vecka ${z3.lastFrostWeek}, alltså i början–mitten av ${monthOfWeek(year, z3.lastFrostWeek)}. Den första höstfrosten kommer ofta runt vecka ${z3.firstFrostWeek}.`,
    },
    {
      question: 'När är sista frosten i Göteborg och Malmö?',
      answer: `Göteborg (zon 2) har normalt sin sista frostnatt runt vecka ${rows[1].lastFrostWeek} och Malmö (zon 1) runt vecka ${z1.lastFrostWeek}. Kustnära lägen blir frostfria tidigare än inlandet.`,
    },
    {
      question: 'När är sista frosten i Norrland?',
      answer: `Det varierar mycket: i Sundsvall och Falun (zon 5) runt vecka ${rows[4].lastFrostWeek}, i Umeå och Östersund (zon 6) runt vecka ${rows[5].lastFrostWeek}, i Luleå (zon 7) runt vecka ${rows[6].lastFrostWeek} och i Kiruna (zon 8) runt vecka ${z8.lastFrostWeek}. Där är den frostfria säsongen bara cirka ${z8.frostFreeWeeks} veckor.`,
    },
    {
      question: 'När kan man plantera ut tomater?',
      answer: `Tidigast veckan efter den normala sista frosten – i zon 3 alltså runt vecka ${z3.plantOutWeek}. Nätterna bör hålla sig över cirka tio grader, och plantorna behöver härdas av ute en vecka först.`,
    },
    {
      question: 'Vad räknas som en frostnatt?',
      answer: 'När temperaturen nära marken går ner till 0 °C eller lägre. Redan runt +2 °C i prognosen kan det bli frost vid marken en klar och vindstilla natt, särskilt i svackor.',
    },
    {
      question: 'Hur vet jag vilken odlingszon jag bor i?',
      answer: 'Sök på din ort ovan eller se zonkartan. Zonerna går från 1 i Skåne till 8 i fjällen. Lokalt läge – höjd, närhet till vatten och skydd mot vind – kan göra att din trädgård beter sig som en zon varmare eller kallare.',
    },
  ];
  return {
    year,
    title: `Sista frost ${year} – när är frosten över där du bor?`,
    h1: `När är sista frosten ${year}?`,
    description: `Normal sista vårfrost och första höstfrost för ${places.length} svenska orter och odlingszon 1–8, med vecka och datum för ${year}. Se när du kan plantera ut tomater.`,
    quickAnswer,
    rows,
    places,
    faqs,
    crops: FROST_CROPS.map((name) => ({ name, slug: cropSlug(name) })),
  };
}

export function frostGuideJsonLd(guide: FrostGuide) {
  const url = `${SITE_ORIGIN}${FROST_PATH}`;
  return [
    { '@type': 'WebPage', '@id': `${url}#page`, url, name: guide.title, description: guide.description, inLanguage: 'sv-SE', isPartOf: { '@id': `${SITE_ORIGIN}/#website` } },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: guide.faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Odlingsdagboken', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: 'Sista frost' },
      ],
    },
  ];
}

