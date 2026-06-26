#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const origin = 'https://odlingsdagboken.com';
const pages = {
  '/': ['Odlingsdagboken – digital odlingsdagbok', 'Planera sådd, logga skörd och lär av varje odlingssäsong.'],
  '/priser': ['Priser | Odlingsdagboken', 'Börja gratis och uppgradera till Plus för fler bäddar, Gro och statistik.'],
  '/om-oss': ['Om Odlingsdagboken', 'Läs varför Odlingsdagboken är byggd för svenska odlare.'],
  '/sakalender': ['Såkalender 2026 för Sverige', 'Skapa en personlig såkalender efter grödor och svensk klimatzon.'],
  '/odlingsplan': ['Skapa en odlingsplan', 'Planera pallkrage, växthus, friland, balkong eller kolonilott.'],
  '/odlingsakuten': ['Odlingsakuten – hjälp med växtproblem', 'Felsök gula blad, skadedjur och plantor som inte trivs.'],
  '/gro': ['Gro – personlig odlingshjälp', 'Fråga Gro om såtider, växtproblem och planering.'],
  '/blogg': ['Odlingsguider för svenska förhållanden', 'Praktiska guider om sådd, jord, skötsel och skörd.'],
  '/vaxter': ['Växtbibliotek', 'Se såtid, placering, skötsel och skörd för populära växter.'],
  '/manad': ['Odla månad för månad', 'Se vad du kan så, plantera och skörda varje månad.'],
  '/zoner': ['Odlingszoner i Sverige', 'Lär dig hur odlingszon påverkar frost, såtid och utplantering.'],
};

const template = await readFile(join(dist, 'index.html'), 'utf8');
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

for (const [route, [title, description]] of Object.entries(pages)) {
  const canonical = `${origin}${route === '/' ? '/' : route}`;
  const fallback = `<div id="root"><main style="max-width:900px;margin:60px auto;padding:24px;font-family:system-ui"><h1>${escape(title)}</h1><p>${escape(description)}</p><p><a href="/login?mode=register">Skapa gratis konto</a></p></main></div>`;
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escape(description)}" />`)
    .replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`)
    .replace('<div id="root"></div>', fallback);
  const output = route === '/' ? join(dist, 'index.html') : join(dist, route.slice(1), 'index.html');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, html, 'utf8');
}

console.log(`[prerender] skapade ${Object.keys(pages).length} publika HTML-sidor`);
