const ORIGIN = 'https://odlingsdagboken.com';
const xml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

/** Use exactly the public pages written by this build, including new articles. */
export function renderSitemap(pages) {
  const seen = new Set();
  const entries = [];
  for (const page of pages) {
    if (page.noindex || seen.has(page.route)) continue;
    seen.add(page.route);
    const url = new URL(page.route, ORIGIN);
    if (url.origin !== ORIGIN) throw new Error(`Sitemap route must belong to ${ORIGIN}: ${page.route}`);
    const modified = page.modifiedTime || page.publishedTime;
    const lastmod = modified && Number.isFinite(Date.parse(modified))
      ? `<lastmod>${new Date(modified).toISOString()}</lastmod>` : '';
    const image = page.image
      ? `<image:image><image:loc>${xml(new URL(page.image, ORIGIN).href)}</image:loc></image:image>` : '';
    entries.push(`  <url><loc>${xml(url.href)}</loc>${lastmod}${image}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.join('\n')}\n</urlset>\n`;
}
