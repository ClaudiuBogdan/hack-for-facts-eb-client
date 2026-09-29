import { describe, expect, it } from 'vitest'
import { queryOf, searchOf } from './analytics-model'
import { explorerSearchOf, parseProcurementHomeSearch } from '@/schemas/procurement-home'
import {
  allYears,
  buyerAllRecordsSearch,
  buyerCountySearch,
  buyerRecordsSearch,
  countyRecordsSearch,
  procurementHrefOf,
  sectionIndex,
  startSearches,
  supplierCountySearch,
  supplierRecordsSearch,
} from './home-links'
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

describe('the analytics answers a profile page opens', () => {
  it('opens a complete year by its year, and the year in progress over its months only', () => {
    expect(buyerRecordsSearch('4364446', yearPeriod(2025, null), 'direct')).toEqual({ cumparator: 4364446, perioada: 2025, dupa: 'inregistrari' })
    expect(supplierRecordsSearch('9813902', yearPeriod(2026, '2026-05'), 'contract')).toEqual({ tip: 'contracte', furnizor: 9813902, perioada: '2026-01..2026-05', dupa: 'inregistrari' })
    expect(supplierCountySearch('9813902', 'B', yearPeriod(2024, null), 'direct')).toEqual({ furnizor: 9813902, judet: 'B', perioada: 2024, dupa: 'inregistrari' })
    // The last twelve months by their months, across the two years.
    expect(buyerRecordsSearch('4364446', recentPeriod('2026-05'), 'contract')).toMatchObject({ perioada: '2025-06..2026-05' })
  })

  it('answers a county row by firm (a buyer’s own default), not by its records: a list cannot filter on the firm’s place', () => {
    expect(buyerCountySearch('4364446', 'IF', yearPeriod(2026, '2026-05'))).toEqual({ cumparator: 4364446, judet_firma: 'IF', perioada: '2026-01..2026-05' })
  })

  it('opens every year of a party from 2019', () => {
    const now = new Date('2026-09-29T12:00:00Z')
    expect(allYears(now)).toBe('2019-01..2026-12')
    expect(buyerAllRecordsSearch('4364446', 'contract', now)).toEqual({ tip: 'contracte', cumparator: 4364446, perioada: '2019-01..2026-12', dupa: 'inregistrari' })
    expect(supplierRecordsSearch('9813902', null, 'direct', now)).toMatchObject({ perioada: '2019-01..2026-12' })
  })
})

describe('the analytics answers the front door opens', () => {
  /** What the analytics page reads back of an address: every link is one it writes itself. */
  const read = (search: Record<string, unknown>) => searchOf(queryOf(Object.fromEntries(Object.entries(search).map(([key, value]) => [key, String(value)]))))

  it('keep the population each link names, so an answer counts what its row or card counts', () => {
    const { awards, frameworks, rankings } = startSearches(2025)
    expect(read(awards)).toEqual({ tip: 'contracte', perioada: '2025', dupa: 'inregistrari' })
    expect(read(frameworks)).toEqual({ tip: 'acorduri', perioada: '2025', dupa: 'inregistrari' })
    expect(rankings).toEqual({})
    expect(read(countyRecordsSearch('contracte', 'CJ', 2025))).toEqual({ tip: 'contracte', judet: 'CJ', perioada: '2025', dupa: 'inregistrari' })
    expect(read(countyRecordsSearch('lei', 'CJ', 2025))).toEqual({ judet: 'CJ', perioada: '2025', dupa: 'inregistrari' })
  })
})
