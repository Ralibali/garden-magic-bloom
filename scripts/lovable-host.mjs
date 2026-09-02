/**
 * Resolve and serve dist the way production does today.
 *
 * Live evidence (2026-09-02, x-deployment-id 69d1c4e7-0899-4f6f-931a-7605a762fe03):
 *   garden-magic-bloom.lovable.app → 302 odlingsdagboken.com (Lovable Cloud + Cloudflare)
 *   /vaxter and /priser return unique prerendered dist/<route>/index.html
 *   /funktioner and /hur-det-fungerar are BYTE-IDENTICAL to /  → files missing, SPA fallback
 *   /vaxter/tomat also collapses to homepage when the slug file is absent
 *
 * This is NOT vite preview. Vite preview was a false proof on PR 15.
 */
import { createServer } from 'node:http';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

export function defaultDist() {
  return join(fileURLToPath(new URL('..', import.meta.url)), 'dist');
}

function safeJoin(root, requestPath) {
  const rel = decodeURIComponent(requestPath.split('?')[0].split('#')[0]).replace(/^\/+/, '');
  const candidate = normalize(join(root, rel));
  const rootResolved = resolve(root) + sep;
  if (candidate !== resolve(root) && !candidate.startsWith(rootResolved)) return null;
  return candidate;
}

function isFile(path) {
  return !!path && existsSync(path) && statSync(path).isFile();
}

/**
 * @returns {{ file: string | null, fallback: boolean, reason: string }}
 */
export function resolveLovableHostFile(distDir, requestPath) {
  const raw = requestPath.split('?')[0].split('#')[0] || '/';
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(raw) && !raw.endsWith('/');

  if (hasExtension && !raw.endsWith('.html')) {
    const exact = safeJoin(distDir, raw);
    if (isFile(exact)) return { file: exact, fallback: false, reason: 'exact-asset' };
    return { file: null, fallback: false, reason: 'missing-asset' };
  }

  const trimmed = raw === '/' ? '' : raw.replace(/^\/+/, '').replace(/\/+$/, '');
  const candidates = trimmed
    ? [
        safeJoin(distDir, trimmed),
        safeJoin(distDir, `${trimmed}.html`),
        safeJoin(distDir, `${trimmed}/index.html`),
      ]
    : [join(distDir, 'index.html')];

  for (const file of candidates) {
    if (isFile(file)) return { file, fallback: false, reason: 'static-html' };
  }

  const spa = join(distDir, 'index.html');
  if (isFile(spa)) return { file: spa, fallback: true, reason: 'spa-fallback' };
  return { file: null, fallback: true, reason: 'missing-index' };
}

export function createLovableHost(distDir = defaultDist(), port = 4173) {
  const server = createServer((req, res) => {
    const url = req.url || '/';
    const resolved = resolveLovableHostFile(distDir, url);
    if (!resolved.file) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const type = MIME[extname(resolved.file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'content-type': type,
      'x-lovable-host-fallback': resolved.fallback ? '1' : '0',
      'x-lovable-host-reason': resolved.reason,
      'cache-control': 'no-cache, must-revalidate, max-age=0',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(resolved.file).pipe(res);
  });
  return {
    server,
    listen: () => new Promise((resolveListen) => {
      server.listen(port, '127.0.0.1', () => resolveListen(`http://127.0.0.1:${port}`));
    }),
    close: () => new Promise((resolveClose) => server.close(resolveClose)),
  };
}

const isDirect = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirect) {
  const port = Number(process.env.PORT || 4173);
  const host = createLovableHost(defaultDist(), port);
  const url = await host.listen();
  console.log(`[lovable-host] serving ${defaultDist()} at ${url} (static file, else SPA index.html)`);
}
