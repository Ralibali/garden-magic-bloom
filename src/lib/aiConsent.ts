export const AI_CONSENT_VERSION = '2026-09-08';
const key = (userId: string) => `od-ai-consent:${userId}`;
export function hasAiConsent(userId?: string) {
  if (!userId) return false;
  try { return localStorage.getItem(key(userId)) === AI_CONSENT_VERSION; } catch { return false; }
}
export function setAiConsent(userId: string, allowed: boolean) {
  if (allowed) localStorage.setItem(key(userId), AI_CONSENT_VERSION);
  else localStorage.removeItem(key(userId));
  window.dispatchEvent(new Event('ai-consent-change'));
}
export function requireAiConsent(userId?: string) {
  if (!hasAiConsent(userId)) throw new Error('Öppna Gro och välj om du vill dela uppgifter med AI innan du analyserar bilder.');
}
