#!/usr/bin/env node
/**
 * Prerender alla publika routes till statisk HTML.
 *
 * Körs av Vercel via "npm run build:prerender" (ändras manuellt i Vercel dashboard,
 * INTE i package.json's vanliga "build" – Lovables interna preview använder vite build).
 *
 * Output: dist/<route>/index.html med korrekt title, meta, canonical och JSON-LD
 * renderade av react-helmet-async.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import puppeteer from 'puppeteer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, '..', 'dist');
const PORT = 4173;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysonnvbkrwajacvdkqut.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlzb25udmJrcndhamFjdmRrcXV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4Mzg5MjEsImV4cCI6MjA4ODQxNDkyMX0.noi4GzE33SVpbFvdwOmGiNpaq6KfY3IcRSJYwJwQ0Ww';

const STATIC_ROUTES = [
  '/', '/priser', '/om-oss', '/sakalender', '/odlingsplan', '/odlingsakuten',
  '/gro', '/blogg', '/vaxter', '/manad', '/zoner', '/terms',
];

const DEFAULT_TITLE = 'Odlingsdagboken';

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml',
};

async function fetchSlugs(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=slug${filter ? '&' + filter : ''}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) {
    console.warn(`[prerender] kunde inte hämta ${table}: ${res.status}`);
    return [];
  }
  const rows = await res.json();
  return rows.map(r => r.slug).filter(Boolean);
}

async function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      let urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = join(DIST, urlPath);
      try {
        const s = await stat(filePath);
        if (s.isDirectory()) filePath = join(filePath, 'index.html');
      } catch {
        // SPA fallback
        filePath = join(DIST, 'index.html');
      }
      const data = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    } catch (e) {
      res.writeHead(404); res.end('not found');
    }
  });
  await new Promise(r => server.listen(PORT, r));
  return server;
}

async function renderRoute(browser, route) {
  const page = await browser.newPage();
  try {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
    // Vänta tills helmet uppdaterat title (max 5s)
    await page.waitForFunction(
      (def) => document.title && document.title !== def && document.title.length > 0,
      { timeout: 5000 },
      DEFAULT_TITLE,
    ).catch(() => {});
    const html = await page.content();
    return html;
  } finally {
    await page.close();
  }
}

async function writeRouteHtml(route, html) {
  const cleanRoute = route === '/' ? '/index' : route;
  const filePath = join(DIST, cleanRoute, 'index.html');
  if (route === '/') {
    await writeFile(join(DIST, 'index.html'), html, 'utf8');
    return;
  }
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, html, 'utf8');
}

async function main() {
  console.log('[prerender] startar statisk server...');
  const server = await startStaticServer();

  console.log('[prerender] hämtar dynamiska slugs från Supabase...');
  const [blogSlugs, plantSlugs, monthSlugs, zoneSlugs] = await Promise.all([
    fetchSlugs('blog_posts', 'is_published=eq.true'),
    fetchSlugs('seo_plants', 'published=eq.true'),
    fetchSlugs('seo_months'),
    fetchSlugs('seo_zones'),
  ]);

  const dynamicRoutes = [
    ...blogSlugs.map(s => `/blogg/${s}`),
    ...plantSlugs.map(s => `/vaxter/${s}`),
    ...monthSlugs.map(s => `/manad/${s}`),
    ...zoneSlugs.map(s => `/zoner/${s}`),
  ];
  const routes = [...STATIC_ROUTES, ...dynamicRoutes];
  console.log(`[prerender] ${routes.length} routes (${STATIC_ROUTES.length} statiska + ${dynamicRoutes.length} dynamiska)`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let ok = 0, fail = 0;
  const concurrency = 4;
  for (let i = 0; i < routes.length; i += concurrency) {
    const batch = routes.slice(i, i + concurrency);
    await Promise.all(batch.map(async (route) => {
      try {
        const html = await renderRoute(browser, route);
        await writeRouteHtml(route, html);
        ok++;
        if (ok % 25 === 0) console.log(`[prerender] ${ok}/${routes.length} klara...`);
      } catch (e) {
        fail++;
        console.error(`[prerender] FAIL ${route}: ${e.message}`);
      }
    }));
  }

  await browser.close();
  server.close();

  const failRate = fail / routes.length;
  console.log(`[prerender] klart. ${ok} lyckades, ${fail} misslyckades (${(failRate*100).toFixed(1)}%).`);
  if (failRate > 0.05) {
    console.error('[prerender] >5% misslyckades – avbryter.');
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
