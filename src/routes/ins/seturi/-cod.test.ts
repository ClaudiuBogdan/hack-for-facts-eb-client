import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detailDataset,
  detailTier0,
} from '@/features/statistics/test/detail-fixtures'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
const notFoundMock = vi.fn(() => notFoundError)
const fetchDatasetTier0Mock = vi.fn()
const resolveDatasetSeriesMock = vi.fn()
const prefetchDatasetDetailMock = vi.fn()
const datasetTier0ReadsMock = vi.fn(() => [] as unknown[])

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
  redirect: vi.fn(),
}))
vi.mock('@/features/statistics/api/dataset-detail-api', () => ({
  fetchDatasetTier0: fetchDatasetTier0Mock,
}))
vi.mock('@/features/statistics/lib/detail-series-resolution', () => ({
  resolveDatasetSeries: resolveDatasetSeriesMock,
}))
vi.mock('@/features/statistics/hooks/use-dataset-detail', () => ({
  prefetchDatasetDetail: prefetchDatasetDetailMock,
  datasetTier0Reads: datasetTier0ReadsMock,
}))
vi.mock('@/lib/http-cache', () => ({
  createNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }),
  createPublicPageCacheHeaders: () => ({ 'Cache-Control': 'public' }),
}))

type LoaderInput = {
  readonly context: { readonly queryClient: unknown }
  readonly params: { readonly cod: string }
  readonly deps: Record<string, unknown>
  readonly abortController: AbortController
}

type LoaderData = {
  readonly tier0?: unknown
  readonly series?: { readonly series: unknown; readonly issues?: readonly string[] }
  readonly headDataset?: unknown
  readonly scopeKey: string
  readonly failed: boolean
}

async function importRoute() {
  const { Route } = await import('./$cod')
  return Route as unknown as {
    loader: (input: LoaderInput) => Promise<LoaderData>
    headers: (input: { readonly loaderData?: LoaderData }) => Record<string, string>
    head: (input: { readonly loaderData?: LoaderData }) => {
      readonly meta: ReadonlyArray<Record<string, unknown>>
    }
  }
}

const deps = { teritoriu: undefined, clasificari: undefined, unitate: undefined }
const input = (cod = 'POP107D'): LoaderInput => ({
  context: { queryClient: { tag: 'query-client' } },
  params: { cod },
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

const resolved = {
  nativeContract: 'resolved-v1',
  series: { readMode: 'complete', observations: [] },
  representative: null,
  issues: [],
}

describe('/ins/seturi/$cod loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    notFoundMock.mockClear()
    fetchDatasetTier0Mock.mockReset()
    resolveDatasetSeriesMock.mockReset()
    prefetchDatasetDetailMock.mockReset()
    prefetchDatasetDetailMock.mockResolvedValue(undefined)
    datasetTier0ReadsMock.mockReset()
    datasetTier0ReadsMock.mockReturnValue([])
  })

  it('never blocks a client-side navigation: it starts the reads under the page’s keys and returns', async () => {
    const route = await importRoute()
    // A prefetch that never settles is exactly the frozen click this avoids.
    prefetchDatasetDetailMock.mockImplementation(() => new Promise(() => {}))
    const data = await route.loader(input())
    expect(data).toEqual({ scopeKey: expect.stringContaining('native-source-selection-v1'), failed: false })
    expect(prefetchDatasetDetailMock).toHaveBeenCalledWith({ tag: 'query-client' }, { code: 'POP107D', search: deps })
    expect(fetchDatasetTier0Mock).not.toHaveBeenCalled()
    expect(notFoundMock).not.toHaveBeenCalled()
  })

  it('keeps the document head named on a client-side scope change, from the dataset already read', async () => {
    const tier0 = detailTier0()
    datasetTier0ReadsMock.mockReturnValue([tier0])
    const route = await importRoute()
    const data = await route.loader(input())
    expect(data).toEqual({ scopeKey: expect.any(String), failed: false, headDataset: tier0.dataset })
    expect(route.head({ loaderData: data }).meta[0]).toEqual({
      title: 'Populația după domiciliu (POP107D) — Transparenta.eu',
    })
    // The head's dataset is never a seed: the lazy route reads `tier0` alone.
    expect(data.tier0).toBeUndefined()
  })

  it('swallows a failed prefetch on the client: the page’s own query reports it', async () => {
    const route = await importRoute()
    prefetchDatasetDetailMock.mockRejectedValue(new Error('down'))
    await expect(route.loader(input())).resolves.toMatchObject({ failed: false })
  })

  it('awaits the dataset and its resolved series while server-rendering', async () => {
    const tier0 = detailTier0()
    fetchDatasetTier0Mock.mockResolvedValue(tier0)
    resolveDatasetSeriesMock.mockResolvedValue(resolved)
    const route = await importRoute()
    const data = await asServerRender(() => route.loader(input('pop107d')))
    expect(fetchDatasetTier0Mock).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'POP107D', entity: { territoryCode: 'RO', territoryLevel: 'NATIONAL' } }),
    )
    expect(resolveDatasetSeriesMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'POP107D', search: deps, dataset: tier0.dataset, latest: tier0.latest }),
    )
    expect(data).toEqual({ tier0, series: resolved, scopeKey: expect.any(String), failed: false })
    expect(prefetchDatasetDetailMock).not.toHaveBeenCalled()
    expect(route.headers({ loaderData: data })).toEqual({ 'Cache-Control': 'public' })
  })

  it('answers not-found for an unknown code while server-rendering', async () => {
    fetchDatasetTier0Mock.mockResolvedValue(detailTier0({ dataset: null, latest: null }))
    const route = await importRoute()
    await expect(asServerRender(() => route.loader(input('NUEXISTA')))).rejects.toBe(notFoundError)
    expect(resolveDatasetSeriesMock).not.toHaveBeenCalled()
  })

  it('reads nothing past the catalog for a catalog-only matrix, and caches that page', async () => {
    const tier0 = detailTier0({
      dataset: detailDataset({ code: 'TUR101C', data_status: 'CATALOG_ONLY', sync_status: 'PENDING' }),
      latest: null,
    })
    fetchDatasetTier0Mock.mockResolvedValue(tier0)
    const route = await importRoute()
    const data = await asServerRender(() => route.loader(input('TUR101C')))
    expect(resolveDatasetSeriesMock).not.toHaveBeenCalled()
    expect(data).toEqual({ tier0, scopeKey: expect.any(String), failed: false })
    expect(route.headers({ loaderData: data })).toEqual({ 'Cache-Control': 'public' })
  })

  it('serves a failed read uncached, and keeps the dataset when only the series failed', async () => {
    const route = await importRoute()
    fetchDatasetTier0Mock.mockRejectedValue(new Error('upstream down'))
    const tier0Failed = await asServerRender(() => route.loader(input()))
    expect(tier0Failed).toEqual({ scopeKey: expect.any(String), failed: true })
    expect(route.headers({ loaderData: tier0Failed })).toEqual({ 'Cache-Control': 'no-store' })

    const tier0 = detailTier0()
    fetchDatasetTier0Mock.mockResolvedValue(tier0)
    resolveDatasetSeriesMock.mockRejectedValue(new Error('upstream down'))
    const seriesFailed = await asServerRender(() => route.loader(input()))
    expect(seriesFailed).toEqual({ tier0, scopeKey: expect.any(String), failed: true })
    expect(route.headers({ loaderData: seriesFailed })).toEqual({ 'Cache-Control': 'no-store' })
  })

  it('does not cache a render that could show no series for the address', async () => {
    const route = await importRoute()
    const data: LoaderData = {
      tier0: detailTier0(),
      series: { series: null },
      scopeKey: 'k',
      failed: false,
    }
    expect(route.headers({ loaderData: data })).toEqual({ 'Cache-Control': 'no-store' })
    expect(route.headers({ loaderData: undefined })).toEqual({ 'Cache-Control': 'no-store' })
    expect(route.headers({ loaderData: { scopeKey: 'k', failed: false } })).toEqual({ 'Cache-Control': 'no-store' })
  })

  it('describes the page in words, never in the markup INS ships inside a definition', async () => {
    const route = await importRoute()
    const definition = `Capitolul 7 „Conturile de patrimoniu" <a href="https://eur-lex.europa.eu/x" target="_blank">https://eur-lex.europa.eu/x</a>. ${'Metodologia urmează regulamentul european. '.repeat(6)}`
    const { meta } = route.head({
      loaderData: {
        tier0: detailTier0({ dataset: detailDataset({ definition_ro: definition }) }),
        scopeKey: 'k',
        failed: false,
      },
    })
    const description = meta.find((entry) => entry.name === 'description')?.content as string
    expect(description).not.toContain('<a')
    expect(description).not.toContain('target=')
    expect(description.length).toBeLessThanOrEqual(161)
    expect(description.endsWith('…')).toBe(true)
    expect(meta[0]).toEqual({ title: 'Populația după domiciliu (POP107D) — Transparenta.eu' })
  })

  it('describes a markup-only definition with the generic line, never an empty tag', async () => {
    const route = await importRoute()
    const { meta } = route.head({
      loaderData: {
        tier0: detailTier0({ dataset: detailDataset({ definition_ro: '<br>' }) }),
        scopeKey: 'k',
        failed: false,
      },
    })
    expect(meta.find((entry) => entry.name === 'description')?.content).toBe(
      'Serie de date INS Tempo cu valori pe teritorii și perioade.',
    )
  })

  it('names the page a placeholder on a client-side navigation, where the dataset is still in flight', async () => {
    const route = await importRoute()
    expect(route.head({ loaderData: { scopeKey: 'k', failed: false } }).meta).toEqual([
      { title: 'Set de date INS — Transparenta.eu' },
      { property: 'og:title', content: 'Set de date INS — Transparenta.eu' },
      { name: 'twitter:title', content: 'Set de date INS — Transparenta.eu' },
    ])
  })
})
