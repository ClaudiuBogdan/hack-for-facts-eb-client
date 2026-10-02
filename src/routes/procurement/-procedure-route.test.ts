import { beforeEach, describe, expect, it, vi } from 'vitest'
import { procedureSheetOf } from '@/features/procurement/lib/procedure-model'
import { procurementProcedureKeys } from '@/features/procurement/lib/procedure-keys'
import { cancelledRaw, cnirRaw, legacyRaw, readOf } from '@/features/procurement/lib/procedure.fixture'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: () => notFoundError,
}))

const readForSsr = vi.fn()
vi.mock('@/features/procurement/api/procurement-procedure-ssr', () => ({ readProcurementProcedureForSsr: (...args: unknown[]) => readForSsr(...args) }))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))
// The head speaks the request's language through a translator; the real one needs the app's i18n set up. Here the macros already give the
// message as its source text: this one passes it on, so the description can be read.
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (descriptor: unknown) => (typeof descriptor === 'string' ? descriptor : JSON.stringify(descriptor)) }) }))

const { Route } = await import('./procedures/$id')

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
  }) => { readonly meta: readonly Record<string, string>[]; readonly links: readonly Record<string, string>[] }
}

function queryClient(data?: unknown): QueryClientStub {
  return { prefetchQuery: vi.fn(() => new Promise(() => undefined)), getQueryData: vi.fn(() => data) }
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

const sheet = procedureSheetOf(readOf(cnirRaw()))
const metaOf = (head: { readonly meta: readonly Record<string, string>[] }) => Object.fromEntries(head.meta.map((entry) => [entry.name ?? entry.property ?? 'title', entry.content ?? entry.title]))

beforeEach(() => {
  readForSsr.mockReset()
})

describe('/procurement/procedures/$id', () => {
  it('reads the procedure while server-rendering', async () => {
    const read = { id: sheet.id, procedure: sheet }
    readForSsr.mockResolvedValue(read)
    const data = await asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: sheet.id } }))
    expect(data).toBe(read)
    expect(readForSsr).toHaveBeenCalledWith(sheet.id)
  })

  it('answers a notice SEAP does not have with a 404 on the server', async () => {
    readForSsr.mockResolvedValue({ id: 'missing', procedure: null })
    await expect(asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: 'missing' } }))).rejects.toBe(notFoundError)
  })

  it('answers an id that is not a number with a 404, reading nothing', async () => {
    const client = queryClient()
    await expect(route.loader({ context: { queryClient: client }, params: { id: 'CAN1145385' } })).rejects.toBe(notFoundError)
    await expect(asServerRender(() => route.loader({ context: { queryClient: client }, params: { id: '337399abc' } }))).rejects.toBe(notFoundError)
    expect(readForSsr).not.toHaveBeenCalled()
    expect(client.prefetchQuery).not.toHaveBeenCalled()
  })

  it('never holds a client-side navigation: it starts the page’s read and returns', async () => {
    const client = queryClient()
    await expect(route.loader({ context: { queryClient: client }, params: { id: sheet.id } })).resolves.toEqual({ id: sheet.id })
    expect(readForSsr).not.toHaveBeenCalled()
    expect(client.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(procurementProcedureKeys.procedure(sheet.id))
  })

  it('caches only a whole render', () => {
    vi.stubEnv('DEV', false)
    try {
      expect(route.headers({ loaderData: { id: '1', procedure: sheet } })['CDN-Cache-Control']).toContain('s-maxage=600')
      for (const loaderData of [{ id: '1' }, { id: '1', procedure: { ...sheet, partial: true } }]) {
        expect(route.headers({ loaderData })['CDN-Cache-Control']).toBe('no-store')
      }
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('names the page by what the procedure was for and whose it is, canonical at its own address', () => {
    const head = route.head({ params: { id: sheet.id }, loaderData: { id: sheet.id, procedure: sheet }, match: { context: { locale: 'ro', queryClient: queryClient() } } })
    const meta = metaOf(head)
    expect(meta.title).toBe(`${sheet.title} — ${sheet.authority.name} — Achiziții publice — Transparenta.eu`)
    expect(meta.description).toContain('a atribuit contracte')
    expect(meta['og:url']).toBe('http://localhost:3000/procurement/procedures/337399')
    expect(head.links).toEqual([{ rel: 'canonical', href: 'http://localhost:3000/procurement/procedures/337399' }])
  })

  it('describes a call, and a cancelled award notice, without claiming an award', () => {
    const describe = (sheet: ReturnType<typeof procedureSheetOf>) =>
      metaOf(route.head({ params: { id: sheet.id }, loaderData: { id: sheet.id, procedure: sheet }, match: { context: { locale: 'ro', queryClient: queryClient() } } })).description
    const cancelled = procedureSheetOf(readOf(cancelledRaw()))
    expect(describe(cancelled)).not.toContain('a atribuit')
    expect(describe(cancelled)).toContain('ce s-a întâmplat cu procedura')
    const call = procedureSheetOf(readOf({ ...legacyRaw(), procedure: { ...legacyRaw().procedure, title: 'Condensatoare' } }))
    expect(describe(call)).toContain('anunțul de participare')
  })

  it('names an untitled notice by its number, and reads a client-side navigation’s procedure from the cache', () => {
    const legacy = procedureSheetOf(readOf(legacyRaw()))
    const head = route.head({ params: { id: legacy.id }, loaderData: { id: legacy.id }, match: { context: { locale: 'ro', queryClient: queryClient(legacy) } } })
    expect(metaOf(head).title).toBe(`Anunțul 92137 — ${legacy.authority.name} — Achiziții publice — Transparenta.eu`)
  })
})
