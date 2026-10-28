import {
  computeAggregates,
  filterProjectsBySearch,
  flattenPnrrProjectRecords,
} from '@/features/pnrr/lib/data-transform'
import {
  buildPnrrOverviewMapSearchKey,
  buildPnrrOverviewSearchKey,
  pickPnrrOverviewMapSelection,
} from '@/features/pnrr/lib/pnrr-overview-request'
import { PNRR_FILESET_ID } from '@/features/pnrr/lib/snapshot'
import {
  normalizePnrrSeoSnapshotSearch,
  type PnrrSeoSnapshotSearch,
} from '@/features/pnrr/seo/pnrr-seo'
import {
  assemblePnrrWorkerModel,
  buildFilterFacets,
  buildOverviewMapPreview,
  buildOverviewSummary,
  buildQueryMeta,
  findBeneficiaryDetail,
} from '@/features/pnrr/workers/pnrr-query-model'
import type {
  PnrrOverviewMeta,
  PnrrServerOverview,
  PnrrServerOverviewMapPreview,
  PnrrWorkerModel,
} from '@/features/pnrr/workers/pnrr-worker-types'
import {
  parsePnrrSearchString,
  type PnrrBeneficiaryPayment,
  type PnrrOfficialIndicators,
  type PnrrProject,
  type PnrrSearchState,
} from '@/schemas/pnrr'
import {
  fetchPnrrBeneficiaryPayments,
  fetchPnrrOfficialIndicators,
  fetchPnrrProjects,
  readCachedPnrrBeneficiaryPaymentsResult,
  readCachedPnrrOfficialIndicatorsResult,
  readCachedPnrrProjectsResult,
} from './pnrr-data-proxy'

/*
 * The PNRR overview, built on the server with the worker's own code
 * (`pnrr-query-model.ts`) from the files the worker would download, so the
 * default view of `/pnrr` needs none of the 3.4 MB raw dataset. Rendered in SSR
 * when the data is in memory, and served by `/api/pnrr/overview` otherwise and
 * for the map preview.
 *
 * Memory: both caches are bounded (LRU) and emptied when the data refreshes;
 * an overview is ~64 KB of JSON, a map preview ~650 KB (kept as its JSON).
 */

const OVERVIEW_CACHE_LIMIT = 32
const MAP_PREVIEW_CACHE_LIMIT = 8
const MAX_OVERVIEW_QUERY_LENGTH = 4096
const OVERVIEW_CACHE_CONTROL =
  'public, max-age=60, s-maxage=3600, stale-while-revalidate=600'

type ServerModel = {
  readonly model: PnrrWorkerModel
  readonly generation: number
  readonly stale: boolean
  readonly degraded: boolean
}

type ServerModelInputs = {
  readonly projects: {
    readonly data: readonly PnrrProject[]
    readonly projectCount: number
    readonly projectRecordCount: number
    readonly stale: boolean
  }
  readonly payments: {
    readonly data: readonly PnrrBeneficiaryPayment[]
    readonly stale: boolean
  } | null
  readonly indicators: {
    readonly data: PnrrOfficialIndicators | null
    readonly stale: boolean
  } | null
}

let modelGeneration = 0
let cachedModel: {
  readonly projects: readonly PnrrProject[]
  readonly payments: readonly PnrrBeneficiaryPayment[] | null
  readonly indicators: PnrrOfficialIndicators | null | undefined
  readonly value: ServerModel
} | null = null
let cachedUatLabels: {
  readonly generation: number
  readonly labels: ReadonlyMap<string, string>
} | null = null
const overviewCache = new Map<
  string,
  { readonly generation: number; readonly value: PnrrServerOverview }
>()
const mapPreviewCache = new Map<
  string,
  { readonly generation: number; readonly json: string }
>()
let pendingDataWarmup: Promise<void> | null = null

function assembleServerModel(inputs: ServerModelInputs): ServerModel {
  const stale = Boolean(
    inputs.projects.stale || inputs.payments?.stale || inputs.indicators?.stale,
  )
  const degraded = inputs.payments === null || inputs.indicators === null
  const indicatorsData =
    inputs.indicators === null ? undefined : inputs.indicators.data

  if (
    cachedModel &&
    cachedModel.projects === inputs.projects.data &&
    cachedModel.payments === (inputs.payments?.data ?? null) &&
    cachedModel.indicators === indicatorsData
  ) {
    if (cachedModel.value.stale !== stale) {
      cachedModel = { ...cachedModel, value: { ...cachedModel.value, stale } }
    }
    return cachedModel.value
  }

  modelGeneration += 1
  overviewCache.clear()
  mapPreviewCache.clear()
  cachedUatLabels = null

  const model = assemblePnrrWorkerModel({
    projects: inputs.projects.data,
    projectRecords: flattenPnrrProjectRecords(inputs.projects.data),
    projectCount: inputs.projects.projectCount,
    projectRecordCount: inputs.projects.projectRecordCount,
    beneficiaryPayments: {
      available: inputs.payments !== null,
      data: inputs.payments?.data ?? [],
    },
    indicators: {
      available: inputs.indicators !== null,
      data: inputs.indicators?.data ?? null,
    },
  })
  const value = { model, generation: modelGeneration, stale, degraded }
  cachedModel = {
    projects: inputs.projects.data,
    payments: inputs.payments?.data ?? null,
    indicators: indicatorsData,
    value,
  }
  return value
}

function warmServerOverviewData(): void {
  if (pendingDataWarmup) return
  pendingDataWarmup = Promise.allSettled([
    fetchPnrrProjects(),
    fetchPnrrBeneficiaryPayments(),
    fetchPnrrOfficialIndicators(),
  ])
    .then(() => {
      // Build the unfiltered overview now (~0.5 s of CPU on the full dataset)
      // rather than inside the next page request.
      const serverModel = readCachedServerModel()
      if (serverModel && !serverModel.degraded) {
        readOrBuildOverview(serverModel, {})
      }
    })
    .catch((error) => {
      console.error('[pnrr-overview] Overview warm-up failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
    .finally(() => {
      pendingDataWarmup = null
    })
}

/** The model from memory only, for SSR; starts a refresh when it is missing or old. */
function readCachedServerModel(): ServerModel | null {
  const projects = readCachedPnrrProjectsResult({ allowStale: true })
  const payments = readCachedPnrrBeneficiaryPaymentsResult({ allowStale: true })
  const indicators = readCachedPnrrOfficialIndicatorsResult({ allowStale: true })

  if (!projects || !payments || !indicators) {
    warmServerOverviewData()
    return null
  }

  const serverModel = assembleServerModel({ projects, payments, indicators })
  if (serverModel.stale) warmServerOverviewData()
  return serverModel
}

async function loadServerModel(): Promise<ServerModel> {
  const [projects, payments, indicators] = await Promise.allSettled([
    fetchPnrrProjects(),
    fetchPnrrBeneficiaryPayments(),
    fetchPnrrOfficialIndicators(),
  ])
  if (projects.status === 'rejected') throw projects.reason

  return assembleServerModel({
    projects: projects.value,
    payments:
      payments.status === 'fulfilled'
        ? {
            data: payments.value.data,
            stale: payments.value.source === 'stale-cache',
          }
        : null,
    indicators:
      indicators.status === 'fulfilled'
        ? {
            data: indicators.value.data,
            stale: indicators.value.source === 'stale-cache',
          }
        : null,
  })
}

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

function readFromCache<TEntry extends { readonly generation: number }>(
  cache: Map<string, TEntry>,
  key: string,
  generation: number,
): TEntry | null {
  const entry = cache.get(key)
  if (!entry || entry.generation !== generation) return null
  cache.delete(key)
  cache.set(key, entry)
  return entry
}

function readUatLabels(serverModel: ServerModel): ReadonlyMap<string, string> {
  if (cachedUatLabels?.generation === serverModel.generation) {
    return cachedUatLabels.labels
  }
  const labels = new Map(
    buildFilterFacets(serverModel.model.records).uats.map((uat) => [
      uat.value,
      uat.label,
    ]),
  )
  cachedUatLabels = { generation: serverModel.generation, labels }
  return labels
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
  serverModel: ServerModel,
  search: PnrrSeoSnapshotSearch,
  projects: readonly PnrrProject[],
): PnrrServerOverview['labels'] {
  const sirutas = [search.uatSiruta, ...(search.uatSirutas ?? [])].filter(
    (siruta): siruta is string => Boolean(siruta),
  )
  const uatLabels = sirutas.length > 0 ? readUatLabels(serverModel) : null
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

/** The worker's `query()` overview for these filters, without the map preview. */
export function buildServerOverview(
  serverModel: ServerModel,
  search: PnrrSeoSnapshotSearch,
): PnrrServerOverview {
  const { model } = serverModel
  const projects = filterProjectsBySearch(model.projects, search)
  const records = flattenPnrrProjectRecords(projects)
  const aggregates = computeAggregates(projects)

  return {
    fileSetId: PNRR_FILESET_ID,
    overview: buildOverviewSummary(model, projects, records, aggregates),
    meta: pickOverviewMeta(buildQueryMeta(model, aggregates)),
    labels: buildOverviewLabels(serverModel, search, projects),
  }
}

function readOrBuildOverview(
  serverModel: ServerModel,
  search: Partial<PnrrSearchState>,
): PnrrServerOverview {
  const normalizedSearch = normalizePnrrSeoSnapshotSearch(search)
  const key = buildPnrrOverviewSearchKey(normalizedSearch)
  const cached = readFromCache(overviewCache, key, serverModel.generation)
  if (cached) return cached.value

  const value = buildServerOverview(serverModel, normalizedSearch)
  rememberInCache(
    overviewCache,
    key,
    { generation: serverModel.generation, value },
    OVERVIEW_CACHE_LIMIT,
  )
  return value
}

function readOrBuildMapPreviewJson(
  serverModel: ServerModel,
  search: Partial<PnrrSearchState>,
): string {
  const key = buildPnrrOverviewMapSearchKey(search)
  const cached = readFromCache(mapPreviewCache, key, serverModel.generation)
  if (cached) return cached.json

  const normalizedSearch = normalizePnrrSeoSnapshotSearch(search)
  const projects = filterProjectsBySearch(
    serverModel.model.projects,
    normalizedSearch,
  )
  const json = JSON.stringify({
    fileSetId: PNRR_FILESET_ID,
    mapPreview: buildOverviewMapPreview(
      flattenPnrrProjectRecords(projects),
      { ...normalizedSearch, ...pickPnrrOverviewMapSelection(search) },
    ),
  } satisfies PnrrServerOverviewMapPreview)
  rememberInCache(
    mapPreviewCache,
    key,
    { generation: serverModel.generation, json },
    MAP_PREVIEW_CACHE_LIMIT,
  )
  return json
}

/**
 * The overview for the SSR of `/pnrr`, from memory only: null while the data is
 * not loaded (the page then asks `/api/pnrr/overview`). Never a degraded one.
 */
export function readPnrrOverviewForSsr(
  search: Partial<PnrrSearchState>,
): PnrrServerOverview | null {
  const serverModel = readCachedServerModel()
  if (!serverModel || serverModel.degraded) return null
  return readOrBuildOverview(serverModel, search)
}

function jsonResponse(
  body: string,
  status: number,
  cacheControl: string,
): Response {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': cacheControl,
      vary: 'Accept-Encoding',
    },
  })
}

export async function handlePnrrOverviewRequest(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url)
  if (url.search.length > MAX_OVERVIEW_QUERY_LENGTH) {
    return jsonResponse('{"error":"query_too_long"}', 414, 'no-store')
  }

  let search: Partial<PnrrSearchState>
  try {
    search = parsePnrrSearchString(url.search)
  } catch {
    return jsonResponse('{"error":"invalid_search"}', 400, 'no-store')
  }

  try {
    const serverModel = await loadServerModel()
    const cacheControl =
      serverModel.degraded ? 'no-store'
      : serverModel.stale ? 'public, max-age=0, s-maxage=0'
      : OVERVIEW_CACHE_CONTROL
    const body =
      url.searchParams.get('part') === 'map-preview'
        ? readOrBuildMapPreviewJson(serverModel, search)
        : JSON.stringify(readOrBuildOverview(serverModel, search))

    return jsonResponse(body, 200, cacheControl)
  } catch (error) {
    console.error('[pnrr-overview] Overview request failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return jsonResponse(
      JSON.stringify({
        error: 'fetch_failed',
        message: 'Unable to build the PNRR overview',
      }),
      502,
      'no-store',
    )
  }
}
