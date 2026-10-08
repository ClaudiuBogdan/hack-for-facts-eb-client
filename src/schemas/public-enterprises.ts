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

// --- /public-enterprises/authorities/$cui (an authority's portfolio) ------

/** The table's order: 2024 turnover, headcount, net result (the lowest first), name. */
export const PUBLIC_ENTERPRISE_PORTFOLIO_SORTS = ['cifra', 'salariati', 'rezultat', 'nume'] as const
export type PublicEnterprisePortfolioSort = (typeof PUBLIC_ENTERPRISE_PORTFOLIO_SORTS)[number]

/** Which rows by ANAF's list's word here: all, active, inactive, the rest (a blank cell, under another authority, none named, not in it, or the list unread). */
export const PUBLIC_ENTERPRISE_PORTFOLIO_FILTERS = ['toate', 'active', 'inactive', 'altele'] as const
export type PublicEnterprisePortfolioFilter = (typeof PUBLIC_ENTERPRISE_PORTFOLIO_FILTERS)[number]

export type PublicEnterprisePortfolioSearch = {
  readonly ordine?: PublicEnterprisePortfolioSort
  readonly lista?: PublicEnterprisePortfolioFilter
}

export const PUBLIC_ENTERPRISE_PORTFOLIO_DEFAULTS = { ordine: 'cifra', lista: 'toate' } as const satisfies Required<PublicEnterprisePortfolioSearch>

export const publicEnterprisePortfolioSearchSchema = z
  .object({
    ordine: choice(PUBLIC_ENTERPRISE_PORTFOLIO_SORTS, PUBLIC_ENTERPRISE_PORTFOLIO_DEFAULTS.ordine),
    lista: choice(PUBLIC_ENTERPRISE_PORTFOLIO_FILTERS, PUBLIC_ENTERPRISE_PORTFOLIO_DEFAULTS.lista),
  })
  .catch(() => ({ ordine: undefined, lista: undefined }))

/** Both keys come back, an unreadable or default one as `undefined` (the root keeps unknown keys; see the hub's parser). */
export function parsePublicEnterprisePortfolioSearch(search: Record<string, unknown>): PublicEnterprisePortfolioSearch {
  return publicEnterprisePortfolioSearchSchema.parse(search)
}

export function resolvePublicEnterprisePortfolioSearch(search: PublicEnterprisePortfolioSearch): Required<PublicEnterprisePortfolioSearch> {
  return {
    ordine: search.ordine ?? PUBLIC_ENTERPRISE_PORTFOLIO_DEFAULTS.ordine,
    lista: search.lista ?? PUBLIC_ENTERPRISE_PORTFOLIO_DEFAULTS.lista,
  }
}
