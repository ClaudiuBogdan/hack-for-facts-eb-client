import { linkSearchOf, SEARCH_KEYS, type AnalyticsUrlSearch } from './analytics-model'

/**
 * The old explorer's address keys (`/procurement/search`, `/procurement?view=…`),
 * and what the procurement routes check and translate with them before
 * redirecting an old link; the translation of an explorer question itself
 * needs the explorer's schema and stays in `analytics-legacy.ts`. Written out rather than read off `procurementHubSearchSchema.shape`:
 * the route tree, which every page loads, checks them, and reading them off the
 * schema built the whole explorer schema on every page (docs/route-contracts.md).
 * A test keeps the list equal to the schema's keys.
 */
export const EXPLORER_SEARCH_KEYS = [
  'view',
  'vbasis',
  'tab',
  'grain',
  'measure',
  'mapGrain',
  'mapParty',
  'rankDim',
  'cpvLevel',
  'rankBy',
  'rankPage',
  'rankPageSize',
  'q',
  'qmode',
  'authority_cui',
  'supplier_cui',
  'cpv',
  'cpv_division',
  'cpv_group',
  'cpv_class',
  'cpv_category',
  'source',
  'status',
  'value_state',
  'record_kind',
  'county',
  'region',
  'year',
  'dateFrom',
  'dateTo',
  'period',
  'buyerRegion',
  'buyerCounty',
  'buyerSiruta',
  'supplierRegion',
  'supplierCounty',
  'supplierSiruta',
  'valueMin',
  'valueMax',
  'signal',
  'sort',
  'page',
  'pageSize',
  'from',
  'highlight',
] as const

/** The explorer's keys, and its legacy `tab`. */
export const EXPLORER_KEYS: ReadonlySet<string> = new Set([...EXPLORER_SEARCH_KEYS, 'tab'])

/**
 * A link carries an explorer question: one of its keys, and none of the
 * analytics page's own (`cpv` is both pages' key, and means the same code) —
 * an analytics address with a stray key (`page=2`) is answered as it is.
 */
export function isExplorerSearch(raw: Readonly<Record<string, unknown>>): boolean {
  const keys = Object.keys(raw)
  if (keys.some((key) => key !== 'cpv' && SEARCH_KEYS.includes(key))) return false
  return keys.some((key) => EXPLORER_KEYS.has(key) && !SEARCH_KEYS.includes(key))
}

/** A CPV code in an old category address: two to eight digits, or the eight with their check digit. */
export function cpvCodeParam(code: string): string | null {
  const match = /^(\d{2,8})(?:-\d)?$/u.exec(code)
  if (!match || (code.includes('-') && match[1]!.length !== 8)) return null
  return match[1]!
}

/**
 * The address's keys that are neither the page's nor the explorer's —
 * `lang`, the site's currency, a campaign's tags — which a change of
 * question keeps. An explorer key left in it (`page=2`) would make the next
 * address read as an explorer question once the page's own keys are all
 * defaults, and redirect it.
 */
export function siteSearchOf<S extends Readonly<Record<string, unknown>>>(search: S): Partial<S> {
  // Only keys are dropped: what is left is the address's own, as its type says.
  return Object.fromEntries(Object.entries(search).filter(([key]) => !SEARCH_KEYS.includes(key) && !EXPLORER_KEYS.has(key))) as Partial<S>
}

export function categoryRedirectSearch(raw: Readonly<Record<string, unknown>>, code: string): AnalyticsUrlSearch {
  // What the link carried goes as the router parsed it (the root route validates its own keys again on arrival).
  return { ...siteSearchOf(raw), ...linkSearchOf({ cpv: code }) } as AnalyticsUrlSearch
}
