import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundMock = vi.fn(() => new Error('not-found'))
const readForSsrMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))
// Under Vitest the `msg` macro compiles to its text: the request's translator hands it back.
vi.mock('@/lib/i18n', () => ({
  translatorFor: () => ({ _: (message: string | { readonly id: string; readonly message?: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) }),
}))
vi.mock('@/features/public-enterprises/api/public-enterprise-ssr', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/public-enterprises/api/public-enterprise-ssr')>()),
  readPublicEnterpriseForSsr: readForSsrMock,
}))
// Stubbed rather than partially mocked: `@/config/env` validates `import.meta.env` at import time.
vi.mock('@/config/env', () => ({
  env: { VITE_CLERK_PUBLISHABLE_KEY: 'pk_test' },
  getSiteUrl: () => 'https://transparenta.eu',
  getApiBaseUrl: () => 'https://api.example.com',
}))

import { enterpriseReadFixture } from '@/features/public-enterprises/lib/test/enterprise-fixture'

type QueryOptionsArg = { readonly queryKey: readonly unknown[] }

interface RouteUnderTest {
  readonly notFoundComponent: unknown
  readonly params: { readonly parse: (params: { readonly cui: string }) => { readonly cui: string } }
  readonly loader: (input: { readonly context: { readonly queryClient: unknown }; readonly params: { readonly cui: string } }) => Promise<Record<string, unknown>>
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
  readonly head: (input: { readonly params: { readonly cui: string }; readonly loaderData?: Record<string, unknown>; readonly match: { readonly context: { readonly locale: string } } }) => {
    readonly meta: ReadonlyArray<Record<string, unknown>>
    readonly links?: ReadonlyArray<Record<string, unknown>>
  }
}

async function importRoute(): Promise<RouteUnderTest> {
  const { Route } = await import('./$cui')
  return Route as unknown as RouteUnderTest
}

function createQueryClient() {
  return { prefetchQuery: vi.fn(async (_options: QueryOptionsArg): Promise<void> => undefined) }
}

/** Runs `body` with `globalThis.window` removed, so the real `shouldBlockLoaderForSsr` takes its server branch. */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
  }
}

const COMPLETE = { enterprise: enterpriseReadFixture(), company: null, buyer: { partial: false } }

describe('/public-enterprises/$cui', () => {
  beforeEach(() => {
    vi.resetModules()
    readForSsrMock.mockReset()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('takes a canonical CUI only: 2–10 digits, no leading zero; a path it rejects lands on its own not-found page', async () => {
    const route = await importRoute()
    // Registered here, not in the lazy file: the params fail before that file loads.
    expect(route.notFoundComponent).toEqual(expect.any(Function))
    expect(route.params.parse({ cui: '789401' })).toEqual({ cui: '789401' })
    expect(route.params.parse({ cui: '10' })).toEqual({ cui: '10' })
    for (const cui of ['RO789401', ' 789401', '0789401', 'abc', '', '1', '12345678901']) expect(() => route.params.parse({ cui })).toThrow('not-found')
  })

  it('reads the three on the server and hands the head what it says', async () => {
    readForSsrMock.mockResolvedValue(COMPLETE)
    const queryClient = createQueryClient()
    const route = await importRoute()
    const data = await asServerRender(() => route.loader({ context: { queryClient }, params: { cui: '789401' } }))
    expect(readForSsrMock).toHaveBeenCalledWith('789401')
    expect(data).toMatchObject({ cui: '789401', complete: true, seo: { name: 'Tursib SA', authority: 'Consiliul Local Sibiu', authoritySource: 's1001' } })
    // Read directly, not seeded into the query client (its server clock would dehydrate stale).
    expect(queryClient.prefetchQuery).not.toHaveBeenCalled()
  })

  it('answers a CUI no list holds with a 404', async () => {
    readForSsrMock.mockResolvedValue({ enterprise: enterpriseReadFixture({ profile: null }) })
    const route = await importRoute()
    await expect(asServerRender(() => route.loader({ context: { queryClient: createQueryClient() }, params: { cui: '14399840' } }))).rejects.toThrow('not-found')
  })

  it('serves the page when only the enterprise read failed, for the browser to read it', async () => {
    readForSsrMock.mockResolvedValue({ company: null })
    const route = await importRoute()
    const data = await asServerRender(() => route.loader({ context: { queryClient: createQueryClient() }, params: { cui: '789401' } }))
    expect(data).toEqual({ cui: '789401', complete: false, company: null })
  })

  it('starts the three reads and returns at once on a client-side navigation', async () => {
    const queryClient = createQueryClient()
    const route = await importRoute()
    expect(await route.loader({ context: { queryClient }, params: { cui: '789401' } })).toEqual({ cui: '789401', complete: false })
    expect(readForSsrMock).not.toHaveBeenCalled()
    expect(queryClient.prefetchQuery.mock.calls.map(([options]) => options.queryKey)).toEqual([
      ['public-enterprise', '789401'],
      ['private-company', '789401'],
      ['procurement', 'buyer', 'profile', '789401', 'recent'],
    ])
  })

  it('caches a whole render publicly, and never a failed or partial one', async () => {
    const route = await importRoute()
    vi.stubEnv('DEV', false)
    const whole = route.headers({ loaderData: { complete: true } })
    const partial = route.headers({ loaderData: { complete: false } })
    vi.unstubAllEnvs()
    expect(whole['Cache-Control'] ?? '').toContain('s-maxage=600')
    expect(whole.Vary ?? '').toContain('Cookie')
    expect(partial['Cache-Control']).toContain('no-store')
    expect(partial['CDN-Cache-Control']).toBe('no-store')
  })

  it('titles the page from the server’s facts, the CUI alone before they are read', async () => {
    readForSsrMock.mockResolvedValue(COMPLETE)
    const route = await importRoute()
    const loaderData = await asServerRender(() => route.loader({ context: { queryClient: createQueryClient() }, params: { cui: '789401' } }))
    const head = route.head({ params: { cui: '789401' }, loaderData, match: { context: { locale: 'ro' } } })
    expect(head.meta[0]).toEqual({ title: 'Tursib SA — Întreprinderi publice — Transparenta.eu' })
    expect(head.links?.[0]).toEqual({ rel: 'canonical', href: 'https://transparenta.eu/public-enterprises/789401' })
    // Without the enterprise read: a neutral title, and no index.
    expect(route.head({ params: { cui: '789401' }, loaderData: { cui: '789401', complete: false }, match: { context: { locale: 'ro' } } }).meta).toEqual([
      { title: 'CUI 789401 — Transparenta.eu' },
      { name: 'robots', content: 'noindex' },
    ])
    expect(route.head({ params: { cui: 'abc' }, match: { context: { locale: 'ro' } } }).meta[0]).toEqual({ title: 'Transparenta.eu' })
  })
})
