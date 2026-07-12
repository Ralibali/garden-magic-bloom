type PlausibleProperty = string | number | boolean | null | undefined;
type PlausibleProperties = Record<string, PlausibleProperty>;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

function sanitizeProperties(properties: PlausibleProperties) {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) =>
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean',
    ),
  ) as Record<string, string | number | boolean>;
}

/**
 * Sends an anonymous product-funnel event to Plausible.
 * Never pass email addresses, names, free-text messages, or other personal data.
 */
export function plausibleEvent(eventName: string, properties: PlausibleProperties = {}) {
  if (typeof window === 'undefined' || typeof window.plausible !== 'function') return;

  try {
    window.plausible(eventName, { props: sanitizeProperties(properties) });
  } catch (error) {
    console.warn('[plausibleEvent]', eventName, error);
  }
}
