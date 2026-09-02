/**
 * Shared prerender helpers. Used by scripts/prerender.mjs and unit tests.
 */

export const ORIGIN = 'https://odlingsdagboken.com';
export const DEFAULT_OG_IMAGE = `${ORIGIN}/og-image.png`;

/** Same public project as vite.config.ts `define` — Node prerender cannot see Vite replacements. */
export const DEFAULT_SUPABASE_URL = 'https://ysonnvbkrwajacvdkqut.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzb25udmJrcndhamFjdmRrcXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mzg5MjEsImV4cCI6MjA4ODQxNDkyMX0.noi4GzE33SVpbFvdwOmGiNpaq6KfY3IcRSJYwJwQ0Ww';

export const HOMEPAGE_TITLE = 'Odlingsdagboken – såkalender, odlingsplan och skördelogg';
export const HOMEPAGE_H1 = 'Digital odlingsdagbok för svenska odlare';
export const HOMEPAGE_CANONICAL = `${ORIGIN}/`;

export const REQUIRED_FIRST_BYTE_PAGES = [
  {
    route: '/funktioner',
    title: 'Funktioner i Odlingsdagboken – dagbok, såkalender och skördelogg',
    heading: 'Funktioner som gör odlingen lättare att minnas',
    description: 'Se hur odlingsdagbok, såkalender, skördelogg och Gro hänger ihop. Byggd för pallkrage, växthus, balkong och friland i Sverige.',
    body: 'Startsida och funktionssida är inte samma sak. Här är vad appen faktiskt gör när säsongen är igång: du planerar, loggar och tittar tillbaka. Odlingsdagbok per bädd, såkalender efter zon, påminnelser, växtpuls, Gro, skörd och fotodagbok.',
  },
  {
    route: '/hur-det-fungerar',
    title: 'Hur Odlingsdagboken fungerar – från zon till säsongslärdom',
    heading: 'Så fungerar Odlingsdagboken i praktiken',
    description: 'Välj zon, få en plan för sådd och utplantering, logga vad som händer och lär av din egen trädgård till nästa år.',
    body: 'Det är inte en kurs och inte en nyhetsfeed. Du sätter en zon, får en rimlig tidsplan och antecknar det som händer i bädden. Tre steg: berätta var du odlar, få en plan du kan ändra, logga det som faktiskt hände.',
  },
];

export function supabaseConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  };
}

export const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const stripHtml = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const truncate = (value, max = 160) => {
  const clean = stripHtml(value);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

export const decodeEntities = (value = '') => String(value)
  .replaceAll('&amp;', '&')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'");

export function canonicalFor(route) {
  return `${ORIGIN}${route === '/' ? '/' : route}`;
}

export function firstByteSignals(html) {
  const title = decodeEntities((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const canonical = decodeEntities((html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1] || '').trim();
  const h1 = decodeEntities(stripHtml((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '')).trim();
  return { title, canonical, h1 };
}

export function assertUniqueFirstByte(html, page) {
  const signals = firstByteSignals(html);
  const expectedCanonical = canonicalFor(page.route);
  const failures = [];
  if (signals.title === HOMEPAGE_TITLE) failures.push(`title collapsed to homepage (${signals.title})`);
  if (signals.h1 === HOMEPAGE_H1) failures.push(`H1 collapsed to homepage (${signals.h1})`);
  if (signals.canonical === HOMEPAGE_CANONICAL) failures.push(`canonical collapsed to homepage (${signals.canonical})`);
  if (page.title && signals.title !== page.title) failures.push(`title mismatch: got "${signals.title}" expected "${page.title}"`);
  if (page.heading && signals.h1 !== page.heading) failures.push(`H1 mismatch: got "${signals.h1}" expected "${page.heading}"`);
  if (signals.canonical !== expectedCanonical) failures.push(`canonical mismatch: got "${signals.canonical}" expected "${expectedCanonical}"`);
  if (failures.length) {
    throw new Error(`[prerender] ${page.route} first-byte invalid: ${failures.join('; ')}`);
  }
  return signals;
}

export function mergeRequiredPages(pages = []) {
  const byRoute = new Map(pages.map((page) => [page.route, page]));
  for (const required of REQUIRED_FIRST_BYTE_PAGES) {
    if (!byRoute.has(required.route)) byRoute.set(required.route, required);
  }
  return [...byRoute.values()];
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}

function replaceMetaName(html, name, content) {
  const tag = `<meta name="${name}" content="${escapeHtml(content)}" />`;
  const regex = new RegExp(`<meta\\s+name=["']${escapeRegExp(name)}["'][^>]*>`, 'i');
  return regex.test(html) ? html.replace(regex, tag) : html.replace('</head>', `  ${tag}\n  </head>`);
}

function replaceMetaProperty(html, property, content) {
  const tag = `<meta property="${property}" content="${escapeHtml(content)}" />`;
  const regex = new RegExp(`<meta\\s+property=["']${escapeRegExp(property)}["'][^>]*>`, 'i');
  return regex.test(html) ? html.replace(regex, tag) : html.replace('</head>', `  ${tag}\n  </head>`);
}

function replaceCanonical(html, canonical) {
  const tag = `<link rel="canonical" href="${escapeHtml(canonical)}" />`;
  return html.replace(/<link\s+rel=["']canonical["'][^>]*>/i, tag);
}

function replaceAlternate(html, hreflang, href) {
  const tag = `<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}" />`;
  const regex = new RegExp(`<link\\s+rel=["']alternate["'][^>]*hreflang=["']${escapeRegExp(hreflang)}["'][^>]*>`, 'i');
  return regex.test(html) ? html.replace(regex, tag) : html.replace('</head>', `  ${tag}\n  </head>`);
}

function injectJsonLd(html, schema) {
  if (!schema) return html;
  const payload = JSON.stringify({ '@context': 'https://schema.org', ...(Array.isArray(schema) ? { '@graph': schema } : schema) }).replace(/</g, '\\u003c');
  const script = `<script id="prerender-page-schema" type="application/ld+json">${payload}</script>`;
  const cleaned = html.replace(/\s*<script id="prerender-page-schema"[\s\S]*?<\/script>/i, '');
  return cleaned.replace('</head>', `  ${script}\n  </head>`);
}

export function fallbackMarkup(page) {
  const body = truncate(page.body || page.description, 900);
  const image = page.image ? `<img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.imageAlt || page.heading || page.title)}" style="display:block;width:100%;max-width:760px;aspect-ratio:16/9;object-fit:cover;border-radius:18px;margin:24px 0" />` : '';
  const published = page.publishedTime ? `<p><small>Publicerad ${escapeHtml(page.publishedTime.slice(0, 10))}</small></p>` : '';
  return `<div id="root"><main id="main-content" style="max-width:900px;margin:56px auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;line-height:1.65;color:#173226"><nav aria-label="Huvudnavigation" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:36px"><a href="/">Odlingsdagboken</a><a href="/funktioner">Funktioner</a><a href="/hur-det-fungerar">Hur det fungerar</a><a href="/sakalender">Såkalender</a><a href="/vaxter">Växter</a><a href="/blogg">Blogg</a></nav><article><h1>${escapeHtml(page.heading || page.title)}</h1>${published}${image}<p>${escapeHtml(body)}</p></article><p style="margin-top:32px"><a href="/login?mode=register">Skapa gratis konto</a></p></main></div>`;
}

export function pageSchema(page) {
  if (page.schema) return page.schema;
  const canonical = canonicalFor(page.route);
  const schemaType = page.schemaType || (page.type === 'article' ? 'Article' : 'WebPage');
  const result = {
    '@type': schemaType,
    '@id': `${canonical}#page`,
    url: canonical,
    name: page.heading || page.title,
    description: page.description,
    inLanguage: 'sv-SE',
    isPartOf: { '@id': `${ORIGIN}/#website` },
  };
  if (page.type === 'article') {
    result.headline = page.heading || page.title;
    result.mainEntityOfPage = { '@type': 'WebPage', '@id': canonical };
    result.author = { '@id': `${ORIGIN}/#organization` };
    result.publisher = { '@id': `${ORIGIN}/#organization` };
    if (page.publishedTime) result.datePublished = page.publishedTime;
    if (page.modifiedTime) result.dateModified = page.modifiedTime;
    if (page.image) result.image = page.image;
  }
  return result;
}

export function renderPage(template, page) {
  const canonical = canonicalFor(page.route);
  const image = page.image || DEFAULT_OG_IMAGE;
  let html = template;
  html = replaceTitle(html, page.title);
  html = replaceMetaName(html, 'description', page.description);
  html = replaceMetaName(html, 'robots', page.noindex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  html = replaceCanonical(html, canonical);
  html = replaceAlternate(html, 'sv-SE', canonical);
  html = replaceAlternate(html, 'x-default', canonical);
  html = replaceMetaProperty(html, 'og:title', page.title);
  html = replaceMetaProperty(html, 'og:description', page.description);
  html = replaceMetaProperty(html, 'og:url', canonical);
  html = replaceMetaProperty(html, 'og:type', page.type || 'website');
  html = replaceMetaProperty(html, 'og:image', image);
  html = replaceMetaProperty(html, 'og:image:alt', page.imageAlt || page.heading || page.title);
  html = replaceMetaProperty(html, 'og:image:width', '1200');
  html = replaceMetaProperty(html, 'og:image:height', '630');
  html = replaceMetaName(html, 'twitter:card', 'summary_large_image');
  html = replaceMetaName(html, 'twitter:title', page.title);
  html = replaceMetaName(html, 'twitter:description', page.description);
  html = replaceMetaName(html, 'twitter:image', image);
  html = replaceMetaName(html, 'twitter:image:alt', page.imageAlt || page.heading || page.title);
  if (page.publishedTime) html = replaceMetaProperty(html, 'article:published_time', page.publishedTime);
  if (page.modifiedTime) html = replaceMetaProperty(html, 'article:modified_time', page.modifiedTime);
  html = injectJsonLd(html, pageSchema(page));
  html = html.replace('<div id="root"></div>', fallbackMarkup(page));
  return html;
}
