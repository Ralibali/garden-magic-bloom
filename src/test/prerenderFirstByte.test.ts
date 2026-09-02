import { describe, expect, it } from 'vitest';
import {
  HOMEPAGE_CANONICAL,
  HOMEPAGE_H1,
  HOMEPAGE_TITLE,
  REQUIRED_FIRST_BYTE_PAGES,
  assertUniqueFirstByte,
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
