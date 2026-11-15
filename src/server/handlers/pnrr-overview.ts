import {
  computeAggregates,
  flattenPnrrProjectRecords,
} from '@/features/pnrr/lib/data-transform'
import {
  buildPnrrDashboardPartSearch,
  buildPnrrOverviewMapSearchKey,
  buildPnrrOverviewSearchKey,
  PNRR_DASHBOARD_RELEASE_HEADER,
  PNRR_DETAIL_PARAM_MAX_LENGTH,
  PNRR_MAP_SERIES_IDS,
  PNRR_OVERVIEW_PARTS,
  PNRR_RELEASE_ID_PATTERN,
  pickPnrrOverviewMapSelection,
  type PnrrOverviewPart,
} from '@/features/pnrr/lib/pnrr-overview-request'
import {
  normalizePnrrSeoSnapshotSearch,
  type PnrrSeoSnapshotSearch,
} from '@/features/pnrr/seo/pnrr-seo'
import { PnrrReleaseDivergenceError } from '@/features/pnrr/hooks/use-pnrr-live-data'
import type { PnrrMapSeriesId } from '@/features/pnrr/hooks/usePnrrMapSeries'
import {
  buildAnomalyModel,
  buildBeneficiaryPage,
  buildCsv,
  buildFilterFacets,
  buildMapModel,
  buildOverviewMapPreview,
  buildOverviewSummary,
  buildProjectPage,
  buildQueryMeta,
  findBeneficiaryDetail,
  findPnrrProject,
  getFilteredProjects,
} from '@/features/pnrr/workers/pnrr-query-model'
import type {
  PnrrOverviewMeta,
  PnrrServerOverview,
  PnrrServerOverviewMapPreview,
} from '@/features/pnrr/workers/pnrr-worker-types'
import { createLogger } from '@/lib/logger'
import {
  parsePnrrSearchString,
  type PnrrProject,
  type PnrrSearchState,
} from '@/schemas/pnrr'
import {
  loadPnrrReleaseModel,
  PnrrReleaseAbstainedError,
  readPnrrActiveRelease,
  readReadyPnrrReleaseModel,
  setPnrrDashboardModelBuiltHook,
  warmPnrrReleaseModel,
  type PnrrReleaseModel,
} from './pnrr-dashboard-release'

/*
 * The PNRR dashboard's answers, built on the web server with the worker's own
 * code (`pnrr-query-model.ts`) from the active API release's model, so the
 * browser downloads no dataset. `/api/pnrr/overview` serves the overview, its
 * map preview and the explorer parts (project/beneficiary pages, anomalies,
 * map, filter options, details and the CSV export); the server render reads
 * the overview from memory only.
 *
 * Every answer is pinned to one release: the request names it, the answer's
 * header repeats it, and a request for a release that is no longer active is
 * refused with 409 so the page re-reads the release instead of mixing two.
 *
 * Memory: the answer caches live on the release model and are bounded (LRU);
 * an overview is ~64 KB of JSON, a map preview ~650 KB (kept as its JSON).
 */

const OVERVIEW_CACHE_LIMIT = 32
const MAP_PREVIEW_CACHE_LIMIT = 8
const MAX_OVERVIEW_QUERY_LENGTH = 4096
/** Pinned to a release, an answer cannot change: the CDN may keep it. */
const RELEASE_PINNED_CACHE_CONTROL =
  'public, max-age=60, s-maxage=3600, stale-while-revalidate=600'
/** Without a release in the URL, the answer follows the active release. */
const UNPINNED_CACHE_CONTROL = 'public, max-age=0, s-maxage=60'

const logger = createLogger('pnrr-overview')
const PART_SET: ReadonlySet<string> = new Set(PNRR_OVERVIEW_PARTS)
const SERIES_SET: ReadonlySet<string> = new Set(PNRR_MAP_SERIES_IDS)

function rememberInCache<TEntry>(
  cache: Map<string, TEntry>,
  key: string,
  entry: TEntry,
  limit: number,
): void {
  cache.delete(key)
  cache.set(key, entry)
  while (cache.size > limit) {
    const oldestKey = cache.keys().next().value
    if (oldestKey === undefined) break
    cache.delete(oldestKey)
  }
}

function readFromCache<TEntry>(
  cache: Map<string, TEntry>,
  key: string,
): TEntry | undefined {
  const entry = cache.get(key)
  if (entry === undefined) return undefined
  cache.delete(key)
  cache.set(key, entry)
  return entry
}

function readUatLabels(model: PnrrReleaseModel): ReadonlyMap<string, string> {
  if (model.uatLabels) return model.uatLabels
  const labels = new Map(
    buildFilterFacets(model.model.records).uats.map((uat) => [
      uat.value,
      uat.label,
    ]),
  )
  model.uatLabels = labels
  return labels
}

function readFacetsJson(model: PnrrReleaseModel): string {
  model.facetsJson ??= JSON.stringify(buildFilterFacets(model.model.records))
  return model.facetsJson
}

function pickOverviewMeta(
  meta: ReturnType<typeof buildQueryMeta>,
): PnrrOverviewMeta {
  return {
    projectCount: meta.projectCount,
    projectRecordCount: meta.projectRecordCount,
    beneficiaryPaymentCount: meta.beneficiaryPaymentCount,
    officialAllocatedTotalEur: meta.officialAllocatedTotalEur,
    officialPaidTotalEur: meta.officialPaidTotalEur,
    paidBeneficiaryCount: meta.paidBeneficiaryCount,
    paymentCapability: meta.paymentCapability,
    indicatorCapability: meta.indicatorCapability,
  }
}

function buildOverviewLabels(
  model: PnrrReleaseModel,
  search: PnrrSeoSnapshotSearch,
  projects: readonly PnrrProject[],
): PnrrServerOverview['labels'] {
  const sirutas = [search.uatSiruta, ...(search.uatSirutas ?? [])].filter(
    (siruta): siruta is string => Boolean(siruta),
  )
  const uatLabels = sirutas.length > 0 ? readUatLabels(model) : null
  const beneficiary = search.beneficiaryCui
    ? findBeneficiaryDetail(projects, { cui: search.beneficiaryCui })
    : null

  return {
    uats: sirutas.flatMap((siruta) => {
      const label = uatLabels?.get(siruta)
      return label ? [{ siruta, label }] : []
    }),
    beneficiaries:
      beneficiary?.cui && beneficiary.name
        ? [{ cui: beneficiary.cui, name: beneficiary.name }]
        : [],
  }
}

function filteredProjects(
  model: PnrrReleaseModel,
  search: Partial<PnrrSearchState>,
): readonly PnrrProject[] {
  return getFilteredProjects(model.model, search, model.filteredProjectsCache)
}

/** The worker's `query()` overview for these filters, without the map preview. */
export function buildServerOverview(
  model: PnrrReleaseModel,
  search: PnrrSeoSnapshotSearch,
): PnrrServerOverview {
  const projects = filteredProjects(model, search)
  const records = flattenPnrrProjectRecords(projects)
  const aggregates = computeAggregates(projects)

  return {
    fileSetId: model.releaseId,
    overview: buildOverviewSummary(model.model, projects, records, aggregates),
    meta: pickOverviewMeta(buildQueryMeta(model.model, aggregates)),
    labels: buildOverviewLabels(model, search, projects),
  }
}

function readOrBuildOverview(
  model: PnrrReleaseModel,
  search: Partial<PnrrSearchState>,
): PnrrServerOverview {
  const normalizedSearch = normalizePnrrSeoSnapshotSearch(search)
  const key = buildPnrrOverviewSearchKey(normalizedSearch)
  const cached = readFromCache(model.overviewCache, key)
  if (cached) return cached

  const value = buildServerOverview(model, normalizedSearch)
  rememberInCache(model.overviewCache, key, value, OVERVIEW_CACHE_LIMIT)
  return value
}

function readOrBuildMapPreviewJson(
  model: PnrrReleaseModel,
  search: Partial<PnrrSearchState>,
): string {
  const key = buildPnrrOverviewMapSearchKey(search)
  const cached = readFromCache(model.mapPreviewCache, key)
  if (cached) return cached

  const normalizedSearch = normalizePnrrSeoSnapshotSearch(search)
  const projects = filteredProjects(model, normalizedSearch)
  const body = JSON.stringify({
    fileSetId: model.releaseId,
    mapPreview: buildOverviewMapPreview(flattenPnrrProjectRecords(projects), {
      ...normalizedSearch,
      ...pickPnrrOverviewMapSelection(search),
    }),
  } satisfies PnrrServerOverviewMapPreview)
  rememberInCache(model.mapPreviewCache, key, body, MAP_PREVIEW_CACHE_LIMIT)
  return body
}

// The unfiltered overview is the arithmetic every first visit needs: build
// it with the model, before any page asks for it.
setPnrrDashboardModelBuiltHook((model) => {
  readOrBuildOverview(model, {})
})

/**
 * The overview for the server render of `/pnrr`, from memory only: null while
 * this release's model is not built yet (the load starts in the background and
 * the page asks `/api/pnrr/overview`). The release is the one the route read
 * from the API for this render.
 */
export function readPnrrOverviewForSsr(
  search: Partial<PnrrSearchState>,
  releaseId: string,
): PnrrServerOverview | null {
  const model = readReadyPnrrReleaseModel(releaseId)
  if (model) return readOrBuildOverview(model, search)
  void readPnrrActiveRelease(releaseId)
    .then((active) => {
      if (active.releaseId === releaseId) warmPnrrReleaseModel(active)
    })
    .catch(() => {
      // The page's own request reports the failure.
    })
  return null
}

type PartAnswer = {
  readonly body: string
  readonly contentType: string
  readonly disposition?: string
}

const json = (value: unknown): PartAnswer => ({
  body: JSON.stringify(value),
  contentType: 'application/json',
})

function readDetailParam(url: URL, name: string): string | null {
  const value = url.searchParams.get(name)?.trim()
  return value ? value : null
}

function answerPart(
  model: PnrrReleaseModel,
  part: PnrrOverviewPart,
  search: Partial<PnrrSearchState>,
  url: URL,
): PartAnswer | null {
  // Each part reads only the keys it depends on, as the client sent them.
  const partSearch = buildPnrrDashboardPartSearch(part, search)

  switch (part) {
    case 'summary':
      return json(readOrBuildOverview(model, partSearch))
    case 'map-preview':
      return {
        body: readOrBuildMapPreviewJson(model, partSearch),
        contentType: 'application/json',
      }
    case 'projects':
      return json(buildProjectPage(filteredProjects(model, partSearch), partSearch))
    case 'beneficiaries':
      return json(
        buildBeneficiaryPage(filteredProjects(model, partSearch), partSearch),
      )
    case 'anomalies':
      // As the worker: the signal filters pick rows, not the base set.
      return json(
        buildAnomalyModel(
          filteredProjects(model, {
            ...partSearch,
            onlyAnomalies: undefined,
            anomalyTypes: undefined,
            dataQualitySignalTypes: undefined,
          }),
          partSearch,
        ),
      )
    case 'map': {
      const series = url.searchParams.get('series') ?? 'total-value'
      if (!SERIES_SET.has(series)) return null
      return json({
        mapModel: buildMapModel(
          flattenPnrrProjectRecords(filteredProjects(model, partSearch)),
          partSearch,
          series as PnrrMapSeriesId,
          partSearch.granularity === 'uat' ? 'uat' : 'county',
        ),
      })
    }
    case 'facets':
      return { body: readFacetsJson(model), contentType: 'application/json' }
    case 'project': {
      const projectId = readDetailParam(url, 'projectId')
      if (!projectId) return null
      return json({ project: findPnrrProject(model.model, projectId) })
    }
    case 'beneficiary': {
      const key = readDetailParam(url, 'detailKey')
      const cui = readDetailParam(url, 'detailCui')
      if (!key && !cui) return null
      return json({
        beneficiary: findBeneficiaryDetail(filteredProjects(model, partSearch), {
          key,
          cui,
        }),
      })
    }
    case 'csv': {
      const safeReleaseId = model.releaseId.replace(/[^a-zA-Z0-9._-]/g, '_')
      return {
        body: buildCsv(
          filteredProjects(model, partSearch),
          partSearch,
          model.releaseId,
        ),
        contentType: 'text/csv; charset=utf-8',
        disposition: `attachment; filename="pnrr-projects-${safeReleaseId}.csv"`,
      }
    }
  }
}

function errorResponse(
  status: number,
  error: string,
  extra: Readonly<Record<string, string>> = {},
): Response {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  })
}

function hasInvalidPartInput(part: string, url: URL): boolean {
  if (
    ['projectId', 'detailKey', 'detailCui'].some(
      (name) =>
        (url.searchParams.get(name)?.length ?? 0) > PNRR_DETAIL_PARAM_MAX_LENGTH,
    )
  ) {
    return true
  }
  if (part === 'project') return readDetailParam(url, 'projectId') === null
  if (part === 'beneficiary') {
    return (
      readDetailParam(url, 'detailKey') === null &&
      readDetailParam(url, 'detailCui') === null
    )
  }
  return part === 'map' && !SERIES_SET.has(url.searchParams.get('series') ?? 'total-value')
}

export async function handlePnrrOverviewRequest(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url)
  if (url.search.length > MAX_OVERVIEW_QUERY_LENGTH) {
    return errorResponse(414, 'query_too_long')
  }

  const part = url.searchParams.get('part') ?? 'summary'
  const declaredRelease = url.searchParams.get('release')
  if (
    !PART_SET.has(part) ||
    (declaredRelease !== null && !PNRR_RELEASE_ID_PATTERN.test(declaredRelease)) ||
    hasInvalidPartInput(part, url)
  ) {
    return errorResponse(400, 'invalid_request')
  }

  let search: Partial<PnrrSearchState>
  try {
    search = parsePnrrSearchString(url.search)
  } catch {
    return errorResponse(400, 'invalid_search')
  }

  try {
    const active = await readPnrrActiveRelease(declaredRelease)
    if (declaredRelease && declaredRelease !== active.releaseId) {
      return errorResponse(409, 'release_mismatch', {
        releaseId: active.releaseId,
      })
    }
    const model = await loadPnrrReleaseModel(active)
    const answer = answerPart(model, part as PnrrOverviewPart, search, url)
    if (!answer) return errorResponse(400, 'invalid_request')

    return new Response(answer.body, {
      status: 200,
      headers: {
        'content-type': answer.contentType,
        'cache-control': declaredRelease
          ? RELEASE_PINNED_CACHE_CONTROL
          : UNPINNED_CACHE_CONTROL,
        vary: 'Accept-Encoding',
        [PNRR_DASHBOARD_RELEASE_HEADER]: model.releaseId,
        ...(answer.disposition
          ? { 'content-disposition': answer.disposition }
          : {}),
      },
    })
  } catch (error) {
    if (error instanceof PnrrReleaseAbstainedError) {
      return errorResponse(503, 'release_abstained', {
        releaseId: error.releaseId,
      })
    }
    if (error instanceof PnrrReleaseDivergenceError) {
      return errorResponse(503, 'release_changing')
    }
    logger.error('PNRR dashboard request failed', {
      part,
      error: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(502, 'fetch_failed')
  }
}
