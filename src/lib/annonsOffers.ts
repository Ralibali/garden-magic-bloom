/** Disclosed Addrevenue offer for Odlingsdagboken /manad/maj only. */
export const DIN_TRADGARD_MAJ_ANNONS = {
  route: '/manad/maj',
  href: 'https://addrevenue.io/t?a=985743&c=3467735',
  disclosure: 'Annons',
  linkText: 'Se trädgårdsprodukter hos Din trädgård',
  rel: 'sponsored noopener noreferrer',
} as const;

export function isDinTradgardMajRoute(pathname: string): boolean {
  const path = String(pathname || '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return path === DIN_TRADGARD_MAJ_ANNONS.route;
}
