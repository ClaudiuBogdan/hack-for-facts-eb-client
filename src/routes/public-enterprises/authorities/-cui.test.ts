import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const notFoundMock = vi.fn(() => new Error('not-found'))
const readAuthorityPortfolio = vi.fn()
const fetchAuthorityPortfolio = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
  notFound: notFoundMock,
}))
// Under Vitest the `msg` macro compiles to its text: the request's translator hands it back.
vi.mock('@/lib/i18n', () => ({
  translatorFor: () => ({ _: (message: string | { readonly id: string; readonly message?: string }) => (typeof message === 'string' ? message : (message.message ?? message.id)) }),
}))
vi.mock('@/features/public-enterprises/api/authority-portfolio-server', () => ({ readAuthorityPortfolio }))
vi.mock('@/features/public-enterprises/api/authority-portfolio-api', () => ({ fetchAuthorityPortfolio }))
// Stubbed rather than partially mocked: `@/config/env` validates `import.meta.env` at import time.
vi.mock('@/config/env', () => ({
  env: { VITE_CLERK_PUBLISHABLE_KEY: 'pk_test' },
  getSiteUrl: () => 'https://transparenta.eu',
  getApiBaseUrl: () => 'https://api.example.com',
}))

import { portfolioFixture } from '@/features/public-enterprises/lib/test/portfolio-fixture'

type LoaderData = Record<string, unknown> & { readonly seo?: Record<string, unknown> }

interface RouteUnderTest {
  readonly notFoundComponent: unknown
  readonly params: { readonly parse: (params: { readonly cui: string }) => { readonly cui: string } }
  readonly validateSearch: (search: Record<string, unknown>) => Record<string, unknown>
  readonly staleTime: number
  readonly loader: (input: { readonly params: { readonly cui: string }; readonly abortController: AbortController }) => Promise<LoaderData>
  readonly headers: (input: { readonly loaderData?: LoaderData }) => Record<string, string>
  readonly head: (input: { readonly params: { readonly cui: string }; readonly loaderData?: LoaderData; readonly match: { readonly context: { readonly locale: string } } }) => {
    readonly meta: ReadonlyArray<Record<string, unknown>>
    readonly links?: ReadonlyArray<Record<string, unknown>>
  }
}

async function importRoute(): Promise<RouteUnderTest> {
  const { Route } = await import('./$cui')
  return Route as unknown as RouteUnderTest
}

/** Runs `body` as the server renders: `import.meta.env.SSR` set and no `window`. */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  vi.stubEnv('SSR', true)
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
    vi.unstubAllEnvs()
  }
}

describe('/public-enterprises/authorities/$cui', () => {
  beforeEach(() => {
    vi.resetModules()
    readAuthorityPortfolio.mockReset()
    fetchAuthorityPortfolio.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('takes a canonical CUI only: 2–10 digits, no leading zero; a path it rejects lands on its own not-found page', async () => {
    const route = await importRoute()
    // Registered here, not in the lazy file: the params fail before that file loads.
    expect(route.notFoundComponent).toEqual(expect.any(Function))
    expect(route.params.parse({ cui: '4270740' })).toEqual({ cui: '4270740' })
    for (const cui of ['RO4270740', '04270740', 'abc', '', '1', '12345678901', '__proto__']) expect(() => route.params.parse({ cui })).toThrow('not-found')
  })

  it('keeps the table’s order and filter in the address, every key back, an unreadable or default one empty', async () => {
    const route = await importRoute()
    expect(route.validateSearch({ ordine: 'rezultat', lista: 'inactive' })).toEqual({ ordine: 'rezultat', lista: 'inactive' })
    expect(route.validateSearch({ ordine: 'cifra', lista: 'nimic', lang: 'en' })).toEqual({ ordine: undefined, lista: undefined })
  })

  it('reads the snapshot on the server, and hands the head what it says', async () => {
    const portfolio = portfolioFixture('4270740')
    readAuthorityPortfolio.mockResolvedValue(portfolio)
    const route = await importRoute()
    const data = await asServerRender(() => route.loader({ params: { cui: '4270740' }, abortController: new AbortController() }))
    expect(readAuthorityPortfolio).toHaveBeenCalledWith('4270740')
    expect(fetchAuthorityPortfolio).not.toHaveBeenCalled()
    expect(data).toEqual({ portfolio, seo: { cui: '4270740', name: 'Consiliul Local Sibiu', listed: 4, announcedOnly: 0, year: 2024 } })
    // A portfolio read once is kept: the snapshot changes only with a deploy.
    expect(route.staleTime).toBe(Number.POSITIVE_INFINITY)
  })

  it('fetches the authority’s part on a client-side navigation, never the snapshot', async () => {
    fetchAuthorityPortfolio.mockResolvedValue(portfolioFixture('45699112'))
    const route = await importRoute()
    const controller = new AbortController()
    const data = await route.loader({ params: { cui: '45699112' }, abortController: controller })
    expect(fetchAuthorityPortfolio).toHaveBeenCalledWith('45699112', { signal: controller.signal })
    expect(readAuthorityPortfolio).not.toHaveBeenCalled()
    expect(data.seo).toMatchObject({ listed: 0, announcedOnly: 1 })
  })

  it('answers an authority the snapshot does not hold with a 404, on the server and in the browser', async () => {
    readAuthorityPortfolio.mockResolvedValue(null)
    fetchAuthorityPortfolio.mockResolvedValue(null)
    const route = await importRoute()
    await expect(asServerRender(() => route.loader({ params: { cui: '99999999' }, abortController: new AbortController() }))).rejects.toThrow('not-found')
    await expect(route.loader({ params: { cui: '99999999' }, abortController: new AbortController() })).rejects.toThrow('not-found')
  })

  it('caches a render publicly, and never a 404', async () => {
    const route = await importRoute()
    vi.stubEnv('DEV', false)
    const whole = route.headers({ loaderData: { portfolio: {} } })
    const missing = route.headers({})
    vi.unstubAllEnvs()
    expect(whole['Cache-Control'] ?? '').toContain('s-maxage=3600')
    expect(whole.Vary ?? '').toContain('Cookie')
    expect(missing['Cache-Control']).toContain('no-store')
    expect(missing['CDN-Cache-Control']).toBe('no-store')
  })

  it('titles the page from the loader’s facts, the CUI alone without them', async () => {
    readAuthorityPortfolio.mockResolvedValue(portfolioFixture('4270740'))
    const route = await importRoute()
    const loaderData = await asServerRender(() => route.loader({ params: { cui: '4270740' }, abortController: new AbortController() }))
    const head = route.head({ params: { cui: '4270740' }, loaderData, match: { context: { locale: 'ro' } } })
    expect(head.meta[0]).toEqual({ title: 'Consiliul Local Sibiu: întreprinderile publice — Transparenta.eu' })
    expect(head.links?.[0]).toEqual({ rel: 'canonical', href: 'https://transparenta.eu/public-enterprises/authorities/4270740' })
    expect(route.head({ params: { cui: '4270740' }, match: { context: { locale: 'ro' } } }).meta).toEqual([{ title: 'CUI 4270740 — Transparenta.eu' }, { name: 'robots', content: 'noindex' }])
    expect(route.head({ params: { cui: 'abc' }, match: { context: { locale: 'ro' } } }).meta[0]).toEqual({ title: 'Transparenta.eu' })
  })
})
