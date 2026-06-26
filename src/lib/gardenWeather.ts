function coordinatesForZone(zone: number | null | undefined) {
  switch (zone) {
    case 1: return { lat: 55.60, lon: 13.00, label: 'Malmöregionen' };
    case 2: return { lat: 57.71, lon: 11.97, label: 'Göteborgsregionen' };
    case 3: return { lat: 58.41, lon: 15.62, label: 'Mellansverige' };
    case 4: return { lat: 60.67, lon: 15.63, label: 'Dalarna' };
    case 5: return { lat: 62.39, lon: 17.31, label: 'Södra Norrland' };
    case 6: return { lat: 63.83, lon: 20.26, label: 'Västerbotten' };
    case 7: return { lat: 65.58, lon: 17.54, label: 'Inre Norrland' };
    case 8: return { lat: 67.86, lon: 20.22, label: 'Fjäll- och nordområde' };
    default: return { lat: 58.41, lon: 15.62, label: 'Mellansverige' };
  }
}

export async function getGardenForecast(climateZone?: number | null) {
  const { lat, lon, label } = coordinatesForZone(climateZone);
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'Europe/Stockholm',
    forecast_days: '5',
    current: 'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error('Kunde inte hämta väderprognosen');
  const data = await response.json();
  return { ...data, location_label: label, climate_zone: climateZone ?? 3 };
}

export function weatherDescription(code?: number) {
  if (code === 0) return 'Klart';
  if (code === 1 || code === 2) return 'Mest klart';
  if (code === 3) return 'Mulet';
  if (code === 45 || code === 48) return 'Dimma';
  if (code && code >= 51 && code <= 67) return 'Regn';
  if (code && code >= 71 && code <= 77) return 'Snö';
  if (code && code >= 80 && code <= 82) return 'Regnskurar';
  if (code && code >= 95) return 'Åska';
  return 'Växlande väder';
}
