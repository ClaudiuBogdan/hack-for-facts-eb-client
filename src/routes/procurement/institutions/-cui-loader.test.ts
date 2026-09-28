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

vi.mock('@/features/procurement/api/procurement-buyer-ssr', () => ({
  readProcurementBuyerForSsr: readForSsrMock,
}))

// The newest year with data: the year in progress, as once SEAP's data reaches into it.
const readNewestYearMock = vi.fn(async (latest: number) => ({ year: latest + 1, failed: false }))
vi.mock('@/features/procurement/api/procurement-cutoff', () => ({
  readNewestYear: readNewestYearMock,
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
  return {
    prefetchQuery: vi.fn(async (_options: QueryOptionsArg): Promise<void> => undefined),
    fetchQuery: vi.fn(async (options: { readonly queryFn: () => Promise<unknown> }) => options.queryFn()),
  }
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

const PROFILE = { identity: { cui: '4291620', name: 'Comuna Surduc' }, partial: false, directYears: [{ year: 2025, value: 2_838_842, count: 145 }], awardYears: [] }

describe('/procurement/institutions/$cui', () => {
  beforeEach(() => {
    vi.resetModules()
    readForSsrMock.mockReset()
    readNewestYearMock.mockClear()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('takes a CUI of digits only', async () => {
    const route = await importRoute()
    expect(route.params.parse({ cui: ' 4291620 ' })).toEqual({ cui: '4291620' })
    expect(() => route.params.parse({ cui: 'RO4291620' })).toThrow('not-found')
  })

  it('keeps the year and the two band choices, and drops what it cannot use', async () => {
    const route = await importRoute()
    expect(route.validateSearch({ year: '2023', ce: 'contracte', mari: 'directe' })).toEqual({ year: 2023, ce: 'contracte', mari: 'directe' })
    expect(route.validateSearch({ year: 'x', ce: 'all', mari: 3, cpv: '45', month: '2025-01' })).toEqual({})
  })

  it('reads the profile and the records on the server, for the year asked — the year in progress included', async () => {
    readForSsrMock.mockResolvedValue({ year: 2023, profile: PROFILE, records: { contracts: [], direct: [] } })
    const queryClient = createQueryClient()
    const route = await importRoute()
    const data = await asServerRender(() => route.loader({ context: { queryClient }, params: { cui: '4291620' }, deps: { year: 2023 } }))
    expect(readForSsrMock).toHaveBeenCalledWith('4291620', 2023)
    expect(readNewestYearMock).not.toHaveBeenCalled()
    expect(data.profile).toBe(PROFILE)
    // Read directly, not seeded into the query client (its server clock would dehydrate stale).
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled()
  })

  it('opens on the newest year with data when none is asked, or the one asked is out of range', async () => {
    readForSsrMock.mockResolvedValue({ year: homeYear() + 1 })
    const route = await importRoute()
    await asServerRender(() => route.loader({ context: { queryClient: createQueryClient() }, params: { cui: '4291620' }, deps: { year: 2015 } }))
    expect(readForSsrMock).toHaveBeenCalledWith('4291620', homeYear() + 1)
    await asServerRender(() => route.loader({ context: { queryClient: createQueryClient() }, params: { cui: '4291620' }, deps: {} }))
    expect(readForSsrMock).toHaveBeenLastCalledWith('4291620', homeYear() + 1)
    // In January the year in progress holds almost nothing: the last complete one.
    readNewestYearMock.mockImplementationOnce(async (latest: number) => ({ year: latest, failed: false }))
    await asServerRender(() => route.loader({ context: { queryClient: createQueryClient() }, params: { cui: '4291620' }, deps: {} }))
    expect(readForSsrMock).toHaveBeenLastCalledWith('4291620', homeYear())
  })

  it('never lets a default opened without SEAP’s cutoff be cached: its year may not be the newest', async () => {
    readForSsrMock.mockResolvedValue({ year: homeYear(), profile: PROFILE, records: { contracts: [], direct: [] } })
    readNewestYearMock.mockImplementationOnce(async (latest: number) => ({ year: latest, failed: true }))
    const route = await importRoute()
    const data = await asServerRender(() => route.loader({ context: { queryClient: createQueryClient() }, params: { cui: '4291620' }, deps: {} }))
    expect(data.newestUnread).toBe(true)
    expect(route.headers({ loaderData: data })['CDN-Cache-Control']).toBe('no-store')
  })

  it('starts both reads and returns at once on a client-side navigation', async () => {
    const queryClient = createQueryClient()
    const route = await importRoute()
    const data = await route.loader({ context: { queryClient }, params: { cui: '4291620' }, deps: { year: 2023 } })
    expect(data).toEqual({ year: 2023 })
    expect(readForSsrMock).not.toHaveBeenCalled()
    expect(queryClient.prefetchQuery.mock.calls.map(([options]) => options.queryKey)).toEqual([
      ['procurement', 'buyer', 'profile', '4291620', 2023],
      ['procurement', 'buyer', 'records', '4291620', 2023, 8],
    ])
  })

  it('never holds a client-side navigation without a year for the newest one: it returns at once, and the reads start when it lands', async () => {
    let land: (newest: { year: number; failed: boolean }) => void = () => undefined
    readNewestYearMock.mockImplementationOnce(() => new Promise((resolve) => (land = resolve)))
    const queryClient = createQueryClient()
    const route = await importRoute()
    const data = await route.loader({ context: { queryClient }, params: { cui: '4291620' }, deps: {} })
    expect(data).toEqual({ year: null })
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled()
    land({ year: homeYear() + 1, failed: false })
    await vi.waitFor(() => expect(queryClient.prefetchQuery).toHaveBeenCalledTimes(2))
    expect(queryClient.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(['procurement', 'buyer', 'profile', '4291620', homeYear() + 1])
  })

  it('caches a whole render publicly, and never a failed or partial one', async () => {
    const route = await importRoute()
    vi.stubEnv('DEV', false)
    try {
      const whole = route.headers({ loaderData: { year: 2025, profile: PROFILE, records: { contracts: [], direct: [] } } })
      expect(whole['CDN-Cache-Control']).toContain('s-maxage=600')
      expect(whole.Vary).toBe('Accept-Encoding, Cookie')
      for (const loaderData of [
        { year: 2025, records: { contracts: [], direct: [] } },
        { year: 2025, profile: PROFILE },
        { year: 2025, profile: { ...PROFILE, partial: true }, records: { contracts: [], direct: [] } },
      ]) {
        const headers = route.headers({ loaderData })
        expect(headers['Cache-Control']).toBe('no-store')
        expect(headers['CDN-Cache-Control']).toBe('no-store')
      }
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('names the buyer in the head: from the loader, from any cached year after a year is picked, else by its CUI', async () => {
    const route = await importRoute()
    const context = (cached: unknown[] = []) => ({ locale: 'ro', queryClient: { getQueriesData: vi.fn(() => cached) } })
    const named = route.head({ params: { cui: '4291620' }, loaderData: { year: 2025, profile: PROFILE }, match: { context: context() } })
    expect(named.meta).toContainEqual({ title: 'Comuna Surduc — Achiziții publice — Transparenta.eu' })
    const picked = route.head({
      params: { cui: '4291620' },
      loaderData: { year: 2023 },
      match: { context: context([[['procurement', 'buyer', 'profile', '4291620', 2023], undefined], [['procurement', 'buyer', 'profile', '4291620', 2025], PROFILE]]) },
    })
    expect(picked.meta).toContainEqual({ title: 'Comuna Surduc — Achiziții publice — Transparenta.eu' })
    const unnamed = route.head({ params: { cui: '4291620' }, loaderData: { year: 2025 }, match: { context: context() } })
    expect(unnamed.meta).toContainEqual({ title: 'Instituție CUI 4291620 — Achiziții publice — Transparenta.eu' })
  })

  it('keeps a page with no record since 2019 out of search engines', async () => {
    const route = await importRoute()
    const context = { locale: 'ro', queryClient: { getQueriesData: () => [] } }
    const empty = { ...PROFILE, directYears: [], awardYears: [] }
    expect(route.head({ params: { cui: '14399840' }, loaderData: { year: 2025, profile: empty }, match: { context } }).meta).toContainEqual({ name: 'robots', content: 'noindex' })
    const buying = { ...PROFILE, directYears: [{ year: 2025, value: 1, count: 1 }], awardYears: [] }
    expect(route.head({ params: { cui: '4291620' }, loaderData: { year: 2025, profile: buying }, match: { context } }).meta).not.toContainEqual({ name: 'robots', content: 'noindex' })
  })
})
