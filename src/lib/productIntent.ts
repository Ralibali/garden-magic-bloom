import { registerUrl, safeAppReturnPath } from '@/lib/authReturn';

const ODLINGSZON_STORAGE_KEY = 'odlingszon';

export const PRODUCT_INTENT_KEY = 'odlingsdagboken_product_intent';

export type ProductIntent =
  | { kind: 'add-plant'; crop: string; slug?: string; returnTo: '/app/sowings' }
  | { kind: 'personalize-zone'; zone: number; place?: string; returnTo: '/app/calendar' }
  | { kind: 'save-problem'; crop: string; symptom: string; place?: string; moisture?: string; coldNights?: string; advice?: Array<{ title: string; text: string }>; returnTo: '/app/pests' };

function isIntent(value: unknown): value is ProductIntent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const raw = value as Record<string, unknown>;
  if (raw.kind === 'add-plant' && typeof raw.crop === 'string' && raw.crop.trim()) {
    return true;
  }
  if (raw.kind === 'personalize-zone' && Number.isFinite(Number(raw.zone))) {
    return true;
  }
  if (raw.kind === 'save-problem' && typeof raw.crop === 'string' && typeof raw.symptom === 'string') {
    return true;
  }
  return false;
}

export function saveProductIntent(intent: ProductIntent): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRODUCT_INTENT_KEY, JSON.stringify(intent));
    if (intent.kind === 'personalize-zone') {
      localStorage.setItem(ODLINGSZON_STORAGE_KEY, String(intent.zone));
    }
    if (intent.kind === 'add-plant' || intent.kind === 'save-problem' || intent.kind === 'personalize-zone') {
      const plan = intentToPublicPlan(intent);
      localStorage.setItem('odlingsdagboken_latest_public_plan', JSON.stringify(plan));
    }
  } catch {
    /* storage may be unavailable */
  }
}

export function loadProductIntent(): ProductIntent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PRODUCT_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isIntent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearProductIntent(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PRODUCT_INTENT_KEY);
  } catch {
    /* noop */
  }
}

export function intentToPublicPlan(intent: ProductIntent): Record<string, unknown> {
  if (intent.kind === 'add-plant') {
    return {
      type: 'sakalender',
      crops: [intent.crop],
      crop: intent.crop,
      slug: intent.slug,
      method: 'Pallkrage',
      createdAt: new Date().toISOString(),
    };
  }
  if (intent.kind === 'personalize-zone') {
    return {
      type: 'sakalender',
      zone: intent.zone,
      place: intent.place,
      method: 'Pallkrage',
      crops: [],
      createdAt: new Date().toISOString(),
    };
  }
  return {
    type: 'odlingsakuten',
    crop: intent.crop,
    crops: [intent.crop],
    symptom: intent.symptom,
    place: intent.place,
    moisture: intent.moisture,
    coldNights: intent.coldNights,
    advice: intent.advice,
    createdAt: new Date().toISOString(),
  };
}

export function registerUrlForIntent(intent: ProductIntent): string {
  if (intent.kind === 'add-plant') {
    return registerUrl({ source: 'vaxt', returnTo: intent.returnTo, crop: intent.crop });
  }
  if (intent.kind === 'personalize-zone') {
    return registerUrl({ source: 'zon', returnTo: intent.returnTo, zone: intent.zone });
  }
  return registerUrl({
    source: 'odlingsakuten',
    returnTo: intent.returnTo,
    crop: intent.crop,
    symptom: intent.symptom,
  });
}

export function navigationForIntent(intent: ProductIntent): { path: string; state: Record<string, unknown> } {
  if (intent.kind === 'add-plant') {
    return {
      path: '/app/sowings',
      state: { prefill: { variety: intent.crop }, prefillCrop: intent.crop },
    };
  }
  if (intent.kind === 'personalize-zone') {
    return { path: '/app/calendar', state: { zone: intent.zone, place: intent.place } };
  }
  const notes = [
    intent.crop ? `Växt: ${intent.crop}` : '',
    intent.place ? `Plats: ${intent.place}` : '',
    intent.moisture ? `Jord: ${intent.moisture}` : '',
    intent.coldNights && intent.coldNights !== 'Vet ej' ? `Kalla nätter: ${intent.coldNights}` : '',
    Array.isArray(intent.advice) && intent.advice.length
      ? `Första bedömning: ${intent.advice.map((item) => item.title).join(', ')}`
      : '',
  ].filter(Boolean).join('. ');
  return {
    path: '/app/pests',
    state: {
      prefill: {
        pest_name: intent.symptom,
        notes,
        crop: intent.crop,
      },
    },
  };
}

export function consumeIntentNavigation(): { path: string; state: Record<string, unknown> } | null {
  const intent = loadProductIntent();
  if (!intent) return null;
  clearProductIntent();
  return navigationForIntent(intent);
}

export function destinationFromSearch(
  search: URLSearchParams,
  stored = loadProductIntent(),
): { path: string; state?: Record<string, unknown> } {
  const returnTo = safeAppReturnPath(search.get('return'));
  const crop = (search.get('crop') || (stored?.kind === 'add-plant' || stored?.kind === 'save-problem' ? stored.crop : '') || '').trim();
  const symptom = (search.get('symptom') || (stored?.kind === 'save-problem' ? stored.symptom : '') || '').trim();
  const zoneRaw = search.get('zone');
  const zone = zoneRaw ? Number.parseInt(zoneRaw, 10) : stored?.kind === 'personalize-zone' ? stored.zone : NaN;

  if (stored) {
    const fromStored = navigationForIntent(stored);
    if (returnTo !== '/app') fromStored.path = returnTo;
    return fromStored;
  }

  if (returnTo === '/app/sowings' && crop) {
    return { path: returnTo, state: { prefill: { variety: crop }, prefillCrop: crop } };
  }
  if (returnTo === '/app/pests' && (symptom || crop)) {
    return {
      path: returnTo,
      state: {
        prefill: {
          pest_name: symptom || 'Odlingssymtom',
          notes: crop ? `Växt: ${crop}` : '',
          crop,
        },
      },
    };
  }
  if (returnTo === '/app/calendar' && Number.isFinite(zone)) {
    return { path: returnTo, state: { zone } };
  }
  return { path: returnTo };
}
