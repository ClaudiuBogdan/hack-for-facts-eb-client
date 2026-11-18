import { beforeEach, describe, expect, it, vi } from 'vitest'
import { directPurchase, dpContext } from '@/features/procurement/lib/direct-purchase.fixture'
import { procurementDirectPurchaseKeys } from '@/features/procurement/lib/direct-purchase-keys'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: () => notFoundError,
  redirect: (options: unknown) => ({ redirect: options }),
}))

const readForSsr = vi.fn()
const resolveForSsr = vi.fn()
vi.mock('@/features/procurement/api/procurement-direct-purchase-ssr', () => ({
  readProcurementDirectPurchaseForSsr: (...args: unknown[]) => readForSsr(...args),
  resolveLegacyLinkForSsr: (...args: unknown[]) => resolveForSsr(...args),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))
// The head speaks the request's language through a translator; the real one needs the app's i18n set up.
// Every description reads `descriere`; the title's own words translate, so a page in English is named in English.
vi.mock('@/lib/i18n', () => ({
  translatorFor: (locale: string) => ({
    // The test setup's `msg` is the message itself.
    _: (message: unknown) => (message === 'Achiziții publice' ? (locale === 'en' ? 'Public procurement' : 'Achiziții publice') : 'descriere'),
  }),
}))

const { Route } = await import('./direct-acquisitions/$id')

type Input = { readonly context: { readonly queryClient: QueryClientStub }; readonly params: { readonly id: string } }
interface QueryClientStub {
  readonly prefetchQuery: ReturnType<typeof vi.fn>
  readonly getQueryData: ReturnType<typeof vi.fn>
}
const route = Route as unknown as {
  readonly loader: (input: Input) => Promise<Record<string, unknown>>
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
  readonly head: (input: {
    readonly params: { readonly id: string }
    readonly loaderData?: Record<string, unknown>
    readonly match: { readonly context: { readonly locale: string; readonly queryClient: QueryClientStub } }
  }) => { readonly meta: readonly Record<string, string>[] }
}

function queryClient(): QueryClientStub {
  return { prefetchQuery: vi.fn(() => new Promise(() => undefined)), getQueryData: vi.fn(() => undefined) }
}

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

beforeEach(() => {
  readForSsr.mockReset()
  resolveForSsr.mockReset().mockResolvedValue({ kind: 'legacy' })
})

describe('/procurement/direct-acquisitions/$id', () => {
  it('reads the purchase and its context while server-rendering', async () => {
    const read = { id: '10120196', purchase: directPurchase(), context: dpContext() }
    readForSsr.mockResolvedValue(read)
    const data = await asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: '10120196' } }))
    expect(data).toBe(read)
    expect(readForSsr).toHaveBeenCalledWith('10120196')
  })

  it('redirects a legacy link to the release’s purchase on the server, with a 302', async () => {
    const id = 'a'.repeat(64)
    resolveForSsr.mockResolvedValue({ kind: 'release', id })
    await expect(asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: '10120196' } }))).rejects.toEqual({
      redirect: { to: '/procurement/direct-acquisitions/$id', params: { id }, replace: true, statusCode: 302 },
    })
    expect(readForSsr).not.toHaveBeenCalled()
  })

  it('a link it could not resolve serves nothing the next read could contradict: no read, no kept render', async () => {
    resolveForSsr.mockResolvedValue({ kind: 'failed' })
    const data = await asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: '10120196' } }))
    expect(data).toEqual({ id: '10120196' })
    expect(readForSsr).not.toHaveBeenCalled()
    expect(route.headers({ loaderData: data })).toMatchObject({ 'Cache-Control': 'no-store', 'CDN-Cache-Control': 'no-store' })
  })

  it('names a withheld supplier as a natural person in the description, never by a name', () => {
    const purchase = { ...directPurchase(), supplier: { cui: null, name: '', identity: null, hasBudget: false, withheld: 'natural-person' as const } }
    const head = route.head({ params: { id: 'x' }, loaderData: { purchase }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    expect(JSON.stringify(head)).not.toContain('Floraria')
  })

  it('answers a record SEAP does not have with a 404 on the server', async () => {
    readForSsr.mockResolvedValue({ id: 'missing', purchase: null })
    await expect(asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: 'missing' } }))).rejects.toBe(notFoundError)
  })

  it('never holds a client-side navigation: it starts the page’s read and returns', async () => {
    const client = queryClient()
    await expect(route.loader({ context: { queryClient: client }, params: { id: '10120196' } })).resolves.toEqual({ id: '10120196' })
    expect(readForSsr).not.toHaveBeenCalled()
    expect(client.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(procurementDirectPurchaseKeys.purchase('10120196'))
  })

  it('caches only a whole render: purchase and context read', () => {
    vi.stubEnv('DEV', false)
    try {
      const whole = route.headers({ loaderData: { id: '1', purchase: directPurchase(), context: dpContext() } })
      expect(whole['CDN-Cache-Control']).toContain('s-maxage=600')
      for (const loaderData of [
        { id: '1' },
        { id: '1', purchase: { ...directPurchase(), partial: true }, context: dpContext() },
        { id: '1', purchase: directPurchase() },
        { id: '1', purchase: directPurchase(), context: dpContext({ partial: true }) },
      ]) {
        expect(route.headers({ loaderData })['CDN-Cache-Control']).toBe('no-store')
      }
      // With no context to read (no CUI for a side, no date, before 2019) the server says so — `null` — and the purchase alone is whole.
      const noContext = { ...directPurchase(), authority: { ...directPurchase().authority, cui: null } }
      expect(route.headers({ loaderData: { id: '1', purchase: noContext, context: null } })['CDN-Cache-Control']).toContain('s-maxage=600')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('names the page by what was bought and who bought it', () => {
    const head = route.head({
      params: { id: '10120196' },
      loaderData: { id: '10120196', purchase: directPurchase() },
      match: { context: { locale: 'ro', queryClient: queryClient() } },
    })
    const meta = Object.fromEntries(head.meta.map((entry) => [entry.name ?? entry.property ?? 'title', entry.content ?? entry.title]))
    expect(meta.title).toBe('Aranjamente florale — Banca Nationala a Romaniei — Achiziții publice — Transparenta.eu')
    expect(meta.description).toBe('descriere')
    expect(meta['og:url']).toBe('http://localhost:3000/procurement/direct-acquisitions/10120196')
  })
})
