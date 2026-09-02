#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REQUIRED_FIRST_BYTE_PAGES,
  assertUniqueFirstByte,
  mergeRequiredPages,
  renderPage,
  supabaseConfig,
  truncate,
  DEFAULT_OG_IMAGE,
  HOMEPAGE_TITLE,
  HOMEPAGE_H1,
} from './prerender-lib.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const currentYear = new Date().getFullYear();
const origin = 'https://odlingsdagboken.com';

const staticPages = [
  {
    route: '/',
    title: HOMEPAGE_TITLE,
    description: 'Planera sådd, logga skördar och se vad som fungerar i din trädgård år efter år. Gratis digital odlingsdagbok för svenska odlare.',
    heading: HOMEPAGE_H1,
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
  { route: '/odlingskalender', title: `Odlingskalender ${currentYear} – månad för månad i din zon`, description: 'Se vad du ska så, förodla, plantera och skörda varje månad. Anpassad efter svenska klimatzoner 1–8.', heading: `Odlingskalender ${currentYear}`, schemaType: 'CollectionPage' },
  { route: '/zoner', title: 'Odlingszoner i Sverige – frost, såtid och utplantering', description: 'Lär dig hur svensk odlingszon påverkar frost, såtid, utplantering och vilka växter som passar där du bor.', heading: 'Odlingszoner i Sverige', schemaType: 'CollectionPage' },
  { route: '/install', title: 'Installera Odlingsdagboken som app', description: 'Installera Odlingsdagboken på mobil, surfplatta eller dator och öppna din odling direkt från hemskärmen.', heading: 'Installera Odlingsdagboken' },
  { route: '/terms', title: 'Villkor och integritet | Odlingsdagboken', description: 'Läs användarvillkor och information om hur Odlingsdagboken behandlar personuppgifter.', heading: 'Villkor och integritet' },
  { route: '/login', title: 'Skapa gratis konto | Odlingsdagboken', description: 'Skapa ett gratis konto och börja spara såkalender, odlingsplan, skördar och anteckningar.', heading: 'Skapa konto eller logga in', noindex: true },
  { route: '/reset-password', title: 'Återställ lösenord | Odlingsdagboken', description: 'Återställ lösenordet till ditt konto i Odlingsdagboken.', heading: 'Återställ lösenord', noindex: true },
  { route: '/app', title: 'Min odlingsdagbok', description: 'Din privata odlingsdagbok.', heading: 'Min odlingsdagbok', noindex: true },
  ...REQUIRED_FIRST_BYTE_PAGES,
];

const template = await readFile(join(dist, 'index.html'), 'utf8');

function routeOutput(route) {
  return route === '/' ? join(dist, 'index.html') : join(dist, route.replace(/^\//, ''), 'index.html');
}

async function writePage(page) {
  const output = routeOutput(page.route);
  const html = renderPage(template, page);
  if (page.route !== '/') assertUniqueFirstByte(html, page);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html, 'utf8');
}

async function fetchTable(table, query) {
  const { url: supabaseUrl, key: supabaseKey } = supabaseConfig();
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
  const { url, key } = supabaseConfig();
  const envConfigured = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) && (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY);
  if (!envConfigured) {
    // Hosted deploys must not ship empty SEO shells. GitHub Verify has no Supabase secrets.
    if (process.env.VERCEL === '1' || process.env.NETLIFY === 'true') {
      throw new Error('[prerender] Supabase-miljö saknas i produktionsbygget. Sätt VITE_SUPABASE_URL och VITE_SUPABASE_PUBLISHABLE_KEY – annars levereras alla månads-, växt- och zonsidor som tom React-shell.');
    }
    if (!url || !key) {
      console.warn('[prerender] Supabase-miljö saknas; hoppar över dynamiska slug-sidor i denna build.');
      return [];
    }
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
        image: post.cover_image_url || DEFAULT_OG_IMAGE,
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
        image: plant.image_url || DEFAULT_OG_IMAGE,
        imageAlt: plant.image_alt || plant.name,
        publishedTime: plant.created_at,
        modifiedTime: plant.updated_at || plant.created_at,
      });
    }

    for (const month of months || []) {
      pages.push({
        route: `/odlingskalender/${month.slug}`,
        title: `Odlingskalender ${month.month_name.toLowerCase()} – så, plantera och skörda i din zon`,
        heading: `Odlingskalender för ${month.month_name.toLowerCase()}`,
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
const allPages = mergeRequiredPages([...staticPages, ...dynamicPages]);
for (const page of allPages) await writePage(page);

const rebuilt = REQUIRED_FIRST_BYTE_PAGES.map((page) => page.route).join(', ');
console.log(`[prerender] skapade ${allPages.length} HTML-sidor (${staticPages.length} fasta, ${dynamicPages.length} dynamiska). Unika first-byte-sidor: ${rebuilt}`);
