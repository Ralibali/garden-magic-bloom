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

describe('prerender first-byte for existing article/month URLs', () => {
  it('keeps the published URL set — no new routes', () => {
    expect(REQUIRED_FIRST_BYTE_PAGES.map((page) => page.route)).toEqual([
      '/blogg/hostodling-gronsaker-guide',
      '/odlingskalender/augusti',
    ]);
  });

  it('fills in the existing article and August calendar when dynamic fetch is empty', () => {
    const merged = mergeRequiredPages([{ route: '/', title: HOMEPAGE_TITLE, heading: HOMEPAGE_H1, description: 'x' }]);
    expect(merged.map((page) => page.route)).toContain('/blogg/hostodling-gronsaker-guide');
    expect(merged.map((page) => page.route)).toContain('/odlingskalender/augusti');
  });

  it('does not overwrite a live CMS row for the same existing slug', () => {
    const live = {
      route: '/blogg/hostodling-gronsaker-guide',
      title: 'Höstodling – grönsaker du kan odla sent på säsongen',
      heading: 'Höstodling – grönsaker du kan så sent på säsongen',
      description: 'Live excerpt from CMS',
    };
    const merged = mergeRequiredPages([live]);
    const article = merged.find((page) => page.route === '/blogg/hostodling-gronsaker-guide');
    expect(article?.description).toBe('Live excerpt from CMS');
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
      expect(() => assertUniqueFirstByte(html, page)).not.toThrow();
    },
  );

  it('compares first-byte title after HTML entity encoding', () => {
    const page = {
      route: '/blogg/example',
      title: 'Pallkrage Storlek & Djup',
      heading: 'Pallkrage Storlek & Djup',
      description: 'Guide.',
    };
    const html = renderPage(TEMPLATE, page);
    expect(html).toContain('<title>Pallkrage Storlek &amp; Djup</title>');
    expect(firstByteSignals(html).title).toBe('Pallkrage Storlek & Djup');
  });

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
});
