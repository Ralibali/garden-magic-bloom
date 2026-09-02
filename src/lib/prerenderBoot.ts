export type PrerenderBoot = {
  route?: string;
  heading?: string;
  plantName?: string | null;
  slug?: string | null;
  publishId?: string | null;
};

declare global {
  interface Window {
    __OD_PRERENDER__?: PrerenderBoot;
  }
}

export function readPrerenderBoot(): PrerenderBoot | null {
  if (typeof window === 'undefined') return null;
  const boot = window.__OD_PRERENDER__;
  return boot && typeof boot === 'object' ? boot : null;
}

/** Crop name that must stay visible after createRoot replaces first-byte HTML. */
export function plantCtaCrop(
  plant: { name?: string | null } | null | undefined,
  boot: PrerenderBoot | null,
  slug?: string,
): string | undefined {
  if (plant?.name) return plant.name;
  if (boot?.plantName && (!slug || !boot.slug || boot.slug === slug)) return boot.plantName;
  return undefined;
}
