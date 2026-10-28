import { describe, expect, it } from 'vitest'
import { parsePnrrSearchString, type PnrrSearchState } from '@/schemas/pnrr'
import { normalizePnrrSeoSnapshotSearch } from '../seo/pnrr-seo'
import {
  buildPnrrOverviewMapSearchKey,
  buildPnrrOverviewRequestPath,
  buildPnrrOverviewSearchKey,
  pickPnrrOverviewMapSelection,
} from './pnrr-overview-request'
import { PNRR_FILESET_ID } from './snapshot'

const FILTERED_SEARCH: Partial<PnrrSearchState> = {
  view: 'projects',
  search: '"spital județean" OR -școală',
  beneficiaryCui: 'RO 4288110',
  uatSirutas: ['54975', '179132'],
  components: ['C12', 'C10'],
  counties: ['Cluj'],
  fundingSources: ['loan'],
  onlyAnomalies: true,
  includeNational: false,
  currency: 'EUR',
  page: 3,
  sortBy: 'title',
}

function parseRequestPath(path: string): {
  readonly search: Partial<PnrrSearchState>
  readonly params: URLSearchParams
} {
  const url = new URL(path, 'https://example.test')
  return { search: parsePnrrSearchString(url.search), params: url.searchParams }
}

describe('buildPnrrOverviewRequestPath', () => {
  it('sends the data filters in the page format, and the server reads back the same filters', () => {
    const path = buildPnrrOverviewRequestPath(FILTERED_SEARCH)
    const { search, params } = parseRequestPath(path)

    expect(path.startsWith('/api/pnrr/overview?')).toBe(true)
    expect(params.get('v')).toBe(PNRR_FILESET_ID)
    expect(params.has('part')).toBe(false)
    expect(normalizePnrrSeoSnapshotSearch(search)).toEqual(
      normalizePnrrSeoSnapshotSearch(FILTERED_SEARCH),
    )
    expect(buildPnrrOverviewSearchKey(search)).toBe(
      buildPnrrOverviewSearchKey(FILTERED_SEARCH),
    )
  })

  it('leaves out what does not change the overview: view, paging, sorting and currency', () => {
    const { params } = parseRequestPath(
      buildPnrrOverviewRequestPath(FILTERED_SEARCH),
    )

    for (const key of ['view', 'page', 'sortBy', 'currency', 'panel']) {
      expect(params.has(key)).toBe(false)
    }
  })

  it('gives the same URL for the same filters in any order', () => {
    expect(
      buildPnrrOverviewRequestPath({ counties: ['Cluj', 'Alba'], view: 'map' }),
    ).toBe(buildPnrrOverviewRequestPath({ counties: ['Alba', 'Cluj'] }))
  })

  it('adds the opened UAT to the map preview request only', () => {
    const search: Partial<PnrrSearchState> = {
      ...FILTERED_SEARCH,
      panel: 'map-uat',
      panelUatSiruta: '54975',
    }
    const summary = parseRequestPath(buildPnrrOverviewRequestPath(search))
    const mapPreview = parseRequestPath(
      buildPnrrOverviewRequestPath(search, 'map-preview'),
    )

    expect(summary.params.has('panel')).toBe(false)
    expect(mapPreview.params.get('part')).toBe('map-preview')
    expect(pickPnrrOverviewMapSelection(mapPreview.search)).toEqual({
      panel: 'map-uat',
      panelUatSiruta: '54975',
    })
    expect(buildPnrrOverviewMapSearchKey(mapPreview.search)).toBe(
      buildPnrrOverviewMapSearchKey(search),
    )
  })

  it('ignores other panels for the map preview', () => {
    expect(
      pickPnrrOverviewMapSelection({
        panel: 'map-county',
        panelCountyCode: 'CJ',
      }),
    ).toEqual({})
    expect(buildPnrrOverviewMapSearchKey({ panel: 'project' })).toBe(
      buildPnrrOverviewMapSearchKey({}),
    )
  })
})
