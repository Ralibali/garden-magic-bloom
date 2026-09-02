export type PublicPlanType = 'sakalender' | 'odlingsplan' | 'odlingsakuten';

export interface ImportedPublicPlan {
  type: PublicPlanType;
  zone: number;
  method: string;
  crops: string[];
  raw: Record<string, unknown>;
}

const PUBLIC_PLAN_KEYS = [
  'odlingsdagboken_latest_public_plan',
  'odlingsdagboken_public_sakalender',
  'odlingsdagboken_public_odlingsplan',
] as const;

function normalizeZone(value: unknown): number {
  const zone = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(zone) && zone >= 1 && zone <= 8 ? zone : 3;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .filter(item => typeof item === 'string' || typeof item === 'number')
    .map(item => String(item).trim())
    .filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, 30);
}

export function parsePublicPlan(value: unknown): ImportedPublicPlan | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const type = raw.type;
  if (type !== 'sakalender' && type !== 'odlingsplan' && type !== 'odlingsakuten') return null;

  const crops = normalizeStringArray(
    raw.crops ?? raw.selectedCrops ?? raw.plants ?? (typeof raw.crop === 'string' ? [raw.crop] : []),
  );
  const method = String(raw.method ?? raw.growingMethod ?? raw.place ?? 'Pallkrage').trim() || 'Pallkrage';

  return {
    type,
    zone: normalizeZone(raw.zone ?? raw.climateZone),
    method,
    crops,
    raw,
  };
}

export function loadPublicPlan(): ImportedPublicPlan | null {
  if (typeof window === 'undefined') return null;

  for (const key of PUBLIC_PLAN_KEYS) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;
      const parsed = parsePublicPlan(JSON.parse(stored));
      if (parsed) return parsed;
    } catch {}
  }

  return null;
}

export function clearPublicPlan() {
  if (typeof window === 'undefined') return;
  for (const key of PUBLIC_PLAN_KEYS) localStorage.removeItem(key);
}
