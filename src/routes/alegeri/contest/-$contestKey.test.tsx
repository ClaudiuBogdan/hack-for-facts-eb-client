import { beforeEach, describe, expect, it, vi } from 'vitest'

const { readContestForSsr, contestOptions, notFoundError } = vi.hoisted(() => ({
  readContestForSsr: vi.fn(),
  contestOptions: vi.fn((key: string) => ({ queryKey: ['contest', key] })),
  notFoundError: new Error('not-found'),
}))

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options, notFound: () => notFoundError }))
vi.mock('@/features/elections/api/elections-catalog-ssr', () => ({ readElectionContestForSsr: readContestForSsr }))
vi.mock('@/features/elections/hooks/use-elections-catalog', () => ({ electionContestQueryOptions: contestOptions }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (descriptor: unknown) => String(descriptor) }) }))

const { Route } = await import('./$contestKey')

interface QueryClientStub {
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

const queryClient = (data?: unknown): QueryClientStub => ({ prefetchQuery: vi.fn(() => new Promise(() => undefined)), getQueryData: vi.fn(() => data) })
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

const KEY = 'contest:bec-local-2024:mayor:source_constituency:8-19'
const CONTEST = { contestKey: KEY, electionKey: 'bec-local-2024', reportedOffice: 'mayor', sourceScopeKey: '8:19', scopeLabel: 'CINCU' }

beforeEach(() => {
  readContestForSsr.mockReset()
  contestOptions.mockClear()
})

describe('/alegeri/contest/$contestKey', () => {
  it('takes no search params: a contest page is its key', () => {
    expect(route.validateSearch).toBeUndefined()
  })

  it('starts the read in the browser and returns at once', async () => {
    const loaderInput = input(KEY)
    await expect(route.loader(loaderInput)).resolves.toEqual({ contestKey: KEY })
    expect(loaderInput.context.queryClient.prefetchQuery).toHaveBeenCalledWith({ queryKey: ['contest', KEY] })
  })

  it('reads the contest while server-rendering, and answers a missing one with a 404', async () => {
    readContestForSsr.mockResolvedValueOnce(CONTEST).mockResolvedValueOnce(null)
    const loaderInput = input(KEY)
    await expect(asServerRender(() => route.loader(loaderInput))).resolves.toEqual({ contestKey: KEY, contest: CONTEST })
    expect(readContestForSsr).toHaveBeenCalledWith(KEY, loaderInput.abortController.signal)
    await expect(asServerRender(() => route.loader(input('missing')))).rejects.toBe(notFoundError)
  })

  it('leaves a failed server read to the page’s own retry', async () => {
    readContestForSsr.mockResolvedValue(undefined)
    await expect(asServerRender(() => route.loader(input(KEY)))).resolves.toEqual({ contestKey: KEY })
  })

  it('answers a key the API could never hold with a 404, reading nothing', async () => {
    const client = queryClient()
    await expect(route.loader(input('bad\u0000key', client))).rejects.toBe(notFoundError)
    expect(client.prefetchQuery).not.toHaveBeenCalled()
    expect(readContestForSsr).not.toHaveBeenCalled()
  })

  it('is never cached, by the browser or the CDN', () => {
    expect(route.headers()).toEqual({ 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' })
  })

  it('names the contest by its place and office, canonical on its encoded key', () => {
    const head = route.head({ params: { contestKey: KEY }, loaderData: { contest: CONTEST }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    expect(head.meta[0]).toEqual({ title: 'CINCU · mayor — Alegeri — Transparenta.eu' })
    expect(head.links).toEqual([{ rel: 'canonical', href: `https://transparenta.eu/alegeri/contest/${encodeURIComponent(KEY)}` }])
    const pending = route.head({ params: { contestKey: KEY }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    expect(pending.meta[0]).toEqual({ title: `Scrutinul ${KEY} — Alegeri — Transparenta.eu` })
  })
})
