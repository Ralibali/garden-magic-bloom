// Granular cookie consent (GDPR / ePrivacy).
// Categories: necessary (always), analytics, marketing.
// Backward compatible with legacy `cookie-consent` = 'accepted' | 'declined'.

export type CookieCategory = 'necessary' | 'analytics' | 'marketing';

export interface CookieConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
  version: 2;
}

export const CONSENT_KEY = 'cookie-consent-v2';
export const LEGACY_KEY = 'cookie-consent';
export const CONSENT_EVENT = 'cookie-consent-change';

const DEFAULT: CookieConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  updatedAt: '',
  version: 2,
};

export function getConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT, ...parsed, necessary: true, version: 2 };
    }
    // Migrate legacy
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'accepted') {
      return { ...DEFAULT, analytics: true, marketing: true, updatedAt: new Date().toISOString() };
    }
    if (legacy === 'declined') {
      return { ...DEFAULT, updatedAt: new Date().toISOString() };
    }
    return null;
  } catch {
    return null;
  }
}

export function hasDecision(): boolean {
  return getConsent() !== null;
}

export function hasCategory(cat: CookieCategory): boolean {
  const c = getConsent();
  if (!c) return cat === 'necessary';
  return !!c[cat];
}

export function saveConsent(next: Partial<Omit<CookieConsentState, 'necessary' | 'version' | 'updatedAt'>>) {
  const current = getConsent() ?? DEFAULT;
  const state: CookieConsentState = {
    necessary: true,
    analytics: next.analytics ?? current.analytics,
    marketing: next.marketing ?? current.marketing,
    updatedAt: new Date().toISOString(),
    version: 2,
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    // Legacy mirror so existing analytics gates keep working
    const legacyValue = state.analytics ? 'accepted' : 'declined';
    localStorage.setItem(LEGACY_KEY, legacyValue);
    window.dispatchEvent(new StorageEvent('storage', { key: LEGACY_KEY, newValue: legacyValue }));
    window.dispatchEvent(new StorageEvent('storage', { key: CONSENT_KEY, newValue: JSON.stringify(state) }));
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
    if (state.marketing && typeof (window as any).loadGoogleAds === 'function') {
      (window as any).loadGoogleAds();
    }
  } catch {}
  return state;
}

export function acceptAll() {
  return saveConsent({ analytics: true, marketing: true });
}
export function rejectAll() {
  return saveConsent({ analytics: false, marketing: false });
}

export function openCookiePreferences() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('open-cookie-preferences'));
}
