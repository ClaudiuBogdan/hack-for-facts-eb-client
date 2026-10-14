import { beforeEach, describe, expect, it, vi } from 'vitest'

const { readCatalogForSsr, catalogOptions } = vi.hoisted(() => ({
  readCatalogForSsr: vi.fn(),
  catalogOptions: vi.fn((search: unknown) => ({ queryKey: ['catalog', search] })),
}))

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options }))
vi.mock('@/features/elections/api/elections-catalog-ssr', () => ({ readElectionCatalogForSsr: readCatalogForSsr }))
vi.mock('@/features/elections/hooks/use-elections-catalog', () => ({ electionCatalogQueryOptions: catalogOptions }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (descriptor: unknown) => String(descriptor) }) }))

const { Route } = await import('./index')
const { electionsCatalogKeys, seedKeyOf } = await import('@/features/elections/lib/elections-catalog-keys')

type LoaderInput = {
  readonly context: { readonly queryClient: { readonly prefetchQuery: ReturnType<typeof vi.fn> } }
  readonly deps: Record<string, unknown>
  readonly abortController: AbortController
}
const route = Route as unknown as {
  readonly validateSearch: (search: unknown) => Record<string, unknown>
  readonly loaderDeps: (input: { readonly search: Record<string, unknown> }) => Record<string, unknown>
  readonly loader: (input: LoaderInput) => Promise<Record<string, unknown>>
  readonly headers: () => Record<string, string>
  readonly head: (input: { readonly match: { readonly context: { readonly locale: string } } }) => {
    readonly meta: readonly Record<string, string>[]
    readonly links: readonly Record<string, string>[]
  }
}

const input = (deps: Record<string, unknown> = {}): LoaderInput => ({
  context: { queryClient: { prefetchQuery: vi.fn(() => new Promise(() => undefined)) } },
  deps,
  abortController: new AbortController(),
})

/** Runs `body` with `globalThis.window` removed: the real loader-blocking sniff then says „server". */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
  }
}

const PAGE = { items: [], page: 1, pageSize: 20, total: 50, hasMore: true }

beforeEach(() => {
  readCatalogForSsr.mockReset()
  catalogOptions.mockClear()
})

describe('/alegeri', () => {
  it('reads its filters and page from the address, exactly', () => {
    expect(route.validateSearch(undefined)).toEqual({})
    expect(route.validateSearch({ an: 2024, tip: 'local,presidential', pagina: 2, q: 'cluj', sort: 'year' })).toEqual({ an: 2024, tip: 'local,presidential', pagina: 2 })
    expect(route.loaderDeps({ search: { an: 2024, pagina: 2 } })).toEqual({ an: 2024, pagina: 2 })
  })

  it('starts the read under the page’s own key in the browser and returns at once', async () => {
    const loaderInput = input({ tip: 'local' })
    await expect(route.loader(loaderInput)).resolves.toEqual({ seedKey: seedKeyOf(electionsCatalogKeys.catalog({ tip: 'local' })) })
    expect(loaderInput.context.queryClient.prefetchQuery).toHaveBeenCalledWith({ queryKey: ['catalog', { tip: 'local' }] })
    expect(readCatalogForSsr).not.toHaveBeenCalled()
  })

  it('reads the page while server-rendering, keyed to the address it was read for', async () => {
    readCatalogForSsr.mockResolvedValue(PAGE)
    const loaderInput = input({ an: 2019, pagina: 3 })
    await expect(asServerRender(() => route.loader(loaderInput))).resolves.toEqual({ seedKey: seedKeyOf(electionsCatalogKeys.catalog({ an: 2019, pagina: 3 })), page: PAGE })
    expect(readCatalogForSsr).toHaveBeenCalledWith({ an: 2019, pagina: 3 }, loaderInput.abortController.signal)
  })

  it('leaves a failed server read to the page’s own query and retry', async () => {
    readCatalogForSsr.mockResolvedValue(undefined)
    await expect(asServerRender(() => route.loader(input()))).resolves.toEqual({ seedKey: seedKeyOf(electionsCatalogKeys.catalog({})) })
  })

  it('is never cached, by the browser or the CDN', () => {
    expect(route.headers()).toEqual({ 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' })
  })

  it('names the catalog in the head, canonical on the bare address', () => {
    const head = route.head({ match: { context: { locale: 'ro' } } })
    expect(head.meta[0]).toEqual({ title: 'Ediții de date electorale — Alegeri — Transparenta.eu' })
    expect(head.meta).toContainEqual({ name: 'description', content: expect.stringContaining('Rezultatele nu sunt încă disponibile') })
    expect(head.links).toEqual([{ rel: 'canonical', href: 'https://transparenta.eu/alegeri' }])
  })
})
