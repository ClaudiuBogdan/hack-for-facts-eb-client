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

  it('normalizes UAT filter identifiers and drops untrusted names', () => {
    expect(
      parsePnrrSearchString(
        '?view=projects&uatSiruta=%22147358%22&uatName=Orasul+Brosteni234',
      ),
    ).toEqual({
      view: 'projects',
      uatSiruta: '147358',
    })
  })

  it('keeps project panel state in canonical URL search state', () => {
    expect(
      parsePnrrSearchString(
        '?view=projects&panel=project&panelProjectId=project-1&page=2',
      ),
    ).toEqual({
      view: 'projects',
      panel: 'project',
      panelProjectId: 'project-1',
      page: 2,
    })
  })

  it('keeps map UAT panel state with map viewport coordinates', () => {
    expect(
      parsePnrrSearchString(
        '?view=map&granularity=uat&panel=map-uat&panelUatSiruta=123&panelUatName=Fake&panelProjectId=project-1&mapLat=44.9&mapLng=26.8&mapZoom=10',
      ),
    ).toEqual({
      view: 'map',
      granularity: 'uat',
      panel: 'map-uat',
      panelUatSiruta: '123',
      panelProjectId: 'project-1',
      mapLat: 44.9,
      mapLng: 26.8,
      mapZoom: 10,
    })
  })

  it('normalizes JSON-encoded panel identifiers', () => {
    expect(
      parsePnrrSearchString(
        '?panel=map-uat&panelUatSiruta=%22147358%22&panelUatName=Fake',
      ),
    ).toEqual({
      panel: 'map-uat',
      panelUatSiruta: '147358',
    })
  })

  it('keeps map county panel state by county code only', () => {
    expect(
      parsePnrrSearchString(
        '?panel=map-county&panelCountyCode=il&panelCounty=Fake&panelProjectId=project-1',
      ),
    ).toEqual({
      panel: 'map-county',
      panelCountyCode: 'IL',
      panelProjectId: 'project-1',
    })
  })

  it('keeps anomaly info panel signal state', () => {
    expect(
      parsePnrrSearchString(
        '?view=anomalies&panel=anomaly-info&panelSignalKind=risk&panelSignalType=large-low-progress',
      ),
    ).toEqual({
      view: 'anomalies',
      panel: 'anomaly-info',
      panelSignalKind: 'risk',
      panelSignalType: 'large-low-progress',
    })
  })

  it('removes invalid panel state without the required identifier', () => {
    expect(parsePnrrSearchString('?panel=beneficiary&panelBeneficiaryName=Name')).toEqual({})
  })

  it('keeps national as a detailed beneficiary type filter', () => {
    expect(parsePnrrSearchString('?beneficiaryTypes=%5B%22national%22%5D')).toEqual({
      beneficiaryTypes: ['national'],
    })
  })

  it('drops unsupported entity types from canonical URL state', () => {
    expect(parsePnrrSearchString('?entityTypes=%5B%22national%22%5D')).toEqual({})
    expect(
      parsePnrrSearchString('?entityTypes=%5B%22private%22%2C%22national%22%5D'),
    ).toEqual({
      entityTypes: ['private'],
    })
  })
})
