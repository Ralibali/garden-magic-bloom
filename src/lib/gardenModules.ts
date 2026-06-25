// Module visibility based on the gardening profile selected during onboarding.
export type GardenCategory = 'kokstradgard' | 'krukvaxter' | 'bar_frukt' | 'blommor';

export const GARDEN_CATEGORIES: { id: GardenCategory; label: string; emoji: string; description: string }[] = [
  { id: 'kokstradgard', label: 'Köksträdgård', emoji: '🥬', description: 'Grönsaker, örter och pallkragar' },
  { id: 'krukvaxter', label: 'Krukväxter & inomhus', emoji: '🪴', description: 'Inomhusväxter och fönsterbrädsodling' },
  { id: 'bar_frukt', label: 'Bär & frukt', emoji: '🍓', description: 'Bärbuskar, fruktträd och vindruvor' },
  { id: 'blommor', label: 'Blommor & perenner', emoji: '🌸', description: 'Prydnadsväxter, perenner och lökar' },
];

const ROUTE_CATEGORIES: Record<string, GardenCategory[]> = {
  '/app/beds': ['kokstradgard', 'bar_frukt', 'blommor'],
  '/app/sowings': ['kokstradgard', 'bar_frukt', 'blommor'],
  '/app/harvests': ['kokstradgard', 'bar_frukt'],
  '/app/calendar': ['kokstradgard', 'bar_frukt', 'blommor'],
  '/app/rotation': ['kokstradgard'],
  '/app/seeds': ['kokstradgard', 'blommor', 'bar_frukt'],
  '/app/companion': ['kokstradgard'],
  '/app/pests': ['kokstradgard', 'bar_frukt', 'blommor'],
  '/app/my-plants': ['krukvaxter'],
  '/app/plants': ['kokstradgard', 'krukvaxter', 'bar_frukt', 'blommor'],
  '/app/photos': ['kokstradgard', 'krukvaxter', 'bar_frukt', 'blommor'],
  '/app/timeline': ['kokstradgard', 'bar_frukt', 'blommor'],
};

const ALWAYS_VISIBLE = [
  '/app',
  '/app/gro',
  '/app/reminders',
  '/app/statistics',
  '/app/premium',
  '/app/settings',
  '/app/admin',
];

export function isRouteVisible(route: string, selectedCategories: GardenCategory[]): boolean {
  if (!selectedCategories.length) return true;
  if (ALWAYS_VISIBLE.includes(route)) return true;
  const routeCategories = ROUTE_CATEGORIES[route];
  if (!routeCategories) return true;
  return routeCategories.some((category) => selectedCategories.includes(category));
}
