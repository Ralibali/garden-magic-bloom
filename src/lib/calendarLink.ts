import { sowingMatrix } from '@/data/sowingMatrix';
import { guideSeasonYear } from '@/lib/sowingGuide';

export const growingMethods = ['Pallkrage', 'Växthus', 'Friland', 'Balkong', 'Krukor'];
export const raisedBedCrops = ['Rädisa', 'Sallat', 'Spenat', 'Dill'];

export interface CalendarPlan {
  type: 'sakalender';
  season: number;
  zone: string;
  method: string;
  crops: string[];
  varieties: Record<string, string>;
}

export function calendarChannel(raw: string | null): string | undefined {
  return raw && /^[a-z][a-z0-9-]{0,35}$/.test(raw) ? raw : undefined;
}

export function calendarLink(plan: CalendarPlan, channel = 'delning'): string {
  const encoded = new TextEncoder().encode(JSON.stringify(plan));
  const hash = btoa(String.fromCharCode(...encoded)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const url = new URL('/sakalender', 'https://odlingsdagboken.com');
  url.searchParams.set('via', calendarChannel(channel) ?? 'delning');
  url.hash = 'plan=' + hash;
  return url.href;
}

export function readCalendarLink(hash: string): CalendarPlan | null {
  const encoded = new URLSearchParams(hash.replace(/^#/, '')).get('plan');
  if (!encoded || encoded.length > 16384 || !/^[\w-]+$/.test(encoded)) return null;
  try {
    const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0));
    const plan = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (plan?.type !== 'sakalender' || !Array.isArray(plan.crops) || !growingMethods.includes(plan.method)) return null;
    if (!Number.isInteger(plan.season) || plan.season < 2000 || plan.season > 2100) return null;
    if (!['1','2','3','4','5','6','7','8','Vet inte'].includes(plan.zone)) return null;
    const names = new Set(sowingMatrix.map(c => c.name));
    const crops = [...new Set<string>(plan.crops.filter((c: unknown) => typeof c === 'string' && names.has(c)))];
    if (!crops.length) return null;
    const varieties: Record<string, string> = {};
    for (const crop of crops) {
      const variety = plan.varieties?.[crop];
      if (typeof variety === 'string' && variety.trim()) varieties[crop] = variety.trim().slice(0, 50);
    }
    return { type: 'sakalender', season: plan.season, zone: plan.zone, method: plan.method, crops, varieties };
  } catch {
    return null;
  }
}

export function calendarStartingPoint(params: URLSearchParams, hash: string) {
  const shared = readCalendarLink(hash);
  if (shared) return { plan: shared, showResult: true };
  const crops = params.getAll('crop').map(value =>
    sowingMatrix.find(c => c.name.toLocaleLowerCase('sv') === value.toLocaleLowerCase('sv'))?.name
  ).filter((crop): crop is string => Boolean(crop));
  const bed = params.get('mall') === 'pallkrage-120x80';
  const zone = params.get('zone') ?? '';
  const plan: CalendarPlan = { type: 'sakalender', season: guideSeasonYear(), zone: /^[1-8]$/.test(zone) ? zone : '3',
    method: 'Pallkrage', crops: crops.length ? [...new Set(crops)] : bed ? [...raisedBedCrops] : ['Tomat', 'Gurka', 'Morot', 'Sallat'], varieties: {} };
  return { plan, showResult: crops.length > 0 && !bed };
}
