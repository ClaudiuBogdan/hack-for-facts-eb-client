import { beforeEach, describe, expect, it, vi } from 'vitest'
import { territoryHubFixture } from '@/features/statistics/test/territory-hub-fixtures'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
const notFoundMock = vi.fn(() => notFoundError)
const fetchStatisticsTerritoryHubMock = vi.fn()
const prefetchMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))
vi.mock('@/features/statistics/api/statistics-api', () => ({
  fetchStatisticsTerritoryHub: fetchStatisticsTerritoryHubMock,
}))
vi.mock('@/features/statistics/hooks/use-statistics', () => ({
  prefetchStatisticsTerritoryHub: prefetchMock,
}))
vi.mock('@/lib/http-cache', () => ({
  createNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }),
  createPublicPageCacheHeaders: () => ({ 'Cache-Control': 'public' }),
}))

type LoaderData = { readonly hub?: unknown; readonly failed: boolean }
type LoaderInput = {
  readonly context: { readonly queryClient: unknown }
  readonly params: { readonly siruta: string }
  readonly abortController: AbortController
}

async function importRoute() {
  const { Route } = await import('./$siruta')
  return Route as unknown as {
    loader: (input: LoaderInput) => Promise<LoaderData>
    headers: (input: { readonly loaderData?: LoaderData }) => Record<string, string>
    head: (input: { readonly loaderData?: LoaderData }) => {
      readonly meta: ReadonlyArray<Record<string, unknown>>
    }
  }
}

const input = (siruta = '54975'): LoaderInput => ({
  context: { queryClient: { tag: 'query-client' } },
  params: { siruta },
  abortController: new AbortController(),
})

/** Runs `body` with `globalThis.window` removed: the SSR branch, with its real guard. */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
  }
}

describe('/ins/teritorii/$siruta loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    notFoundMock.mockClear()
    fetchStatisticsTerritoryHubMock.mockReset()
    prefetchMock.mockReset()
    prefetchMock.mockResolvedValue(undefined)
  })

  it('never blocks a client-side navigation: it starts the read under the page’s key and returns', async () => {
    const route = await importRoute()
    prefetchMock.mockImplementation(() => new Promise(() => {}))
    await expect(route.loader(input())).resolves.toEqual({ failed: false })
    expect(prefetchMock).toHaveBeenCalledWith({ tag: 'query-client' }, '54975')
    expect(fetchStatisticsTerritoryHubMock).not.toHaveBeenCalled()
  })

  it('starts no read for a malformed code on the client either', async () => {
    const route = await importRoute()
    await expect(route.loader(input('nu-e-siruta'))).resolves.toEqual({ failed: false })
    expect(prefetchMock).not.toHaveBeenCalled()
  })

  it('awaits the hub while server-rendering and caches that page', async () => {
    const hub = territoryHubFixture('54975')
    fetchStatisticsTerritoryHubMock.mockResolvedValue(hub)
    const route = await importRoute()
    const data = await asServerRender(() => route.loader(input(' 54975 ')))
    expect(fetchStatisticsTerritoryHubMock).toHaveBeenCalledWith('54975', expect.any(AbortSignal))
    expect(data).toEqual({ hub, failed: false })
    expect(route.headers({ loaderData: data })).toEqual({ 'Cache-Control': 'public' })
    expect(prefetchMock).not.toHaveBeenCalled()
  })

  it('answers not-found for an unknown or malformed code while server-rendering, never a cached 200', async () => {
    fetchStatisticsTerritoryHubMock.mockResolvedValue(null)
    const route = await importRoute()
    await expect(asServerRender(() => route.loader(input('999999')))).rejects.toBe(notFoundError)
    await expect(asServerRender(() => route.loader(input('abc')))).rejects.toBe(notFoundError)
    expect(fetchStatisticsTerritoryHubMock).toHaveBeenCalledTimes(1)
  })

  it('serves a failed read uncached', async () => {
    fetchStatisticsTerritoryHubMock.mockRejectedValue(new Error('upstream down'))
    const route = await importRoute()
    const data = await asServerRender(() => route.loader(input()))
    expect(data).toEqual({ failed: true })
    expect(route.headers({ loaderData: data })).toEqual({ 'Cache-Control': 'no-store' })
    expect(route.headers({ loaderData: { failed: false } })).toEqual({ 'Cache-Control': 'no-store' })
    expect(route.headers({ loaderData: undefined })).toEqual({ 'Cache-Control': 'no-store' })
  })

  it('names the place in the document head, and a placeholder before the place is known', async () => {
    const route = await importRoute()
    const { meta } = route.head({ loaderData: { hub: territoryHubFixture('54975'), failed: false } })
    expect(meta[0]).toEqual({ title: 'Cluj-Napoca · Statistici INS — Transparenta.eu' })
    // The card a shared link unfurls into names the place too, not the site.
    expect(meta).toContainEqual({ property: 'og:title', content: 'Cluj-Napoca · Statistici INS — Transparenta.eu' })
    expect(String(meta.find((tag) => tag.property === 'og:description')?.content)).toContain('Cluj-Napoca')
    expect(route.head({ loaderData: { failed: false } }).meta).toEqual([
      { title: 'Statistici teritoriu — Transparenta.eu' },
      { property: 'og:title', content: 'Statistici teritoriu — Transparenta.eu' },
      { name: 'twitter:title', content: 'Statistici teritoriu — Transparenta.eu' },
    ])
  })
})
