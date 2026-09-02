#!/usr/bin/env node
/**
 * Hydrate proof against the Lovable-host simulator (static file, else SPA
 * fallback) — not vite preview. Chrome dump-dom after JS takeover.
 */
import { spawn } from 'node:child_process';
import { createLovableHost, defaultDist } from './lovable-host.mjs';

const PORT = Number(process.env.HYDRATE_PORT || 4173);
const CHROME = process.env.CHROME || 'google-chrome';

function fail(message) {
  throw new Error(`[hydrate] ${message}`);
}

function dumpDom(url) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      `--user-data-dir=/tmp/od-hydrate-${process.pid}-${Math.random().toString(36).slice(2)}`,
      '--virtual-time-budget=8000',
      '--timeout=20000',
      '--dump-dom',
      url,
    ];
    const child = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let html = '';
    let err = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { html += chunk; });
    child.stderr.on('data', (chunk) => { err += chunk; });
    const killer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`chrome timed out for ${url}`));
    }, 25000);
    child.on('exit', (code) => {
      clearTimeout(killer);
      if (!html && code !== 0) reject(new Error(`chrome ${code} for ${url}: ${err.slice(0, 400)}`));
      else resolve(html);
    });
  });
}

function h1(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

function navHref(html, label) {
  const re = new RegExp(`href="([^"]+)"[^>]*>\\s*${label}\\s*<`, 'i');
  const match = html.match(re);
  return match ? match[1] : null;
}

const host = createLovableHost(defaultDist(), PORT);
const origin = await host.listen();

try {
  const pages = [
    {
      path: '/funktioner',
      h1: 'Funktioner som gör odlingen lättare att minnas',
      nav: ['/funktioner', '/hur-det-fungerar'],
    },
    {
      path: '/hur-det-fungerar',
      h1: 'Så fungerar Odlingsdagboken i praktiken',
      nav: ['/funktioner', '/hur-det-fungerar'],
    },
    {
      path: '/vaxter/arta',
      h1Includes: 'ärta',
      cta: 'Lägg till ärta i min odling',
    },
  ];

  for (const page of pages) {
    const html = await dumpDom(`${origin}${page.path}`);
    if (!html || html.length < 200) fail(`${page.path} empty dump-dom`);
    if (/Sidan hittades inte/.test(html) || />404</.test(html) || /Här växer det inget just nu/.test(html)) {
      fail(`${page.path} hydrated to 404`);
    }
    const heading = h1(html);
    if (page.h1 && heading !== page.h1) fail(`${page.path} H1 "${heading}" != "${page.h1}"`);
    if (page.h1Includes && !heading.toLowerCase().includes(page.h1Includes.toLowerCase())) {
      fail(`${page.path} H1 "${heading}" missing ${page.h1Includes}`);
    }
    if (page.cta && !html.includes(page.cta)) fail(`${page.path} hydrated page lost "${page.cta}"`);
    if (page.nav) {
      for (const href of page.nav) {
        if (!html.includes(`href="${href}"`) && !html.includes(`href='${href}'`)) {
          fail(`${page.path} missing nav href ${href}`);
        }
      }
      if (html.includes('/#funktioner') || html.includes('/#hur-det-fungerar')) {
        fail(`${page.path} still has hash nav`);
      }
    }
    const funktionerHref = navHref(html, 'Funktioner');
    if (funktionerHref && funktionerHref.includes('#')) {
      fail(`${page.path} Funktioner nav is ${funktionerHref}`);
    }
    console.log(`[hydrate] ${page.path} OK — H1 "${heading}"`);
  }

  const home = await dumpDom(`${origin}/`);
  if (!home.includes('href="/funktioner"')) fail('homepage nav is not /funktioner');
  if (home.includes('/#funktioner')) fail('homepage still has /#funktioner');
  console.log('[hydrate] homepage nav OK — /funktioner (no hash)');
} finally {
  await host.close();
}

console.log(`[hydrate] OK — Lovable-host simulator at ${origin} passed first-byte-matching JS takeover`);
