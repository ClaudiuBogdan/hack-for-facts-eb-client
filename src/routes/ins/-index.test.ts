import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hubData } from '@/features/statistics/test/hub-fixtures'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const fetchStatisticsHubMock = vi.fn()
const prefetchQueryMock = vi.fn()
const publicHeadersMock = vi.fn((policy: { readonly vary?: readonly string[] }) => ({
  'Cache-Control': 'public',
  Vary: (policy.vary ?? ['Accept-Encoding']).join(', '),
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: (options: unknown) => options,
}))
vi.mock('@/features/statistics/api/statistics-api', () => ({
  fetchStatisticsHub: fetchStatisticsHubMock,
}))
vi.mock('@/lib/http-cache', () => ({
  createNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }),
  createPublicPageCacheHeaders: publicHeadersMock,
}))

type LoaderData = { readonly hub?: { readonly failures: readonly unknown[] } }
type LoaderInput = {
  readonly context: { readonly queryClient: { readonly prefetchQuery: typeof prefetchQueryMock } }
  readonly abortController: AbortController
}

async function importRoute() {
  const { Route } = await import('./index')
  return Route as unknown as {
    loader: (input: LoaderInput) => Promise<LoaderData>
    headers: (input: { readonly loaderData?: LoaderData }) => Record<string, string>
    head: () => { readonly meta: ReadonlyArray<Record<string, unknown>> }
  }
}

const input = (): LoaderInput => ({
  context: { queryClient: { prefetchQuery: prefetchQueryMock } },
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

describe('/ins loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    fetchStatisticsHubMock.mockReset()
    prefetchQueryMock.mockReset()
    prefetchQueryMock.mockResolvedValue(undefined)
    publicHeadersMock.mockClear()
  })

  it('reads under the page’s own key in the browser and returns at once, so a hover preload is not thrown away', async () => {
    const route = await importRoute()
    prefetchQueryMock.mockImplementation(() => new Promise(() => {}))
    await expect(route.loader(input())).resolves.toEqual({})
    expect(prefetchQueryMock).toHaveBeenCalledTimes(1)
    expect(prefetchQueryMock.mock.calls[0][0]).toMatchObject({ queryKey: ['statistics', 'hub-v1'] })
    expect(fetchStatisticsHubMock).not.toHaveBeenCalled()
  })

  it('awaits the hub while server-rendering and caches a complete page per language', async () => {
    const hub = hubData()
    fetchStatisticsHubMock.mockResolvedValue(hub)
    const route = await importRoute()
    const data = await asServerRender(() => route.loader(input()))
    expect(fetchStatisticsHubMock).toHaveBeenCalledWith(expect.any(AbortSignal))
    expect(data).toEqual({ hub })
    expect(prefetchQueryMock).not.toHaveBeenCalled()
    expect(route.headers({ loaderData: data })).toEqual({ 'Cache-Control': 'public', Vary: 'Accept-Encoding, Cookie' })
  })

  it('keeps a complete hub for the next render, and reads one with a failed section again', async () => {
    const complete = hubData()
    const partial = hubData({ failures: ['counties'] })
    fetchStatisticsHubMock.mockResolvedValueOnce(partial).mockResolvedValueOnce(complete)
    const route = await importRoute()
    expect(await asServerRender(() => route.loader(input()))).toEqual({ hub: partial })
    expect(await asServerRender(() => route.loader(input()))).toEqual({ hub: complete })
    expect(await asServerRender(() => route.loader(input()))).toEqual({ hub: complete })
    expect(fetchStatisticsHubMock).toHaveBeenCalledTimes(2)
  })

  it('reads the hub under its own deadline, not the request’s signal: the read is shared', async () => {
    fetchStatisticsHubMock.mockResolvedValue(hubData())
    const route = await importRoute()
    const request = input()
    await asServerRender(() => route.loader(request))
    const signal = fetchStatisticsHubMock.mock.calls[0][0] as AbortSignal
    request.abortController.abort()
    expect(signal.aborted).toBe(false)
  })

  it('names the hub for the tab and for a shared link’s card', async () => {
    const route = await importRoute()
    const { meta } = route.head()
    expect(meta).toContainEqual({ title: 'Statistici INS — Transparenta.eu' })
    expect(meta).toContainEqual({ property: 'og:title', content: 'Statistici INS — Transparenta.eu' })
    expect(meta.find((tag) => tag.property === 'og:description')?.content).toEqual(
      meta.find((tag) => tag.name === 'description')?.content,
    )
  })

  it('serves a render with a failed section uncached', async () => {
    const route = await importRoute()
    expect(route.headers({ loaderData: { hub: { failures: ['counties'] } } })).toEqual({ 'Cache-Control': 'no-store' })
    expect(route.headers({ loaderData: {} })).toEqual({ 'Cache-Control': 'no-store' })
    expect(route.headers({ loaderData: undefined })).toEqual({ 'Cache-Control': 'no-store' })
  })
})
