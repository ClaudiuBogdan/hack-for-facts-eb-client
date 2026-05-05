import { createIsomorphicFn } from '@tanstack/react-start'
import type { Currency } from '@/schemas/charts'
import type {
  PnrrOfficialIndicators,
  PnrrProject,
  PnrrSearchState,
} from '@/schemas/pnrr'
import {
  DEFAULT_CURRENCY,
  readClientCurrencyPreference,
  readUserCurrencyPreference,
} from '@/lib/user-preferences'
import type { PnrrDataCacheGeneration } from '@/server/handlers/pnrr-data-proxy'
import type { PnrrSeoSnapshot } from './pnrr-seo'

export type PnrrSeoLoaderData = {
  readonly initialCurrency: Currency
  readonly seoSnapshot: PnrrSeoSnapshot | null
  readonly seoSnapshotSearchKey: string
  readonly requestSiteUrl?: string
}

export type PnrrSeoLoaderInput = {
  readonly search: Partial<PnrrSearchState>
  readonly searchKey: string
}

const PNRR_SEO_SNAPSHOT_TTL_MS = 60 * 60 * 1000
const PNRR_SEO_STALE_SNAPSHOT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const PNRR_SEO_SNAPSHOT_CACHE_LIMIT = 50
const PNRR_SEO_PENDING_SNAPSHOT_LIMIT = 10

const cachedSeoSnapshots = new Map<
  string,
  {
    readonly snapshot: PnrrSeoSnapshot
    readonly dataGeneration: PnrrDataCacheGeneration
    readonly expiresAt: number
    readonly sourceDataStale: boolean
  }
>()
const pendingSeoSnapshots = new Map<
  string,
  {
    readonly snapshot: Promise<PnrrSeoSnapshot>
    readonly dataGeneration: PnrrDataCacheGeneration
  }
>()
let pendingSeoDataWarmup: Promise<void> | null = null

type CachedSeoSnapshotResult = {
  readonly snapshot: PnrrSeoSnapshot
  readonly stale: boolean
  readonly sourceDataStale: boolean
}

function isSameDataCacheGeneration(
  first: PnrrDataCacheGeneration,
  second: PnrrDataCacheGeneration,
): boolean {
  return (
    first.projects === second.projects &&
    first.indicators === second.indicators
  )
}

function readCachedSeoSnapshot(
  searchKey: string,
  dataGeneration: PnrrDataCacheGeneration,
  options: { readonly allowStale?: boolean } = {},
): CachedSeoSnapshotResult | null {
  const cached = cachedSeoSnapshots.get(searchKey)
  if (!cached) return null

  const now = Date.now()
  const expired = cached.expiresAt <= now
  const dataGenerationStale = !isSameDataCacheGeneration(
    cached.dataGeneration,
    dataGeneration,
  )
  const stale = expired || dataGenerationStale || cached.sourceDataStale

  if (expired && cached.expiresAt + PNRR_SEO_STALE_SNAPSHOT_TTL_MS <= now) {
    cachedSeoSnapshots.delete(searchKey)
    return null
  }

  if (stale && !options.allowStale) {
    cachedSeoSnapshots.delete(searchKey)
    return null
  }

  return {
    snapshot: cached.snapshot,
    stale,
    sourceDataStale: cached.sourceDataStale,
  }
}

function writeCachedSeoSnapshot(
  searchKey: string,
  snapshot: PnrrSeoSnapshot,
  dataGeneration: PnrrDataCacheGeneration,
  options: { readonly sourceDataStale?: boolean } = {},
): void {
  cachedSeoSnapshots.set(searchKey, {
    snapshot,
    dataGeneration,
    expiresAt: Date.now() + PNRR_SEO_SNAPSHOT_TTL_MS,
    sourceDataStale: options.sourceDataStale ?? false,
  })

  while (cachedSeoSnapshots.size > PNRR_SEO_SNAPSHOT_CACHE_LIMIT) {
    const oldestKey = cachedSeoSnapshots.keys().next().value
    if (!oldestKey) break
    cachedSeoSnapshots.delete(oldestKey)
  }
}

async function loadServerSeoSnapshot(
  input: PnrrSeoLoaderInput,
): Promise<PnrrSeoSnapshot | null> {
  const {
    readCachedPnrrOfficialIndicatorsResult,
    readCachedPnrrProjectsResult,
    readPnrrDataCacheGeneration,
  } = await import(
    '@/server/handlers/pnrr-data-proxy'
  )
  const dataGeneration = readPnrrDataCacheGeneration()
  const cached = readCachedSeoSnapshot(input.searchKey, dataGeneration, {
    allowStale: true,
  })

  const projectsResult = readCachedPnrrProjectsResult({ allowStale: true })
  const officialIndicatorsResult = readCachedPnrrOfficialIndicatorsResult({
    allowStale: true,
  })
  if (!projectsResult || !officialIndicatorsResult) {
    warmServerSeoDataCache()
    return cached && !cached.sourceDataStale ? cached.snapshot : null
  }

  const hasStaleData = projectsResult.stale || officialIndicatorsResult.stale
  if (hasStaleData) {
    warmServerSeoDataCache()
  }

  if (cached && !cached.stale) {
    return cached.snapshot
  }

  if (cached?.stale) {
    if (!hasStaleData) {
      void refreshServerSeoSnapshot({
        input,
        dataGeneration,
        projects: projectsResult.data,
        officialIndicators: officialIndicatorsResult.data,
      })
    }
    return cached.snapshot
  }

  const pending = pendingSeoSnapshots.get(input.searchKey)
  if (pending) {
    if (isSameDataCacheGeneration(pending.dataGeneration, dataGeneration)) {
      return pending.snapshot
    }
    pendingSeoSnapshots.delete(input.searchKey)
  }
  if (pendingSeoSnapshots.size >= PNRR_SEO_PENDING_SNAPSHOT_LIMIT) return null

  const request = (async (): Promise<PnrrSeoSnapshot> => {
    const { buildPnrrSeoSnapshotFromProjects } = await import('./pnrr-seo')

    const snapshot = buildPnrrSeoSnapshotFromProjects({
      projects: projectsResult.data,
      search: input.search,
      officialIndicators: officialIndicatorsResult.data,
    })
    writeCachedSeoSnapshot(input.searchKey, snapshot, dataGeneration, {
      sourceDataStale: hasStaleData,
    })
    return snapshot
  })().finally(() => {
    pendingSeoSnapshots.delete(input.searchKey)
  })

  pendingSeoSnapshots.set(input.searchKey, {
    snapshot: request,
    dataGeneration,
  })
  return request
}

async function refreshServerSeoSnapshot({
  input,
  dataGeneration,
  projects,
  officialIndicators,
}: {
  readonly input: PnrrSeoLoaderInput
  readonly dataGeneration: PnrrDataCacheGeneration
  readonly projects: readonly PnrrProject[]
  readonly officialIndicators?: PnrrOfficialIndicators | null
}): Promise<void> {
  const pending = pendingSeoSnapshots.get(input.searchKey)
  if (pending) {
    if (isSameDataCacheGeneration(pending.dataGeneration, dataGeneration)) return
    pendingSeoSnapshots.delete(input.searchKey)
  }
  if (pendingSeoSnapshots.size >= PNRR_SEO_PENDING_SNAPSHOT_LIMIT) return

  const request = (async (): Promise<PnrrSeoSnapshot> => {
    const { buildPnrrSeoSnapshotFromProjects } = await import('./pnrr-seo')
    const snapshot = buildPnrrSeoSnapshotFromProjects({
      projects,
      search: input.search,
      officialIndicators,
    })
    writeCachedSeoSnapshot(input.searchKey, snapshot, dataGeneration)
    return snapshot
  })().finally(() => {
    pendingSeoSnapshots.delete(input.searchKey)
  })

  pendingSeoSnapshots.set(input.searchKey, {
    snapshot: request,
    dataGeneration,
  })

  await request
    .catch((error) => {
      console.error('[pnrr-seo-loader] PNRR SEO snapshot refresh failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
}

function warmServerSeoDataCache(): void {
  if (pendingSeoDataWarmup) return

  pendingSeoDataWarmup = (async (): Promise<void> => {
    const {
      fetchPnrrOfficialIndicators,
      fetchPnrrProjects,
      readPnrrDataCacheGeneration,
    } = await import('@/server/handlers/pnrr-data-proxy')
    const previousGeneration = readPnrrDataCacheGeneration()
    await Promise.all([
      fetchPnrrProjects(),
      fetchPnrrOfficialIndicators(),
    ])
    const nextGeneration = readPnrrDataCacheGeneration()
    if (!isSameDataCacheGeneration(previousGeneration, nextGeneration)) {
      for (const [searchKey, cached] of cachedSeoSnapshots) {
        if (cached.expiresAt <= Date.now()) {
          cachedSeoSnapshots.delete(searchKey)
        }
      }
    }
  })()
    .catch((error) => {
      console.error('[pnrr-seo-loader] PNRR SEO warmup failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
    .finally(() => {
      pendingSeoDataWarmup = null
    })
}

export const loadPnrrSeoData = createIsomorphicFn()
  .client(async (input: PnrrSeoLoaderInput): Promise<PnrrSeoLoaderData> => {
    return {
      initialCurrency: readClientCurrencyPreference() ?? DEFAULT_CURRENCY,
      seoSnapshot: null,
      seoSnapshotSearchKey: input.searchKey,
      requestSiteUrl: typeof window === 'undefined' ? undefined : window.location.origin,
    }
  })
  .server(
    async (input: PnrrSeoLoaderInput): Promise<PnrrSeoLoaderData> => {
      const { getRequestUrl } = await import('@tanstack/react-start/server')
      const requestUrl = getRequestUrl()
      const [seoSnapshot, initialCurrency] = await Promise.all([
        loadServerSeoSnapshot(input),
        readUserCurrencyPreference(),
      ])

      return {
        initialCurrency,
        seoSnapshot,
        seoSnapshotSearchKey: input.searchKey,
        requestSiteUrl: requestUrl.origin,
      }
    },
  )
