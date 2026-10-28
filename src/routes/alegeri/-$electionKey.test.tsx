import { beforeEach, describe, expect, it, vi } from 'vitest'
import { event as eventOf } from '@/features/elections/test/catalog-fixtures'

const { readEventForSsr, eventOptions, contestsOptions, notFoundError } = vi.hoisted(() => ({
  readEventForSsr: vi.fn(),
  eventOptions: vi.fn((key: string) => ({ queryKey: ['event', key] })),
  contestsOptions: vi.fn((key: string, search: unknown) => ({ queryKey: ['contests', key, search] })),
  notFoundError: new Error('not-found'),
}))

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options, notFound: () => notFoundError }))
vi.mock('@/features/elections/api/elections-catalog-ssr', () => ({ readElectionEventForSsr: readEventForSsr }))
vi.mock('@/features/elections/hooks/use-elections-catalog', () => ({ electionEventQueryOptions: eventOptions, electionContestsQueryOptions: contestsOptions }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (descriptor: unknown) => String(descriptor) }) }))

const { Route } = await import('./$electionKey')
const { electionsCatalogKeys, seedKeyOf } = await import('@/features/elections/lib/elections-catalog-keys')

interface QueryClientStub {
  readonly fetchQuery: ReturnType<typeof vi.fn>
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

const queryClient = (data?: unknown, event: unknown = null): QueryClientStub => ({
  fetchQuery: vi.fn(() => Promise.resolve(event)),
  prefetchQuery: vi.fn(() => Promise.resolve()),
  getQueryData: vi.fn(() => data),
})
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

const EVENT = eventOf()
const PAGE = { items: [], page: 1, pageSize: 20, total: 0, hasMore: false }
const titleOf = (head: { readonly meta: readonly Record<string, string>[] }) => head.meta[0]?.title

beforeEach(() => {
  readEventForSsr.mockReset()
  eventOptions.mockClear()
  contestsOptions.mockClear()
})

describe('/alegeri/$electionKey', () => {
  it('reads the ballot day, the filters and the page from the address, exactly', () => {
    expect(route.validateSearch({ data: '2024-06-23', functie: 'mayor', arie: 'uat', judet: 'CJ', pagina: 2, tur: 'tur1', tab: 'sumar' })).toEqual({
      data: '2024-06-23',
      functie: 'mayor',
      arie: 'uat',
      judet: 'CJ',
      pagina: 2,
    })
  })

  it('in the browser, starts the event’s read, then the named day’s contests, and returns at once', async () => {
    const client = queryClient(undefined, EVENT)
    await expect(route.loader(input('ro:local:2024', { data: '2024-06-23', functie: 'mayor' }, client))).resolves.toEqual({ electionKey: 'ro:local:2024' })
    expect(client.fetchQuery).toHaveBeenCalledWith({ queryKey: ['event', 'ro:local:2024'] })
    await vi.waitFor(() => expect(client.prefetchQuery).toHaveBeenCalledWith({ queryKey: ['contests', 'ro:local:2024:2024-06-23', { data: '2024-06-23', functie: 'mayor' }] }))
  })

  it('in the browser, reads no contests for an event the API does not have', async () => {
    const client = queryClient(undefined, null)
    await route.loader(input('ro:local:1999', {}, client))
    await Promise.resolve()
    expect(client.prefetchQuery).not.toHaveBeenCalled()
  })

  it('reads the event and its day’s contests while server-rendering, keyed to what they were read for', async () => {
    readEventForSsr.mockResolvedValue({ event: EVENT, contests: { occurrenceKey: 'ro:local:2024:2024-06-09', page: PAGE } })
    const loaderInput = input('ro:local:2024', { pagina: 2 })
    await expect(asServerRender(() => route.loader(loaderInput))).resolves.toEqual({
      electionKey: 'ro:local:2024',
      event: EVENT,
      contests: {
        occurrenceKey: 'ro:local:2024:2024-06-09',
        seedKey: seedKeyOf(electionsCatalogKeys.contests('ro:local:2024:2024-06-09', { pagina: 2 })),
        page: PAGE,
      },
    })
    expect(readEventForSsr).toHaveBeenCalledWith('ro:local:2024', { pagina: 2 }, loaderInput.abortController.signal)
  })

  it('answers an event the API does not have with a 404 on the server', async () => {
    readEventForSsr.mockResolvedValue({ event: null })
    await expect(asServerRender(() => route.loader(input('ro:local:1999')))).rejects.toBe(notFoundError)
  })

  it('leaves a failed event read to the page, never to a 404', async () => {
    readEventForSsr.mockResolvedValue({})
    await expect(asServerRender(() => route.loader(input('ro:local:2024')))).resolves.toEqual({ electionKey: 'ro:local:2024' })
  })

  it('answers a key the API could never hold with a 404, reading nothing', async () => {
    const client = queryClient()
    for (const key of ['', 'bad\nkey', 'a'.repeat(513)]) {
      await expect(route.loader(input(key, {}, client))).rejects.toBe(notFoundError)
      await expect(asServerRender(() => route.loader(input(key, {}, client)))).rejects.toBe(notFoundError)
    }
    expect(readEventForSsr).not.toHaveBeenCalled()
    expect(client.fetchQuery).not.toHaveBeenCalled()
  })

  it('is never cached, by the browser or the CDN', () => {
    expect(route.headers()).toEqual({ 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' })
  })

  it('names the event in the head, from the server’s read or the cache, canonical on its encoded key', () => {
    const fromLoader = route.head({ params: { electionKey: 'ro:local:2024' }, loaderData: { event: EVENT }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    expect(titleOf(fromLoader)).toBe('Alegeri locale 2024 — Transparenta.eu')
    expect(fromLoader.links).toEqual([{ rel: 'canonical', href: 'https://transparenta.eu/alegeri/ro%3Alocal%3A2024' }])
    const fromCache = route.head({
      params: { electionKey: 'ro:presidential:2025' },
      match: { context: { locale: 'ro', queryClient: queryClient(eventOf({ eventKey: 'ro:presidential:2025', family: 'presidential', year: 2025 })) } },
    })
    expect(titleOf(fromCache)).toBe('Alegeri prezidențiale 2025 — Transparenta.eu')
    const unknown = route.head({ params: { electionKey: 'k:1' }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    expect(titleOf(unknown)).toBe('Alegerea k:1 — Transparenta.eu')
  })
})
