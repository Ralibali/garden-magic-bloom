import { describe, it, expect } from 'vitest';
import { extractHeadings, injectHeadingIds, slugify, sortRelatedPosts, pickContextualCta } from '@/lib/blogArticle';

describe('slugify', () => {
  it('hanterar svenska tecken deterministiskt', () => {
    expect(slugify('Så här odlar du tomater')).toBe('sa-har-odlar-du-tomater');
    expect(slugify('Växtföljd & rotation')).toBe('vaxtfoljd-rotation');
  });
});

describe('extractHeadings', () => {
  it('plockar ut H2 och H3 med unika id:n', () => {
    const html = '<h2>Sådd</h2><p>a</p><h3>Jord</h3><h2>Sådd</h2>';
    const h = extractHeadings(html);
    expect(h).toHaveLength(3);
    expect(h[0]).toMatchObject({ level: 2, id: 'sadd' });
    expect(h[1]).toMatchObject({ level: 3, id: 'jord' });
    expect(h[2].id).toBe('sadd-2'); // dedup
  });

  it('ignorerar HTML inuti rubriker', () => {
    expect(extractHeadings('<h2><strong>Så mår tomaten</strong></h2>')[0].text).toBe('Så mår tomaten');
  });
});

describe('injectHeadingIds', () => {
  it('lägger till id på H2/H3 utan att röra annan markup', () => {
    const html = '<h2>Sådd</h2><p><em>a</em></p><h3>Jord</h3>';
    const headings = extractHeadings(html);
    const out = injectHeadingIds(html, headings);
    expect(out).toContain('<h2 id="sadd">');
    expect(out).toContain('<h3 id="jord">');
    expect(out).toContain('<p><em>a</em></p>');
  });
});

describe('sortRelatedPosts', () => {
  const posts = [
    { id: '1', slug: 'a', title: 'A', category: 'guide', tags: ['tomat'], published_at: '2026-01-01' },
    { id: '2', slug: 'b', title: 'B', category: 'tips', tags: ['tomat', 'sadd'], published_at: '2026-06-01' },
    { id: '3', slug: 'c', title: 'C', category: 'guide', tags: ['gurka'], published_at: '2025-01-01' },
    { id: '4', slug: 'current', title: 'X', category: 'guide', tags: ['tomat'], published_at: '2026-05-01' },
  ];
  it('exkluderar aktuell artikel och sorterar efter kategori+tag-överlapp', () => {
    const related = sortRelatedPosts(posts, { slug: 'current', category: 'guide', tags: ['tomat'] });
    expect(related.map((p) => p.slug)).not.toContain('current');
    expect(related[0].slug).toBe('a'); // guide + tomat -> 3p
    expect(related[1].slug).toBe('c'); // guide only -> 2p (nyare kategoriträff)
    expect(related[2].slug).toBe('b'); // tomat only -> 1p
  });
});

describe('pickContextualCta', () => {
  it('växlar CTA per ämne', () => {
    expect(pickContextualCta({ category: 'guide', tags: ['sådd'] }).buttonLabel).toMatch(/sådd/i);
    expect(pickContextualCta({ category: 'tips', tags: ['skörd'] }).buttonLabel).toMatch(/skörd/i);
    expect(pickContextualCta({ category: 'guide', tags: ['krukväxter'] }).buttonLabel).toMatch(/växtpuls/i);
    expect(pickContextualCta({ category: 'annat', tags: [] }).buttonLabel).toBe('Skapa gratis konto');
  });
});
