/**
 * Shared helpers for programmatic SEO pages (växter, månader, zoner).
 * Keeps formatting identical across index/detail templates so the
 * generated HTML is consistent for crawlers and AI extractors.
 */

export const MONTH_NAMES_SV = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
] as const;

export const MONTH_NAMES_TITLE = MONTH_NAMES_SV.map(
  m => m.charAt(0).toUpperCase() + m.slice(1)
);

/** Format a month range like "mars–maj" or "december" (single month). */
export function formatMonthRange(start?: number | null, end?: number | null): string | null {
  if (!start || start < 1 || start > 12) return null;
  const startName = MONTH_NAMES_SV[start - 1];
  if (!end || end === start) return startName;
  if (end < 1 || end > 12) return startName;
  return `${startName}–${MONTH_NAMES_SV[end - 1]}`;
}

/** "tre" / "tre–fem" — used for soft Swedish copy (Odlingsdagboken style). */
export function rangeOrSingle(min?: number | null, max?: number | null, unit = ''): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${min}–${max}${unit ? ' ' + unit : ''}`;
  const v = min ?? max;
  return v != null ? `${v}${unit ? ' ' + unit : ''}` : null;
}

export const SEASON_LABEL: Record<string, string> = {
  vinter: 'Vinter',
  vår: 'Vår',
  sommar: 'Sommar',
  höst: 'Höst',
};

export const CATEGORY_LABEL: Record<string, string> = {
  grönsak: 'Grönsak',
  frukt: 'Frukt',
  bär: 'Bär',
  krydda: 'Krydda',
  blomma: 'Blomma',
  rotfrukt: 'Rotfrukt',
};

/** Build BreadcrumbList JSON-LD entries. Last item omits `item` per schema.org. */
export function buildBreadcrumbs(
  items: { name: string; url?: string }[]
) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.url ? { item: it.url } : {}),
    })),
  };
}

export const ORG_PUBLISHER = {
  '@type': 'Organization',
  name: 'Odlingsdagboken',
  url: 'https://odlingsdagboken.com',
  logo: { '@type': 'ImageObject', url: 'https://odlingsdagboken.com/favicon.svg' },
};

export const ORG_AUTHOR = {
  '@type': 'Organization',
  name: 'Aurora Media AB',
  url: 'https://odlingsdagboken.com',
  email: 'info@auroramedia.se',
};
