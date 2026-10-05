// Såtidssidornas adresser för sitemap och llms.txt. Samma sluggregel som
// cropSlug i src/lib/sowingGuide.ts; src/test/satiderRoutes.test.ts håller dem lika.
import { sowingWeeks } from './sowingWeeks.ts';

export const SATIDER_PATH = '/satider';

export function cropSlug(name: string): string {
  return name.toLowerCase()
    .replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const SATIDER_CROPS: { name: string; route: string }[] = Object.keys(sowingWeeks).map((name) => ({
  name,
  route: `${SATIDER_PATH}/${cropSlug(name)}`,
}));

export const SATIDER_ROUTES: string[] = [SATIDER_PATH, ...SATIDER_CROPS.map((crop) => crop.route)];
