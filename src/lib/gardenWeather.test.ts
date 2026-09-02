import { describe, expect, it, vi, afterEach } from 'vitest';
import { resolveGardenLocation, getGardenForecast } from './gardenWeather';

describe('resolveGardenLocation', () => {
  it('prefers saved approximate coordinates over the zone centroid', () => {
    const resolved = resolveGardenLocation(3, { lat: 59.12, lon: 18.05 });
    expect(resolved.location_source).toBe('saved');
    expect(resolved.lat).toBe(59.12);
    expect(resolved.lon).toBe(18.05);
  });

  it('falls back to the climate zone when coords are missing or invalid', () => {
    expect(resolveGardenLocation(3, null).location_source).toBe('zone');
    expect(resolveGardenLocation(3, { lat: 999, lon: 18 }).location_source).toBe('zone');
    expect(resolveGardenLocation(1, {}).lat).toBe(55.6);
  });
});

describe('getGardenForecast', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests Open-Meteo with the resolved point and never returns fake frost', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(String(url)).toContain('latitude=59.12');
      expect(String(url)).toContain('longitude=18.05');
      return {
        ok: true,
        json: async () => ({ daily: { temperature_2m_min: [8] } }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    const forecast = await getGardenForecast(3, { lat: 59.12, lon: 18.05 });
    expect(forecast.location_source).toBe('saved');
    expect(forecast.daily.temperature_2m_min[0]).toBe(8);
  });
});
