import type { ProcurementHubState } from '@/schemas/procurement-hub'

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
 * (`/entities/4305857`) or a state company (`/intreprinderi-publice/16054368`,
 * which buys under the procurement law) opens its buyer page, a company
 * (`/companies/14399840`) its supplier page. Anything else keeps its own link
 * (null).
 */
export function procurementHrefOf(hit: { readonly href: string; readonly isExternal: boolean }): string | null {
  if (hit.isExternal) return null
  const match = /^\/(entities|intreprinderi-publice|companies)\/(\d+)(?:[/?#]|$)/.exec(hit.href)
  if (!match?.[2]) return null
  return match[1] === 'companies' ? `/procurement/suppliers/${match[2]}` : `/procurement/institutions/${match[2]}`
}

/** The explorer's address, typed: a value its schema would drop is a type error here, not a silent wider list. */
export type ExplorerSearch = Partial<ProcurementHubState>

/**
 * A county's list in the explorer, for what the map counts there: its direct
 * purchases, or its contract awards — framework agreements apart, as the map
 * counts them.
 */
export function countyExplorerSearch(indicator: 'lei' | 'contracte', county: string, year: number): ExplorerSearch {
  return indicator === 'lei'
    ? { view: 'list', grain: 'direct_acquisitions', buyerCounty: county, year }
    : { view: 'list', grain: 'contracts', record_kind: ['purchases'], buyerCounty: county, year }
}

/** Every record of a buyer in one population, every year, in the explorer's list (its default would be contracts only). */
export function buyerAllRecordsSearch(cui: string, grain: 'direct' | 'contract'): ExplorerSearch {
  return grain === 'direct'
    ? { view: 'list', grain: 'direct_acquisitions', authority_cui: cui }
    : { view: 'list', grain: 'contracts', record_kind: ['purchases'], authority_cui: cui }
}

/** A buyer's records of one year in the explorer: its direct purchases, or its contract awards (framework agreements apart). */
export function buyerRecordsSearch(cui: string, year: number, grain: 'direct' | 'contract'): ExplorerSearch {
  return grain === 'direct'
    ? { view: 'list', grain: 'direct_acquisitions', authority_cui: cui, year }
    : { view: 'list', grain: 'contracts', record_kind: ['purchases'], authority_cui: cui, year }
}

/** A buyer's direct purchases of one year from firms in one county: exactly what its county row counts. */
export function buyerCountySearch(cui: string, county: string, year: number): ExplorerSearch {
  return { view: 'list', grain: 'direct_acquisitions', authority_cui: cui, supplierCounty: county, year }
}

/**
 * A firm's records in the explorer, every year (`year` null) or one: its
 * direct purchases, or its contract awards (framework agreements apart).
 */
export function supplierRecordsSearch(cui: string, year: number | null, grain: 'direct' | 'contract'): ExplorerSearch {
  const base: ExplorerSearch =
    grain === 'direct' ? { view: 'list', grain: 'direct_acquisitions', supplier_cui: cui } : { view: 'list', grain: 'contracts', record_kind: ['purchases'], supplier_cui: cui }
  return year === null ? base : { ...base, year }
}

/** A firm's records of one year from institutions in one county: exactly what its county row counts. */
export function supplierCountySearch(cui: string, county: string, year: number, grain: 'direct' | 'contract'): ExplorerSearch {
  return { ...supplierRecordsSearch(cui, year, grain), buyerCounty: county }
}

/** The three ways in: the year's contract awards, its framework agreements, the rankings. */
export function startSearches(year: number): { readonly awards: ExplorerSearch; readonly frameworks: ExplorerSearch; readonly rankings: ExplorerSearch } {
  return {
    awards: { view: 'list', grain: 'contracts', record_kind: ['purchases'], year },
    frameworks: { view: 'list', grain: 'contracts', record_kind: ['frameworks'], year },
    rankings: { view: 'rankings' },
  }
}
