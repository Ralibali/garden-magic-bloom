/**
 * Frostvarning i förväg: skannar 5-dygnsprognosen efter kalla nätter
 * så att odlaren hinner agera innan det är för sent.
 */

export interface FrostNight {
  /** Datum för den kalla natten (YYYY-MM-DD) */
  date: string;
  /** Lägsta temperatur den natten */
  minTemp: number;
  /** 'frost' vid ≤0 °C, 'risk' vid ≤2 °C */
  severity: 'frost' | 'risk';
}

export interface FrostWarning {
  firstNight: FrostNight;
  /** Antal nätter med frost/risk inom prognosen */
  totalColdNights: number;
  /** Färdig svensk rubrik, t.ex. "Frost väntas natten till lördag" */
  headline: string;
  /** Rådgivande text */
  advice: string;
}

const DAY_NAMES = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];

function svenskDag(dateStr: string, today: Date): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - todayMid.getTime()) / 86_400_000);
  if (diffDays === 0) return 'i natt';
  if (diffDays === 1) return 'natten till ' + DAY_NAMES[date.getDay()];
  return `natten till ${DAY_NAMES[date.getDay()]}`;
}

/**
 * Hittar kommande frostnätter i en Open-Meteo-prognos.
 * Tittar på upp till 3 dygn framåt — längre än så är prognosen osäker
 * och varningen riskerar att bli brus.
 */
export function getFrostWarning(forecast: any, today: Date = new Date()): FrostWarning | null {
  const times: string[] | undefined = forecast?.daily?.time;
  const minTemps: number[] | undefined = forecast?.daily?.temperature_2m_min;
  if (!times?.length || !minTemps?.length) return null;

  const nights: FrostNight[] = [];
  const lookahead = Math.min(3, times.length);
  for (let i = 0; i < lookahead; i++) {
    const min = minTemps[i];
    if (typeof min !== 'number') continue;
    if (min <= 0) nights.push({ date: times[i], minTemp: min, severity: 'frost' });
    else if (min <= 2) nights.push({ date: times[i], minTemp: min, severity: 'risk' });
  }
  if (!nights.length) return null;

  const first = nights[0];
  const hasRealFrost = nights.some((n) => n.severity === 'frost');
  const tempText = `${Math.round(first.minTemp)} °C`;
  const when = svenskDag(first.date, today);

  return {
    firstNight: first,
    totalColdNights: nights.length,
    headline: hasRealFrost
      ? `Frost väntas ${when} (${tempText})`
      : `Kall natt väntas ${when} (${tempText})`,
    advice: hasRealFrost
      ? 'Täck frostkänsliga grödor med fiberduk, ta in krukväxter och skjut upp utplantering. Tomat, gurka, chili och basilika är extra känsliga.'
      : 'Det närmar sig frostgränsen. Håll fiberduk redo och vänta med att plantera ut känsliga plantor.',
  };
}
