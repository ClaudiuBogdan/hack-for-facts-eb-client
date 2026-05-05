import { createIsomorphicFn } from '@tanstack/react-start'
import type { Currency } from '@/schemas/charts'
import type { PnrrSearchState } from '@/schemas/pnrr'
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
const PNRR_SEO_SNAPSHOT_CACHE_LIMIT = 50
const PNRR_SEO_PENDING_SNAPSHOT_LIMIT = 10

const cachedSeoSnapshots = new Map<
  string,
  {
    readonly snapshot: PnrrSeoSnapshot
    readonly dataGeneration: PnrrDataCacheGeneration
    readonly expiresAt: number
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
): PnrrSeoSnapshot | null {
  const cached = cachedSeoSnapshots.get(searchKey)
  if (!cached) return null

  if (
    cached.expiresAt <= Date.now() ||
    !isSameDataCacheGeneration(cached.dataGeneration, dataGeneration)
  ) {
    cachedSeoSnapshots.delete(searchKey)
    return null
  }

  return cached.snapshot
}

function writeCachedSeoSnapshot(
  searchKey: string,
  snapshot: PnrrSeoSnapshot,
  dataGeneration: PnrrDataCacheGeneration,
): void {
  cachedSeoSnapshots.set(searchKey, {
    snapshot,
    dataGeneration,
    expiresAt: Date.now() + PNRR_SEO_SNAPSHOT_TTL_MS,
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
    readCachedPnrrOfficialIndicators,
    readCachedPnrrProjects,
    readPnrrDataCacheGeneration,
  } = await import(
    '@/server/handlers/pnrr-data-proxy'
  )
  const dataGeneration = readPnrrDataCacheGeneration()
  const cached = readCachedSeoSnapshot(input.searchKey, dataGeneration)
  if (cached) return cached

  const projectsResult = readCachedPnrrProjects()
  const officialIndicators = readCachedPnrrOfficialIndicators()
  if (!projectsResult || !officialIndicators) {
    warmServerSeoDataCache()
    return null
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
  return request
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
      cachedSeoSnapshots.clear()
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
