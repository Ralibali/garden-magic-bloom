#!/usr/bin/env node
/**
 * One publish unit: every prerendered HTML file must load the same hashed
 * index-*.js that actually registers /funktioner and /hur-det-fungerar.
 *
 * This is the split-deploy guard. Lovable can upload unique HTML while Chrome
 * still executes an older SPA entry. Fail the build if that can happen.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { REQUIRED_FIRST_BYTE_PAGES, extractIndexAsset } from './prerender-lib.mjs';
import { defaultDist, resolveLovableHostFile } from './lovable-host.mjs';

function fail(message) {
  throw new Error(`[publish-unit] ${message}`);
}

const dist = defaultDist();
const home = resolveLovableHostFile(dist, '/');
if (!home.file || home.fallback) fail('dist/index.html missing');

const homeHtml = await readFile(home.file, 'utf8');
const indexAsset = extractIndexAsset(homeHtml);
if (!indexAsset) fail('homepage HTML has no /assets/index-*.js — SPA entry missing');

const assetPath = join(dist, indexAsset.replace(/^\//, ''));
let indexJs = '';
try {
  indexJs = await readFile(assetPath, 'utf8');
} catch {
  fail(`${indexAsset} referenced by HTML but not in dist — hashed chunk from another build`);
}

const requiredJs = [
  ['path:"/funktioner"', /path:"\/funktioner"/],
  ['path:"/hur-det-fungerar"', /path:"\/hur-det-fungerar"/],
  ['nav to /funktioner', /to:"\/funktioner"/],
  ['nav to /hur-det-fungerar', /to:"\/hur-det-fungerar"/],
  ['Funktioner H1', /Funktioner som gör odlingen lättare att minnas/],
  ['Hur-det-fungerar H1', /Så fungerar Odlingsdagboken i praktiken/],
];

for (const [label, pattern] of requiredJs) {
  if (!pattern.test(indexJs)) {
    fail(`${indexAsset} is missing ${label}. This JS would 404 after hydrate.`);
  }
}

if (/to:"\/#funktioner"/.test(indexJs) || /to:"\/#hur-det-fungerar"/.test(indexJs)) {
  fail(`${indexAsset} still has hash-router nav (/#funktioner). Old SPA bundle.`);
}

const publishId = (homeHtml.match(/<meta\s+name=["']od-publish-id["'][^>]*content=["']([^"']+)["']/i) || [])[1];
if (!publishId) fail('homepage missing od-publish-id — HTML and JS cannot be matched after publish');
if (!indexJs.includes(publishId)) {
  fail(`JS ${indexAsset} does not contain publish id ${publishId} — not the same vite build`);
}

const routes = [
  ...REQUIRED_FIRST_BYTE_PAGES.map((page) => page.route),
  '/vaxter',
  '/priser',
];

for (const route of routes) {
  const resolved = resolveLovableHostFile(dist, route);
  if (resolved.fallback) fail(`${route} SPA-fell back — prerender file missing`);
  const html = await readFile(resolved.file, 'utf8');
  const asset = extractIndexAsset(html);
  if (asset !== indexAsset) {
    fail(`${route} loads ${asset} but homepage loads ${indexAsset} — split HTML/JS publish`);
  }
  const pageId = (html.match(/<meta\s+name=["']od-publish-id["'][^>]*content=["']([^"']+)["']/i) || [])[1];
  if (pageId !== publishId) {
    fail(`${route} od-publish-id ${pageId} != homepage ${publishId}`);
  }
}

let plantOk = 0;
try {
  const slugs = await readdir(join(dist, 'vaxter'), { withFileTypes: true });
  for (const entry of slugs) {
    if (!entry.isDirectory()) continue;
    const route = `/vaxter/${entry.name}`;
    const resolved = resolveLovableHostFile(dist, route);
    if (resolved.fallback) continue;
    const html = await readFile(resolved.file, 'utf8');
    if (extractIndexAsset(html) !== indexAsset) fail(`${route} loads a different index JS`);
    if (!html.includes('__OD_PRERENDER__') || !html.includes('plantName')) {
      fail(`${route} missing prerender boot payload — hydrate would drop the plant CTA`);
    }
    plantOk += 1;
  }
} catch {
  /* no plants */
}

console.log(`[publish-unit] OK — ${indexAsset} is the single SPA entry for HTML+JS. publish-id ${publishId}. Plant boot pages: ${plantOk}`);
