import { t } from '@lingui/core/macro'
import type { LegalSearchFilter } from '../api/legal-search-api'
import { LEGAL_DOMAIN_SLUGS } from './legal-domains'

/**
 * The search page's filters (owner, 25 November 2026): act type, status, years, domain, category and penalties,
 * each one the search engine expresses (measured on the dev API; `exclude` and the fiscal-impact filter are
 * refused there, so they are not offered). The issuer waits for one name per issuer in the data (LEG-N36A). The
 * search returns no counts per option (LEG-41A6), so the options carry none. Pure: the address, the adapter's
 * arguments and the act's name are worked out here, the page only draws them.
 */

/** The act types the filter accepts (the API's 18; `doc`, `codul` and `proiect` are not among them: LEG-PDYY). */
export const SEARCH_TYPES = ['lege', 'oug', 'og', 'hotarare', 'ordin', 'decizie', 'decret', 'norma', 'regulament', 'rectificare', 'metodologie', 'comunicat', 'procedura', 'acord', 'circulara', 'instructiuni', 'raport', 'unknown'] as const
export const SEARCH_STATUSES = ['in-vigoare', 'modificat', 'abrogat-partial', 'abrogat', 'suspendat', 'iesit-din-vigoare'] as const
/** The summaries' 13 categories: a different vocabulary from the act type, which it often repeats. */
export const SEARCH_CATEGORIES = ['lege', 'ordin', 'hotarare', 'hotarare-de-guvern', 'decizie', 'decret', 'norma-metodologica', 'regulament', 'ordonanta', 'ordonanta-de-urgenta', 'tratat', 'circulara', 'altele'] as const

/** The status choice: the server's default (without repealed acts), every act, or one status by name. */
export type SearchStatus = 'implicit' | 'toate' | (typeof SEARCH_STATUSES)[number]

export type SearchFilters = {
  readonly tip: readonly string[]
  readonly stare: SearchStatus
  readonly from: number | null
  readonly to: number | null
  readonly domeniu: readonly string[]
  readonly categorie: readonly string[]
  readonly sanctiuni: boolean
}

export const NO_SEARCH_FILTERS: SearchFilters = { tip: [], stare: 'implicit', from: null, to: null, domeniu: [], categorie: [], sanctiuni: false }

/** The years a filter takes (the API's own bounds). */
export const SEARCH_YEAR_MIN = 1800
export const SEARCH_YEAR_MAX = 2100

const text = (value: unknown): string => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '')
const listOf = (value: unknown, allowed: readonly string[]): string[] => [...new Set(text(value).split(',').filter((key) => allowed.includes(key)))].sort()
const year = (value: string): number | null => {
  if (!/^\d{4}$/u.test(value)) return null
  const n = Number(value)
  return n >= SEARCH_YEAR_MIN && n <= SEARCH_YEAR_MAX ? n : null
}

/** The address's filter keys, read: an unreadable key is no filter. `historical=true` (the old box) is „Toate". */
export function readSearchFilters(search: Record<string, unknown>): SearchFilters {
  const stare = text(search['stare'])
  const named = (SEARCH_STATUSES as readonly string[]).includes(stare) ? (stare as SearchStatus) : null
  // „2015", „2015-2024", „2015-" (from) or „-2010" (until)
  const an = /^(\d{4})?(-)?(\d{4})?$/u.exec(text(search['an']))
  let from = an?.[1] ? year(an[1]) : null
  let to = an ? (an[2] ? (an[3] ? year(an[3]) : null) : an[1] ? year(an[1]) : null) : null
  if (from !== null && to !== null && from > to) [from, to] = [to, from]
  return {
    tip: listOf(search['tip'], SEARCH_TYPES),
    stare: named ?? (search['historical'] === true ? 'toate' : 'implicit'),
    from,
    to,
    domeniu: listOf(search['domeniu'], LEGAL_DOMAIN_SLUGS),
    categorie: listOf(search['categorie'], SEARCH_CATEGORIES),
    sanctiuni: search['sanctiuni'] === true,
  }
}

/**
 * The filters as address keys, every key named (the router merges a child's search over the root's: a key left
 * out would stay). One spelling per state: „Toate" is `historical=true`; a status by name is `stare`.
 */
export function searchOfFilters(filters: SearchFilters): {
  readonly historical: true | undefined
  readonly stare: string | undefined
  readonly tip: string | undefined
  readonly an: string | undefined
  readonly domeniu: string | undefined
  readonly categorie: string | undefined
  readonly sanctiuni: true | undefined
} {
  const { from, to } = filters
  return {
    historical: filters.stare === 'toate' ? true : undefined,
    stare: filters.stare === 'implicit' || filters.stare === 'toate' ? undefined : filters.stare,
    tip: filters.tip.length > 0 ? [...filters.tip].sort().join(',') : undefined,
    an: from === null && to === null ? undefined : from === to ? String(from) : `${from ?? ''}-${to ?? ''}`,
    domeniu: filters.domeniu.length > 0 ? [...filters.domeniu].sort().join(',') : undefined,
    categorie: filters.categorie.length > 0 ? [...filters.categorie].sort().join(',') : undefined,
    sanctiuni: filters.sanctiuni ? true : undefined,
  }
}

/** The filters as the search adapter takes them, and whether repealed acts are searched (a named status: yes). */
export function searchArgs(filters: SearchFilters): { readonly filter: LegalSearchFilter; readonly historical: boolean } {
  const status = filters.stare === 'implicit' || filters.stare === 'toate' ? undefined : [filters.stare]
  return {
    historical: filters.stare !== 'implicit',
    filter: {
      ...(filters.tip.length > 0 && { actType: filters.tip }),
      ...(status && { status }),
      ...(filters.from !== null && { yearFrom: filters.from }),
      ...(filters.to !== null && { yearTo: filters.to }),
      ...(filters.domeniu.length > 0 && { domain: filters.domeniu }),
      ...(filters.categorie.length > 0 && { category: filters.categorie }),
      ...(filters.sanctiuni && { penaltiesMentioned: true }),
    },
  }
}

/**
 * The statuses the search keeps when „include istorice" is off: the server's `LEGAL_LIVE_STATUSES`
 * (`src/modules/legal/core/legal-engine-filter.ts`), copied so the act list with no term shows what the search shows.
 */
export const LIVE_STATUSES = ['in-vigoare', 'modificat', 'abrogat-partial', 'suspendat', 'necunoscut'] as const

/**
 * The filters as the act list takes them, when the search has filters and no term (owner, 27 November 2026). The act
 * list has no „include istorice" switch, so with no status chosen it is asked for the live statuses by name.
 */
export function browseFilter(filters: SearchFilters): LegalSearchFilter {
  const { filter } = searchArgs(filters)
  return filters.stare === 'implicit' ? { ...filter, status: [...LIVE_STATUSES] } : filter
}

/**
 * A link to the retired Acte page (`/legislation/acts?actType=&year=&domain=&status=`), read as the search's keys
 * (owner, 27 November 2026). The page showed the acts in force when it named no status, so a bare link asks for those;
 * `status=toate` was every act. A value the search does not take drops; the address's language goes along.
 */
export function searchOfActsDirectory(search: Record<string, unknown>): Record<string, string | true> {
  const status = search['status']
  // The old page's year was one year; the search's reader also takes ranges, so only four digits pass (Codex review).
  const oneYear = /^\d{4}$/u.test(text(search['year'])) ? search['year'] : undefined
  const filters = readSearchFilters({
    tip: search['actType'],
    an: oneYear,
    domeniu: search['domain'],
    ...(status === 'toate' ? { historical: true } : { stare: status === undefined ? 'in-vigoare' : status }),
  })
  const keys = Object.entries(searchOfFilters(filters)).filter((entry): entry is [string, string | true] => entry[1] !== undefined)
  const lang = search['lang']
  return { ...(typeof lang === 'string' ? { lang } : {}), ...Object.fromEntries(keys) }
}

/** Whether a filter read from the AI summaries is on: then acts without a summary are left out, and the page says so. */
export function usesSummaries(filters: SearchFilters): boolean {
  return filters.domeniu.length > 0 || filters.categorie.length > 0 || filters.sanctiuni
}

export function isSearchFiltered(filters: SearchFilters): boolean {
  return filters.tip.length > 0 || filters.stare !== 'implicit' || filters.from !== null || filters.to !== null || usesSummaries(filters)
}

/** How many filters are on: each type, domain and category chosen counts, as do the status, the years and penalties. */
export function activeFilterCount(filters: SearchFilters): number {
  return filters.tip.length + (filters.stare === 'implicit' ? 0 : 1) + (filters.from === null && filters.to === null ? 0 : 1) + filters.domeniu.length + filters.categorie.length + (filters.sanctiuni ? 1 : 0)
}

/** A range kept in order: a start after the end moves the end, as the analysis page's years do. */
export function withSearchYears(filters: SearchFilters, from: number | null, to: number | null): SearchFilters {
  if (from !== null && to !== null && from > to) return { ...filters, from, to: from }
  return { ...filters, from, to }
}

export function searchCategoryLabel(key: string): string {
  switch (key) {
    case 'lege':
      return t`Lege`
    case 'ordin':
      return t`Ordin`
    case 'hotarare':
      return t`Hotărâre`
    case 'hotarare-de-guvern':
      return t`Hotărâre de Guvern`
    case 'decizie':
      return t`Decizie`
    case 'decret':
      return t`Decret`
    case 'norma-metodologica':
      return t`Normă metodologică`
    case 'regulament':
      return t`Regulament`
    case 'ordonanta':
      return t`Ordonanță`
    case 'ordonanta-de-urgenta':
      return t`Ordonanță de urgență`
    case 'tratat':
      return t`Tratat`
    case 'circulara':
      return t`Circulară`
    default:
      return t`Altele`
  }
}

/** The API's citation for a `doc` act, which names nothing („Doc nr. 41627"; LEG-PDYY). */
const BARE_DOC = /^Doc nr\.\s/u

/** A word of capitals only (two letters or more), which the Portal uses for an act's kind at the head of its name. */
const CAPITALS = /^[\p{Lu}][\p{Lu}\p{M}'’-]+$/u

/**
 * The Portal's name in sentence case: the head of the name in capitals (its kind, „AMENDAMENTE", „COD DE ETICĂ")
 * lowered, the rest as written, so the acronyms and names after it keep their capitals („…al CNAS").
 */
export function portalNameCase(name: string): string {
  const words = name.trim().split(/(\s+)/u)
  let head = true
  const out = words.map((word) => {
    if (!head || /^\s+$/u.test(word)) return word
    if (CAPITALS.test(word)) return word.toLocaleLowerCase('ro')
    head = false
    return word
  })
  const joined = out.join('')
  return joined.charAt(0).toLocaleUpperCase('ro') + joined.slice(1)
}

/** How a search hit is named: its citation, or the Portal's name where the citation is a bare „Doc nr.". */
export function searchHitName(hit: { readonly act: { readonly displayCitation: string }; readonly name: string | null }): string {
  return BARE_DOC.test(hit.act.displayCitation) && hit.name ? portalNameCase(hit.name) : hit.act.displayCitation
}
