// The explorer's addresses as the analytics page's: every question an old link asked is asked again, in the page's words, with the explorer's own defaults; what the page cannot filter on stays behind.
import { describe, expect, it } from 'vitest'
import { analyticsRedirectSearch, analyticsSearchFromExplorer, isExplorerSearch } from './analytics-legacy'

const NOW = new Date('2026-09-29T12:00:00Z')

describe('an explorer link', () => {
  it('is told by its keys, not by the analytics page’s own', () => {
    expect(isExplorerSearch({ view: 'list' })).toBe(true)
    expect(isExplorerSearch({ authority_cui: '4305857' })).toBe(true)
    expect(isExplorerSearch({ cumparator: '4305857', perioada: 2024 })).toBe(false)
    // `cpv` is both pages' key, and means the same code.
    expect(isExplorerSearch({ cpv: '45000000' })).toBe(false)
    expect(isExplorerSearch({ lang: 'en' })).toBe(false)
    // An analytics address with a stray explorer key is answered as it is, never rebuilt from the stray key.
    expect(isExplorerSearch({ tip: 'directe', cumparator: 4305857, dupa: 'inregistrari', page: 2 })).toBe(false)
    expect(isExplorerSearch({ cpv: '45000000', view: 'list' })).toBe(true)
  })
})

describe('the explorer’s question, in the analytics page’s words', () => {
  it('reads the population off the grain and the record kind (the explorer’s default was the contracts)', () => {
    expect(analyticsSearchFromExplorer({}, NOW)).toEqual({ tip: 'contracte', perioada: 2025 })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions' }, NOW)).toEqual({ perioada: 2025 })
    expect(analyticsSearchFromExplorer({ grain: 'contracts', record_kind: 'frameworks' }, NOW)).toEqual({ tip: 'acorduri', perioada: 2025 })
    expect(analyticsSearchFromExplorer({ grain: 'contracts', record_kind: 'purchases' }, NOW)).toEqual({ tip: 'contracte', perioada: 2025 })
    // The framework ceilings were the explorer's value basis for the framework agreements.
    expect(analyticsSearchFromExplorer({ vbasis: 'ceiling' }, NOW)).toEqual({ tip: 'acorduri', perioada: 2025 })
  })

  it('opens a list on its records, a ranking on its axis and its basis — by value unless it said by count', () => {
    expect(analyticsSearchFromExplorer({ view: 'list', grain: 'direct_acquisitions', authority_cui: '4305857' }, NOW)).toEqual({ cumparator: 4305857, perioada: 2025, dupa: 'inregistrari' })
    expect(analyticsSearchFromExplorer({ view: 'rankings', rankDim: 'supplier', rankBy: 'count', year: 2024 }, NOW)).toEqual({ tip: 'contracte', perioada: 2024, dupa: 'firma' })
    // The explorer ranked by value by default; the contracts' own default here is the count.
    expect(analyticsSearchFromExplorer({ view: 'rankings', rankDim: 'supplier', year: 2024 }, NOW)).toEqual({ tip: 'contracte', perioada: 2024, dupa: 'firma', masura: 'lei' })
    expect(analyticsSearchFromExplorer({ view: 'rankings', rankDim: 'cpv', cpvLevel: 'group', grain: 'direct_acquisitions' }, NOW)).toEqual({ perioada: 2025, dupa: 'grup' })
    // The framework agreements have no value to rank by.
    expect(analyticsSearchFromExplorer({ view: 'rankings', rankDim: 'buyer', grain: 'contracts', record_kind: 'frameworks' }, NOW)).toEqual({ tip: 'acorduri', perioada: 2025, dupa: 'institutie' })
    // A ranking of the axis the link fixed gives way to the page's next question.
    expect(analyticsSearchFromExplorer({ view: 'rankings', rankDim: 'buyer', authority_cui: '4305857', grain: 'direct_acquisitions' }, NOW)).toEqual({ cumparator: 4305857, perioada: 2025 })
  })

  it('keeps the parties, the category at its level, the places, the title’s words and the value range', () => {
    expect(
      analyticsSearchFromExplorer(
        { view: 'list', grain: 'direct_acquisitions', supplier_cui: 'RO14399840', cpv_division: '45000000', buyerCounty: 'CJ', supplierRegion: 'Centru', q: 'laptop', valueMin: 1000, valueMax: 5000 },
        NOW,
      ),
    ).toEqual({ furnizor: 14399840, cpv: 45, judet: 'CJ', regiune_firma: 'Centru', perioada: 2025, titlu: 'laptop', valoare: '1000..5000' })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', cpv_group: '45200000' }, NOW)).toMatchObject({ cpv: 452 })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', cpv: '03000000-1' }, NOW)).toMatchObject({ cpv: '03000000' })
  })

  it('reads every year first, then two days, one day and after, a year, else the explorer’s default: the previous calendar year', () => {
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', period: 'all', year: 2023 }, NOW)).toEqual({ perioada: '2019-01..2026-12' })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', dateFrom: '2025-06-01', dateTo: '2026-05-31' }, NOW)).toEqual({ perioada: '2025-06..2026-05' })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', dateFrom: '2019-01-01' }, NOW)).toEqual({ perioada: '2019-01..2026-12' })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', year: 2023 }, NOW)).toEqual({ perioada: 2023 })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions' }, NOW)).toEqual({ perioada: 2025 })
  })

  it('leaves behind what the page cannot filter on, and what the explorer itself ignored', () => {
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', year: 2024, status: 'awarded', value_state: 'accepted', source: 'seap', sort: 'value_asc', page: 3, mapGrain: 'county' }, NOW)).toEqual({ perioada: 2024 })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', year: 2024, county: 'CJ', region: 'cluj' }, NOW)).toEqual({ perioada: 2024 })
  })

  it('keeps a value the page cannot read as it came, for the page to say so — never a wider answer in silence', () => {
    expect(analyticsSearchFromExplorer({ view: 'list', year: 2024, authority_cui: '4305857', supplier_cui: 'BG131128432' }, NOW)).toEqual({ tip: 'contracte', cumparator: 4305857, furnizor: 'BG131128432', perioada: 2024, dupa: 'inregistrari' })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', year: 2024, q: 'ab' }, NOW)).toEqual({ perioada: 2024, titlu: 'ab' })
    expect(analyticsSearchFromExplorer({ grain: 'direct_acquisitions', dateFrom: '2005-01-01', dateTo: '2006-12-31' }, NOW)).toEqual({ perioada: '2005-01..2006-12' })
  })

  it('carries what else the link held, less the keys it is told to drop', () => {
    expect(analyticsRedirectSearch({ view: 'list', q: 'spital', year: 2024, lang: 'en', cumparatori: 'contracte' }, new Set(['cumparatori']))).toEqual({ lang: 'en', tip: 'contracte', perioada: 2024, titlu: 'spital' })
  })
})
