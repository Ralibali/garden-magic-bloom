/** Ungefärliga exempelorter per svensk odlingszon. Inte en officiell zonkarta. */

export const ZONE_PLACES: Array<{ zone: number; places: string[] }> = [
  { zone: 1, places: ['Malmö', 'Helsingborg', 'Ystad', 'Trelleborg'] },
  { zone: 2, places: ['Göteborg', 'Kalmar', 'Karlskrona', 'Halmstad', 'Växjö'] },
  { zone: 3, places: ['Stockholm', 'Linköping', 'Örebro', 'Norrköping'] },
  { zone: 4, places: ['Västerås', 'Gävle', 'Karlstad', 'Eskilstuna', 'Borlänge'] },
  { zone: 5, places: ['Falun', 'Sundsvall', 'Hudiksvall'] },
  { zone: 6, places: ['Östersund', 'Umeå', 'Härnösand', 'Sollefteå'] },
  { zone: 7, places: ['Luleå', 'Skellefteå', 'Piteå'] },
  { zone: 8, places: ['Kiruna', 'Gällivare', 'Jokkmokk', 'Arvidsjaur'] },
];

export function zoneForPlace(place: string): number | null {
  const needle = place.trim().toLowerCase();
  if (!needle) return null;
  for (const row of ZONE_PLACES) {
    if (row.places.some((item) => item.toLowerCase() === needle)) return row.zone;
  }
  return null;
}

export function placesForZone(zone: number): string[] {
  return ZONE_PLACES.find((row) => row.zone === zone)?.places ?? [];
}
