/**
 * Ren logik för fröns bäst-före-status — utan externa beroenden (testbar).
 */

export type ExpiryStatus = 'expired' | 'soon' | 'ok' | 'none';

/** Kontrollerar om ett bäst-före-datum är passerat eller nära (default 90 dagar). */
export function getExpiryStatus(expiryDate: string | null | undefined, soonDays = 90, today: Date = new Date()): ExpiryStatus {
  if (!expiryDate) return 'none';
  const date = new Date(`${String(expiryDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'none';
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((date.getTime() - todayMid.getTime()) / 86_400_000);
  if (diffDays < 0) return 'expired';
  if (diffDays <= soonDays) return 'soon';
  return 'ok';
}

export const EXPIRY_LABELS: Record<ExpiryStatus, string> = {
  expired: 'Utgånget',
  soon: 'Går ut snart',
  ok: 'Färskt',
  none: '',
};
