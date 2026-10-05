import { describe, expect, it } from 'vitest';
import { sowingMatrix } from '@/data/sowingMatrix';
import { buildFrostGuide, frostForPlace, frostGuideJsonLd, frostZoneRows } from '@/lib/frostGuide';
import { cropSlug as appSlug, POPULAR_CROP_NAMES } from '@/lib/guideRoutes';
import { relatedGuideCrops } from '@/lib/sowingGuide';
import { cropSlug as edgeSlug } from '../../supabase/functions/_shared/satiderRoutes';

describe('sista frost', () => {
  it('ger vecka, datum och frostfri säsong per zon', () => {
    const rows = frostZoneRows(2026);
    expect(rows).toHaveLength(8);
    expect(rows[2]).toMatchObject({ zone: 3, lastFrostWeek: 19, lastFrostDates: '4–10 maj', firstFrostWeek: 40, frostFreeWeeks: 21, plantOutWeek: 20 });
    expect(rows[0].lastFrostWeek).toBeLessThan(rows[7].lastFrostWeek);
  });

  it('hittar orter oavsett skiftläge och säger ifrån för okända', () => {
    expect(frostForPlace('umeå', 2026)).toMatchObject({ place: 'Umeå', zone: 6 });
    expect(frostForPlace('Atlantis', 2026)).toBeNull();
    expect(frostForPlace('  ', 2026)).toBeNull();
  });

  it('svarar på frågan för Stockholm, Skåne och fjällen', () => {
    const guide = buildFrostGuide(2026);
    expect(guide.h1).toBe('När är sista frosten 2026?');
    expect(guide.quickAnswer).toContain('runt vecka 19 (4–10 maj 2026)');
    expect(guide.quickAnswer).toContain('Malmö och Skåne (zon 1) brukar frosten släppa redan vecka 16');
    expect(guide.quickAnswer).toContain('Kiruna och fjällen (zon 8) får vänta till vecka 25');
    expect(guide.description.length).toBeLessThanOrEqual(160);
    expect(guide.places.length).toBeGreaterThan(30);
    expect(guide.faqs.every((f) => !/undefined|NaN/.test(f.answer))).toBe(true);
    expect(frostGuideJsonLd(guide).map((g) => g['@type'])).toEqual(['WebPage', 'FAQPage', 'BreadcrumbList']);
  });
});

describe('interna länkar till såtiderna', () => {
  it('hittar grödor i fritext, med hela ord och i ordning', () => {
    expect(relatedGuideCrops('Så lyckas du med tomater och gurkor i växthuset').map((c) => c.name)).toEqual(['Tomat', 'Gurka']);
    expect(relatedGuideCrops('Plantera vitlök i oktober').map((c) => c.name)).toEqual(['Vitlök']);
    expect(relatedGuideCrops('Förgro sättpotatis i mars').map((c) => c.name)).toEqual(['Potatis']);
    expect(relatedGuideCrops('Jord, gödsel och kompost')).toEqual([]);
    expect(relatedGuideCrops('tomat gurka morot squash dill', 3)).toHaveLength(3);
  });

  it('startsidans urval finns i såmatrisen och sluggarna är lika i app och edge', () => {
    for (const name of POPULAR_CROP_NAMES) expect(sowingMatrix.some((c) => c.name === name), name).toBe(true);
    for (const crop of sowingMatrix) expect(appSlug(crop.name)).toBe(edgeSlug(crop.name));
  });
});
