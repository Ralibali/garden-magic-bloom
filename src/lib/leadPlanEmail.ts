export type PublicLeadSource = 'sakalender' | 'odlingsplan' | 'odlingsakuten';

const allowedSources = new Set<PublicLeadSource>(['sakalender', 'odlingsplan', 'odlingsakuten']);

export function normalizeLeadEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPublicLeadSource(source: string): source is PublicLeadSource {
  return allowedSources.has(source as PublicLeadSource);
}

export function isPlanWithinEmailLimit(plan: unknown, maxBytes = 8192): boolean {
  try {
    return new TextEncoder().encode(JSON.stringify(plan ?? {})).byteLength <= maxBytes;
  } catch {
    return false;
  }
}
