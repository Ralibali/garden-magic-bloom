// Module visibility based on user's gardening profile selection
// Categories: kokstradgard, krukvaxter, bar_frukt, blommor

export type GardenCategory = 'kokstradgard' | 'krukvaxter' | 'bar_frukt' | 'blommor';

export const GARDEN_CATEGORIES: { id: GardenCategory; label: string; emoji: string; description: string }[] = [
  { id: 'kokstradgard', label: 'Köksträdgård', emoji: '🥬', description: 'Grönsaker, örter och pallkragar' },
  { id: 'krukvaxter', label: 'Krukväxter & inomhus', emoji: '🪴', description: 'Inomhusväxter och fönsterbrädsodling' },
  { id: 'bar_frukt', label: 'Bär & frukt', emoji: '🍓', description: 'Bärbuskar, fruktträd och vindruvor' },
  { id: 'blommor', label: 'Blommor & perenner', emoji: '🌸', description: 'Prydnadsväxter, perenner och lökar' },
];

// Map routes to which categories they belong to
// Routes not listed here are always visible (Hem, Coach, Statistik, Premium, Inställningar, Admin)
const ROUTE_CATEGORIES: Record<string, GardenCategory[]> = {
  '/app/beds': ['kokstradgard', 'bar_frukt', 'blommor'],
  '/app/sowings': ['kokstradgard', 'bar_frukt', 'blommor'],
  '/app/harvests': ['kokstradgard', 'bar_frukt'],
  '/app/calendar': ['kokstradgard', 'bar_frukt'],
  '/app/rotation': ['kokstradgard'],
  '/app/seeds': ['kokstradgard', 'blommor', 'bar_frukt'],
  '/app/companion': ['kokstradgard'],
  '/app/pests': ['kokstradgard', 'bar_frukt', 'blommor'],
  '/app/my-plants': ['krukvaxter'],
  '/app/plants': ['kokstradgard', 'krukvaxter', 'bar_frukt', 'blommor'],
  '/app/photos': ['kokstradgard', 'krukvaxter', 'bar_frukt', 'blommor'],
  '/app/timeline': ['kokstradgard', 'bar_frukt', 'blommor'],
};

// Always-visible routes (never filtered out)
const ALWAYS_VISIBLE = ['/app', '/app/coach', '/app/statistics', '/app/premium', '/app/settings', '/app/admin'];

export function isRouteVisible(route: string, selectedCategories: GardenCategory[]): boolean {
  // If no categories selected, show everything (default)
  if (!selectedCategories.length) return true;
  // Always-visible routes
  if (ALWAYS_VISIBLE.includes(route)) return true;
  // If route has category mapping, check intersection
  const routeCategories = ROUTE_CATEGORIES[route];
  if (!routeCategories) return true; // unmapped routes are always visible
  return routeCategories.some(cat => selectedCategories.includes(cat));
}
