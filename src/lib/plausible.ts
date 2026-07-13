/**
 * Plausible Analytics helper.
 *
 * The Plausible snippet in index.html loads and initialises the tracker exactly
 * once, and pa-*.js auto-tracks SPA pushState pageviews — we must never call
 * pageview manually here or it would double-count.
 *
 * We only send anonymous product-funnel events with LOW-CARDINALITY properties.
 * NEVER pass emails, names, free text, notes, coordinates, internal ids or
 * anything user-identifying — the type system below enforces this at the call
 * sites for the approved event catalogue.
 */

type PlausibleProperty = string | number | boolean | null | undefined;
type PlausibleProperties = Record<string, PlausibleProperty>;

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: { props?: Record<string, string | number | boolean> },
    ) => void;
  }
}

// ---- Typed event catalogue ---------------------------------------------------

type Plan = 'free' | 'plus';
type BillingInterval = 'yearly';
type CultivationType = 'direct' | 'indoor';
type LowCardSource =
  | 'landing'
  | 'blog'
  | 'pricing'
  | 'premium_page'
  | 'dashboard'
  | 'onboarding'
  | 'other';

export type TypedEvents = {
  'Signup Completed': { method: 'email'; confirmation_required: boolean };
  'Trial Started': { plan: Plan };
  'Premium Checkout Started': { plan: 'plus'; billing_interval: BillingInterval };
  'Premium Purchased': { plan: 'plus'; billing_interval: BillingInterval };
  'First Cultivation Logged': { cultivation_type: CultivationType };
};

// ---- Internals ---------------------------------------------------------------

const ADMIN_PATH_PREFIXES = ['/app/admin', '/admin'];

function isAdminContext(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname || '';
  return ADMIN_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function sanitizeProperties(properties: PlausibleProperties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) =>
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
    ),
  ) as Record<string, string | number | boolean>;
}

function send(eventName: string, properties: PlausibleProperties) {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') return;
  if (isAdminContext()) return;
  try {
    window.plausible(eventName, { props: sanitizeProperties(properties) });
  } catch (error) {
    console.warn('[plausible]', eventName, error);
  }
}

// ---- Public API --------------------------------------------------------------

/**
 * Type-safe tracker for the approved product-funnel events. Prefer this over
 * `plausibleEvent` for anything in the funnel — it prevents accidental leaks
 * of PII or high-cardinality values.
 */
export function track<E extends keyof TypedEvents>(eventName: E, properties: TypedEvents[E]): void {
  send(eventName, properties as PlausibleProperties);
}

const ONCE_KEY_PREFIX = 'odb_plausible_once:';

/** Fire a typed event at most once per browser (localStorage-scoped). */
export function trackOnce<E extends keyof TypedEvents>(
  eventName: E,
  properties: TypedEvents[E],
  dedupeKey: string,
): void {
  try {
    const key = `${ONCE_KEY_PREFIX}${dedupeKey}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
  } catch {
    // storage unavailable → still fire once per session best-effort
  }
  track(eventName, properties);
}

/**
 * Legacy free-form event emitter for existing callers (CTA clicks, form
 * viewed, etc). Keep property values low-cardinality and NEVER personal.
 */
export function plausibleEvent(eventName: string, properties: PlausibleProperties = {}) {
  send(eventName, properties);
}
