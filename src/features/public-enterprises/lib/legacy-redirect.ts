/**
 * The mock-era public-enterprise pages (`/intreprinderi-publice`) were retired
 * in October 2026: they never read the live API, so every visit answered an
 * error. Until the redesigned public-enterprise pages ship, an old link lands
 * on the company pages, which hold every public enterprise.
 *
 * Only the site's own key (`lang`) goes along. The old listing's filters
 * (`q`, `county`, `status`…) meant nothing on `/companies` and would trip its
 * own redirect to the directory.
 */
export function legacyPublicEnterpriseSearch(search: Readonly<Record<string, unknown>>): { readonly lang?: unknown } {
  return search.lang === undefined ? {} : { lang: search.lang }
}

/**
 * A CUI as an old link wrote it (`10020943`, `RO10020943`, `ro-10020943`) as
 * its digits. Anything else goes on as written, for the company page to answer
 * that it does not exist: `abc1` must not land on company 1.
 */
export function legacyProfileCui(param: string): string {
  return /^\s*(?:ro)?[-\s]?(\d+)\s*$/i.exec(param)?.[1] ?? param
}

/**
 * Temporary, not permanent: the target changes when the new pages are
 * promoted. A redirect skips the routes' own headers, so it says itself that
 * no browser, proxy or CDN may keep it.
 */
export const LEGACY_PUBLIC_ENTERPRISE_REDIRECT = {
  statusCode: 302,
  headers: { 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' },
} as const
