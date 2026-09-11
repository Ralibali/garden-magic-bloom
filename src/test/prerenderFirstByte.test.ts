import { describe, expect, it } from 'vitest';
import {
  HOMEPAGE_CANONICAL,
  HOMEPAGE_H1,
  HOMEPAGE_TITLE,
  MONTH_SLUGS,
  REQUIRED_FIRST_BYTE_PAGES,
  REQUIRED_MANAD_FIRST_BYTE_PAGES,
  assertUniqueFirstByte,
  calendarMonthFirstByte,
  DIN_TRADGARD_MAJ_ANNONS,
  firstByteSignals,
  mergeRequiredPages,
  renderPage,
} from '../../scripts/prerender-lib.mjs';

const TEMPLATE = `<!doctype html>
<html lang="sv">
  <head>
    <title>Odlingsdagboken – digital odlingsdagbok för svenska odlare</title>
    <meta name="description" content="Håll koll på såtider, skördar och växtföljd." />
    <link rel="canonical" href="https://odlingsdagboken.com/" />
    <link rel="alternate" hreflang="sv-SE" href="https://odlingsdagboken.com/" />
    <link rel="alternate" hreflang="x-default" href="https://odlingsdagboken.com/" />
    <meta property="og:title" content="Odlingsdagboken" />
    <meta property="og:description" content="Planera sådd." />
    <meta property="og:url" content="https://odlingsdagboken.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="https://odlingsdagboken.com/og-image.png" />
    <meta property="og:image:alt" content="Odlingsdagboken" />
    <meta name="twitter:title" content="Odlingsdagboken" />
    <meta name="twitter:description" content="Planera sådd." />
    <meta name="twitter:image" content="https://odlingsdagboken.com/og-image.png" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

describe('prerender first-byte for rebuilt homepage shells', () => {
  it('keeps the complete stored HTML article and product link while stripping executable markup', () => {
    const html = renderPage(TEMPLATE, {
      route: '/blogg/overlamning', title: 'Överlämning', heading: 'Överlämning', description: 'Ingress',
      body: 'En kort ingress.',
      articleContent: `<h2>Förberedelser</h2><p>${'En viktig anteckning. '.repeat(100)}</p><h2>Sista avsnittet</h2><p>Slutkontroll: <a href="/login?mode=register" rel="sponsored">spara din logg</a>.</p><img src="/blog-images/spring-garden.jpg" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">fel</a>`,
    });
    expect(html).toContain('<h2>Sista avsnittet</h2>');
    expect(html).toContain('Slutkontroll:');
    expect(html).toContain('href="/login?mode=register" rel="sponsored"');
    expect(html).not.toContain('alert(1)');
    expect(html).not.toContain('onerror');
  });

  it('renders stored Markdown articles without clipping their last paragraph', () => {
    const html = renderPage(TEMPLATE, {
      route: '/blogg/markdown', title: 'Planera', heading: 'Planera', description: 'Ingress',
      articleContent: `# Planera\n\n${'Anteckningar om odlingen. '.repeat(100)}\n\n## Nästa steg\n\n[Öppna dagboken](/login)`,
    });
    expect(html).toContain('<h2>Nästa steg</h2>');
    expect(html).toContain('<a href="/login">Öppna dagboken</a>');
    expect((html.match(/<h1>/g) || []).length).toBe(1);
  });

  it('rebuilds only the two leftover shells — no new thin URLs', () => {
    expect(REQUIRED_FIRST_BYTE_PAGES.map((page) => page.route)).toEqual([
      '/funktioner',
      '/hur-det-fungerar',
    ]);
  });

  it('fills the two shells when they are missing from the page list', () => {
    const merged = mergeRequiredPages([{ route: '/', title: HOMEPAGE_TITLE, heading: HOMEPAGE_H1, description: 'x' }]);
    expect(merged.map((page) => page.route)).toEqual(expect.arrayContaining(['/funktioner', '/hur-det-fungerar']));
  });

  it('prerenders all 12 existing /manad/:slug URLs, not new paths', () => {
    expect(MONTH_SLUGS).toEqual([
      'januari', 'februari', 'mars', 'april', 'maj', 'juni',
      'juli', 'augusti', 'september', 'oktober', 'november', 'december',
    ]);
    expect(REQUIRED_MANAD_FIRST_BYTE_PAGES.map((page) => page.route)).toEqual(
      MONTH_SLUGS.map((slug) => `/manad/${slug}`),
    );
  });

  it('fills /manad/maj from published month content when CMS fetch is empty', () => {
    const merged = mergeRequiredPages([{ route: '/', title: HOMEPAGE_TITLE, heading: HOMEPAGE_H1, description: 'x' }]);
    const maj = merged.find((page) => page.route === '/manad/maj');
    expect(maj?.title).toMatch(/maj/i);
    expect(maj?.title).not.toBe(HOMEPAGE_TITLE);
    expect(maj?.heading).toBe('Odlingskalender för maj');
    expect(maj?.body).toMatch(/Maj är månaden/);
  });

  it('does not overwrite a live CMS row for /manad/maj', () => {
    const live = calendarMonthFirstByte({
      slug: 'maj',
      month_name: 'maj',
      intro: 'Live CMS intro for maj from seo_months.',
      created_at: '2026-04-20T21:10:46.016087+00:00',
      updated_at: '2026-04-21T10:14:41.906846+00:00',
    }, '/manad');
    const merged = mergeRequiredPages([live]);
    const maj = merged.find((page) => page.route === '/manad/maj');
    expect(maj?.body).toBe('Live CMS intro for maj from seo_months.');
  });

  it.each(REQUIRED_MANAD_FIRST_BYTE_PAGES)(
    'writes unique title, H1 and self-canonical for $route',
    (page) => {
      const html = renderPage(TEMPLATE, page);
      const signals = firstByteSignals(html);
      const month = page.route.replace('/manad/', '');
      expect(signals.title).toBe(page.title);
      expect(signals.title.toLowerCase()).toContain(month);
      expect(signals.title).not.toBe(HOMEPAGE_TITLE);
      expect(signals.h1).toBe(page.heading);
      expect(signals.h1.toLowerCase()).toContain(month);
      expect(signals.h1).not.toBe(HOMEPAGE_H1);
      expect(signals.canonical).toBe(`https://odlingsdagboken.com${page.route}`);
      expect(signals.canonical).not.toBe(HOMEPAGE_CANONICAL);
      expect(html).toContain(String(page.body).slice(0, 40));
      expect(html).not.toMatch(/adtraction|adrecord/i);
      if (page.route === '/manad/maj') {
        const bodyAt = html.indexOf(String(page.body).slice(0, 40));
        const ctaAt = html.indexOf(DIN_TRADGARD_MAJ_ANNONS.linkText);
        expect(html).toContain(`>${DIN_TRADGARD_MAJ_ANNONS.disclosure}<`);
        expect(html).toContain(DIN_TRADGARD_MAJ_ANNONS.disclosureLine);
        expect(html).toContain(DIN_TRADGARD_MAJ_ANNONS.linkText);
        expect(html).toContain(DIN_TRADGARD_MAJ_ANNONS.floor);
        expect(html).toContain('a=985743');
        expect(html).toContain('c=3467735');
        expect(html).toContain(`rel="${DIN_TRADGARD_MAJ_ANNONS.rel}"`);
        expect(ctaAt).toBeGreaterThan(bodyAt);
      } else {
        expect(html).not.toMatch(/affiliate/i);
        expect(html).not.toContain('addrevenue.io');
        expect(html).not.toContain('a=985743');
        expect(html).not.toContain(DIN_TRADGARD_MAJ_ANNONS.linkText);
      }
      expect(() => assertUniqueFirstByte(html, page)).not.toThrow();
    },
  );

  it('does not put the Din trädgård Annons on /odlingskalender/maj', () => {
    const html = renderPage(TEMPLATE, calendarMonthFirstByte({
      slug: 'maj',
      month_name: 'maj',
      intro: 'Maj är månaden då trädgården exploderar av liv.',
      created_at: '2026-04-20T21:10:46.016087+00:00',
      updated_at: '2026-04-21T10:14:41.906846+00:00',
    }, '/odlingskalender'));
    expect(firstByteSignals(html).canonical).toBe('https://odlingsdagboken.com/odlingskalender/maj');
    expect(html).not.toContain('addrevenue.io');
    expect(html).not.toContain('a=985743');
    expect(html).not.toContain(DIN_TRADGARD_MAJ_ANNONS.linkText);
  });

  it.each(REQUIRED_FIRST_BYTE_PAGES)(
    'writes unique title, H1 and canonical for $route',
    (page) => {
      const html = renderPage(TEMPLATE, page);
      const signals = firstByteSignals(html);
      expect(signals.title).toBe(page.title);
      expect(signals.title).not.toBe(HOMEPAGE_TITLE);
      expect(signals.h1).toBe(page.heading);
      expect(signals.h1).not.toBe(HOMEPAGE_H1);
      expect(signals.canonical).toBe(`https://odlingsdagboken.com${page.route}`);
      expect(signals.canonical).not.toBe(HOMEPAGE_CANONICAL);
      expect(html).toContain(page.body!.slice(0, 40));
      expect(() => assertUniqueFirstByte(html, page)).not.toThrow();
    },
  );

  it('rejects homepage collapse', () => {
    const collapsed = renderPage(TEMPLATE, {
      route: '/',
      title: HOMEPAGE_TITLE,
      heading: HOMEPAGE_H1,
      description: 'Planera sådd.',
    });
    expect(() =>
      assertUniqueFirstByte(collapsed, REQUIRED_FIRST_BYTE_PAGES[0]),
    ).toThrow(/collapsed to homepage/);
  });

  it('embeds plant CTA on /vaxter/:slug first-byte HTML', () => {
    const html = renderPage(TEMPLATE, {
      route: '/vaxter/morot',
      title: 'Odla Morot i Sverige – komplett guide | Odlingsdagboken',
      heading: 'Odla Morot i Sverige – komplett guide',
      description: 'Så odlar du morot.',
      body: 'Morot trivs i lucker jord.',
      plantName: 'Morot',
    });
    expect(html).toContain('Lägg till Morot i min odling');
    expect(html).toContain('data-cta="add-plant"');
    expect(html).toContain('crop=Morot');
    expect(html).toContain('__OD_PRERENDER__');
    expect(html).toContain('"plantName":"Morot"');
    expect(html).toContain('"slug":"morot"');
    expect(firstByteSignals(html).canonical).toBe('https://odlingsdagboken.com/vaxter/morot');
  });
});
