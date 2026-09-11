import { describe, expect, it } from 'vitest';
import { DIN_TRADGARD_MAJ_ANNONS, isDinTradgardMajRoute } from '@/lib/annonsOffers';
import { DIN_TRADGARD_MAJ_ANNONS as prerenderOffer } from '../../scripts/prerender-lib.mjs';

describe('Din trädgård Annons on /manad/maj', () => {
  it('keeps the approved Addrevenue ids and READY 2026-09-02 copy', () => {
    expect(DIN_TRADGARD_MAJ_ANNONS.href).toBe('https://addrevenue.io/t?a=985743&c=3467735');
    expect(DIN_TRADGARD_MAJ_ANNONS.disclosure).toBe('Annons');
    expect(DIN_TRADGARD_MAJ_ANNONS.disclosureLine).toBe('Affiliatelänkar till Din trädgård.');
    expect(DIN_TRADGARD_MAJ_ANNONS.linkText).toBe('Nät, stöd och redskap i maj');
    expect(DIN_TRADGARD_MAJ_ANNONS.floor).toBe(
      'Annons. Länkarna går till Din trädgård och är affiliatelänkar. Odlingsdagboken kan få ersättning om du gör ett köp — utan extra kostnad för dig.',
    );
    expect(DIN_TRADGARD_MAJ_ANNONS.rel).toBe('sponsored noopener noreferrer');
    expect(DIN_TRADGARD_MAJ_ANNONS).toEqual(prerenderOffer);
  });

  it('is only true for the /manad/maj route', () => {
    expect(isDinTradgardMajRoute('/manad/maj')).toBe(true);
    expect(isDinTradgardMajRoute('/manad/maj/')).toBe(true);
    expect(isDinTradgardMajRoute('/manad/maj?utm=1')).toBe(true);
    expect(isDinTradgardMajRoute('/odlingskalender/maj')).toBe(false);
    expect(isDinTradgardMajRoute('/manad/april')).toBe(false);
    expect(isDinTradgardMajRoute('/manad')).toBe(false);
    expect(isDinTradgardMajRoute('/')).toBe(false);
  });
});
