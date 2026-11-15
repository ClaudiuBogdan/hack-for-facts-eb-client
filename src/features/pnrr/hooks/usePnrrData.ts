import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type { PnrrProject, PnrrSearchState } from '@/schemas/pnrr'
import type { PnrrMapSeriesId } from './usePnrrMapSeries'
import { pnrrLiveQueryKeys } from './use-pnrr-live-data'
import { usePnrrDashboardReleaseId } from '../lib/pnrr-release-context'
import {
  buildPnrrDashboardPartKey,
  buildPnrrOverviewMapSearchKey,
  buildPnrrOverviewRequestPath,
  buildPnrrOverviewSearchKey,
  PNRR_DASHBOARD_RELEASE_HEADER,
  pnrrDashboardPartQueryKey,
  pnrrOverviewMapPreviewQueryKey,
  pnrrOverviewQueryKey,
  type PnrrOverviewPart,
  type PnrrOverviewPartParams,
} from '../lib/pnrr-overview-request'
import type {
  PnrrServerOverview,
  PnrrServerOverviewMapPreview,
  PnrrWorkerAnomalyModel,
  PnrrWorkerBeneficiaryDetail,
  PnrrWorkerBeneficiaryPage,
  PnrrWorkerFilterFacets,
  PnrrWorkerMapModel,
  PnrrWorkerProjectPage,
} from '../workers/pnrr-worker-types'

/*
 * The dashboard's reads. Every answer is built on the web server
 * (`/api/pnrr/overview`) from the active API release by the dashboard's pure
 * query model, so the browser never downloads the dataset: it asks for the one
 * page, model or detail it shows. Requests and query keys carry the release
 * the dashboard is showing; an answer from any other release is refused, and
 * the release is re-read, rather than mixed in.
 */

/** The server answered for another release than the one this page shows. */
export class PnrrDashboardReleaseMismatchError extends Error {
  constructor(
    readonly requestedReleaseId: string,
    readonly servedReleaseId: string | null,
  ) {
    super(
      `PNRR release changed: asked for ${requestedReleaseId}, the server has ${
        servedReleaseId ?? 'another release'
      }`,
    )
    this.name = 'PnrrDashboardReleaseMismatchError'
  }
}

const DASHBOARD_RETRY_COUNT = 1

function retryUnlessReleaseMismatch(failureCount: number, error: unknown) {
  return (
    !(error instanceof PnrrDashboardReleaseMismatchError) &&
    failureCount < DASHBOARD_RETRY_COUNT
  )
}

async function readReleaseFromBody(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { readonly releaseId?: unknown }
    return typeof body.releaseId === 'string' ? body.releaseId : null
  } catch {
    return null
  }
}

/**
 * One release-pinned request. A 409, or an answer built from another release,
 * makes the page re-read the active release instead of showing the answer.
 */
async function fetchPinned(
  queryClient: QueryClient,
  path: string,
  releaseId: string,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(path, {
    headers: { accept: 'application/json, text/csv' },
    signal,
  })
  const servedReleaseId =
    response.status === 409
      ? await readReleaseFromBody(response)
      : response.headers.get(PNRR_DASHBOARD_RELEASE_HEADER)

  if (response.status === 409 || (response.ok && servedReleaseId !== releaseId)) {
    void queryClient.invalidateQueries({ queryKey: pnrrLiveQueryKeys.status() })
    throw new PnrrDashboardReleaseMismatchError(releaseId, servedReleaseId)
  }
  if (!response.ok) {
    throw new Error(`Failed to load the PNRR overview: ${response.status}`)
  }
  return response
}

async function fetchPinnedJson<TResult>(
  queryClient: QueryClient,
  path: string,
  releaseId: string,
  signal?: AbortSignal,
): Promise<TResult> {
  const response = await fetchPinned(queryClient, path, releaseId, signal)
  return (await response.json()) as TResult
}

/** Keeps the previous answer while the next one loads, but never across releases. */
function sameReleasePlaceholder<TData>(releaseId: string | null) {
  return (
    previousData: TData | undefined,
    previousQuery: { readonly queryKey: readonly unknown[] } | undefined,
  ): TData | undefined =>
    previousQuery?.queryKey[1] === releaseId ? previousData : undefined
}

type PartOptions = {
  readonly enabled: boolean
  readonly params?: PnrrOverviewPartParams
  readonly keepPrevious?: boolean
}

function usePnrrDashboardPart<TResult>(
  part: PnrrOverviewPart,
  search: Partial<PnrrSearchState> | undefined,
  options: PartOptions,
) {
  const releaseId = usePnrrDashboardReleaseId()
  const queryClient = useQueryClient()
  const partKey = buildPnrrDashboardPartKey(part, search, options.params)

  return useQuery<TResult>({
    queryKey: pnrrDashboardPartQueryKey(releaseId, part, partKey),
    queryFn: ({ signal }) =>
      fetchPinnedJson<TResult>(
        queryClient,
        buildPnrrOverviewRequestPath(search, part, {
          releaseId,
          params: options.params,
        }),
        releaseId ?? '',
        signal,
      ),
    enabled: options.enabled && releaseId !== null,
    // A release-pinned answer never changes.
    staleTime: Infinity,
    retry: retryUnlessReleaseMismatch,
    placeholderData:
      options.keepPrevious === false
        ? undefined
        : (previousData, previousQuery) =>
            previousQuery?.queryKey[1] === releaseId ? previousData : undefined,
  })
}

/**
 * The overview the server builds for these filters. The server render puts it
 * in the query cache when the release model is in memory.
 */
export function usePnrrServerOverview(
  search: Partial<PnrrSearchState> | undefined,
  options: { readonly enabled: boolean },
) {
  const releaseId = usePnrrDashboardReleaseId()
  const queryClient = useQueryClient()
  const searchKey = buildPnrrOverviewSearchKey(search)

  return useQuery<PnrrServerOverview>({
    queryKey: pnrrOverviewQueryKey(releaseId, searchKey),
    queryFn: ({ signal }) =>
      fetchPinnedJson<PnrrServerOverview>(
        queryClient,
        buildPnrrOverviewRequestPath(search, 'summary', { releaseId }),
        releaseId ?? '',
        signal,
      ),
    enabled: options.enabled && releaseId !== null,
    staleTime: Infinity,
    retry: retryUnlessReleaseMismatch,
    placeholderData: sameReleasePlaceholder<PnrrServerOverview>(releaseId),
  })
}

/** The overview's UAT map preview, fetched apart once the map section is on screen. */
export function usePnrrServerOverviewMapPreview(
  search: Partial<PnrrSearchState> | undefined,
  options: { readonly enabled: boolean },
) {
  const releaseId = usePnrrDashboardReleaseId()
  const queryClient = useQueryClient()
  const mapSearchKey = buildPnrrOverviewMapSearchKey(search)

  return useQuery<PnrrServerOverviewMapPreview>({
    queryKey: pnrrOverviewMapPreviewQueryKey(releaseId, mapSearchKey),
    queryFn: ({ signal }) =>
      fetchPinnedJson<PnrrServerOverviewMapPreview>(
        queryClient,
        buildPnrrOverviewRequestPath(search, 'map-preview', { releaseId }),
        releaseId ?? '',
        signal,
      ),
    enabled: options.enabled && releaseId !== null,
    staleTime: Infinity,
    retry: retryUnlessReleaseMismatch,
    placeholderData:
      sameReleasePlaceholder<PnrrServerOverviewMapPreview>(releaseId),
  })
}

export function usePnrrProjectPage(
  search: Partial<PnrrSearchState> | undefined,
  options: { readonly enabled: boolean },
) {
  return usePnrrDashboardPart<PnrrWorkerProjectPage>('projects', search, options)
}

export function usePnrrBeneficiaryPage(
  search: Partial<PnrrSearchState> | undefined,
  options: { readonly enabled: boolean },
) {
  return usePnrrDashboardPart<PnrrWorkerBeneficiaryPage>(
    'beneficiaries',
    search,
    options,
  )
}

export function usePnrrAnomalyModel(
  search: Partial<PnrrSearchState> | undefined,
  options: { readonly enabled: boolean },
) {
  return usePnrrDashboardPart<PnrrWorkerAnomalyModel>(
    'anomalies',
    search,
    options,
  )
}

/** The filter options of the whole release, read once the filter sheet opens. */
export function usePnrrFilterFacets(options: { readonly enabled: boolean }) {
  return usePnrrDashboardPart<PnrrWorkerFilterFacets>('facets', undefined, {
    ...options,
    keepPrevious: false,
  })
}

/** The map tab's model for one series; the dashboard reads the default series the same way. */
export function usePnrrMapModel(
  search?: Partial<PnrrSearchState>,
  mapSeriesId: PnrrMapSeriesId = 'total-value',
  options: { readonly enabled: boolean } = { enabled: true },
) {
  return usePnrrDashboardPart<{ readonly mapModel: PnrrWorkerMapModel }>(
    'map',
    search,
    { ...options, params: { series: mapSeriesId } },
  )
}

export function usePnrrProjectDetail(projectId?: string | null) {
  const releaseId = usePnrrDashboardReleaseId()
  const query = usePnrrDashboardPart<{ readonly project: PnrrProject | null }>(
    'project',
    undefined,
    {
      enabled: Boolean(projectId),
      params: { projectId: projectId ?? null },
      keepPrevious: false,
    },
  )

  return {
    data: query.data ?? { project: null },
    error: query.error,
    isError: query.isError,
    // Until the release is known the detail cannot be asked for yet.
    isLoading: Boolean(projectId) && (releaseId === null || query.isLoading),
  }
}

export function usePnrrBeneficiaryDetail(
  key: string | null,
  search?: Partial<PnrrSearchState>,
  cui?: string | null,
) {
  const releaseId = usePnrrDashboardReleaseId()
  const enabled = Boolean(key || cui)
  const query = usePnrrDashboardPart<{
    readonly beneficiary: PnrrWorkerBeneficiaryDetail | null
  }>('beneficiary', search, {
    enabled,
    params: { detailKey: key, detailCui: cui ?? null },
    keepPrevious: false,
  })

  return {
    data: query.data ?? { beneficiary: null },
    error: query.error,
    isError: query.isError,
    isLoading: enabled && (releaseId === null || query.isLoading),
  }
}

/** The CSV of every project matching the filters, built by the server for this release. */
export async function exportPnrrCsv({
  queryClient,
  search,
  releaseId,
}: {
  readonly queryClient: QueryClient
  readonly search?: Partial<PnrrSearchState>
  readonly releaseId: string
}): Promise<string> {
  const response = await fetchPinned(
    queryClient,
    buildPnrrOverviewRequestPath(search, 'csv', { releaseId }),
    releaseId,
  )
  return response.text()
}
