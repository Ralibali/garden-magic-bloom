import { build, loadConfigFromFile } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const pages = { '/': 'GrowthHome', '/sakalender': 'Sakalender', '/odlingskalender': 'OdlingskalenderIndex', '/vaxter': 'VaxterIndex', '/zoner': 'ZonerIndex', '/zoner/:slug': 'ZonDetail', '/priser': 'Priser', '/gro': 'Gro' };

export async function createPublicRenderer() {
  const dir = resolve('node_modules/.cache/public-react');
  await mkdir(dir, { recursive: true });
  const entry = `
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import { SeoPrerenderContext } from '@/hooks/seo-prerender-context';
${Object.values(pages).map(name => `import ${name} from '@/pages/${name}';`).join('\n')}
export function render(route, zones) {
 const meta = {};
 const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 if (zones) client.setQueryData(['seo-zones-index'], zones);
 const html = renderToString(<SeoPrerenderContext.Provider value={meta}><HelmetProvider><QueryClientProvider client={client}><AuthProvider><TooltipProvider><MemoryRouter initialEntries={[route]}><Routes>
 ${Object.entries(pages).map(([path, name]) => `<Route path="${path}" element={<${name}/>}/>`).join('')}
 </Routes></MemoryRouter></TooltipProvider></AuthProvider></QueryClientProvider></HelmetProvider></SeoPrerenderContext.Provider>);
 client.clear();
 if (!/<h1[ >]/.test(html)) throw new Error('No first-byte H1 for ' + route);
 return { meta, html: html.replace(/opacity:0(?=[;\"])/g, 'opacity:1') };
}`;
  await writeFile(resolve(dir, 'entry.tsx'), entry);
  const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' });
  await build({ configFile: false, logLevel: 'error', resolve: { alias: { '@': resolve('src') } }, define: loaded.config.define,
    esbuild: { jsx: 'automatic' }, build: { ssr: resolve(dir, 'entry.tsx'), outDir: resolve(dir, 'out'), emptyOutDir: true, rollupOptions: { output: { format: 'es', entryFileNames: 'entry.mjs' } } } });
  const render = (await import(pathToFileURL(resolve(dir, 'out/entry.mjs')).href)).render;
  return (route, zones) => Object.hasOwn(pages, route) || /^\/zoner\/zon-[3-8]$/.test(route) ? render(route, zones) : null;
}
