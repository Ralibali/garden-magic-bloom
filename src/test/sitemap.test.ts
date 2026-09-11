import { describe, expect, it } from 'vitest';
import { renderSitemap } from '../../scripts/sitemap.mjs';

describe('sitemap follows the published pages', () => {
  it('includes new articles, own images and real modification dates but excludes private pages and duplicates', () => {
    const result = renderSitemap([
      { route: '/' },
      { route: '/blogg/ny-artikel', image: '/blog-images/owned-archive/test.webp', modifiedTime: '2026-09-07T01:00:00Z' },
      { route: '/blogg/ny-artikel' },
      { route: '/login', noindex: true },
      { route: '/app', noindex: true },
    ]);
    expect(result).toContain('<loc>https://odlingsdagboken.com/blogg/ny-artikel</loc>');
    expect(result).toContain('<image:loc>https://odlingsdagboken.com/blog-images/owned-archive/test.webp</image:loc>');
    expect(result).toContain('<lastmod>2026-09-07T01:00:00.000Z</lastmod>');
    expect(result.match(/<url>/g)).toHaveLength(2);
    expect(result).not.toContain('/login');
    expect(result).not.toContain('/app');
  });

  it('lists existing /manad/:slug locs once those pages are prerendered', () => {
    const result = renderSitemap([
      { route: '/odlingskalender/maj', modifiedTime: '2026-04-21T10:14:41.906846+00:00' },
      { route: '/manad/maj', modifiedTime: '2026-04-21T10:14:41.906846+00:00' },
      { route: '/manad/januari', modifiedTime: '2026-04-20T21:09:00.02363+00:00' },
    ]);
    expect(result).toContain('<loc>https://odlingsdagboken.com/odlingskalender/maj</loc>');
    expect(result).toContain('<loc>https://odlingsdagboken.com/manad/maj</loc>');
    expect(result).toContain('<loc>https://odlingsdagboken.com/manad/januari</loc>');
  });

  it('encodes URLs and XML, omits unknown dates and rejects foreign canonical URLs', () => {
    const result = renderSitemap([{ route: '/blogg/tagg/frö & jord', modifiedTime: 'unknown' }]);
    expect(result).toContain('/blogg/tagg/fr%C3%B6%20&amp;%20jord');
    expect(result).not.toContain('<lastmod>');
    expect(() => renderSitemap([{ route: '//example.com/foreign' }])).toThrow(/must belong/);
  });
});
