import { canonicalCuiOf } from './enterprise-cui'

/**
 * The mock-era public-enterprise pages (`/intreprinderi-publice`) were retired
 * in October 2026: they never read the live API, so every visit answered an
 * error. Both addresses moved for good: the front door to
 * `/public-enterprises`, an enterprise's profile to `/public-enterprises/$cui`.
 *
 * Only the site's own key (`lang`) goes along: the old pages' filters (`q`,
 * `county`, `status`, a profile's tab) mean nothing on either target.
 */
export function legacyPublicEnterpriseSearch(search: Readonly<Record<string, unknown>>): { readonly lang?: unknown } {
  return search.lang === undefined ? {} : { lang: search.lang }
}

/**
 * A CUI as an old link wrote it (`10020943`, `RO10020943`, `ro-010020943`) as
 * its canonical digits. Anything else goes on as written, for the enterprise
 * page to answer that it does not exist: `abc1` must not land on enterprise 1.
 */
export function legacyProfileCui(param: string): string {
  const digits = /^\s*(?:ro)?[-\s]?(\d+)\s*$/i.exec(param)?.[1]
  return (digits ? canonicalCuiOf(digits) : null) ?? param
}

/** The front door moved for good: a permanent redirect. */
export const LEGACY_FRONT_DOOR_REDIRECT = { statusCode: 301 } as const

/** A profile moved for good to the enterprise page: a permanent redirect too. */
export const LEGACY_PROFILE_REDIRECT = { statusCode: 301 } as const
