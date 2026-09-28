import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { homeYear } from '@/features/procurement/lib/home-model'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundMock = vi.fn(() => new Error('not-found'))
const readForSsrMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))

// The global Lingui mock has no `setupI18n`: the request's translator reads a descriptor's source.
vi.mock('@/lib/i18n', () => ({
  translatorFor: () => ({ _: (message: string | { readonly id: string; readonly message?: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) }),
}))

vi.mock('@/features/procurement/api/procurement-supplier-ssr', () => ({
  readProcurementSupplierForSsr: readForSsrMock,
}))

// Stubbed rather than partially mocked: `@/config/env` validates `import.meta.env`
// at import time, and the query-options module pulls it in via the GraphQL client.
vi.mock('@/config/env', () => ({
  env: { VITE_CLERK_PUBLISHABLE_KEY: 'pk_test' },
  getSiteUrl: () => 'https://transparenta.eu',
  getApiBaseUrl: () => 'https://api.example.com',
}))

type QueryOptionsArg = { readonly queryKey: readonly unknown[] }

interface RouteUnderTest {
  readonly params: { readonly parse: (params: { readonly cui: string }) => { readonly cui: string } }
  readonly validateSearch: (search: Record<string, unknown>) => Record<string, unknown>
  readonly loader: (input: {
    readonly context: { readonly queryClient: unknown }
    readonly params: { readonly cui: string }
    readonly deps: { readonly year?: number }
  }) => Promise<Record<string, unknown>>
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
  readonly head: (input: {
    readonly params: { readonly cui: string }
    readonly loaderData?: Record<string, unknown>
    readonly match: { readonly context: { readonly locale: string; readonly queryClient: { readonly getQueriesData: (filters: unknown) => unknown[] } } }
  }) => { readonly meta: ReadonlyArray<Record<string, unknown>> }
}

async function importRoute(): Promise<RouteUnderTest> {
  const { Route } = await import('./$cui')
  return Route as unknown as RouteUnderTest
}

function createQueryClient() {
  return { prefetchQuery: vi.fn(async (_options: QueryOptionsArg): Promise<void> => undefined) }
}

/**
 * Runs `body` with `globalThis.window` removed, so the real
 * `shouldBlockLoaderForSsr` takes its server branch — stubbing it would leave
 * its environment sniff untested.
 */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
  }
}

const PROFILE = { cui: '9813902', name: 'Costalex Construct SRL', partial: false, directYears: [{ year: 2025, value: 4_835_000, count: 11 }], contractYears: [] }

describe('/procurement/suppliers/$cui', () => {
  beforeEach(() => {
    vi.resetModules()
    readForSsrMock.mockReset()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('takes a CUI of digits only', async () => {
    const route = await importRoute()
    expect(route.params.parse({ cui: ' 9813902 ' })).toEqual({ cui: '9813902' })
    expect(() => route.params.parse({ cui: 'RO9813902' })).toThrow('not-found')
  })

  it('keeps the year and the two band choices, and drops what it cannot use — the old page’s filters too', async () => {
    const route = await importRoute()
    expect(route.validateSearch({ year: '2026', ce: 'contracte', mari: 'directe' })).toEqual({ year: 2026, ce: 'contracte', mari: 'directe' })
    expect(route.validateSearch({ year: 'x', ce: 'all', mari: 3, cpv: '45', month: '2025-01' })).toEqual({})
  })

  it('reads the profile and the direct purchases on the server, for the year asked — the year in progress included', async () => {
    readForSsrMock.mockResolvedValue({ year: homeYear() + 1, profile: PROFILE, direct: [] })
    const queryClient = createQueryClient()
    const route = await importRoute()
    const data = await asServerRender(() => route.loader({ context: { queryClient }, params: { cui: '9813902' }, deps: { year: homeYear() + 1 } }))
    expect(readForSsrMock).toHaveBeenCalledWith('9813902', homeYear() + 1)
    expect(data.profile).toBe(PROFILE)
    // Read directly, not seeded into the query client (its server clock would dehydrate stale).
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled()
  })

  it('answers 404 for an identifier the API refuses as an organisation’s', async () => {
    readForSsrMock.mockResolvedValue({ year: homeYear(), notFound: true })
    const route = await importRoute()
    await expect(asServerRender(() => route.loader({ context: { queryClient: createQueryClient() }, params: { cui: '000000000000' }, deps: {} }))).rejects.toThrow('not-found')
  })

  it('describes the last complete year when the one asked is out of range', async () => {
    readForSsrMock.mockResolvedValue({ year: homeYear() })
    const route = await importRoute()
    await asServerRender(() => route.loader({ context: { queryClient: createQueryClient() }, params: { cui: '9813902' }, deps: { year: 2015 } }))
    expect(readForSsrMock).toHaveBeenCalledWith('9813902', homeYear())
  })

  it('starts both reads and returns at once on a client-side navigation', async () => {
    const queryClient = createQueryClient()
    const route = await importRoute()
    const data = await route.loader({ context: { queryClient }, params: { cui: '9813902' }, deps: {} })
    expect(data).toEqual({ year: homeYear() })
    expect(readForSsrMock).not.toHaveBeenCalled()
    expect(queryClient.prefetchQuery.mock.calls.map(([options]) => options.queryKey)).toEqual([
      ['procurement', 'supplier', 'profile', '9813902', homeYear()],
      ['procurement', 'supplier', 'direct', '9813902', homeYear(), 8],
    ])
  })

  it('caches a whole render publicly, and never a failed or partial one', async () => {
    const route = await importRoute()
    vi.stubEnv('DEV', false)
    try {
      const whole = route.headers({ loaderData: { year: 2025, profile: PROFILE, direct: [] } })
      expect(whole['CDN-Cache-Control']).toContain('s-maxage=600')
      expect(whole.Vary).toBe('Accept-Encoding, Cookie')
      for (const loaderData of [{ year: 2025, direct: [] }, { year: 2025, profile: PROFILE }, { year: 2025, profile: { ...PROFILE, partial: true }, direct: [] }]) {
        const headers = route.headers({ loaderData })
        expect(headers['Cache-Control']).toBe('no-store')
        expect(headers['CDN-Cache-Control']).toBe('no-store')
      }
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('names the firm in the head: from the loader, from any cached year after a year is picked, else by its CUI', async () => {
    const route = await importRoute()
    const context = (cached: unknown[] = []) => ({ locale: 'ro', queryClient: { getQueriesData: vi.fn(() => cached) } })
    const named = route.head({ params: { cui: '9813902' }, loaderData: { year: 2025, profile: PROFILE }, match: { context: context() } })
    expect(named.meta).toContainEqual({ title: 'Costalex Construct SRL — Achiziții publice — Transparenta.eu' })
    const picked = route.head({
      params: { cui: '9813902' },
      loaderData: { year: 2023 },
      match: { context: context([[['procurement', 'supplier', 'profile', '9813902', 2023], undefined], [['procurement', 'supplier', 'profile', '9813902', 2025], PROFILE]]) },
    })
    expect(picked.meta).toContainEqual({ title: 'Costalex Construct SRL — Achiziții publice — Transparenta.eu' })
    const unnamed = route.head({ params: { cui: '9813902' }, loaderData: { year: 2025 }, match: { context: context() } })
    expect(unnamed.meta).toContainEqual({ title: 'Furnizor CUI 9813902 — Achiziții publice — Transparenta.eu' })
  })

  it('keeps a page with no sale since 2019 out of search engines', async () => {
    const route = await importRoute()
    const context = { locale: 'ro', queryClient: { getQueriesData: () => [] } }
    const empty = { ...PROFILE, directYears: [], contractYears: [{ year: 2025, value: null, count: 0 }] }
    expect(route.head({ params: { cui: '36744060' }, loaderData: { year: 2025, profile: empty }, match: { context } }).meta).toContainEqual({ name: 'robots', content: 'noindex' })
    expect(route.head({ params: { cui: '9813902' }, loaderData: { year: 2025, profile: PROFILE }, match: { context } }).meta).not.toContainEqual({ name: 'robots', content: 'noindex' })
  })
})
