import { describe, expect, it } from 'vitest'
import { parseStatisticsDatasetExplorerSearch } from '@/schemas/statistics'
import {
  buildDatasetFilterInput,
  clearedExplorerFilters,
  clearedExplorerSearch,
  countActiveExplorerFilters,
  explorerOffset,
  hasActiveExplorerFilters,
} from './explorer-filter'

describe('buildDatasetFilterInput', () => {
  it('asks for both data statuses, since the catalog page shows both', () => {
    // Omitting `dataStatus` makes the server read the fact-loaded view only,
    // which would silently hide the ~1,871 catalog-only datasets.
    expect(buildDatasetFilterInput({}).dataStatus).toEqual([
      'AVAILABLE',
      'CATALOG_ONLY',
    ])
  })

  it('narrows to dataStatus, never syncStatus, for a picker that needs facts', () => {
    expect(buildDatasetFilterInput({}, { onlyWithData: true })).toEqual({
      dataStatus: ['AVAILABLE'],
    })
  })

  it('forwards search, context, periodicity and coverage flags', () => {
    const filter = buildDatasetFilterInput({
      q: 'populatie',
      context: '2',
      frecventa: ['ANNUAL', 'MONTHLY'],
      uat: true,
      judet: true,
    })

    expect(filter).toEqual({
      dataStatus: ['AVAILABLE', 'CATALOG_ONLY'],
      search: 'populatie',
      rootContextCode: '2',
      periodicity: ['ANNUAL', 'MONTHLY'],
      hasUatData: true,
      hasCountyData: true,
    })
  })

  it('omits coverage flags that are false rather than sending false', () => {
    const filter = buildDatasetFilterInput({ uat: false, judet: false })
    expect(filter.hasUatData).toBeUndefined()
    expect(filter.hasCountyData).toBeUndefined()
  })
})

describe('explorerOffset', () => {
  it('defaults to the first page', () => {
    expect(explorerOffset({})).toBe(0)
  })

  it('is zero-based over a 25-row page', () => {
    expect(explorerOffset({ pagina: 2 })).toBe(25)
    expect(explorerOffset({ pagina: 4 })).toBe(75)
  })
})

describe('countActiveExplorerFilters', () => {
  it('excludes the search term and the page', () => {
    expect(countActiveExplorerFilters({ q: 'somaj', pagina: 3 })).toBe(0)
  })

  it('counts each selected periodicity separately', () => {
    expect(
      countActiveExplorerFilters({ frecventa: ['ANNUAL', 'QUARTERLY'] }),
    ).toBe(2)
  })

  it('counts context and both coverage flags', () => {
    expect(countActiveExplorerFilters({ context: '3', uat: true, judet: true })).toBe(3)
  })
})

describe('hasActiveExplorerFilters', () => {
  it('is true for a bare search term', () => {
    expect(hasActiveExplorerFilters({ q: 'somaj' })).toBe(true)
  })

  it('is false for a bare page change', () => {
    expect(hasActiveExplorerFilters({ pagina: 2 })).toBe(false)
  })
})

describe('clearedExplorerFilters', () => {
  it('keeps the search term, which has its own field, and drops the rest', () => {
    expect(clearedExplorerFilters({ q: 'populatie', context: '2', frecventa: ['ANNUAL'], uat: true, pagina: 3 })).toEqual({ q: 'populatie' })
    expect(clearedExplorerFilters({ context: '2' })).toEqual({})
  })
})

describe('clearedExplorerSearch', () => {
  it('drops the page along with the filters', () => {
    expect(clearedExplorerSearch()).toEqual({})
  })
})

describe('parseStatisticsDatasetExplorerSearch', () => {
  it('degrades malformed values to "filter not applied"', () => {
    expect(
      parseStatisticsDatasetExplorerSearch({
        q: '',
        frecventa: ['WEEKLY'],
        pagina: 0,
        uat: 'yes',
      }),
    ).toEqual({
      q: undefined,
      frecventa: undefined,
      pagina: undefined,
      uat: undefined,
    })
  })

  it('round-trips a fully specified URL state', () => {
    const search = {
      q: 'populatie',
      context: '2',
      frecventa: ['ANNUAL'],
      uat: true,
      judet: true,
      pagina: 2,
    }
    expect(parseStatisticsDatasetExplorerSearch(search)).toEqual(search)
  })
})
