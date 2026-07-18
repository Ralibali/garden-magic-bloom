import { describe, expect, it } from 'vitest';
import { buildSeasonSummary } from './seasonShare';

describe('seasonShare', () => {
  it('bygger en komplett säsongsrapport', () => {
    // Normalisera hårda mellanslag (svensk tusenavskiljare) till vanliga
    const text = buildSeasonSummary({
      year: 2026,
      totalGrams: 12400,
      harvestCount: 23,
      sowingsCount: 15,
      bedsCount: 3,
      topCrops: [
        { variety: 'Tomat', grams: 4200 },
        { variety: 'Gurka', grams: 3100 },
        { variety: 'Morot', grams: 2000 },
      ],
      valueSek: 1240,
      climateZone: 3,
    }).replace(/\u00a0/g, ' ');
    expect(text).toContain('Min odlingssäsong 2026');
    expect(text).toContain('12,4 kg');
    expect(text).toContain('23 tillfällen');
    expect(text).toContain('15 sådder i 3 bäddar');
    expect(text).toContain('Tomat 4,2 kg');
    expect(text).toContain('1 240 kr');
    expect(text).toContain('klimatzon 3');
    expect(text).toContain('odlingsdagboken.com');
  });

  it('hanterar singular korrekt', () => {
    const text = buildSeasonSummary({
      year: 2026,
      totalGrams: 500,
      harvestCount: 1,
      sowingsCount: 1,
      bedsCount: 1,
      topCrops: [{ variety: 'Rädisa', grams: 500 }],
    });
    expect(text).toContain('1 tillfälle');
    expect(text).toContain('1 sådd i 1 bädd');
  });

  it('hoppar över sektioner som saknar data', () => {
    const text = buildSeasonSummary({
      year: 2026,
      totalGrams: 0,
      harvestCount: 0,
      sowingsCount: 5,
      bedsCount: 2,
      topCrops: [],
    });
    expect(text).not.toContain('Skördat');
    expect(text).not.toContain('🏆');
    expect(text).toContain('5 sådder');
  });

  it('tar max tre toppgrödor och ignorerar nollvikt', () => {
    const text = buildSeasonSummary({
      year: 2026,
      totalGrams: 10000,
      harvestCount: 10,
      sowingsCount: 8,
      bedsCount: 2,
      topCrops: [
        { variety: 'A', grams: 5000 },
        { variety: 'B', grams: 3000 },
        { variety: 'C', grams: 2000 },
        { variety: 'D', grams: 1000 },
        { variety: 'E', grams: 0 },
      ],
    });
    expect(text).toContain('A 5 kg');
    expect(text).toContain('C 2 kg');
    expect(text).not.toContain('D ');
    expect(text).not.toContain('E ');
  });
});
