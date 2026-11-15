import { cleanPnrrSearch, type PnrrSearchState } from '@/schemas/pnrr'
import type { PnrrMapSeriesId } from '../hooks/usePnrrMapSeries'
import {
  buildPnrrSeoSnapshotSearchKey,
  normalizePnrrSeoSnapshotSearch,
} from '../seo/pnrr-seo'

/*
 * The request contract of `/api/pnrr/overview`, shared by the client hooks and
 * the server handler. Every answer is built on the web server from one API
 * release and pinned to it: the request names the release, the response
 * header repeats it, and the query keys carry it. Each part sends only the
 * search keys it depends on, normalised the same way on both sides, so equal
 * requests share one cache entry.
 */

export const PNRR_OVERVIEW_API_PATH = '/api/pnrr/overview'

/** Response header naming the API release an answer was built from. */
export const PNRR_DASHBOARD_RELEASE_HEADER = 'x-pnrr-release-id'

/** Release ids as the API issues them; anything else is refused before any work. */
export const PNRR_RELEASE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/

export const PNRR_OVERVIEW_PARTS = [
  'summary',
  'map-preview',
  'projects',
  'beneficiaries',
  'anomalies',
  'map',
  'facets',
  'project',
  'beneficiary',
  'csv',
] as const

export type PnrrOverviewPart = (typeof PNRR_OVERVIEW_PARTS)[number]

export const PNRR_MAP_SERIES_IDS = [
  'total-value',
  'project-count',
  'per-capita',
  'grant-share',
  'implementation-rate',
] as const satisfies readonly PnrrMapSeriesId[]

/** Detail parameters, named apart from the page's own search keys. */
export type PnrrOverviewPartParams = {
  readonly series?: PnrrMapSeriesId
  readonly projectId?: string | null
  readonly detailKey?: string | null
  readonly detailCui?: string | null
}

export const PNRR_DETAIL_PARAM_MAX_LENGTH = 512

export type PnrrOverviewMapSelection = {
  readonly panel?: 'map-uat'
  readonly panelUatSiruta?: string
}

export function pnrrOverviewQueryKey(releaseId: string | null, searchKey: string) {
  return ['pnrr-overview', releaseId, searchKey] as const
}

export function pnrrOverviewMapPreviewQueryKey(
  releaseId: string | null,
  mapSearchKey: string,
) {
  return ['pnrr-overview-map-preview', releaseId, mapSearchKey] as const
}

export function pnrrDashboardPartQueryKey(
  releaseId: string | null,
  part: PnrrOverviewPart,
  partKey: string,
) {
  return ['pnrr-dashboard', releaseId, part, partKey] as const
}

export function buildPnrrOverviewSearchKey(
  search: Partial<PnrrSearchState> = {},
): string {
  return buildPnrrSeoSnapshotSearchKey(search)
}

export function pickPnrrOverviewMapSelection(
  search: Partial<PnrrSearchState> = {},
): PnrrOverviewMapSelection {
  const siruta = search.panelUatSiruta?.trim()
  if (search.panel === 'map-uat' && siruta) {
    return { panel: 'map-uat', panelUatSiruta: siruta }
  }
  return {}
}

export function buildPnrrOverviewMapSearchKey(
  search: Partial<PnrrSearchState> = {},
): string {
  return JSON.stringify([
    buildPnrrOverviewSearchKey(search),
    pickPnrrOverviewMapSelection(search).panelUatSiruta ?? null,
  ])
}

const PAGE_KEYS = ['page', 'pageSize', 'sortBy', 'sortOrder'] as const

const PART_EXTRA_KEYS: Readonly<
  Record<PnrrOverviewPart, readonly (keyof PnrrSearchState)[]>
> = {
  summary: [],
  'map-preview': [],
  projects: PAGE_KEYS,
  anomalies: PAGE_KEYS,
  beneficiaries: [
    'beneficiaryPage',
    'beneficiarySortBy',
    'beneficiarySortOrder',
  ],
  map: ['granularity'],
  facets: [],
  project: [],
  beneficiary: [],
  csv: ['sortBy', 'sortOrder'],
}

/** Parts that answer for the whole release, whatever the filters. */
const PARTS_WITHOUT_FILTERS: ReadonlySet<PnrrOverviewPart> = new Set([
  'facets',
  'project',
])

function pickMapPanelSelection(
  search: Partial<PnrrSearchState>,
): Partial<PnrrSearchState> {
  if (search.panel === 'map-county' && search.panelCountyCode) {
    return { panel: 'map-county', panelCountyCode: search.panelCountyCode }
  }
  if (search.panel === 'map-uat' && search.panelUatSiruta) {
    return { panel: 'map-uat', panelUatSiruta: search.panelUatSiruta }
  }
  return {}
}

function sortObjectKeys(
  value: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
  )
}

/** The search a part depends on: the data filters plus its own keys. */
export function buildPnrrDashboardPartSearch(
  part: PnrrOverviewPart,
  search: Partial<PnrrSearchState> = {},
): Partial<PnrrSearchState> {
  if (PARTS_WITHOUT_FILTERS.has(part)) return {}
  const cleaned = cleanPnrrSearch(search)
  const partSearch: Record<string, unknown> = {
    ...normalizePnrrSeoSnapshotSearch(search),
  }
  for (const key of PART_EXTRA_KEYS[part]) {
    if (cleaned[key] !== undefined) partSearch[key] = cleaned[key]
  }
  if (part === 'map-preview') {
    Object.assign(partSearch, pickPnrrOverviewMapSelection(search))
  }
  if (part === 'map') Object.assign(partSearch, pickMapPanelSelection(cleaned))
  return sortObjectKeys(partSearch) as Partial<PnrrSearchState>
}

export function buildPnrrDashboardPartKey(
  part: PnrrOverviewPart,
  search: Partial<PnrrSearchState> = {},
  params: PnrrOverviewPartParams = {},
): string {
  return JSON.stringify([
    buildPnrrDashboardPartSearch(part, search),
    params.series ?? null,
    params.projectId ?? null,
    params.detailKey ?? null,
    params.detailCui ?? null,
  ])
}

function appendSearchEntries(
  query: URLSearchParams,
  search: Readonly<Record<string, unknown>>,
): void {
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      query.set(key, JSON.stringify(value))
      continue
    }
    query.set(key, String(value))
  }
}

/**
 * The URL of one part for a page search: the part's normalised search in the
 * page's own search-param format (arrays as JSON), pinned to the release.
 */
export function buildPnrrOverviewRequestPath(
  search: Partial<PnrrSearchState> = {},
  part: PnrrOverviewPart = 'summary',
  options: {
    readonly releaseId?: string | null
    readonly params?: PnrrOverviewPartParams
  } = {},
): string {
  const query = new URLSearchParams()
  if (options.releaseId) query.set('release', options.releaseId)
  if (part !== 'summary') query.set('part', part)
  appendSearchEntries(query, buildPnrrDashboardPartSearch(part, search))
  const params = options.params ?? {}
  if (params.series) query.set('series', params.series)
  if (params.projectId) query.set('projectId', params.projectId)
  if (params.detailKey) query.set('detailKey', params.detailKey)
  if (params.detailCui) query.set('detailCui', params.detailCui)
  return `${PNRR_OVERVIEW_API_PATH}?${query.toString()}`
}
