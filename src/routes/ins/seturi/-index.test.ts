import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const fetchDatasetPageMock = vi.fn()
const prefetchQueryMock = vi.fn()
const treeOptions = { queryKey: ['statistics', 'context-tree'] }
const pageOptions = (search: unknown) => ({ queryKey: ['statistics', 'explorer-page', search] })

const loggerError = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: loggerError, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}))
vi.mock('@/features/statistics/api/dataset-explorer-api', () => ({
  fetchDatasetPage: fetchDatasetPageMock,
}))
vi.mock('@/features/statistics/hooks/use-statistics', () => ({
  statisticsContextTreeQueryOptions: () => treeOptions,
}))
vi.mock('@/features/statistics/hooks/use-dataset-explorer', () => ({
  datasetExplorerQueryOptions: pageOptions,
  explorerPageKey: (search: Record<string, unknown>) => `key:${JSON.stringify(search)}`,
}))

type LoaderData = { readonly page?: unknown; readonly pageKey: string }
type LoaderInput = {
  readonly context: { readonly queryClient: { readonly prefetchQuery: typeof prefetchQueryMock } }
  readonly deps: Record<string, unknown>
  readonly abortController: AbortController
}

async function importRoute() {
  const { Route } = await import('./index')
  return Route as unknown as {
    loaderDeps: (input: { readonly search: Record<string, unknown> }) => Record<string, unknown>
    loader: (input: LoaderInput) => Promise<LoaderData>
    head: () => { readonly meta: ReadonlyArray<Record<string, unknown>> }
  }
}

const input = (deps: Record<string, unknown> = { context: '1508' }): LoaderInput => ({
  context: { queryClient: { prefetchQuery: prefetchQueryMock } },
  deps,
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

describe('/ins/seturi loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    fetchDatasetPageMock.mockReset()
    prefetchQueryMock.mockReset()
    prefetchQueryMock.mockResolvedValue(undefined)
    loggerError.mockReset()
  })

  it('re-runs for every change of the address, since the page is the address', async () => {
    const route = await importRoute()
    expect(route.loaderDeps({ search: { q: 'somaj', pagina: 2 } })).toEqual({ q: 'somaj', pagina: 2 })
  })

  it('starts the page and the tree under their own keys in the browser and returns at once', async () => {
    const route = await importRoute()
    prefetchQueryMock.mockImplementation(() => new Promise(() => {}))
    await expect(route.loader(input({ q: 'somaj' }))).resolves.toEqual({ pageKey: 'key:{"q":"somaj"}' })
    expect(prefetchQueryMock.mock.calls.map(([options]) => options)).toEqual([treeOptions, pageOptions({ q: 'somaj' })])
    expect(fetchDatasetPageMock).not.toHaveBeenCalled()
  })

  it('awaits the page while server-rendering, keyed to the address it was read for', async () => {
    const page = { datasets: [{ code: 'SOM101F' }], totalCount: 1, hasNextPage: false }
    fetchDatasetPageMock.mockResolvedValue(page)
    const route = await importRoute()
    const data = await asServerRender(() => route.loader(input({ context: '1508' })))
    expect(fetchDatasetPageMock).toHaveBeenCalledWith({ context: '1508' }, {}, expect.any(AbortSignal))
    expect(data).toEqual({ page, pageKey: 'key:{"context":"1508"}' })
    // The tree is still only prefetched: the list never waits for the rail.
    expect(prefetchQueryMock.mock.calls.map(([options]) => options)).toEqual([treeOptions])
  })

  it('leaves a failed server read to the page’s own query, and reports it', async () => {
    fetchDatasetPageMock.mockRejectedValue(new Error('upstream down'))
    const route = await importRoute()
    await expect(asServerRender(() => route.loader(input()))).resolves.toEqual({ pageKey: 'key:{"context":"1508"}' })
    expect(loggerError).toHaveBeenCalledTimes(1)
  })

  it('does not report a read past the section’s deadline, which the client already logged', async () => {
    const { GraphQLRequestError } = await import('@/lib/graphql/graphql-client')
    fetchDatasetPageMock.mockRejectedValue(new GraphQLRequestError('deadline', { timedOut: true }))
    const route = await importRoute()
    await expect(asServerRender(() => route.loader(input()))).resolves.toEqual({ pageKey: 'key:{"context":"1508"}' })
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('lets a superseded navigation’s abort travel on to the router', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    fetchDatasetPageMock.mockRejectedValue(abort)
    const route = await importRoute()
    await expect(asServerRender(() => route.loader(input()))).rejects.toBe(abort)
    expect(loggerError).not.toHaveBeenCalled()
  })

  it('names the catalog in the document head', async () => {
    const route = await importRoute()
    const { meta } = route.head()
    expect(meta[0]).toEqual({ title: 'Seturi de date INS — Transparenta.eu' })
    expect(meta).toContainEqual({ property: 'og:title', content: 'Seturi de date INS — Transparenta.eu' })
    expect(meta.find((tag) => tag.name === 'twitter:description')?.content).toContain('INS Tempo')
  })
})
