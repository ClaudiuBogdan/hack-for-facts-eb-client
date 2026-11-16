import { describe, expect, it } from 'vitest'
import { parsePnrrSearchString, type PnrrSearchState } from '@/schemas/pnrr'
import { normalizePnrrSeoSnapshotSearch } from '../seo/pnrr-seo'
import {
  buildPnrrDashboardPartKey,
  buildPnrrDashboardPartSearch,
  buildPnrrOverviewMapSearchKey,
  buildPnrrOverviewRequestPath,
  buildPnrrOverviewSearchKey,
  pickPnrrOverviewMapSelection,
  pnrrDashboardPartQueryKey,
  pnrrOverviewQueryKey,
  PNRR_RELEASE_ID_PATTERN,
} from './pnrr-overview-request'

const RELEASE_ID = 'pnrr-release-v1:mipe-20261015T000000Z'

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
    const path = buildPnrrOverviewRequestPath(FILTERED_SEARCH, 'summary', {
      releaseId: RELEASE_ID,
    })
    const { search, params } = parseRequestPath(path)

    expect(path.startsWith('/api/pnrr/overview?')).toBe(true)
    expect(params.get('release')).toBe(RELEASE_ID)
    expect(params.has('v')).toBe(false)
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

describe('dashboard parts', () => {
  it('pins every query key to the release', () => {
    expect(pnrrOverviewQueryKey(RELEASE_ID, '{}')).toEqual([
      'pnrr-overview',
      RELEASE_ID,
      '{}',
    ])
    expect(pnrrDashboardPartQueryKey('other-release', 'projects', 'k')).not.toEqual(
      pnrrDashboardPartQueryKey(RELEASE_ID, 'projects', 'k'),
    )
  })

  it('sends each part only the keys it depends on, and the server reads them back', () => {
    const search: Partial<PnrrSearchState> = {
      ...FILTERED_SEARCH,
      beneficiaryPage: 2,
      granularity: 'uat',
      panel: 'map-county',
      panelCountyCode: 'cj',
    }
    const projects = parseRequestPath(
      buildPnrrOverviewRequestPath(search, 'projects', { releaseId: RELEASE_ID }),
    )
    const beneficiaries = parseRequestPath(
      buildPnrrOverviewRequestPath(search, 'beneficiaries', {
        releaseId: RELEASE_ID,
      }),
    )
    const map = parseRequestPath(
      buildPnrrOverviewRequestPath(search, 'map', {
        releaseId: RELEASE_ID,
        params: { series: 'per-capita' },
      }),
    )

    expect(projects.params.get('part')).toBe('projects')
    expect(projects.search).toMatchObject({ page: 3, sortBy: 'title' })
    expect(projects.params.has('beneficiaryPage')).toBe(false)
    expect(beneficiaries.search).toMatchObject({ beneficiaryPage: 2 })
    expect(beneficiaries.params.has('page')).toBe(false)
    expect(map.params.get('series')).toBe('per-capita')
    expect(map.search).toMatchObject({
      granularity: 'uat',
      panel: 'map-county',
      panelCountyCode: 'CJ',
    })
    for (const part of ['projects', 'beneficiaries', 'map'] as const) {
      const parsed = { projects, beneficiaries, map }[part].search
      expect(buildPnrrDashboardPartSearch(part, parsed)).toEqual(
        buildPnrrDashboardPartSearch(part, search),
      )
    }
  })

  it('asks for release-wide parts without any filter', () => {
    const facets = parseRequestPath(
      buildPnrrOverviewRequestPath(FILTERED_SEARCH, 'facets', {
        releaseId: RELEASE_ID,
      }),
    )
    const project = parseRequestPath(
      buildPnrrOverviewRequestPath(FILTERED_SEARCH, 'project', {
        releaseId: RELEASE_ID,
        params: { projectId: 'key:p-1' },
      }),
    )

    expect([...facets.params.keys()].sort()).toEqual(['part', 'release'])
    expect([...project.params.keys()].sort()).toEqual([
      'part',
      'projectId',
      'release',
    ])
    expect(buildPnrrDashboardPartKey('project', FILTERED_SEARCH, { projectId: 'a' })).toBe(
      buildPnrrDashboardPartKey('project', {}, { projectId: 'a' }),
    )
  })

  it('accepts API release ids and refuses anything else', () => {
    expect(PNRR_RELEASE_ID_PATTERN.test(RELEASE_ID)).toBe(true)
    expect(PNRR_RELEASE_ID_PATTERN.test('../etc')).toBe(false)
    expect(PNRR_RELEASE_ID_PATTERN.test('a'.repeat(201))).toBe(false)
  })
})
