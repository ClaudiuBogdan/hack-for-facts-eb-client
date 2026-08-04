import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundMock = vi.fn(() => new Error('not-found'))
const fetchAuthoritySliceMock = vi.fn()
const fetchInstitutionOverviewMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: () => ({}),
}))

vi.mock('@/features/procurement/api/procurement-api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchProcurementAuthoritySlice: fetchAuthoritySliceMock,
  fetchProcurementInstitutionOverview: fetchInstitutionOverviewMock,
}))

// Stubbed rather than partially mocked: `@/config/env` validates `import.meta.env`
// at import time, and the query-options module pulls it in via the GraphQL client.
vi.mock('@/config/env', () => ({
  env: { VITE_CLERK_PUBLISHABLE_KEY: 'pk_test' },
  getSiteUrl: () => 'https://transparenta.eu',
  getApiBaseUrl: () => 'https://api.example.com',
}))

const SLICE = { authorityName: 'Primăria X' } as const
const OVERVIEW = { authorityName: 'Primăria X', populations: [] } as const

type LoaderInput = {
  readonly context: { readonly queryClient: unknown }
  readonly params: { readonly cui: string }
  readonly deps: {
    readonly year?: number
    readonly cpv?: string
    readonly month?: string
  }
}

async function importRoute() {
  const { Route } = await import('./$cui')
  return Route as unknown as {
    loader: (input: LoaderInput) => Promise<{
      readonly slice?: unknown
      readonly overview?: unknown
    }>
    head: (input: {
      readonly params: { readonly cui: string }
      readonly loaderData?: unknown
    }) => { readonly meta: ReadonlyArray<Record<string, unknown>> }
  }
}

type QueryOptionsArg = { readonly queryKey: readonly unknown[] }

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
 * Runs `body` with `globalThis.window` removed — the idiom `-entities.$cui`
 * already uses for this branch. The real `shouldBlockLoaderForSsr` runs:
 * stubbing it would leave its environment sniff — the whole fix — untested and
 * let an inverted guard ship green.
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

describe('/procurement/institutions/$cui loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    notFoundMock.mockClear()
    fetchAuthoritySliceMock.mockReset()
    fetchInstitutionOverviewMock.mockReset()
    fetchAuthoritySliceMock.mockResolvedValue(SLICE)
    fetchInstitutionOverviewMock.mockResolvedValue(OVERVIEW)
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('awaits both payloads while server-rendering, so crawlers get full data', async () => {
    const queryClient = createQueryClient()
    const route = await importRoute()

    const data = await asServerRender(() =>
      route.loader({
        context: { queryClient },
        params: { cui: '2540635' },
        deps: {},
      }),
    )

    expect(data.slice).toBe(SLICE)
    expect(data.overview).toBe(OVERVIEW)
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled()
    // Fetched directly, NOT seeded into the query client: dehydrating the
    // server's `dataUpdatedAt` would make every CDN hit refetch on mount, and
    // would put the SSR path on the client's `retry: 1` default.
    expect(queryClient.ensureQueryData).not.toHaveBeenCalled()
  })

  it('names the page in the server-rendered head', async () => {
    const route = await importRoute()

    const head = route.head({
      params: { cui: '2540635' },
      loaderData: { overview: OVERVIEW },
    })

    expect(head.meta).toContainEqual({
      title: 'Primăria X — Achiziții publice — Transparenta.eu',
    })
  })

  it('falls back to the CUI when the buyer has no name to show', async () => {
    const route = await importRoute()

    const head = route.head({
      params: { cui: '2540635' },
      loaderData: { overview: { authorityName: '   ' } },
    })

    expect(head.meta).toContainEqual({
      title: 'Instituție CUI 2540635 — Achiziții publice — Transparenta.eu',
    })
  })

  it('never blocks a client-side navigation — returns before the API answers', async () => {
    const queryClient = createQueryClient()
    // A prefetch that never settles: the loader must still resolve. Awaiting it
    // is exactly the bug this split removes (~1.4s of frozen UI on click).
    queryClient.prefetchQuery.mockImplementation(() => new Promise(() => {}))
    const route = await importRoute()

    const data = await route.loader({
      context: { queryClient },
      params: { cui: '2540635' },
      deps: {},
    })

    expect(data.slice).toBeUndefined()
    expect(data.overview).toBeUndefined()
    expect(fetchAuthoritySliceMock).not.toHaveBeenCalled()
    expect(fetchInstitutionOverviewMock).not.toHaveBeenCalled()
    expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(2)
  })

  it('prefetches the same query keys the page reads, so nothing is fetched twice', async () => {
    const queryClient = createQueryClient()
    const route = await importRoute()
    const {
      procurementAuthoritySliceQueryOptions,
      procurementInstitutionOverviewQueryOptions,
    } = await import('@/features/procurement/hooks/use-procurement-data')
    const { buildInstitutionScopes } = await import(
      '@/features/procurement/lib/institution-scopes'
    )

    await route.loader({
      context: { queryClient },
      params: { cui: '2540635' },
      deps: { year: 2025 },
    })

    const prefetchedKeys = queryClient.prefetchQuery.mock.calls.map(
      ([options]) => options.queryKey,
    )
    // Unfiltered on purpose: this one feeds the title and the quick-filter chip
    // options, which must not change when a year is picked.
    expect(prefetchedKeys).toContainEqual(
      procurementAuthoritySliceQueryOptions('2540635').queryKey,
    )
    expect(prefetchedKeys).toContainEqual(
      procurementInstitutionOverviewQueryOptions(
        '2540635',
        buildInstitutionScopes({ monthFrom: '2025-01', monthTo: '2025-12' }),
      ).queryKey,
    )
  })

  it('warms the scope the page will read for a picked month and CPV division', async () => {
    const queryClient = createQueryClient()
    const route = await importRoute()
    const { procurementInstitutionOverviewQueryOptions } = await import(
      '@/features/procurement/hooks/use-procurement-data'
    )
    const { buildInstitutionScopes } = await import(
      '@/features/procurement/lib/institution-scopes'
    )

    await route.loader({
      context: { queryClient },
      params: { cui: '2540635' },
      // A picked month wins over its year — the narrower selection. Warming the
      // whole year here would leave the page to fetch the month from scratch.
      deps: { year: 2025, month: '2025-04', cpv: '45' },
    })

    const prefetchedKeys = queryClient.prefetchQuery.mock.calls.map(
      ([options]) => options.queryKey,
    )
    expect(prefetchedKeys).toContainEqual(
      procurementInstitutionOverviewQueryOptions(
        '2540635',
        buildInstitutionScopes({
          monthFrom: '2025-04',
          monthTo: '2025-04',
          cpvDivision: '45',
        }),
      ).queryKey,
    )
  })
})
