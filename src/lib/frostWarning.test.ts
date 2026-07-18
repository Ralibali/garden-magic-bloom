import { describe, expect, it } from 'vitest';
import { getFrostWarning } from './frostWarning';

const makeForecast = (mins: (number | null)[]) => ({
  daily: {
    time: ['2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24'],
    temperature_2m_min: mins,
  },
});

const today = new Date(2026, 3, 20); // måndag 20 april 2026

describe('frostWarning', () => {
  it('returnerar null utan prognosdata', () => {
    expect(getFrostWarning(null)).toBeNull();
    expect(getFrostWarning({})).toBeNull();
    expect(getFrostWarning({ daily: {} })).toBeNull();
  });

  it('returnerar null när alla nätter är milda', () => {
    expect(getFrostWarning(makeForecast([5, 8, 6, 7, 9]), today)).toBeNull();
  });

  it('varnar för frost i natt', () => {
    const w = getFrostWarning(makeForecast([-1, 5, 6]), today);
    expect(w).not.toBeNull();
    expect(w!.firstNight.severity).toBe('frost');
    expect(w!.firstNight.minTemp).toBe(-1);
    expect(w!.headline).toContain('i natt');
    expect(w!.headline).toContain('-1 °C');
  });

  it('varnar i förväg för frost om två dygn', () => {
    const w = getFrostWarning(makeForecast([6, 5, -2]), today);
    expect(w).not.toBeNull();
    expect(w!.firstNight.date).toBe('2026-04-22');
    expect(w!.headline).toContain('natten till onsdag');
  });

  it('klassar 1–2 °C som risk, inte frost', () => {
    const w = getFrostWarning(makeForecast([2, 5, 6]), today);
    expect(w).not.toBeNull();
    expect(w!.firstNight.severity).toBe('risk');
    expect(w!.headline).toContain('Kall natt');
  });

  it('räknar totala kalla nätter i prognosen', () => {
    const w = getFrostWarning(makeForecast([1, -1, 5]), today);
    expect(w!.totalColdNights).toBe(2);
  });

  it('tittar högst tre dygn framåt', () => {
    // Frost på dygn 4 ska inte ge varning
    expect(getFrostWarning(makeForecast([6, 6, 6, -3]), today)).toBeNull();
  });

  it('ger frost-råd även om första natten bara är risk', () => {
    const w = getFrostWarning(makeForecast([2, -1, 6]), today);
    // Det finns äkta frost i prognosen → frost-råd
    expect(w!.advice).toContain('fiberduk');
  });
});
