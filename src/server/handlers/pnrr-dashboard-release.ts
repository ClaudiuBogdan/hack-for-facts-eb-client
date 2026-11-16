import { getApiBaseUrl } from '@/config/env'
import {
  PNRR_RELEASE_QUERY,
  pnrrReleaseResponseSchema,
} from '@/features/pnrr/api/graphql/pnrr-queries'
import { PnrrReleaseDivergenceError } from '@/features/pnrr/hooks/use-pnrr-live-data'
import {
  buildPnrrWorkerModelFromApiSnapshot,
  createPnrrFilteredProjectsCache,
  type PnrrFilteredProjectsCache,
} from '@/features/pnrr/workers/pnrr-query-model'
import type {
  PnrrServerOverview,
  PnrrWorkerModel,
} from '@/features/pnrr/workers/pnrr-worker-types'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { createLogger } from '@/lib/logger'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import {
  pnrrDashboardSnapshotEnvelopeSchema,
  type PnrrLiveRelease,
} from '@/schemas/pnrr-live'

/*
 * The PNRR dashboard's data on the web server: the active API release and the
 * model the dashboard's pure query code (`pnrr-query-model.ts`) runs on, built
 * from that release's dashboard snapshot. The snapshot is server-only input:
 * the browser receives only the small answers built from it.
 *
 * - The active release is re-read at most every minute, and sooner when a
 *   browser declares a release this process has not seen yet.
 * - One snapshot fetch per release per process: concurrent loads share it, a
 *   failed load waits out a cooldown before the next try, and only the newest
 *   releases stay in memory.
 * - The snapshot read is bounded in time and size, validated, and must name
 *   the release it was asked for. Nothing falls back to the frozen S3 file set.
 */

/** Path of the API's server-only dashboard snapshot; the name is pending API confirmation. */
export const PNRR_DASHBOARD_SNAPSHOT_PATH = '/api/v1/pnrr/dashboard-snapshot'
export const PNRR_DASHBOARD_SNAPSHOT_TIMEOUT_MS = 60_000
export const PNRR_DASHBOARD_SNAPSHOT_MAX_BYTES = 192 * 1024 * 1024
const ACTIVE_RELEASE_TTL_MS = 60_000
const ACTIVE_RELEASE_REFRESH_MIN_INTERVAL_MS = 5_000
const ACTIVE_RELEASE_TIMEOUT_MS = 5_000
const LOAD_FAILURE_COOLDOWN_MS = 30_000
const RELEASE_MODEL_LIMIT = 2

const logger = createLogger('pnrr-dashboard-release')

/** One release's model and the per-release answer caches built on it. */
export type PnrrReleaseModel = {
  readonly releaseId: string
  readonly release: PnrrLiveRelease
  readonly model: PnrrWorkerModel
  readonly filteredProjectsCache: PnrrFilteredProjectsCache
  readonly overviewCache: Map<string, PnrrServerOverview>
  readonly mapPreviewCache: Map<string, string>
  facetsJson: string | null
  uatLabels: ReadonlyMap<string, string> | null
}

/** The active release withholds its facts: there is nothing to build. */
export class PnrrReleaseAbstainedError extends Error {
  constructor(readonly releaseId: string) {
    super(`PNRR release ${releaseId} is abstained`)
    this.name = 'PnrrReleaseAbstainedError'
  }
}

export type PnrrDashboardReleaseDeps = {
  readonly readRelease: (signal: AbortSignal) => Promise<PnrrLiveRelease>
  readonly fetchSnapshot: typeof fetch
  readonly apiBaseUrl: () => string
  readonly now: () => number
  /** Called once per built model, e.g. to precompute the unfiltered overview. */
  readonly onModelBuilt?: (model: PnrrReleaseModel) => void
}

async function readActiveReleaseFromApi(
  signal: AbortSignal,
): Promise<PnrrLiveRelease> {
  const raw = await graphqlQuery<unknown>(
    PNRR_RELEASE_QUERY,
    {},
    { operationName: 'PnrrRelease', signal, auth: 'none' },
  )
  return pnrrReleaseResponseSchema.parse(raw).pnrrCurrentRelease
}

const defaultDeps: PnrrDashboardReleaseDeps = {
  readRelease: readActiveReleaseFromApi,
  fetchSnapshot: (input, init) => fetch(input, init),
  apiBaseUrl: () => getApiBaseUrl(),
  now: () => Date.now(),
}

let deps: PnrrDashboardReleaseDeps = defaultDeps
let activeRelease: {
  readonly release: PnrrLiveRelease
  readonly checkedAt: number
} | null = null
let pendingActiveRelease: Promise<PnrrLiveRelease> | null = null
let lastForcedRefreshAt = Number.NEGATIVE_INFINITY
const readyModels = new Map<string, PnrrReleaseModel>()
const pendingModels = new Map<string, Promise<PnrrReleaseModel>>()
const failedLoads = new Map<string, { readonly at: number; readonly error: unknown }>()

/** Test seam: swap the API reads and clear every cache (the precompute hook stays). */
export function resetPnrrDashboardReleaseState(
  overrides: Partial<PnrrDashboardReleaseDeps> = {},
): void {
  deps = { ...defaultDeps, onModelBuilt: deps.onModelBuilt, ...overrides }
  activeRelease = null
  pendingActiveRelease = null
  lastForcedRefreshAt = Number.NEGATIVE_INFINITY
  readyModels.clear()
  pendingModels.clear()
  failedLoads.clear()
}

export function setPnrrDashboardModelBuiltHook(
  onModelBuilt: (model: PnrrReleaseModel) => void,
): void {
  deps = { ...deps, onModelBuilt }
}

function refreshActiveRelease(): Promise<PnrrLiveRelease> {
  if (pendingActiveRelease) return pendingActiveRelease
  const request = deps
    .readRelease(AbortSignal.timeout(ACTIVE_RELEASE_TIMEOUT_MS))
    .then((release) => {
      activeRelease = { release, checkedAt: deps.now() }
      return release
    })
    .finally(() => {
      pendingActiveRelease = null
    })
  pendingActiveRelease = request
  return request
}

/**
 * The active release. `declaredReleaseId` is the release a browser asks for:
 * when it is not the one this process knows, the release is re-read (at most
 * every few seconds) so a release switch is seen before the minute is up.
 */
export async function readPnrrActiveRelease(
  declaredReleaseId?: string | null,
): Promise<PnrrLiveRelease> {
  const now = deps.now()
  const known = activeRelease
  const fresh = known !== null && now - known.checkedAt < ACTIVE_RELEASE_TTL_MS
  const declaresOther =
    known !== null &&
    Boolean(declaredReleaseId) &&
    declaredReleaseId !== known.release.releaseId

  if (fresh && !declaresOther) return known.release
  if (
    fresh &&
    declaresOther &&
    now - lastForcedRefreshAt < ACTIVE_RELEASE_REFRESH_MIN_INTERVAL_MS
  ) {
    return known.release
  }
  if (declaresOther) lastForcedRefreshAt = now
  return refreshActiveRelease()
}

/** A built model from memory only (for the server render); never starts a fetch. */
export function readReadyPnrrReleaseModel(
  releaseId: string,
): PnrrReleaseModel | null {
  return readyModels.get(releaseId) ?? null
}

async function readBoundedText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error('PNRR dashboard snapshot exceeds the size limit')
  }
  if (!response.body) return ''

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const parts: string[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (received > maxBytes) {
      await reader.cancel()
      throw new Error('PNRR dashboard snapshot exceeds the size limit')
    }
    parts.push(decoder.decode(value, { stream: true }))
  }
  parts.push(decoder.decode())
  return parts.join('')
}

async function fetchReleaseModel(
  release: PnrrLiveRelease,
): Promise<PnrrReleaseModel> {
  const releaseId = release.releaseId
  const url = `${deps.apiBaseUrl()}${PNRR_DASHBOARD_SNAPSHOT_PATH}?assertReleaseId=${encodeURIComponent(releaseId)}`
  const response = await deps.fetchSnapshot(url, {
    headers: { accept: 'application/json' },
    signal: withDeadline(undefined, PNRR_DASHBOARD_SNAPSHOT_TIMEOUT_MS),
  })
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`PNRR dashboard snapshot request failed: ${response.status}`)
  }

  const body = await readBoundedText(response, PNRR_DASHBOARD_SNAPSHOT_MAX_BYTES)
  const snapshot = pnrrDashboardSnapshotEnvelopeSchema.parse(JSON.parse(body)).data
  // A snapshot of another release must never be served under this one.
  if (snapshot.release.releaseId !== releaseId) {
    throw new PnrrReleaseDivergenceError(releaseId, snapshot.release.releaseId)
  }

  const model: PnrrReleaseModel = {
    releaseId,
    release: snapshot.release,
    model: buildPnrrWorkerModelFromApiSnapshot({
      observations: snapshot.observations,
      program: snapshot.program,
    }),
    filteredProjectsCache: createPnrrFilteredProjectsCache(),
    overviewCache: new Map(),
    mapPreviewCache: new Map(),
    facetsJson: null,
    uatLabels: null,
  }
  logger.info('PNRR release model built', {
    releaseId,
    observationCount: snapshot.observations.length,
    projectCount: model.model.projectCount,
  })
  return model
}

function rememberReadyModel(model: PnrrReleaseModel): void {
  readyModels.delete(model.releaseId)
  readyModels.set(model.releaseId, model)
  while (readyModels.size > RELEASE_MODEL_LIMIT) {
    const oldest = readyModels.keys().next().value
    if (oldest === undefined) break
    readyModels.delete(oldest)
  }
}

/** The model of `release`, loading its snapshot once; concurrent callers share the load. */
export function loadPnrrReleaseModel(
  release: PnrrLiveRelease,
): Promise<PnrrReleaseModel> {
  const releaseId = release.releaseId
  if (release.state === 'abstained') {
    return Promise.reject(new PnrrReleaseAbstainedError(releaseId))
  }
  const ready = readyModels.get(releaseId)
  if (ready) return Promise.resolve(ready)
  const pending = pendingModels.get(releaseId)
  if (pending) return pending

  const failure = failedLoads.get(releaseId)
  if (failure && deps.now() - failure.at < LOAD_FAILURE_COOLDOWN_MS) {
    return Promise.reject(failure.error)
  }

  const load = fetchReleaseModel(release)
    .then((model) => {
      failedLoads.delete(releaseId)
      try {
        deps.onModelBuilt?.(model)
      } catch (error) {
        logger.warn('PNRR release model precompute failed', {
          releaseId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
      rememberReadyModel(model)
      return model
    })
    .catch((error: unknown) => {
      failedLoads.set(releaseId, { at: deps.now(), error })
      logger.error('PNRR release model load failed', {
        releaseId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    })
    .finally(() => {
      pendingModels.delete(releaseId)
    })
  pendingModels.set(releaseId, load)
  return load
}

/** Starts the load in the background (for the server render, which never waits for it). */
export function warmPnrrReleaseModel(release: PnrrLiveRelease): void {
  if (release.state === 'abstained') return
  loadPnrrReleaseModel(release).catch(() => {
    // Logged by the load; the next request retries after the cooldown.
  })
}
