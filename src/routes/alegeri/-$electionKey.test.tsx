import { beforeEach, describe, expect, it, vi } from 'vitest'

const { readEditionForSsr, editionOptions, contestsOptions, notFoundError } = vi.hoisted(() => ({
  readEditionForSsr: vi.fn(),
  editionOptions: vi.fn((key: string) => ({ queryKey: ['edition', key] })),
  contestsOptions: vi.fn((key: string, search: unknown) => ({ queryKey: ['contests', key, search] })),
  notFoundError: new Error('not-found'),
}))

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options, notFound: () => notFoundError }))
vi.mock('@/features/elections/api/elections-catalog-ssr', () => ({ readElectionEditionForSsr: readEditionForSsr }))
vi.mock('@/features/elections/hooks/use-elections-catalog', () => ({ electionEditionQueryOptions: editionOptions, electionContestsQueryOptions: contestsOptions }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (descriptor: unknown) => String(descriptor) }) }))

const { Route } = await import('./$electionKey')
const { electionsCatalogKeys, seedKeyOf } = await import('@/features/elections/lib/elections-catalog-keys')

interface QueryClientStub {
  readonly prefetchQuery: ReturnType<typeof vi.fn>
  readonly getQueryData: ReturnType<typeof vi.fn>
}
type LoaderInput = {
  readonly context: { readonly queryClient: QueryClientStub }
  readonly params: { readonly electionKey: string }
  readonly deps: Record<string, unknown>
  readonly abortController: AbortController
}
const route = Route as unknown as {
  readonly validateSearch: (search: unknown) => Record<string, unknown>
  readonly loader: (input: LoaderInput) => Promise<Record<string, unknown>>
  readonly headers: () => Record<string, string>
  readonly head: (input: {
    readonly params: { readonly electionKey: string }
    readonly loaderData?: Record<string, unknown>
    readonly match: { readonly context: { readonly locale: string; readonly queryClient: QueryClientStub } }
  }) => { readonly meta: readonly Record<string, string>[]; readonly links: readonly Record<string, string>[] }
}

const queryClient = (data?: unknown): QueryClientStub => ({ prefetchQuery: vi.fn(() => new Promise(() => undefined)), getQueryData: vi.fn(() => data) })
const input = (electionKey: string, deps: Record<string, unknown> = {}, client = queryClient()): LoaderInput => ({
  context: { queryClient: client },
  params: { electionKey },
  deps,
  abortController: new AbortController(),
})

async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
  }
}

const EDITION = { electionKey: 'bec-local-2024', reportedName: 'bec-local-2024' }
const PAGE = { items: [], page: 1, pageSize: 20, total: 0, hasMore: false }
const titleOf = (head: { readonly meta: readonly Record<string, string>[] }) => head.meta[0]?.title

beforeEach(() => {
  readEditionForSsr.mockReset()
  editionOptions.mockClear()
  contestsOptions.mockClear()
})

describe('/alegeri/$electionKey', () => {
  it('reads the contests’ filters and page from the address, exactly', () => {
    expect(route.validateSearch({ functie: ' mayor', arie: 'county', tur: 1, pagina: 2, tab: 'sumar' })).toEqual({ functie: ' mayor', arie: 'county', tur: '1', pagina: 2 })
  })

  it('starts both reads in the browser and returns at once', async () => {
    const loaderInput = input('bec-local-2024', { functie: 'mayor' })
    await expect(route.loader(loaderInput)).resolves.toEqual({
      electionKey: 'bec-local-2024',
      contestsSeedKey: seedKeyOf(electionsCatalogKeys.contests('bec-local-2024', { functie: 'mayor' })),
    })
    expect(loaderInput.context.queryClient.prefetchQuery.mock.calls.map(([options]) => options)).toEqual([
      { queryKey: ['edition', 'bec-local-2024'] },
      { queryKey: ['contests', 'bec-local-2024', { functie: 'mayor' }] },
    ])
  })

  it('reads the edition and its contests while server-rendering', async () => {
    readEditionForSsr.mockResolvedValue({ edition: EDITION, contests: PAGE })
    const loaderInput = input('bec-local-2024', { pagina: 2 })
    const data = await asServerRender(() => route.loader(loaderInput))
    expect(data).toEqual({
      electionKey: 'bec-local-2024',
      contestsSeedKey: seedKeyOf(electionsCatalogKeys.contests('bec-local-2024', { pagina: 2 })),
      edition: EDITION,
      contests: PAGE,
    })
    expect(readEditionForSsr).toHaveBeenCalledWith('bec-local-2024', { pagina: 2 }, loaderInput.abortController.signal)
  })

  it('answers an edition the API does not have with a 404 on the server', async () => {
    readEditionForSsr.mockResolvedValue({ edition: null })
    await expect(asServerRender(() => route.loader(input('missing')))).rejects.toBe(notFoundError)
  })

  it('leaves a failed edition read to the page, never to a 404', async () => {
    readEditionForSsr.mockResolvedValue({ contests: PAGE })
    const data = await asServerRender(() => route.loader(input('bec-local-2024')))
    expect(data).not.toHaveProperty('edition')
    expect(data).toHaveProperty('contests', PAGE)
  })

  it('answers a key the API could never hold with a 404, reading nothing', async () => {
    const client = queryClient()
    for (const key of ['', 'bad\nkey', 'a'.repeat(513)]) {
      await expect(route.loader(input(key, {}, client))).rejects.toBe(notFoundError)
      await expect(asServerRender(() => route.loader(input(key, {}, client)))).rejects.toBe(notFoundError)
    }
    expect(readEditionForSsr).not.toHaveBeenCalled()
    expect(client.prefetchQuery).not.toHaveBeenCalled()
  })

  it('is never cached, by the browser or the CDN', () => {
    expect(route.headers()).toEqual({ 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' })
  })

  it('names the edition in the head, from the server’s read or the cache, canonical on its encoded key', () => {
    const fromLoader = route.head({ params: { electionKey: 'bec-local-2024' }, loaderData: { edition: EDITION }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    expect(titleOf(fromLoader)).toBe('bec-local-2024 — Alegeri — Transparenta.eu')
    const fromCache = route.head({ params: { electionKey: 'a b' }, match: { context: { locale: 'ro', queryClient: queryClient({ ...EDITION, reportedName: 'Ediția AB' }) } } })
    expect(titleOf(fromCache)).toBe('Ediția AB — Alegeri — Transparenta.eu')
    expect(fromCache.links).toEqual([{ rel: 'canonical', href: 'https://transparenta.eu/alegeri/a%20b' }])
    const unknown = route.head({ params: { electionKey: 'k:1' }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    expect(titleOf(unknown)).toBe('Ediția de sursă k:1 — Alegeri — Transparenta.eu')
  })
})
