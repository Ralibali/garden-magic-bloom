/** Safe post-login destinations. Only in-app paths are allowed. */

const DEFAULT_RETURN = '/app';

const ALLOWED_PREFIXES = [
  '/app',
  '/app/sowings',
  '/app/pests',
  '/app/calendar',
  '/app/my-plants',
  '/app/beds',
  '/app/gro',
];

export function safeAppReturnPath(value: string | null | undefined): string {
  if (!value) return DEFAULT_RETURN;
  const raw = value.trim();
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.includes('://')) {
    return DEFAULT_RETURN;
  }
  const path = raw.split(/[?#]/)[0];
  if (!path || path.includes('..')) return DEFAULT_RETURN;
  const allowed = ALLOWED_PREFIXES.some((prefix) => path === prefix || (prefix !== '/app' && path.startsWith(`${prefix}/`)) || path === '/app');
  if (path === '/app' || path.startsWith('/app/')) {
    if (allowed || /^\/app\/[a-z0-9/-]+$/i.test(path)) return path;
  }
  return DEFAULT_RETURN;
}

export function registerUrl(options: {
  source: string;
  returnTo?: string;
  crop?: string;
  zone?: number | string;
  symptom?: string;
}): string {
  const params = new URLSearchParams({ mode: 'register', source: options.source });
  if (options.returnTo) params.set('return', safeAppReturnPath(options.returnTo));
  if (options.crop) params.set('crop', options.crop.slice(0, 80));
  if (options.zone != null && options.zone !== '') params.set('zone', String(options.zone));
  if (options.symptom) params.set('symptom', options.symptom.slice(0, 80));
  return `/login?${params.toString()}`;
}
