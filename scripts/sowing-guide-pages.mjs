// Såtidssidorna (/satider och /satider/:gröda) och zonkalendrarna
// (/kalender/sakalender-zon-N.ics) byggs vid prerender ur src/lib/sowingGuide.ts,
// så att sökmotorer får hela innehållet i första svaret utan att köra JS.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// esbuild följer med vite och finns därför alltid i node_modules.
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

/** Kör TypeScript-modulen i Node genom att bunta den i minnet. */
export async function loadSowingGuideLib() {
  const result = await build({
    stdin: {
      contents: "export * from './src/lib/sowingGuide.ts';\nexport * from './src/lib/frostGuide.ts';",
      resolveDir: root,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    alias: { '@': join(root, 'src') },
    logLevel: 'silent',
  });
  const code = result.outputFiles[0].text;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

function registerHref(crop, zone) {
  const params = new URLSearchParams({ mode: 'register', source: 'satider', return: '/app/calendar', crop, zone: String(zone) });
  return `/login?${params.toString()}`;
}

function subscribeMarkup(lib, zone) {
  const links = lib.zoneCalendarLinks(zone);
  return `<section aria-label="Prenumerera på såkalendern"><h2>Såkalendern för zon ${zone} i din mobil</h2><p>Prenumerera gratis – varje vecka där något ska förodlas, sås eller planteras ut dyker upp i din vanliga kalender. Inget konto behövs.</p><p><a href="${esc(links.google)}" rel="noopener">Google Kalender</a> · <a href="${esc(links.webcal)}">Apple Kalender / iPhone</a> · <a href="${esc(links.https)}">Ladda ner .ics</a></p></section>`;
}

export function cropPageMarkup(lib, guide, { vaxtSlug = null, zoneSlugs = new Set() } = {}) {
  const head = guide.steps.map((step) => `<th scope="col">${esc(lib.stepLabel(guide.crop, step))}</th>`).join('');
  const rows = guide.rows.map((row) => {
    const zoneSlug = `zon-${row.zone}`;
    const zoneCell = zoneSlugs.has(zoneSlug) ? `<a href="/zoner/${zoneSlug}">Zon ${row.zone}</a>` : `Zon ${row.zone}`;
    const cells = guide.steps.map((step) => {
      const w = row.steps[step];
      if (w) return `<td>${esc(w.weeks)}<br /><small>${esc(w.dates)}</small></td>`;
      return `<td>${row.protectedOnly && step === 'skorda' ? 'Växthus' : '–'}</td>`;
    }).join('');
    return `<tr><th scope="row">${zoneCell}<br /><small>${esc(row.places.slice(0, 2).join(', '))}</small></th>${cells}</tr>`;
  }).join('');
  const faqs = guide.faqs.map((faq) => `<h3>${esc(faq.question)}</h3><p>${esc(faq.answer)}</p>`).join('');
  const months = guide.months.map((m) => `<li><a href="/odlingskalender/${esc(m.name)}">Odlingskalender för ${esc(m.name)}</a></li>`).join('');
  const related = guide.related.map((c) => `<li><a href="${lib.SATIDER_PATH}/${esc(c.slug)}">Såtider för ${esc(c.name.toLowerCase())}</a></li>`).join('');
  const vaxt = vaxtSlug ? `<li><a href="/vaxter/${esc(vaxtSlug)}">Odla ${esc(guide.crop.toLowerCase())} – hela odlingsguiden</a></li>` : '';
  return [
    `<nav aria-label="Brödsmulor"><a href="/">Odlingsdagboken</a> / <a href="${lib.SATIDER_PATH}">Såtider</a> / ${esc(guide.crop)}</nav>`,
    `<p><strong>${esc(guide.quickAnswer)}</strong></p>`,
    `<h2>Såtider för ${esc(guide.query)} i zon 1–8</h2>`,
    `<table><caption>Veckor och ungefärliga datum för ${guide.year} per odlingszon</caption><thead><tr><th scope="col">Zon</th>${head}</tr></thead><tbody>${rows}</tbody></table>`,
    `<p><small>Veckor enligt Odlingsdagbokens såmatris, datum för ${guide.year}. Lokalt läge, sort och väder kan flytta tiderna.</small></p>`,
    guide.tip ? `<h2>Odlingstips för ${esc(guide.query)}</h2><p>${esc(guide.tip)}</p>` : '',
    `<aside data-cta="plan-season"><h2>Lägg in ${esc(guide.query)} i din odlingskalender</h2><p>Odlingsdagboken gör om tiderna till påminnelser för din zon och räknar fram när just dina plantor ska ut.</p><p><a href="${esc(registerHref(guide.crop, lib.REFERENCE_ZONE))}">Planera ${esc(guide.query)} i min kalender</a></p></aside>`,
    subscribeMarkup(lib, lib.REFERENCE_ZONE),
    `<h2>Vanliga frågor om att ${esc(guide.verb)} ${esc(guide.query)}</h2>${faqs}`,
    months ? `<h2>Månad för månad</h2><ul>${months}</ul>` : '',
    `<h2>Mer om ${esc(guide.query)}</h2><ul>${vaxt}${related}<li><a href="${lib.SATIDER_PATH}">Alla såtider</a></li></ul>`,
  ].join('');
}

export function indexPageMarkup(lib, year) {
  const groups = lib.buildSowingGuideIndex(year, lib.REFERENCE_ZONE).map((group) => {
    const items = group.crops.map((crop) => `<li><a href="${lib.SATIDER_PATH}/${esc(crop.slug)}">Såtider för ${esc(crop.name.toLowerCase())}</a> – zon 3: ${esc(crop.summary)}</li>`).join('');
    return `<h2>${esc(group.title)}</h2><ul>${items}</ul>`;
  }).join('');
  return `<p>Välj din odlingszon och se när du ska förodla, så, plantera ut och skörda – vecka för vecka med datum. Tiderna kommer från samma såmatris som Odlingsdagbokens kalender.</p>${groups}${subscribeMarkup(lib, lib.REFERENCE_ZONE)}`;
}

/** Prerender-sidor för alla grödor. `published` styr länkar till befintliga CMS-sidor. */
export async function satiderPages({ plants = [], zones = [] } = {}, now = new Date(), lib = null) {
  lib = lib ?? await loadSowingGuideLib();
  const year = lib.guideSeasonYear(now);
  const zoneSlugs = new Set(zones.map((z) => z.slug));
  const index = lib.buildSowingGuideIndex(year, lib.REFERENCE_ZONE);
  const total = index.reduce((sum, group) => sum + group.crops.length, 0);
  const pages = [{
    route: lib.SATIDER_PATH,
    title: `Såtider ${year} – när ska man så? Alla grödor, zon 1–8`,
    heading: `När ska man så? Såtider för ${total} grödor`,
    description: `När ska man så tomater, sätta potatis eller så morötter? Se såtider för ${total} grödor i din odlingszon, vecka för vecka med datum för ${year}.`,
    schemaType: 'CollectionPage',
    contentHtml: indexPageMarkup(lib, year),
  }];
  for (const crop of lib.GUIDE_CROPS) {
    const guide = lib.buildSowingGuide(crop.slug, year);
    pages.push({
      route: `${lib.SATIDER_PATH}/${guide.slug}`,
      title: guide.title,
      heading: guide.h1,
      description: guide.description,
      type: 'article',
      schema: lib.sowingGuideJsonLd(guide),
      contentHtml: cropPageMarkup(lib, guide, { vaxtSlug: lib.vaxtSlugFor(guide.crop, plants), zoneSlugs }),
    });
  }
  return pages;
}

/** Statiska kalenderfiler per zon för innevarande och nästa år. */
export async function writeZoneCalendars(dist, now = new Date(), lib = null) {
  lib = lib ?? await loadSowingGuideLib();
  const years = [now.getFullYear(), now.getFullYear() + 1];
  const written = [];
  for (const zone of lib.ZONES) {
    const file = join(dist, lib.zoneCalendarPath(zone).replace(/^\//, ''));
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, lib.buildZoneGuideIcs(zone, years, now), 'utf8');
    written.push(file);
  }
  return written;
}

// ─── Sista frost ──────────────────────────────────────────────────────────

export function frostPageMarkup(lib, guide) {
  const rows = guide.rows.map((row) => `<tr><th scope="row">Zon ${row.zone}<br /><small>${esc(row.places.slice(0, 3).join(', '))}</small></th><td>v.${row.lastFrostWeek}<br /><small>${esc(row.lastFrostDates)}</small></td><td>v.${row.firstFrostWeek}<br /><small>${esc(row.firstFrostDates)}</small></td><td>ca ${row.frostFreeWeeks} veckor</td><td>från v.${row.plantOutWeek}</td></tr>`).join('');
  const places = guide.places.map((p) => `<li>${esc(p.place)} (zon ${p.zone}): vecka ${p.lastFrostWeek}, ${esc(p.lastFrostDates)}</li>`).join('');
  const faqs = guide.faqs.map((faq) => `<h3>${esc(faq.question)}</h3><p>${esc(faq.answer)}</p>`).join('');
  const crops = guide.crops.map((c) => `<li><a href="${lib.SATIDER_PATH}/${esc(c.slug)}">Såtider för ${esc(c.name.toLowerCase())}</a></li>`).join('');
  const alert = `/login?${new URLSearchParams({ mode: 'register', source: 'sista-frost', return: '/app/settings' }).toString()}`;
  return [
    `<nav aria-label="Brödsmulor"><a href="/">Odlingsdagboken</a> / Sista frost</nav>`,
    `<p><strong>${esc(guide.quickAnswer)}</strong></p>`,
    `<h2>Sista och första frost per odlingszon</h2>`,
    `<table><caption>Normal sista vårfrost och första höstfrost per zon ${guide.year}</caption><thead><tr><th scope="col">Zon</th><th scope="col">Sista vårfrost</th><th scope="col">Första höstfrost</th><th scope="col">Frostfritt</th><th scope="col">Tomater ut</th></tr></thead><tbody>${rows}</tbody></table>`,
    `<p><small>Normalvärden för ett genomsnittligt år, datum för ${guide.year}. Lokalt läge kan skilja en till två veckor åt båda hållen.</small></p>`,
    `<aside data-cta="frost-alert"><h2>Få frostvarning innan det är för sent</h2><p>Odlingsdagboken bevakar prognosen för din plats och varnar när en kall natt är på väg.</p><p><a href="${esc(alert)}">Slå på frostvarning</a></p></aside>`,
    `<h2>Sista frost ort för ort</h2><ul>${places}</ul>`,
    `<h2>Frostkänsliga grödor – när kan de ut?</h2><ul>${crops}<li><a href="${lib.SATIDER_PATH}">Alla såtider</a></li></ul>`,
    `<h2>Vanliga frågor om frost</h2>${faqs}`,
    `<p><a href="/zoner">Sveriges odlingszoner</a> · <a href="/odlingskalender">Odlingskalendern månad för månad</a></p>`,
  ].join('');
}

export function frostPage(lib, now = new Date()) {
  const guide = lib.buildFrostGuide(lib.guideSeasonYear(now));
  return {
    route: lib.FROST_PATH,
    title: guide.title,
    heading: guide.h1,
    description: guide.description,
    schema: lib.frostGuideJsonLd(guide),
    contentHtml: frostPageMarkup(lib, guide),
  };
}

// ─── Interna länkar på andra sidor ────────────────────────────────────────

/** Startsidans första svar: kort intro plus länkar till de mest sökta såtiderna. */
export function homeGuideLinksMarkup(lib, description) {
  const links = lib.POPULAR_GUIDE_CROPS.map((crop) => `<li><a href="${lib.SATIDER_PATH}/${esc(crop.slug)}">När ska man ${esc(lib.verbFor(crop.name))} ${esc(lib.queryName(crop.name))}?</a></li>`).join('');
  return `<p>${esc(description)}</p><h2>När ska man så?</h2><ul>${links}<li><a href="${lib.FROST_PATH}">När är sista frosten där du bor?</a></li></ul><p><a href="${lib.SATIDER_PATH}">Såtider för alla grödor</a></p>`;
}

/** Bloggartiklar: länkar till såtiderna för grödorna artikeln handlar om. */
export function relatedSatiderMarkup(lib, text) {
  const crops = lib.relatedGuideCrops(text);
  if (!crops.length) return '';
  const links = crops.map((crop) => `<li><a href="${lib.SATIDER_PATH}/${esc(crop.slug)}">När ska man ${esc(lib.verbFor(crop.name))} ${esc(lib.queryName(crop.name))}?</a></li>`).join('');
  return `<aside aria-label="Såtider för grödorna i artikeln"><h2>Såtider i din zon</h2><ul>${links}</ul></aside>`;
}
