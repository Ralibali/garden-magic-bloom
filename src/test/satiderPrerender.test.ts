// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertUniqueFirstByte, renderPage } from '../../scripts/prerender-lib.mjs';
import { renderSitemap } from '../../scripts/sitemap.mjs';
import { satiderPages } from '../../scripts/sowing-guide-pages.mjs';

const TEMPLATE = `<!doctype html><html lang="sv"><head><title>Odlingsdagboken – såkalender, odlingsplan och skördelogg</title>
<meta name="description" content="x" /><link rel="canonical" href="https://odlingsdagboken.com/" /></head><body><div id="root"></div></body></html>`;

describe('prerender av såtidssidorna', () => {
  it('skriver en unik, fullständig sida per gröda – utan databas', async () => {
    const pages = await satiderPages({}, new Date('2026-10-05T12:00:00Z'));
    expect(pages).toHaveLength(45);
    expect(new Set(pages.map((p) => p.route)).size).toBe(45);
    for (const page of pages) assertUniqueFirstByte(renderPage(TEMPLATE, page), page);
  });

  it('har svaret, tabellen, FAQ och interna länkar i första svaret', async () => {
    const pages = await satiderPages(
      { plants: [{ slug: 'tomat', name: 'Tomat' }], zones: [{ slug: 'zon-3' }] },
      new Date('2026-10-05T12:00:00Z'),
    );
    const html = renderPage(TEMPLATE, pages.find((p) => p.route === '/satider/tomat'));
    expect(html).toContain('<title>När ska man så tomater? Såtider 2026 för zon 1–8</title>');
    expect(html).toContain('<h1>När ska man så tomater?</h1>');
    expect(html).toContain('förodlar du tomater inomhus vecka 12–14');
    expect(html).toMatch(/<table>.*<th scope="row"><a href="\/zoner\/zon-3">Zon 3<\/a>/s);
    expect(html).toContain('<h3>Hur långt före sista frost ska man förodla tomater?</h3>');
    expect(html).toContain('href="/vaxter/tomat"');
    expect(html).toContain('href="/odlingskalender/mars"');
    expect(html).toContain('href="/satider/gurka"');
    expect(html).toContain('href="/login?mode=register&amp;source=satider&amp;return=%2Fapp%2Fcalendar&amp;crop=Tomat&amp;zone=3"');
    expect(html).toContain('webcal://odlingsdagboken.com/kalender/sakalender-zon-3.ics');
    expect(html).toContain('"@type":"FAQPage"');
    // Länkar till CMS-sidor som inte är publicerade ska inte finnas.
    const morot = renderPage(TEMPLATE, pages.find((p) => p.route === '/satider/morot'));
    expect(morot).not.toContain('href="/vaxter/');
  });

  it('kommer med i sitemapen', async () => {
    const xml = renderSitemap(await satiderPages({}, new Date('2026-10-05T12:00:00Z')));
    expect(xml).toContain('<loc>https://odlingsdagboken.com/satider</loc>');
    expect(xml).toContain('<loc>https://odlingsdagboken.com/satider/pak-choi</loc>');
  });
});

describe('prerender av frostsidan och interna länkar', async () => {
  const { frostPage, homeGuideLinksMarkup, loadSowingGuideLib, relatedSatiderMarkup } = await import('../../scripts/sowing-guide-pages.mjs');
  const lib = await loadSowingGuideLib();

  it('skriver frostsidan med svar, tabell, orter och FAQ', () => {
    const page = frostPage(lib, new Date('2026-10-05T12:00:00Z'));
    const html = renderPage(TEMPLATE, page);
    assertUniqueFirstByte(html, page);
    expect(html).toContain('<h1>När är sista frosten 2026?</h1>');
    expect(html).toContain('Umeå (zon 6): vecka 23');
    expect(html).toContain('<h3>När är sista frosten i Stockholm?</h3>');
    expect(html).toContain('href="/satider/tomat"');
  });

  it('ger startsidan länkar till de mest sökta såtiderna i första svaret', () => {
    const html = renderPage(TEMPLATE, { route: '/', title: 'Odlingsdagboken', heading: 'Hem', description: 'Intro', contentHtml: homeGuideLinksMarkup(lib, 'Intro') });
    expect(html).toContain('<a href="/satider/potatis">När ska man sätta potatis?</a>');
    expect(html).toContain('<a href="/sista-frost">');
  });

  it('länkar blogginlägg till såtiderna för grödorna de handlar om', () => {
    const page = { route: '/blogg/tomater', title: 'Tomater', heading: 'Odla tomater i växthus', description: 'x', articleContent: '<p>Text</p>', afterContentHtml: relatedSatiderMarkup(lib, 'Odla tomater i växthus tomat') };
    expect(renderPage(TEMPLATE, page)).toContain('<a href="/satider/tomat">När ska man så tomater?</a>');
    expect(relatedSatiderMarkup(lib, 'Kompostera rätt')).toBe('');
  });
});
