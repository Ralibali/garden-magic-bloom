#!/usr/bin/env node
/**
 * Prove first-byte the same way odlingsdagboken.com is hosted:
 * static dist/<route>/index.html wins; missing routes get homepage SPA fallback.
 */
import { readdir, readFile } from 'node:fs/promises';
import {
  REQUIRED_FIRST_BYTE_PAGES,
  HOMEPAGE_CANONICAL,
  HOMEPAGE_H1,
  HOMEPAGE_TITLE,
  firstByteSignals,
} from './prerender-lib.mjs';
import { defaultDist, resolveLovableHostFile } from './lovable-host.mjs';

function fail(message) {
  throw new Error(`[lovable-host] ${message}`);
}

const dist = defaultDist();
const home = resolveLovableHostFile(dist, '/');
if (!home.file || home.fallback) fail('dist/index.html missing — run a production build first');

const homeHtml = await readFile(home.file, 'utf8');
const homeSignals = firstByteSignals(homeHtml);

const checks = [
  ...REQUIRED_FIRST_BYTE_PAGES.map((page) => ({ route: page.route, expect: page, plant: false })),
  { route: `${REQUIRED_FIRST_BYTE_PAGES[0].route}/`, expect: REQUIRED_FIRST_BYTE_PAGES[0], plant: false },
  { route: '/vaxter', expect: { title: 'Växtbibliotek – såtid, skötsel och skörd', heading: 'Växtbibliotek för svenska odlare', route: '/vaxter' }, plant: false },
];

for (const check of checks) {
  const resolved = resolveLovableHostFile(dist, check.route);
  if (resolved.fallback) {
    fail(`${check.route} SPA-fell back to homepage (${resolved.reason}). dist is missing the prerendered file — this is the production bug.`);
  }
  const html = await readFile(resolved.file, 'utf8');
  const signals = firstByteSignals(html);
  if (html === homeHtml) fail(`${check.route} is BYTE-IDENTICAL to /`);
  if (signals.title === HOMEPAGE_TITLE || signals.title === homeSignals.title) {
    fail(`${check.route} title collapsed to homepage: ${signals.title}`);
  }
  if (signals.h1 === HOMEPAGE_H1 || signals.h1 === homeSignals.h1) {
    fail(`${check.route} H1 collapsed to homepage: ${signals.h1}`);
  }
  if (signals.canonical === HOMEPAGE_CANONICAL || signals.canonical === homeSignals.canonical) {
    fail(`${check.route} canonical collapsed to homepage: ${signals.canonical}`);
  }
  if (check.expect.title && signals.title !== check.expect.title) {
    fail(`${check.route} title "${signals.title}" != "${check.expect.title}"`);
  }
  if (check.expect.heading && signals.h1 !== check.expect.heading) {
    fail(`${check.route} H1 "${signals.h1}" != "${check.expect.heading}"`);
  }
  const selfCanonical = `https://odlingsdagboken.com${check.expect.route}`;
  if (signals.canonical !== selfCanonical) {
    fail(`${check.route} canonical "${signals.canonical}" != "${selfCanonical}"`);
  }
}

const plantsDir = `${dist}/vaxter`;
let plantPages = 0;
try {
  const slugs = await readdir(plantsDir, { withFileTypes: true });
  for (const entry of slugs) {
    if (!entry.isDirectory()) continue;
    const route = `/vaxter/${entry.name}`;
    const resolved = resolveLovableHostFile(dist, route);
    if (resolved.fallback) continue;
    const html = await readFile(resolved.file, 'utf8');
    if (!html.includes('Lägg till') || !html.includes('i min odling')) {
      fail(`${route} first-byte missing plant CTA "Lägg till … i min odling"`);
    }
    plantPages += 1;
  }
} catch {
  /* no plant dir yet */
}

if (plantPages === 0) {
  console.warn('[lovable-host] no prerendered /vaxter/:slug pages — plant CTA first-byte not proven in this dist');
}

console.log(`[lovable-host] OK — unique first-byte for ${REQUIRED_FIRST_BYTE_PAGES.map((p) => p.route).join(', ')} (+ trailing slash). Plant slug pages with CTA: ${plantPages}`);
