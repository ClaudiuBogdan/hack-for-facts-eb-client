import { describe, expect, it } from 'vitest'
import { parseProcurementHubSearch } from './procurement-hub'

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
})

describe('capability registry — every dropped list filter is classified', () => {

  it('normalizes a malformed territory param instead of sending it to the server', () => {
    // `buyerCounty=Cluj` would be rejected by the server and fail the request.
    const state = parseProcurementHubSearch({ buyerCounty: 'Cluj', supplierSiruta: 'abc' })
    expect(state.buyerCounty).toBeUndefined()
    expect(state.supplierSiruta).toBeUndefined()
    expect(parseProcurementHubSearch({ buyerCounty: 'CJ' }).buyerCounty).toBe('CJ')
  })
})

// The analytics page's redirects read old explorer links through this parser: its defaults decide where a link lands.
describe('the explorer URL parser, as the redirects read it', () => {
  it('fills the explorer\'s own defaults', () => {
    const state = parseProcurementHubSearch({})
    expect(state.view).toBe('overview')
    expect(state.grain).toBe('contracts')
    expect(state.rankDim).toBe('buyer')
    expect(state.cpvLevel).toBe('division')
    expect(state.rankBy).toBe('value')
    expect(state.vbasis).toBe('awarded')
    expect(parseProcurementHubSearch({ rankBy: 'count' }).rankBy).toBe('count')
  })

  it('reads the legacy view names', () => {
    expect(parseProcurementHubSearch({ tab: 'search' }).view).toBe('list')
    expect(parseProcurementHubSearch({ view: 'map' }).view).toBe('overview')
    expect(parseProcurementHubSearch({ view: 'rankings' }).view).toBe('rankings')
  })

  it('drops a CPV code that is not of its level, instead of widening a category', () => {
    expect(parseProcurementHubSearch({ cpv_group: '45000000' }).cpv_group).toBeUndefined()
    expect(parseProcurementHubSearch({ cpv_group: '45200000' }).cpv_group).toBe('45200000')
  })
})
