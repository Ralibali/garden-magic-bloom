import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'odlingszon';

function readStored(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 8 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Klimatzon som följer med mellan de publika verktygen.
 * Sparas i localStorage under "odlingszon" så att odlingskalendern,
 * såkalendern och odlingsplanen visar samma zon.
 */
export function useOdlingszon(fallback = 3) {
  const [zone, setZoneState] = useState<number>(() => readStored() ?? fallback);

  useEffect(() => {
    const stored = readStored();
    if (stored && stored !== zone) setZoneState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setZone = useCallback((next: number) => {
    const safe = Math.min(8, Math.max(1, Math.round(next)));
    setZoneState(safe);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(safe));
    } catch {}
  }, []);

  return { zone, setZone };
}

export const ODLINGSZON_STORAGE_KEY = STORAGE_KEY;
