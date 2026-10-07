/**
 * The mock-era public-enterprise pages (`/intreprinderi-publice`) were retired
 * in October 2026: they never read the live API, so every visit answered an
 * error. The front door's address moved for good to `/public-enterprises`;
 * an enterprise's old profile lands on its company page until the redesigned
 * enterprise page ships.
 *
 * Only the site's own key (`lang`) goes along: the old pages' filters (`q`,
 * `county`, `status`, a profile's tab) mean nothing on either target.
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

/** The front door moved for good: a permanent redirect. */
export const LEGACY_FRONT_DOOR_REDIRECT = { statusCode: 301 } as const

/**
 * A profile's target changes when the enterprise page ships: temporary, and a
 * redirect skips the routes' own headers, so it says itself that no browser,
 * proxy or CDN may keep it.
 */
export const LEGACY_PROFILE_REDIRECT = {
  statusCode: 302,
  headers: { 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' },
} as const
