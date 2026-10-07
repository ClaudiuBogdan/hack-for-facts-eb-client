import { z } from 'zod'

// --- /public-enterprises (the hub) --------------------------------------

/** Whose enterprises the head ranks: the state's, the county councils', the localities'. */
export const PUBLIC_ENTERPRISE_AUTHORITY_GROUPS = ['stat', 'judete', 'local'] as const
export type PublicEnterpriseAuthorityGroup = (typeof PUBLIC_ENTERPRISE_AUTHORITY_GROUPS)[number]

/** Which enterprises a count takes: all, the local authorities', the state's. */
export const PUBLIC_ENTERPRISE_POPULATIONS = ['toate', 'locale', 'centrale'] as const
export type PublicEnterprisePopulation = (typeof PUBLIC_ENTERPRISE_POPULATIONS)[number]

/** What the size band ranks by: turnover, headcount, loss. */
export const PUBLIC_ENTERPRISE_SIZE_MEASURES = ['cifra', 'salariati', 'pierdere'] as const
export type PublicEnterpriseSizeMeasure = (typeof PUBLIC_ENTERPRISE_SIZE_MEASURES)[number]

export type PublicEnterpriseHubSearch = {
  readonly autoritati?: PublicEnterpriseAuthorityGroup
  readonly judete?: PublicEnterprisePopulation
  readonly domenii?: PublicEnterprisePopulation
  readonly marime?: PublicEnterpriseSizeMeasure
}

export const PUBLIC_ENTERPRISE_HUB_DEFAULTS = {
  autoritati: 'stat',
  judete: 'toate',
  domenii: 'toate',
  marime: 'cifra',
} as const satisfies Required<PublicEnterpriseHubSearch>

/** An unknown or retired value falls back to the default instead of failing the page; a default stays out of the address. */
const choice = <T extends readonly [string, ...string[]]>(values: T, fallback: T[number]) =>
  z
    .enum(values)
    .optional()
    .catch(undefined)
    .transform((value) => (value === fallback ? undefined : value))

export const publicEnterpriseHubSearchSchema = z
  .object({
    autoritati: choice(PUBLIC_ENTERPRISE_AUTHORITY_GROUPS, PUBLIC_ENTERPRISE_HUB_DEFAULTS.autoritati),
    judete: choice(PUBLIC_ENTERPRISE_POPULATIONS, PUBLIC_ENTERPRISE_HUB_DEFAULTS.judete),
    domenii: choice(PUBLIC_ENTERPRISE_POPULATIONS, PUBLIC_ENTERPRISE_HUB_DEFAULTS.domenii),
    marime: choice(PUBLIC_ENTERPRISE_SIZE_MEASURES, PUBLIC_ENTERPRISE_HUB_DEFAULTS.marime),
  })
  .catch(() => ({ autoritati: undefined, judete: undefined, domenii: undefined, marime: undefined }))

/**
 * Every key comes back, an unreadable or default one as `undefined`: the
 * root route keeps unknown keys, and a child's search is merged over its
 * parent's, so a key left out would keep the raw value the address carried.
 */
export function parsePublicEnterpriseHubSearch(search: Record<string, unknown>): PublicEnterpriseHubSearch {
  return publicEnterpriseHubSearchSchema.parse(search)
}

/** The hub's choices, a missing one its default. */
export function resolvePublicEnterpriseHubSearch(search: PublicEnterpriseHubSearch): Required<PublicEnterpriseHubSearch> {
  return {
    autoritati: search.autoritati ?? PUBLIC_ENTERPRISE_HUB_DEFAULTS.autoritati,
    judete: search.judete ?? PUBLIC_ENTERPRISE_HUB_DEFAULTS.judete,
    domenii: search.domenii ?? PUBLIC_ENTERPRISE_HUB_DEFAULTS.domenii,
    marime: search.marime ?? PUBLIC_ENTERPRISE_HUB_DEFAULTS.marime,
  }
}
