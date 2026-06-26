#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const origin = 'https://odlingsdagboken.com';
const currentYear = new Date().getFullYear();
const defaultImage = `${origin}/og-image.png`;

const staticPages = [
  {
    route: '/',
    title: 'Odlingsdagboken – såkalender, odlingsplan och skördelogg',
    description: 'Planera sådd, logga skördar och se vad som fungerar i din trädgård år efter år. Gratis digital odlingsdagbok för svenska odlare.',
    heading: 'Digital odlingsdagbok för svenska odlare',
    type: 'website',
    schema: {
      '@type': 'SoftwareApplication',
      name: 'Odlingsdagboken',
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Web',
      description: 'Digital odlingsdagbok, såkalender och odlingsplanering för svenska hobbyodlare.',
      url: origin,
      inLanguage: 'sv-SE',
      offers: [
        { '@type': 'Offer', price: '0', priceCurrency: 'SEK', description: 'Gratis grundversion' },
        { '@type': 'Offer', price: '99', priceCurrency: 'SEK', description: 'Odlingsdagboken Plus per år' },
      ],
    },
  },
  { route: '/priser', title: 'Priser – Odlingsdagboken Plus 99 kr/år', description: 'Börja gratis och uppgradera till Plus för fler bäddar, Gro, statistik och säsongsjämförelser.', heading: 'Priser för Odlingsdagboken' },
  { route: '/om-oss', title: 'Om Odlingsdagboken', description: 'Läs varför Odlingsdagboken är byggd för svenska hobbyodlare och hur tjänsten hjälper dig lära av varje säsong.', heading: 'Om Odlingsdagboken' },
  { route: '/sakalender', title: `Såkalender ${currentYear} – personlig såkalender för din zon`, description: 'Skapa en gratis såkalender för svenska odlare. Välj klimatzon och få tider för förodling, utplantering, direktsådd och skörd.', heading: `Såkalender ${currentYear} för Sverige` },
  { route: '/odlingsplan', title: 'Skapa en odlingsplan för pallkrage, växthus och friland', description: 'Planera pallkrage, växthus, friland, balkong eller kolonilott och spara planen i din digitala odlingsdagbok.', heading: 'Skapa din odlingsplan' },
  { route: '/odlingsakuten', title: 'Odlingsakuten – hjälp med gula blad och växtproblem', description: 'Felsök gula blad, slokande plantor, skadedjur och svag tillväxt med råd anpassade för svenska förhållanden.', heading: 'Odlingsakuten' },
  { route: '/gro', title: 'Gro – personlig AI-coach för din odling', description: 'Fråga Gro om såtider, växtproblem, väder, växtföljd och planering utifrån din egen odlingshistorik.', heading: 'Möt odlingscoachen Gro' },
  { route: '/blogg', title: `Odlingstips och guider ${currentYear} | Odlingsdagboken`, description: 'Praktiska guider om sådd, jord, pallkrage, växtföljd, skötsel och skörd för svenska hobbyodlare.', heading: 'Odlingstips och guider för svenska hobbyodlare', schemaType: 'CollectionPage' },
  { route: '/vaxter', title: 'Växtbibliotek – såtid, skötsel och skörd', description: 'Se såtid, placering, plantavstånd, skötsel och skörd för populära grönsaker, örter och blommor i Sverige.', heading: 'Växtbibliotek för svenska odlare', schemaType: 'CollectionPage' },
  { route: '/manad', title: 'Odla månad för månad i Sverige', description: 'Se vad du kan så, förodla, plantera och skörda varje månad i svenska trädgårdar och odlingszoner.', heading: 'Odla månad för månad', schemaType: 'CollectionPage' },
  { route: '/zoner', title: 'Odlingszoner i Sverige – frost, såtid och utplantering', description: 'Lär dig hur svensk odlingszon påverkar frost, såtid, utplantering och vilka växter som passar där du bor.', heading: 'Odlingszoner i Sverige', schemaType: 'CollectionPage' },
  { route: '/install', title: 'Installera Odlingsdagboken som app', description: 'Installera Odlingsdagboken på mobil, surfplatta eller dator och öppna din odling direkt från hemskärmen.', heading: 'Installera Odlingsdagboken' },
  { route: '/terms', title: 'Villkor och integritet | Odlingsdagboken', description: 'Läs användarvillkor och information om hur Odlingsdagboken behandlar personuppgifter.', heading: 'Villkor och integritet' },
  { route: '/login', title: 'Skapa gratis konto | Odlingsdagboken', description: 'Skapa ett gratis konto och börja spara såkalender, odlingsplan, skördar och anteckningar.', heading: 'Skapa konto eller logga in', noindex: true },
  { route: '/reset-password', title: 'Återställ lösenord | Odlingsdagboken', description: 'Återställ lösenordet till ditt konto i Odlingsdagboken.', heading: 'Återställ lösenord', noindex: true },
  { route: '/app', title: 'Min odlingsdagbok', description: 'Din privata odlingsdagbok.', heading: 'Min odlingsdagbok', noindex: true },
];

const template = await readFile(join(dist, 'index.html'), 'utf8');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stripHtml = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const truncate = (value, max = 160) => {
  const clean = stripHtml(value);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

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

function fallbackMarkup(page) {
  const body = truncate(page.body || page.description, 900);
  const image = page.image ? `<img src="${escapeHtml(page.image)}" alt="${escapeHtml(page.imageAlt || page.heading || page.title)}" style="display:block;width:100%;max-width:760px;aspect-ratio:16/9;object-fit:cover;border-radius:18px;margin:24px 0" />` : '';
  const published = page.publishedTime ? `<p><small>Publicerad ${escapeHtml(page.publishedTime.slice(0, 10))}</small></p>` : '';
  return `<div id="root"><main id="main-content" style="max-width:900px;margin:56px auto;padding:24px;font-family:system-ui,-apple-system,sans-serif;line-height:1.65;color:#173226"><nav aria-label="Huvudnavigation" style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:36px"><a href="/">Odlingsdagboken</a><a href="/sakalender">Såkalender</a><a href="/vaxter">Växter</a><a href="/blogg">Blogg</a></nav><article><h1>${escapeHtml(page.heading || page.title)}</h1>${published}${image}<p>${escapeHtml(body)}</p></article><p style="margin-top:32px"><a href="/login?mode=register">Skapa gratis konto</a></p></main></div>`;
}

function pageSchema(page) {
  if (page.schema) return page.schema;
  const canonical = `${origin}${page.route === '/' ? '/' : page.route}`;
  const schemaType = page.schemaType || (page.type === 'article' ? 'Article' : 'WebPage');
  const result = {
    '@type': schemaType,
    '@id': `${canonical}#page`,
    url: canonical,
    name: page.heading || page.title,
    description: page.description,
    inLanguage: 'sv-SE',
    isPartOf: { '@id': `${origin}/#website` },
  };
  if (page.type === 'article') {
    result.headline = page.heading || page.title;
    result.mainEntityOfPage = { '@type': 'WebPage', '@id': canonical };
    result.author = { '@id': `${origin}/#organization` };
    result.publisher = { '@id': `${origin}/#organization` };
    if (page.publishedTime) result.datePublished = page.publishedTime;
    if (page.modifiedTime) result.dateModified = page.modifiedTime;
    if (page.image) result.image = page.image;
  }
  return result;
}

function renderPage(page) {
  const canonical = `${origin}${page.route === '/' ? '/' : page.route}`;
  const image = page.image || defaultImage;
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

function routeOutput(route) {
  return route === '/' ? join(dist, 'index.html') : join(dist, route.replace(/^\//, ''), 'index.html');
}

async function writePage(page) {
  const output = routeOutput(page.route);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, renderPage(page), 'utf8');
}

async function fetchTable(table, query) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}`);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) throw new Error(`${table}: HTTP ${response.status} ${await response.text()}`);
  return response.json();
}

async function loadDynamicPages() {
  const configured = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) && (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY);
  if (!configured) {
    console.warn('[prerender] Supabase-miljö saknas; hoppar över dynamiska slug-sidor i denna build.');
    return [];
  }

  try {
    const [posts, plants, months, zones] = await Promise.all([
      fetchTable('blog_posts', {
        select: 'slug,title,excerpt,meta_title,meta_description,cover_image_url,published_at,updated_at,content,tags',
        is_published: 'eq.true',
        order: 'published_at.desc',
      }),
      fetchTable('seo_plants', {
        select: 'slug,name,latin_name,description_short,description_long,image_url,image_alt,created_at,updated_at',
        published: 'eq.true',
        order: 'name.asc',
      }),
      fetchTable('seo_months', {
        select: 'slug,title,intro,month_name,created_at,updated_at',
        published: 'eq.true',
        order: 'month_number.asc',
      }),
      fetchTable('seo_zones', {
        select: 'slug,title,description,zone_number,created_at,updated_at',
        published: 'eq.true',
        order: 'zone_number.asc',
      }),
    ]);

    const pages = [];
    const tagMap = new Map();

    for (const post of posts || []) {
      const description = truncate(post.meta_description || post.excerpt || post.content || `Läs ${post.title} hos Odlingsdagboken.`);
      pages.push({
        route: `/blogg/${post.slug}`,
        title: post.meta_title || `${post.title} | Odlingsdagboken`,
        heading: post.title,
        description,
        body: post.excerpt || post.content,
        type: 'article',
        image: post.cover_image_url || defaultImage,
        imageAlt: post.title,
        publishedTime: post.published_at,
        modifiedTime: post.updated_at || post.published_at,
      });
      for (const tag of Array.isArray(post.tags) ? post.tags : []) {
        if (!tag) continue;
        const current = tagMap.get(tag) || [];
        current.push(post);
        tagMap.set(tag, current);
      }
    }

    for (const [tag, taggedPosts] of tagMap) {
      pages.push({
        route: `/blogg/tagg/${encodeURIComponent(tag)}`,
        title: `${tag} – guider och odlingstips | Odlingsdagboken`,
        heading: `Guider om ${tag}`,
        description: `Artiklar, guider och praktiska odlingstips om ${tag} för svenska hobbyodlare.`,
        body: taggedPosts.map((post) => post.title).join('. '),
        schemaType: 'CollectionPage',
      });
    }

    for (const plant of plants || []) {
      const heading = `Odla ${plant.name} i Sverige – komplett guide`;
      pages.push({
        route: `/vaxter/${plant.slug}`,
        title: `${heading} | Odlingsdagboken`,
        heading,
        description: truncate(plant.description_short || plant.description_long || `Så odlar du ${plant.name} i svenska förhållanden.`),
        body: plant.description_long || plant.description_short,
        type: 'article',
        image: plant.image_url || defaultImage,
        imageAlt: plant.image_alt || plant.name,
        publishedTime: plant.created_at,
        modifiedTime: plant.updated_at || plant.created_at,
      });
    }

    for (const month of months || []) {
      pages.push({
        route: `/manad/${month.slug}`,
        title: `${month.title} | Odlingsdagboken`,
        heading: month.title,
        description: truncate(month.intro || `Vad du kan så, plantera och skörda i ${month.month_name}.`),
        body: month.intro,
        type: 'article',
        publishedTime: month.created_at,
        modifiedTime: month.updated_at || month.created_at,
      });
    }

    for (const zone of zones || []) {
      pages.push({
        route: `/zoner/${zone.slug}`,
        title: `${zone.title} – odlingsguide | Odlingsdagboken`,
        heading: zone.title,
        description: truncate(zone.description || `Klimat, frost, såtid och lämpliga växter för odlingszon ${zone.zone_number}.`),
        body: zone.description,
        type: 'article',
        publishedTime: zone.created_at,
        modifiedTime: zone.updated_at || zone.created_at,
      });
    }

    return pages;
  } catch (error) {
    console.warn('[prerender] Dynamisk SEO-data kunde inte hämtas:', error instanceof Error ? error.message : error);
    return [];
  }
}

const dynamicPages = await loadDynamicPages();
const allPages = [...staticPages, ...dynamicPages];
for (const page of allPages) await writePage(page);

console.log(`[prerender] skapade ${allPages.length} HTML-sidor (${staticPages.length} fasta, ${dynamicPages.length} dynamiska)`);
