import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
const notFoundMock = vi.fn(() => notFoundError)
const fetchCpvCategoryMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: () => ({}),
}))

vi.mock('@/features/procurement/api/procurement-api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchProcurementCpvCategoryPage: fetchCpvCategoryMock,
}))

// Stubbed rather than partially mocked: `@/config/env` validates
// `import.meta.env` at import time, reached here via the GraphQL client.
vi.mock('@/config/env', () => ({
  env: { VITE_CLERK_PUBLISHABLE_KEY: 'pk_test' },
  getSiteUrl: () => 'https://transparenta.eu',
  getApiBaseUrl: () => 'https://api.example.com',
}))

const PAGE = { code: '45', level: 'division', labelRo: 'Construcții' } as const

type QueryOptionsArg = { readonly queryKey: readonly unknown[] }

type LoaderInput = {
  readonly context: { readonly queryClient: unknown }
  readonly params: { readonly code: string }
}

async function importRoute() {
  const { Route } = await import('./$code')
  return Route as unknown as {
    loader: (input: LoaderInput) => Promise<{
      readonly page?: unknown
      readonly code: string
    }>
  }
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
 * Runs `body` with `globalThis.window` removed, so the real
 * `shouldBlockLoaderForSsr` executes. Stubbing it would leave the environment
 * sniff — the whole point of the split — untested.
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

describe('/procurement/categories/$code loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    notFoundMock.mockClear()
    fetchCpvCategoryMock.mockReset()
  })

  it('awaits the category while server-rendering, so crawlers get full data', async () => {
    fetchCpvCategoryMock.mockResolvedValue(PAGE)
    const queryClient = createQueryClient()
    const route = await importRoute()

    const data = await asServerRender(() =>
      route.loader({ context: { queryClient }, params: { code: '45' } }),
    )

    expect(data.page).toEqual(PAGE)
    expect(data.code).toBe('45')
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled()
  })

  it('throws notFound while server-rendering an unknown code', async () => {
    fetchCpvCategoryMock.mockResolvedValue(null)
    const queryClient = createQueryClient()
    const route = await importRoute()

    await expect(
      asServerRender(() =>
        route.loader({ context: { queryClient }, params: { code: '99' } }),
      ),
    ).rejects.toBe(notFoundError)
  })

  it('never blocks a client-side navigation', async () => {
    const queryClient = createQueryClient()
    // A prefetch that never settles: awaiting it is the frozen click this
    // split removes.
    queryClient.prefetchQuery.mockImplementation(() => new Promise(() => {}))
    const route = await importRoute()

    const data = await route.loader({
      context: { queryClient },
      params: { code: '45' },
    })

    expect(data).toEqual({ code: '45' })
    expect(fetchCpvCategoryMock).not.toHaveBeenCalled()
  })

  it('never 404s on the client, even for a code the API will reject', async () => {
    // The page owns that verdict there; a loader `notFound()` would blank the
    // page the user is still on.
    fetchCpvCategoryMock.mockResolvedValue(null)
    const queryClient = createQueryClient()
    const route = await importRoute()

    await expect(
      route.loader({ context: { queryClient }, params: { code: '99' } }),
    ).resolves.toEqual({ code: '99' })
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('prefetches the key the page reads, so nothing is fetched twice', async () => {
    const queryClient = createQueryClient()
    const route = await importRoute()
    const { procurementCpvCategoryQueryOptions } = await import(
      '@/features/procurement/hooks/use-procurement-data'
    )

    await route.loader({ context: { queryClient }, params: { code: '45' } })

    expect(queryClient.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(
      procurementCpvCategoryQueryOptions('45').queryKey,
    )
  })
})
