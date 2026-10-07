import { linkSearchOf, type AnalyticsUrlSearch } from './analytics-model'
import { DIRECT_COMPARABLE_FROM } from './home-model'
import type { ProfilePeriod } from './profile-period'

/** Where the front door's links and anchors point, as pure functions. */

export interface HomeSection {
  readonly id: string
  readonly label: string
}

/** `01 / Ce se cumpără`: a band's number follows its place in the pinned bar. */
export function sectionIndex(sections: readonly HomeSection[], id: string): string {
  const position = sections.findIndex((section) => section.id === id)
  return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
}

/**
 * A search hit's procurement page, read off its route: an institution
 * (`/entities/4305857`) or a state company (`/public-enterprises/16054368`, or
 * the retired `/intreprinderi-publice/…` an older index may hold; it buys under
 * the procurement law) opens its buyer page, a company
 * (`/companies/14399840`) its supplier page. Anything else keeps its own link
 * (null).
 */
export function procurementHrefOf(hit: { readonly href: string; readonly isExternal: boolean }): string | null {
  if (hit.isExternal) return null
  const match = /^\/(entities|public-enterprises|intreprinderi-publice|companies)\/(\d+)(?:[/?#]|$)/.exec(hit.href)
  if (!match?.[2]) return null
  return match[1] === 'companies' ? `/procurement/suppliers/${match[2]}` : `/procurement/institutions/${match[2]}`
}

/**
 * The analytics page's address for a question, as the page writes it: a
 * digits-only value travels bare, a value it cannot read is kept for the
 * page to say so (see `linkSearchOf`). `tip` is the population,
 * `dupa=inregistrari` its records.
 */
export function analyticsSearch(params: Readonly<Record<string, string | number | undefined>>): AnalyticsUrlSearch {
  const strings = Object.fromEntries(Object.entries(params).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])))
  return linkSearchOf(strings)
}

/** The population a page's toggle names: direct purchases, or contract awards (framework agreements apart). */
function tipOf(grain: 'direct' | 'contract'): string {
  return grain === 'direct' ? 'directe' : 'contracte'
}

/**
 * A page's period in the analytics page's words: a complete year by its
 * year; the last twelve months and the year in progress by their months,
 * through the cutoff's — so the answer holds what the page counts, not the
 * months after.
 */
function periodOf(period: ProfilePeriod): string {
  return period.through ? `${period.from}..${period.through}` : String(period.year)
}

/** Every year the platform reads, from 2019 through the end of the current one (the page stops at the data's cutoff). */
export function allYears(now: Date = new Date()): string {
  return `${DIRECT_COMPARABLE_FROM}-01..${now.getFullYear()}-12`
}

/**
 * A county's records, for what the map counts there: its direct purchases,
 * or its contract awards — framework agreements apart, as the map counts
 * them.
 */
export function countyRecordsSearch(indicator: 'lei' | 'contracte', county: string, year: number): AnalyticsUrlSearch {
  return analyticsSearch({ tip: indicator === 'lei' ? 'directe' : 'contracte', judet: county, perioada: year, dupa: 'inregistrari' })
}

/** Every record of a buyer in one population, every year. */
export function buyerAllRecordsSearch(cui: string, grain: 'direct' | 'contract', now: Date = new Date()): AnalyticsUrlSearch {
  return analyticsSearch({ tip: tipOf(grain), cumparator: cui, perioada: allYears(now), dupa: 'inregistrari' })
}

/** A buyer's records of a page's period: its direct purchases, or its contract awards (framework agreements apart). */
export function buyerRecordsSearch(cui: string, period: ProfilePeriod, grain: 'direct' | 'contract'): AnalyticsUrlSearch {
  return analyticsSearch({ tip: tipOf(grain), cumparator: cui, perioada: periodOf(period), dupa: 'inregistrari' })
}

/**
 * A buyer's direct purchases of a page's period from firms in one county,
 * what its county row counts — by firm: a list cannot filter on the firm's
 * place, the analysis can.
 */
export function buyerCountySearch(cui: string, county: string, period: ProfilePeriod): AnalyticsUrlSearch {
  return analyticsSearch({ cumparator: cui, judet_firma: county, perioada: periodOf(period), dupa: 'firma' })
}

/** A firm's records, every year (`period` null) or a page's period: its direct purchases, or its contract awards (framework agreements apart). */
export function supplierRecordsSearch(cui: string, period: ProfilePeriod | null, grain: 'direct' | 'contract', now: Date = new Date()): AnalyticsUrlSearch {
  return analyticsSearch({ tip: tipOf(grain), furnizor: cui, perioada: period === null ? allYears(now) : periodOf(period), dupa: 'inregistrari' })
}

/** A firm's records of a page's period from institutions in one county: exactly what its county row counts. */
export function supplierCountySearch(cui: string, county: string, period: ProfilePeriod, grain: 'direct' | 'contract'): AnalyticsUrlSearch {
  return analyticsSearch({ tip: tipOf(grain), furnizor: cui, judet: county, perioada: periodOf(period), dupa: 'inregistrari' })
}

/** The three ways in: the year's contract awards, its framework agreements, the analysis itself. */
export function startSearches(year: number): { readonly awards: AnalyticsUrlSearch; readonly frameworks: AnalyticsUrlSearch; readonly rankings: AnalyticsUrlSearch } {
  return {
    awards: analyticsSearch({ tip: 'contracte', perioada: year, dupa: 'inregistrari' }),
    frameworks: analyticsSearch({ tip: 'acorduri', perioada: year, dupa: 'inregistrari' }),
    rankings: {},
  }
}
