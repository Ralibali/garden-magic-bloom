import { describe, expect, it } from 'vitest';
import { findCropForVariety, getHarvestHint, isoWeek } from './harvestForecast';
import { sowingMatrix } from '@/data/sowingMatrix';

describe('harvestForecast', () => {
  it('matchar sortnamn mot basgrödor', () => {
    expect(findCropForVariety('Tomat – Sungold')).toBe('Tomat');
    expect(findCropForVariety('Sungold')).toBe('Tomat');
    expect(findCropForVariety('morot napoli')).toBe('Morot');
    expect(findCropForVariety('Jordgubbar – Mara des Bois')).toBe('Jordgubbar');
    expect(findCropForVariety('Okänd växt XYZ')).toBeNull();
    expect(findCropForVariety('')).toBeNull();
    expect(findCropForVariety(null)).toBeNull();
  });

  it('räknar ISO-veckor korrekt', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1); // 1 jan 2026
    expect(isoWeek(new Date(2026, 6, 18))).toBe(29); // 18 juli 2026
    expect(isoWeek(new Date(2026, 11, 28))).toBe(53); // 28 dec 2026
  });

  it('returnerar null för grödor utanför matrisen', () => {
    expect(getHarvestHint('Plastblomma', 3)).toBeNull();
  });

  it('ger "now" när dagens vecka ligger i skördefönstret', () => {
    // Tomat zon 3: frost v.19 → skörd från clampEnd(3, 32) till 40
    const tomat = sowingMatrix.find((c) => c.name === 'Tomat')!;
    const timing = tomat.zones[3];
    // Välj ett datum mitt i fönstret: vecka harvestStart (om den är rimlig)
    const midWeek = Math.min(timing.harvestStart!, timing.harvestEnd!);
    // 2026-01-05 är måndag i vecka 2; vecka w börjar 5 jan + (w-2)*7 dagar
    const date = new Date(2026, 0, 5 + (midWeek - 2) * 7);
    const hint = getHarvestHint('Tomat – Sungold', 3, date);
    expect(hint).not.toBeNull();
    expect(hint!.kind).toBe('now');
    expect(hint!.shortLabel).toBe('Skördeläge nu');
  });

  it('ger "upcoming" före skördefönstret', () => {
    const hint = getHarvestHint('Tomat – Sungold', 3, new Date(2026, 2, 15)); // mitten av mars
    expect(hint).not.toBeNull();
    expect(hint!.kind).toBe('upcoming');
    expect(hint!.startWeek).toBeGreaterThan(0);
  });

  it('ger "past" efter skördefönstret', () => {
    const hint = getHarvestHint('Tomat – Sungold', 3, new Date(2026, 11, 15)); // december
    expect(hint).not.toBeNull();
    expect(hint!.kind).toBe('past');
  });

  it('ger null när grödan saknar skördefönster i zonen', () => {
    // Chili i zon 8 har harvestStart null enligt matrisen
    expect(getHarvestHint('Chili – Jalapeño', 8)).toBeNull();
  });
});
