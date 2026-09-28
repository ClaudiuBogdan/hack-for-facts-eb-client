import { describe, expect, it } from 'vitest'
import { cleanProcurementHubSearch, parseProcurementHubSearch } from '@/schemas/procurement-hub'
import { explorerSearchOf, parseProcurementHomeSearch } from '@/schemas/procurement-home'
import { buyerCountySearch, buyerRecordsSearch, countyExplorerSearch, procurementHrefOf, sectionIndex, startSearches, supplierCountySearch, supplierRecordsSearch } from './home-links'
import { recentPeriod, yearPeriod } from './profile-period.fixture'

describe('procurementHrefOf', () => {
  it('opens an institution’s buyer page and a company’s supplier page', () => {
    expect(procurementHrefOf({ href: '/entities/4305857', isExternal: false })).toBe('/procurement/institutions/4305857')
    expect(procurementHrefOf({ href: '/companies/14399840?tab=x', isExternal: false })).toBe('/procurement/suppliers/14399840')
    // A state company buys under the procurement law.
    expect(procurementHrefOf({ href: '/intreprinderi-publice/16054368', isExternal: false })).toBe('/procurement/institutions/16054368')
  })

  it('leaves anything else to its own link', () => {
    expect(procurementHrefOf({ href: '/ins/seturi/POP105A', isExternal: false })).toBeNull()
    expect(procurementHrefOf({ href: '/entities/4305857', isExternal: true })).toBeNull()
    expect(procurementHrefOf({ href: '/entitiesx/1', isExternal: false })).toBeNull()
  })
})

describe('sectionIndex', () => {
  it('numbers a band by its place in the bar', () => {
    const sections = [
      { id: 'ce', label: 'Ce se cumpără' },
      { id: 'cum', label: 'Cum se cumpără' },
    ]
    expect(sectionIndex(sections, 'cum')).toBe('02 / Cum se cumpără')
  })
})

describe('the front door’s address', () => {
  it('keeps its own choices, drops what it does not know and every default', () => {
    expect(parseProcurementHomeSearch({ cumparatori: 'contracte', bani: 'directe', indicator: 'hmm', recente: 'contracte' })).toEqual({
      cumparatori: 'contracte',
      bani: 'directe',
    })
    expect(parseProcurementHomeSearch({})).toEqual({})
  })

  it('sends an old explorer link on with what it carried, less the front door’s own choices', () => {
    expect(explorerSearchOf({ view: 'list', q: 'spital', lang: 'en', cumparatori: 'contracte' })).toEqual({ view: 'list', q: 'spital', lang: 'en' })
    expect(explorerSearchOf({ tab: 'search' })).toEqual({ tab: 'search' })
  })

  it('keeps a front-door link on the front door, the site’s own keys included', () => {
    expect(explorerSearchOf({})).toBeNull()
    expect(explorerSearchOf({ lang: 'en', currency: 'EUR', firme: 'directe' })).toBeNull()
  })
})

describe('the explorer lists a profile page opens', () => {
  it('opens a complete year by its year, and the year in progress over its months only', () => {
    expect(buyerRecordsSearch('4364446', yearPeriod(2025, null), 'direct')).toEqual({ view: 'list', grain: 'direct_acquisitions', authority_cui: '4364446', year: 2025 })
    expect(buyerCountySearch('4364446', 'IF', yearPeriod(2026, '2026-05'))).toEqual({
      view: 'list',
      grain: 'direct_acquisitions',
      authority_cui: '4364446',
      supplierCounty: 'IF',
      dateFrom: '2026-01-01',
      dateTo: '2026-05-31',
    })
    expect(supplierRecordsSearch('9813902', yearPeriod(2026, '2026-05'), 'contract')).toMatchObject({ supplier_cui: '9813902', dateFrom: '2026-01-01', dateTo: '2026-05-31' })
    expect(supplierRecordsSearch('9813902', null, 'contract')).not.toHaveProperty('year')
    expect(supplierCountySearch('9813902', 'B', yearPeriod(2024, null), 'direct')).toMatchObject({ year: 2024, buyerCounty: 'B' })
    // The last twelve months by their months, across the two years.
    expect(buyerRecordsSearch('4364446', recentPeriod('2026-05'), 'contract')).toMatchObject({ dateFrom: '2025-06-01', dateTo: '2026-05-31' })
    expect(buyerRecordsSearch('4364446', recentPeriod('2026-05'), 'contract')).not.toHaveProperty('year')
  })
})

describe('the explorer lists the front door opens', () => {
  /** What the explorer keeps of a search: its own schema, parsed and cleaned. */
  const kept = (search: Record<string, unknown>) => cleanProcurementHubSearch(parseProcurementHubSearch(search))

  it('keep the population filter each link names, so a list counts what its row or card counts', () => {
    const { awards, frameworks, rankings } = startSearches(2025)
    expect(kept(awards)).toMatchObject({ view: 'list', record_kind: ['purchases'], year: 2025 })
    expect(kept(frameworks)).toMatchObject({ view: 'list', record_kind: ['frameworks'], year: 2025 })
    expect(kept(rankings)).toMatchObject({ view: 'rankings' })
    expect(kept(countyExplorerSearch('contracte', 'CJ', 2025))).toMatchObject({ view: 'list', record_kind: ['purchases'], buyerCounty: 'CJ', year: 2025 })
    expect(kept(countyExplorerSearch('lei', 'CJ', 2025))).toMatchObject({ view: 'list', grain: 'direct_acquisitions', buyerCounty: 'CJ', year: 2025 })
  })
})
