import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import {
  cleanPrivateCompanyDirectorySearch,
  parsePrivateCompanyDirectorySearch,
  privateCompanyDirectorySearchSchema,
  type PrivateCompanyDirectorySearchState,
} from '@/schemas/private-company-search'
import { urlSearchOfText, type CompanyAnalyticsSearch, type CompanyAnalyticsUrlSearch } from './company-analytics-url'
import { foldCountyName } from './county-names'

/**
 * Where an address of the retired company directory lands: `/companies/search`
 * (removed October 2026) and the `/companies?county=…` links from before it.
 *
 * - **Filters** open the companies analysis on the same selection. The
 *   directory matched its registry filters on the ONRC observations of one
 *   identifier in the pinned edition, which are the analysis's `onrc_*` keys,
 *   not its consensus ones (`judet`, `stare`). The legal form is the
 *   exception: the analysis filters only the edition's consensus form
 *   (`forma`), so a company whose entries disagree on it drops out. Each
 *   value goes over as it was written, so a value the analysis cannot read (a
 *   CAEN prefix shorter than four digits, a PFA outside its population) is
 *   named there as unread, not dropped in silence.
 * - **What the analysis cannot filter** — a recorded-date range, and a name
 *   beside other filters — goes over too, under keys the analysis names as
 *   not answered (`inregistrare`, `nume`: `UNANSWERED_KEYS`), so its wider
 *   answer is not taken for the bookmarked question. The order (`sort`)
 *   narrows nothing and is left behind.
 * - **A CUI alone** opens that company's page; beside filters it is the
 *   analysis's company filter.
 * - **A name alone**, or nothing the directory could read, opens the
 *   companies' front door, whose search box looks names up.
 *
 * The rest of the address (`lang`, the site's own keys) goes along.
 */

export type CompanyDirectoryRedirect =
  | { readonly to: '/companies/analytics'; readonly search: Record<string, unknown> & CompanyAnalyticsUrlSearch }
  | { readonly to: '/companies/$cui'; readonly params: { readonly cui: string }; readonly search: Record<string, unknown> }
  | { readonly to: '/companies'; readonly search: Record<string, unknown> }

/** The directory's own keys; the rest of an address is the site's. */
const DIRECTORY_KEYS = new Set(Object.keys(privateCompanyDirectorySearchSchema.shape))

/** A canonical CUI, `RO` prefix allowed: 2–10 digits, no leading zero (the analysis's company filter takes the same). */
const CUI_RE = /^[1-9]\d{1,9}$/u

const COUNTY_CODES = new Set<string>(ROMANIA_COUNTIES.map((county) => county.code))
const COUNTY_BY_NAME = new Map<string, string>(ROMANIA_COUNTIES.map((county) => [foldCountyName(county.nameRo), county.code]))

/**
 * A county as the analysis's `onrc_judet` takes it: its code. The directory
 * took a code or a registry name (`CLUJ`, `Timiş`, `MUNICIPIUL BUCUREŞTI`);
 * a name no county folds to is kept as written. The analysis names it as
 * unread unless it is shaped like a code (`NARNIA`), which, as in the
 * directory, matches no company.
 */
export function directoryCountyCode(value: string): string {
  const upper = value.trim().toUpperCase()
  if (COUNTY_CODES.has(upper)) return upper
  const name = foldCountyName(value).replace(/^(judetul|municipiul)\s+/u, '')
  return COUNTY_BY_NAME.get(name) ?? value.trim()
}

function joined(values: readonly string[] | undefined): string | undefined {
  return values && values.length > 0 ? values.join(',') : undefined
}

function flag(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : value ? 'da' : 'nu'
}

/** The analysis's keys for the directory's filters, a name aside: none when the address had no filter. */
function analysisFilters(legacy: Partial<PrivateCompanyDirectorySearchState>): CompanyAnalyticsSearch {
  const recorded = legacy.regFrom !== undefined || legacy.regTo !== undefined ? `${legacy.regFrom ?? ''}~${legacy.regTo ?? ''}` : undefined
  const entries: [keyof CompanyAnalyticsSearch, string | undefined][] = [
    ['onrc_judet', joined(legacy.county?.map(directoryCountyCode))],
    ['onrc_stare', joined(legacy.status)],
    ['onrc_caen', legacy.caen],
    ['onrc_caen_exact', joined(legacy.onrcCaen)],
    ['forma', joined(legacy.legalForm)],
    ['tva', flag(legacy.vat)],
    ['inactiv', flag(legacy.inactive)],
    ['inregistrare', recorded],
  ]
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined)) as CompanyAnalyticsSearch
}

/** Whether an address carries anything the directory read: a key of its own with a value it understood. */
export function hasDirectorySearch(search: Record<string, unknown>): boolean {
  return Object.keys(cleanPrivateCompanyDirectorySearch(parsePrivateCompanyDirectorySearch(search))).length > 0
}

export function companyDirectoryRedirect(search: Record<string, unknown>): CompanyDirectoryRedirect {
  const site = Object.fromEntries(Object.entries(search).filter(([key]) => !DIRECTORY_KEYS.has(key)))
  const legacy = cleanPrivateCompanyDirectorySearch(parsePrivateCompanyDirectorySearch(search))
  const typed = legacy.q
  const digits = typed?.replace(/^RO\s*/iu, '')
  const cui = digits !== undefined && CUI_RE.test(digits) ? digits : null
  const filters = analysisFilters(legacy)
  if (Object.keys(filters).length > 0) {
    const typedName = typed !== undefined && cui === null ? { nume: typed } : {}
    return { to: '/companies/analytics', search: { ...site, ...urlSearchOfText({ ...filters, ...(cui ? { cui } : typedName) }) } }
  }
  if (cui) return { to: '/companies/$cui', params: { cui }, search: site }
  return { to: '/companies', search: site }
}
