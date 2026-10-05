import { describe, expect, it } from 'vitest';
import { sowingMatrix } from '@/data/sowingMatrix';
import {
  buildSowingGuide,
  buildSowingGuideIndex,
  buildZoneGuideEvents,
  buildZoneGuideIcs,
  cropSlug,
  GUIDE_CROPS,
  guideCropForName,
  guideCropForVaxt,
  guideSeasonYear,
  guideWindow,
  monthSpan,
  sowingGuideJsonLd,
  stepLabel,
  vaxtSlugFor,
  zoneCalendarLinks,
} from '@/lib/sowingGuide';
import { SATIDER_ROUTES } from '../../supabase/functions/_shared/satiderRoutes';

describe('såtidssidornas adresser', () => {
  it('ger stabila ASCII-sluggar', () => {
    expect(cropSlug('Rödbeta')).toBe('rodbeta');
    expect(cropSlug('Pak choi')).toBe('pak-choi');
    expect(cropSlug('Ärtor')).toBe('artor');
    expect(cropSlug('Jordärtskocka')).toBe('jordartskocka');
  });

  it('har en unik sida per gröda i såmatrisen', () => {
    expect(GUIDE_CROPS).toHaveLength(sowingMatrix.length);
    expect(new Set(GUIDE_CROPS.map((c) => c.slug)).size).toBe(sowingMatrix.length);
  });

  it('sitemap och llms.txt i edge functions listar exakt samma sidor som appen', () => {
    expect(SATIDER_ROUTES).toEqual(['/satider', ...GUIDE_CROPS.map((c) => `/satider/${c.slug}`)]);
  });

  it('hittar grödor från namn och från växtbibliotekets sluggar', () => {
    expect(guideCropForName('tomat')?.slug).toBe('tomat');
    expect(guideCropForName('Okänd')).toBeNull();
    const published = [{ slug: 'sallad', name: 'Sallad' }, { slug: 'tomat', name: 'Tomat' }, { slug: 'bona', name: 'Böna' }];
    expect(vaxtSlugFor('Sallat', published)).toBe('sallad');
    expect(vaxtSlugFor('Bönor', published)).toBe('bona');
    expect(vaxtSlugFor('Morot', published)).toBeNull();
    expect(guideCropForVaxt({ slug: 'sallad', name: 'Sallad' })?.name).toBe('Sallat');
    expect(guideCropForVaxt({ slug: 'fikon', name: 'Fikon' })).toBeNull();
  });
});

describe('datum och säsongsår', () => {
  it('räknar fönster till datum för rätt år', () => {
    const w = guideWindow(12, 14, 2026)!;
    expect(w).toMatchObject({ from: '2026-03-16', to: '2026-04-05', weeks: 'v.12–14', dates: '16 mars–5 apr' });
    expect(guideWindow(20, 20, 2026)).toMatchObject({ weeks: 'v.20', dates: '11–17 maj' });
    expect(guideWindow(null, 3, 2026)).toBeNull();
  });

  it('väljer månad efter veckans torsdag', () => {
    expect(monthSpan(guideWindow(27, 31, 2026)!)).toBe('juli');
    expect(monthSpan(guideWindow(32, 40, 2026)!)).toBe('augusti–oktober');
  });

  it('visar nästa års tider från november', () => {
    expect(guideSeasonYear(new Date(2026, 9, 31))).toBe(2026);
    expect(guideSeasonYear(new Date(2026, 10, 1))).toBe(2027);
  });
});

describe('buildSowingGuide', () => {
  it('svarar på frågan i rubriken för zon 3', () => {
    const guide = buildSowingGuide('tomat', 2026)!;
    expect(guide.h1).toBe('När ska man så tomater?');
    expect(guide.title).toBe('När ska man så tomater? Såtider 2026 för zon 1–8');
    expect(guide.quickAnswer).toContain('förodlar du tomater inomhus vecka 12–14 (16 mars–5 apr 2026)');
    expect(guide.quickAnswer).toContain('planterar ut plantorna vecka 20–22');
    expect(guide.quickAnswer).toContain('när frostrisken är över');
    expect(guide.quickAnswer).toContain('Skördetiden är normalt vecka 32–40 (augusti–oktober)');
    expect(guide.steps).toEqual(['forodla', 'planteraUt', 'skorda']);
    expect(guide.rows).toHaveLength(8);
    expect(guide.months.map((m) => m.name)).toEqual(['mars', 'april', 'maj']);
  });

  it('använder rätt verb per gröda', () => {
    expect(buildSowingGuide('potatis', 2026)!.h1).toBe('När ska man sätta potatis?');
    expect(buildSowingGuide('hallon', 2026)!.h1).toBe('När ska man plantera hallon?');
    expect(buildSowingGuide('morot', 2026)!.h1).toBe('När ska man så morötter?');
  });

  it('beskriver höstsatt vitlök som skördas året därpå, lika i hela landet', () => {
    const guide = buildSowingGuide('vitlok', 2026)!;
    expect(guide.quickAnswer).toContain('skördas året därpå');
    expect(guide.harvestNextYear).toBe(true);
    expect(guide.rows[2].steps.skorda?.from).toBe('2027-08-02');
    expect(stepLabel('Vitlök', 'skorda')).toBe('Skörd året därpå');
    expect(stepLabel('Tomat', 'skorda')).toBe('Skörd');
    expect(guide.faqs.find((f) => f.question === 'När kan man sätta vitlök?')?.answer).toMatch(/^Samma tid i hela landet: vecka 38–44/);
  });

  it('säger att perenner först ska etablera sig', () => {
    expect(buildSowingGuide('sparris', 2026)!.quickAnswer).toContain('När plantorna har etablerat sig');
  });

  it('flaggar grödor som bara rekommenderas skyddat längst i norr', () => {
    const guide = buildSowingGuide('chili', 2026)!;
    expect(guide.rows[7].protectedOnly).toBe(true);
    expect(guide.quickAnswer).toContain('Längst i norr rekommenderas chili främst i växthus');
    expect(guide.faqs.find((f) => f.question.includes('norra Sverige'))?.answer).toMatch(/^Ja, men i zon 7–8/);
  });

  it('svarar nej på direktsådd för grödor som måste förodlas', () => {
    const answer = buildSowingGuide('tomat', 2026)!.faqs.find((f) => f.question === 'Kan man så tomater direkt på friland?')?.answer;
    expect(answer).toMatch(/^Inte i svenskt klimat/);
  });

  it('ger unika, lagom långa titlar och beskrivningar för alla grödor', () => {
    const guides = GUIDE_CROPS.map((c) => buildSowingGuide(c.slug, 2026)!);
    expect(new Set(guides.map((g) => g.title)).size).toBe(guides.length);
    for (const g of guides) {
      expect(g.title.length, g.crop).toBeLessThanOrEqual(62);
      expect(g.description.length, g.crop).toBeLessThanOrEqual(160);
      expect(g.faqs.length, g.crop).toBeGreaterThanOrEqual(3);
      expect(g.quickAnswer, g.crop).toMatch(/^I zon 3 – till exempel Stockholm/);
      expect(g.quickAnswer, g.crop).not.toMatch(/och eller|undefined|null|NaN/);
      for (const faq of g.faqs) expect(faq.answer, `${g.crop}: ${faq.question}`).not.toMatch(/undefined|null|NaN/);
    }
  });

  it('returnerar null för okänd gröda', () => {
    expect(buildSowingGuide('fikon', 2026)).toBeNull();
    expect(buildSowingGuide(undefined, 2026)).toBeNull();
  });

  it('ger FAQ- och brödsmule-schema', () => {
    const graph = sowingGuideJsonLd(buildSowingGuide('morot', 2026)!);
    expect(graph.map((g) => g['@type'])).toEqual(['WebPage', 'FAQPage', 'BreadcrumbList']);
    const faq = graph[1] as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    expect(faq.mainEntity[0].name).toBe('När ska man så morötter i Stockholm?');
    expect(faq.mainEntity[0].acceptedAnswer.text).toMatch(/^Stockholm ligger i odlingszon 3\. Där sår du morötter/);
  });
});

describe('översikt och zonkalender', () => {
  it('grupperar alla grödor per kategori', () => {
    const groups = buildSowingGuideIndex(2026);
    expect(groups.reduce((n, g) => n + g.crops.length, 0)).toBe(sowingMatrix.length);
    expect(groups[0].title).toBe('Grönsaker');
    expect(groups[0].crops.find((c) => c.name === 'Tomat')?.summary).toBe('Förodla inomhus v.12–14 (16 mars–5 apr)');
  });

  it('gör en kalenderhändelse per vecka där något börjar', () => {
    const events = buildZoneGuideEvents(3, [2026]);
    const v12 = events.find((e) => e.id === 'guide:zon-3:2026:v12')!;
    expect(v12.date).toBe('2026-03-16');
    expect(v12.title).toMatch(/^Odling v\.12: förodla tomat/);
    expect(v12.detail).toContain('Förodla inomhus: tomat');
    expect(new Set(events.map((e) => e.id)).size).toBe(events.length);
    expect(events.length).toBeLessThan(53);
  });

  it('skriver en prenumererbar iCal-fil per zon', () => {
    const ics = buildZoneGuideIcs(3, [2026, 2027], new Date('2026-10-05T00:00:00Z'));
    expect(ics).toContain('X-WR-CALNAME:Såkalender zon 3 – Odlingsdagboken');
    expect(ics).toContain('REFRESH-INTERVAL;VALUE=DURATION:PT24H');
    expect(ics).toContain('UID:guide:zon-3:2027:v12@odlingsdagboken.com');
    expect(ics).not.toContain('BEGIN:VALARM');
    expect(zoneCalendarLinks(3)).toEqual({
      https: 'https://odlingsdagboken.com/kalender/sakalender-zon-3.ics',
      webcal: 'webcal://odlingsdagboken.com/kalender/sakalender-zon-3.ics',
      google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent('webcal://odlingsdagboken.com/kalender/sakalender-zon-3.ics')}`,
    });
  });
});
