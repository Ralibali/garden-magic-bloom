/** Disclosed Addrevenue offer for Odlingsdagboken /manad/maj only. Copy is verbatim READY 2026-09-02. */
export const DIN_TRADGARD_MAJ_ANNONS = {
  route: '/manad/maj',
  href: 'https://addrevenue.io/t?a=985743&c=3467735',
  disclosure: 'Annons',
  disclosureLine: 'Affiliatelänkar till Din trädgård.',
  linkText: 'Nät, stöd och redskap i maj',
  floor: 'Annons. Länkarna går till Din trädgård och är affiliatelänkar. Odlingsdagboken kan få ersättning om du gör ett köp — utan extra kostnad för dig.',
  rel: 'sponsored noopener noreferrer',
} as const;

export function isDinTradgardMajRoute(pathname: string): boolean {
  const path = String(pathname || '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return path === DIN_TRADGARD_MAJ_ANNONS.route;
}
