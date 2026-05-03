import { describe, expect, it } from 'vitest'
import { cleanPnrrSearch, parsePnrrSearch, parsePnrrSearchString } from './pnrr'

describe('pnrr search schema', () => {
  it('omits default search state from the canonical URL search', () => {
    expect(
      parsePnrrSearch({
        view: 'overview',
        onlyAnomalies: false,
        excludeMicro: false,
        granularity: 'county',
        includeNational: true,
        sortBy: 'value',
        sortOrder: 'desc',
        page: '1',
        pageSize: '25',
      })
    ).toEqual({})
  })

  it('keeps only non-default values and trims text filters', () => {
    expect(
      cleanPnrrSearch({
        view: 'map',
        search: '  autostrada  ',
        granularity: 'uat',
        sortBy: 'title',
        sortOrder: 'asc',
        page: 2,
        pageSize: 50,
        components: [],
        counties: ['Cluj'],
        onlyAnomalies: true,
      })
    ).toEqual({
      view: 'map',
      search: 'autostrada',
      granularity: 'uat',
      sortBy: 'title',
      sortOrder: 'asc',
      page: 2,
      pageSize: 50,
      counties: ['Cluj'],
      onlyAnomalies: true,
    })
  })

  it('keeps map viewport only when all coordinates are present', () => {
    expect(cleanPnrrSearch({ mapLat: 45.9, mapLng: 24.9 })).toEqual({})
    expect(cleanPnrrSearch({ mapLat: 45.9, mapLng: 24.9, mapZoom: 7 })).toEqual({
      mapLat: 45.9,
      mapLng: 24.9,
      mapZoom: 7,
    })
  })

  it('parses the current URL search before removing defaults', () => {
    expect(
      parsePnrrSearchString(
        '?view=map&components=%5B%22C1%22%5D&granularity=county&page=1&pageSize=25'
      )
    ).toEqual({
      view: 'map',
      components: ['C1'],
    })
  })

  it('keeps primitive-looking text search values as strings', () => {
    expect(parsePnrrSearchString('?search=2024&onlyAnomalies=true')).toEqual({
      search: '2024',
      onlyAnomalies: true,
    })
  })

  it('keeps currency in canonical URL search state', () => {
    expect(parsePnrrSearchString('?currency=EUR')).toEqual({
      currency: 'EUR',
    })
  })
})
