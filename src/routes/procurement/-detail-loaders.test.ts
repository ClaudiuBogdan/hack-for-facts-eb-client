import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
const notFoundMock = vi.fn(() => notFoundError)
const fetchProcedureDetailMock = vi.fn()
const fetchContractDetailMock = vi.fn()
const fetchDirectAcquisitionDetailMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: () => ({}),
}))

// Spread the original: the query-options module these routes now pull in
// imports many other fetchers from here, and a bare 3-key mock breaks them.
vi.mock('@/features/procurement/api/procurement-api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchProcurementProcedureDetail: fetchProcedureDetailMock,
  fetchProcurementContractDetail: fetchContractDetailMock,
  fetchProcurementDirectAcquisitionDetail: fetchDirectAcquisitionDetailMock,
}))

// Stubbed rather than partially mocked: `@/config/env` validates
// `import.meta.env` at import time, and the query-options module reaches it
// through the GraphQL client.
vi.mock('@/config/env', () => ({
  env: { VITE_CLERK_PUBLISHABLE_KEY: 'pk_test' },
  getSiteUrl: () => 'https://transparenta.eu',
  getApiBaseUrl: () => 'https://api.example.com',
}))

const DETAIL = { record: { id: 'rec-1' }, related: {} } as const

type QueryOptionsArg = { readonly queryKey: readonly unknown[] }

type LoaderInput = {
  readonly context: { readonly queryClient: unknown }
  readonly params: { readonly id: string }
}

type DetailRoute = {
  loader: (input: LoaderInput) => Promise<{
    readonly detail?: unknown
    readonly id: string
  }>
}

function createQueryClient() {
  return {
    ensureQueryData: vi.fn(
      async (_options: QueryOptionsArg): Promise<unknown> => undefined,
    ),
    prefetchQuery: vi.fn(
      async (_options: QueryOptionsArg): Promise<void> => undefined,
    ),
  }
}

/**
 * Runs `body` with `globalThis.window` removed — the idiom the sibling route
 * tests use for this branch. The real `shouldBlockLoaderForSsr` runs: stubbing
 * it would leave its environment sniff — the whole point of the split —
 * untested and let an inverted guard ship green.
 */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', {
      value: realWindow,
      configurable: true,
      writable: true,
    })
  }
}

const GRAINS = [
  {
    name: 'procedure',
    path: './procedures/$id',
    fetchMock: fetchProcedureDetailMock,
    grain: 'procedures',
  },
  {
    name: 'contract',
    path: './contracts/$id',
    fetchMock: fetchContractDetailMock,
    grain: 'contracts',
  },
  {
    name: 'direct-acquisition',
    path: './direct-acquisitions/$id',
    fetchMock: fetchDirectAcquisitionDetailMock,
    grain: 'direct_acquisitions',
  },
] as const

describe('procurement detail route loaders', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    notFoundMock.mockClear()
    fetchProcedureDetailMock.mockReset()
    fetchContractDetailMock.mockReset()
    fetchDirectAcquisitionDetailMock.mockReset()
  })

  describe.each(GRAINS)('$name', ({ path, fetchMock, grain }) => {
    async function importRoute(): Promise<DetailRoute> {
      const { Route } = await import(/* @vite-ignore */ path)
      return Route as unknown as DetailRoute
    }

    it('awaits the record while server-rendering, so crawlers get full data', async () => {
      fetchMock.mockResolvedValue(DETAIL)
      const queryClient = createQueryClient()
      const route = await importRoute()

      const data = await asServerRender(() =>
        route.loader({ context: { queryClient }, params: { id: 'rec-1' } }),
      )

      expect(data.detail).toEqual(DETAIL)
      expect(data.id).toBe('rec-1')
      expect(fetchMock).toHaveBeenCalledWith('rec-1')
      // Fetched directly, NOT seeded into the query client — the page reseeds
      // it via `initialData` instead.
      expect(queryClient.ensureQueryData).not.toHaveBeenCalled()
      expect(queryClient.prefetchQuery).not.toHaveBeenCalled()
    })

    it('throws notFound while server-rendering an unknown id', async () => {
      fetchMock.mockResolvedValue(null)
      const queryClient = createQueryClient()
      const route = await importRoute()

      await expect(
        asServerRender(() =>
          route.loader({ context: { queryClient }, params: { id: 'missing' } }),
        ),
      ).rejects.toBe(notFoundError)
      expect(fetchMock).toHaveBeenCalledWith('missing')
    })

    it('never blocks a client-side navigation — returns before the API answers', async () => {
      const queryClient = createQueryClient()
      // A prefetch that never settles: awaiting it is exactly the frozen click
      // this split removes.
      queryClient.prefetchQuery.mockImplementation(() => new Promise(() => {}))
      const route = await importRoute()

      const data = await route.loader({
        context: { queryClient },
        params: { id: 'rec-1' },
      })

      expect(data).toEqual({ id: 'rec-1' })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(1)
    })

    it('never 404s on the client, even for an id the API will reject', async () => {
      // On the client the page's own query owns that verdict; a loader
      // `notFound()` would blank the page the user is still looking at.
      fetchMock.mockResolvedValue(null)
      const queryClient = createQueryClient()
      const route = await importRoute()

      await expect(
        route.loader({ context: { queryClient }, params: { id: 'missing' } }),
      ).resolves.toEqual({ id: 'missing' })
      expect(notFoundMock).not.toHaveBeenCalled()
    })

    it('prefetches the key the page reads, so nothing is fetched twice', async () => {
      const queryClient = createQueryClient()
      const route = await importRoute()
      const { procurementRecordDetailQueryOptions } = await import(
        '@/features/procurement/hooks/use-procurement-data'
      )

      await route.loader({
        context: { queryClient },
        params: { id: 'rec-1' },
      })

      expect(queryClient.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(
        procurementRecordDetailQueryOptions(grain, 'rec-1').queryKey,
      )
    })
  })

  it('gives each grain its own cache entry, so ids cannot collide across them', async () => {
    const { procurementRecordDetailQueryOptions } = await import(
      '@/features/procurement/hooks/use-procurement-data'
    )
    const keys = GRAINS.map(({ grain }) =>
      JSON.stringify(procurementRecordDetailQueryOptions(grain, 'shared-id').queryKey),
    )

    expect(new Set(keys).size).toBe(GRAINS.length)
  })
})
