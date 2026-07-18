import { describe, expect, it } from 'vitest';
import { analyzeUserSowings, findCompanionPlant, relationBetween } from './companionAnalysis';

describe('companionAnalysis', () => {
  it('matchar sortnamn mot samplanteringsväxter', () => {
    expect(findCompanionPlant('Tomat – Sungold')).toBe('Tomat');
    expect(findCompanionPlant('morot napoli')).toBe('Morot');
    expect(findCompanionPlant('Bönor – Borlotti')).toBe('Bönor');
    expect(findCompanionPlant('Okänd växt')).toBeNull();
    expect(findCompanionPlant(null)).toBeNull();
  });

  it('hittar relation i båda riktningarna', () => {
    expect(relationBetween('Tomat', 'Basilika')).toBe('good');
    expect(relationBetween('Basilika', 'Tomat')).toBe('good');
    expect(relationBetween('Lök', 'Bönor')).toBe('bad');
    expect(relationBetween('Bönor', 'Lök')).toBe('bad');
    expect(relationBetween('Tomat', 'Sallat')).toBeNull(); // neutral
  });

  it('hittar bra och dåliga par i användarens sådder', () => {
    const sowings = [
      { variety: 'Tomat – Sungold', bed_id: 'b1', beds: { name: 'Norra bädden' } },
      { variety: 'Basilika', bed_id: 'b1', beds: { name: 'Norra bädden' } },
      { variety: 'Lök – Stuttgarter', bed_id: 'b2', beds: { name: 'Södra bädden' } },
      { variety: 'Bönor', bed_id: 'b2', beds: { name: 'Södra bädden' } },
    ];
    const { good, bad } = analyzeUserSowings(sowings);
    // Tomat+Basilika (samma bädd) + Tomat+Lök (korsbädd — tomat tycker om lök)
    expect(good).toHaveLength(2);
    expect(good[0]).toMatchObject({ plantA: 'Tomat', plantB: 'Basilika', bedName: 'Norra bädden' }); // samma bädd först
    expect(good[1].bedName).toBeNull();
    expect(bad).toHaveLength(1);
    expect(bad[0]).toMatchObject({ plantA: 'Lök', plantB: 'Bönor', bedName: 'Södra bädden' });
  });

  it('markerar par utan gemensam bädd som bedName null', () => {
    const sowings = [
      { variety: 'Tomat', bed_id: 'b1', beds: { name: 'A' } },
      { variety: 'Basilika', bed_id: 'b2', beds: { name: 'B' } },
    ];
    const { good } = analyzeUserSowings(sowings);
    expect(good).toHaveLength(1);
    expect(good[0].bedName).toBeNull();
  });

  it('undviker dubletter och ignorerar omatchade sorter', () => {
    const sowings = [
      { variety: 'Tomat – Sungold', bed_id: 'b1' },
      { variety: 'Tomat – Moneymaker', bed_id: 'b1' }, // samma växt+bädd → ignoreras
      { variety: 'Basilika', bed_id: 'b1' },
      { variety: 'Gåsfötter X2000', bed_id: 'b1' }, // matchar inte tabellen
    ];
    const { good, bad } = analyzeUserSowings(sowings);
    expect(good).toHaveLength(1);
    expect(bad).toHaveLength(0);
  });

  it('returnerar tomma listor utan matchande sådder', () => {
    expect(analyzeUserSowings([])).toEqual({ good: [], bad: [] });
    expect(analyzeUserSowings([{ variety: 'X', bed_id: null }])).toEqual({ good: [], bad: [] });
  });
});
