import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contest as contestOf, event as eventOf, result as resultOf } from '@/features/elections/test/catalog-fixtures'

const { readContestForSsr, contestOptions, resultOptions, eventOptions, notFoundError } = vi.hoisted(() => ({
  readContestForSsr: vi.fn(),
  contestOptions: vi.fn((key: string) => ({ queryKey: ['contest', key] })),
  resultOptions: vi.fn((contest: { readonly contestKey: string }) => ({ queryKey: ['result', contest.contestKey] })),
  eventOptions: vi.fn((key: string) => ({ queryKey: ['event', key] })),
  notFoundError: new Error('not-found'),
}))

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options, notFound: () => notFoundError }))
vi.mock('@/features/elections/api/elections-catalog-ssr', () => ({ readElectionContestForSsr: readContestForSsr }))
vi.mock('@/features/elections/hooks/use-elections-catalog', () => ({
  electionContestQueryOptions: contestOptions,
  electionResultQueryOptions: resultOptions,
  electionEventQueryOptions: eventOptions,
}))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (descriptor: unknown) => String(descriptor) }) }))

const { Route } = await import('./$contestKey')

interface QueryClientStub {
  readonly fetchQuery: ReturnType<typeof vi.fn>
  readonly prefetchQuery: ReturnType<typeof vi.fn>
  readonly getQueryData: ReturnType<typeof vi.fn>
}
type LoaderInput = {
  readonly context: { readonly queryClient: QueryClientStub }
  readonly params: { readonly contestKey: string }
  readonly abortController: AbortController
}
const route = Route as unknown as {
  readonly validateSearch?: unknown
  readonly loader: (input: LoaderInput) => Promise<Record<string, unknown>>
  readonly headers: () => Record<string, string>
  readonly head: (input: {
    readonly params: { readonly contestKey: string }
    readonly loaderData?: Record<string, unknown>
    readonly match: { readonly context: { readonly locale: string; readonly queryClient: QueryClientStub } }
  }) => { readonly meta: readonly Record<string, string>[]; readonly links: readonly Record<string, string>[] }
}

const queryClient = (data?: unknown, contest: unknown = null): QueryClientStub => ({
  fetchQuery: vi.fn(() => Promise.resolve(contest)),
  prefetchQuery: vi.fn(() => Promise.resolve()),
  getQueryData: vi.fn(() => data),
})
const input = (contestKey: string, client = queryClient()): LoaderInput => ({ context: { queryClient: client }, params: { contestKey }, abortController: new AbortController() })

async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
  }
}

const CONTEST = contestOf()
const KEY = CONTEST.contestKey
const RESULT = resultOf()
const EVENT = eventOf()

beforeEach(() => {
  readContestForSsr.mockReset()
  for (const mock of [contestOptions, resultOptions, eventOptions]) mock.mockClear()
})

describe('/alegeri/contest/$contestKey', () => {
  it('takes no search params: a contest page is its key', () => {
    expect(route.validateSearch).toBeUndefined()
  })

  it('in the browser, starts the contest’s read, then its figures and event, and returns at once', async () => {
    const client = queryClient(undefined, CONTEST)
    await expect(route.loader(input(KEY, client))).resolves.toEqual({ contestKey: KEY })
    expect(client.fetchQuery).toHaveBeenCalledWith({ queryKey: ['contest', KEY] })
    await vi.waitFor(() => expect(client.prefetchQuery).toHaveBeenCalledTimes(2))
    expect(client.prefetchQuery.mock.calls.map(([options]) => options)).toEqual([{ queryKey: ['result', KEY] }, { queryKey: ['event', 'ro:local:2024'] }])
  })

  it('reads the contest, its figures and its event while server-rendering, and answers a missing contest with a 404', async () => {
    readContestForSsr.mockResolvedValueOnce({ contest: CONTEST, result: RESULT, event: EVENT }).mockResolvedValueOnce({ contest: null })
    const loaderInput = input(KEY)
    await expect(asServerRender(() => route.loader(loaderInput))).resolves.toEqual({ contestKey: KEY, contest: CONTEST, result: RESULT, event: EVENT })
    expect(readContestForSsr).toHaveBeenCalledWith(KEY, loaderInput.abortController.signal)
    await expect(asServerRender(() => route.loader(input('missing')))).rejects.toBe(notFoundError)
  })

  it('keeps a place without figures as null, and leaves failed reads to the page', async () => {
    readContestForSsr.mockResolvedValueOnce({ contest: CONTEST, result: null }).mockResolvedValueOnce({})
    await expect(asServerRender(() => route.loader(input(KEY)))).resolves.toEqual({ contestKey: KEY, contest: CONTEST, result: null })
    await expect(asServerRender(() => route.loader(input(KEY)))).resolves.toEqual({ contestKey: KEY })
  })

  it('answers a key the API could never hold with a 404, reading nothing', async () => {
    const client = queryClient()
    await expect(route.loader(input('bad\u0000key', client))).rejects.toBe(notFoundError)
    expect(client.fetchQuery).not.toHaveBeenCalled()
    expect(readContestForSsr).not.toHaveBeenCalled()
  })

  it('is never cached, by the browser or the CDN', () => {
    expect(route.headers()).toEqual({ 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' })
  })

  it('names the contest by its place and office, canonical on its encoded key', () => {
    const head = route.head({ params: { contestKey: KEY }, loaderData: { contest: CONTEST }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    expect(head.meta[0]).toEqual({ title: 'VICTORIA · Primar — Alegeri — Transparenta.eu' })
    expect(head.links).toEqual([{ rel: 'canonical', href: `https://transparenta.eu/alegeri/contest/${encodeURIComponent(KEY)}` }])
    const pending = route.head({ params: { contestKey: KEY }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    expect(pending.meta[0]).toEqual({ title: `Scrutinul ${KEY} — Alegeri — Transparenta.eu` })
  })
})
