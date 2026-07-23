import { describe, expect, it } from 'vitest'
import {
  cleanProcurementHubSearch,
  hubStateToLandingFilters,
  hubStateToListSearchState,
  parseProcurementHubSearch,
  withProcurementHubDefaults,
} from './procurement-hub'

describe('procurement hub schema', () => {
  it('defaults view to overview and maps legacy tab=search / view=map', () => {
    expect(parseProcurementHubSearch({}).view).toBe('overview')
    expect(parseProcurementHubSearch({ tab: 'search' }).view).toBe('list')
    expect(parseProcurementHubSearch({ view: 'list' }).view).toBe('list')
    expect(parseProcurementHubSearch({ view: 'rankings' }).view).toBe('rankings')
    // Legacy Map tab bookmarks land on Overview; mapGrain is preserved.
    expect(parseProcurementHubSearch({ view: 'map' }).view).toBe('overview')
    expect(
      parseProcurementHubSearch({ view: 'map', mapGrain: 'county' }).mapGrain,
    ).toBe('county')
  })

  it('defaults rankings chrome and cleans them when default', () => {
    expect(parseProcurementHubSearch({}).rankDim).toBe('buyer')
    expect(parseProcurementHubSearch({}).cpvLevel).toBe('division')
    expect(parseProcurementHubSearch({}).rankPage).toBe(1)
    expect(parseProcurementHubSearch({}).rankPageSize).toBe(10)
    expect(parseProcurementHubSearch({}).rankBy).toBe('count')
    expect(parseProcurementHubSearch({ rankBy: 'value' }).rankBy).toBe('value')
    expect(
      cleanProcurementHubSearch({
        view: 'rankings',
        rankDim: 'supplier',
        cpvLevel: 'code',
        rankBy: 'value',
        rankPage: 2,
        rankPageSize: 25,
      }),
    ).toEqual({
      view: 'rankings',
      rankDim: 'supplier',
      cpvLevel: 'code',
      rankBy: 'value',
      rankPage: 2,
      rankPageSize: 25,
    })
    expect(
      cleanProcurementHubSearch({
        view: 'rankings',
        rankDim: 'buyer',
        cpvLevel: 'division',
        rankBy: 'count',
        rankPage: 1,
        rankPageSize: 10,
      }),
    ).toEqual({ view: 'rankings' })
  })

  it('defaults measure and mapGrain and cleans them when default', () => {
    expect(parseProcurementHubSearch({}).measure).toBe('record_count')
    expect(parseProcurementHubSearch({}).mapGrain).toBe('region')
    expect(
      cleanProcurementHubSearch({
        measure: 'record_count',
        mapGrain: 'region',
        q: 'school',
      }),
    ).toEqual({ q: 'school' })
    expect(
      cleanProcurementHubSearch({
        measure: 'value_awarded',
        mapGrain: 'county',
      }),
    ).toEqual({ measure: 'value_awarded', mapGrain: 'county' })
  })

  it('keeps finest buyer geo key (siruta > county > region)', () => {
    expect(
      parseProcurementHubSearch({
        buyerSiruta: '120855',
        buyerCounty: 'CJ',
        buyerRegion: 'Nord-Vest',
      }),
    ).toMatchObject({
      buyerSiruta: '120855',
      buyerCounty: undefined,
      buyerRegion: undefined,
    })
  })

  it('cleans default view/grain/sort/page from the URL', () => {
    const state = withProcurementHubDefaults({
      view: 'overview',
      grain: 'contracts',
      sort: 'date_desc',
      page: 1,
      pageSize: 25,
      q: 'school',
    })
    expect(cleanProcurementHubSearch(state)).toEqual({ q: 'school' })
  })

  it('resolves previous-year period into list and landing filters', () => {
    const now = new Date('2026-07-21T12:00:00Z')
    const state = parseProcurementHubSearch({})
    expect(hubStateToLandingFilters(state, now)).toEqual({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      rankBy: 'count',
    })
    expect(hubStateToListSearchState(state, now)).toMatchObject({
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31',
      grain: 'contracts',
    })
  })

  it('maps the overview metric to the aggregate ranking request', () => {
    const state = parseProcurementHubSearch({
      measure: 'value_awarded',
      period: 'all',
    })
    expect(hubStateToLandingFilters(state)).toEqual({ rankBy: 'value' })
  })

  it('omits geography from list search state (B1)', () => {
    const state = parseProcurementHubSearch({
      buyerRegion: 'Nord-Vest',
      period: 'all',
    })
    const list = hubStateToListSearchState(state)
    expect(list).not.toHaveProperty('buyerRegion')
    expect(list.dateFrom).toBeUndefined()
    expect(list.dateTo).toBeUndefined()
  })
})
