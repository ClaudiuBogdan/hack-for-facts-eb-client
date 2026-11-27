import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cniRead, ctContext } from '@/features/procurement/lib/contract.fixture'
import { contractSheetOf } from '@/features/procurement/lib/contract-model'
import { procurementContractKeys } from '@/features/procurement/lib/contract-keys'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: () => notFoundError,
}))

const readForSsr = vi.fn()
vi.mock('@/features/procurement/api/procurement-contract-ssr', () => ({ readProcurementContractForSsr: (...args: unknown[]) => readForSsr(...args) }))
// D6: the render is kept under the publication it was read in (the context carries the pair's direct purchases).
vi.mock('@/features/procurement/api/procurement-da-release-status', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/procurement/api/procurement-da-release-status')>()),
  seededUnder: async <T extends object>(read: () => Promise<T>) => ({ ...(await read()), disclosure: 'off:-:nod6:-' }),
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

const { Route } = await import('./contracts/$id')

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

const sheet = contractSheetOf(cniRead())

beforeEach(() => {
  readForSsr.mockReset()
})

describe('/procurement/contracts/$id', () => {
  it('reads the contract and its context while server-rendering', async () => {
    const read = { id: sheet.id, contract: sheet, context: ctContext() }
    readForSsr.mockResolvedValue(read)
    const data = await asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: sheet.id } }))
    expect(data).toEqual({ ...read, disclosure: 'off:-:nod6:-' })
    expect(readForSsr).toHaveBeenCalledWith(sheet.id)
  })

  it('answers a record SEAP does not have with a 404 on the server', async () => {
    readForSsr.mockResolvedValue({ id: 'missing', contract: null })
    await expect(asServerRender(() => route.loader({ context: { queryClient: queryClient() }, params: { id: 'missing' } }))).rejects.toBe(notFoundError)
  })

  it('never holds a client-side navigation: it starts the page’s read and returns', async () => {
    const client = queryClient()
    await expect(route.loader({ context: { queryClient: client }, params: { id: sheet.id } })).resolves.toEqual({ id: sheet.id })
    expect(readForSsr).not.toHaveBeenCalled()
    expect(client.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(procurementContractKeys.contract(sheet.id))
  })

  it('keeps no render in a shared cache, whatever its publication (CACHE-002, D6)', () => {
    vi.stubEnv('DEV', false)
    try {
      const whole = route.headers({ loaderData: { id: '1', contract: sheet, context: ctContext(), disclosure: 'off:-:nod6:-' } })
      expect(whole).toMatchObject({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' })
      expect(whole['CDN-Cache-Control']).not.toMatch(/stale-while-revalidate=[1-9]/u)
      // Read under an unknown publication: kept nowhere.
      expect(route.headers({ loaderData: { id: '1', contract: sheet, context: ctContext(), disclosure: null } })['CDN-Cache-Control']).toBe('no-store')
      for (const loaderData of [
        { id: '1' },
        { id: '1', contract: { ...sheet, partial: true }, context: ctContext() },
        { id: '1', contract: sheet },
        { id: '1', contract: sheet, context: ctContext({ partial: true }) },
      ]) {
        expect(route.headers({ loaderData })['CDN-Cache-Control']).toBe('no-store')
      }
      // With no context to read (no CUI for a side, no date, before 2019) the server says so — `null` — and the contract alone is whole.
      expect(route.headers({ loaderData: { id: '1', contract: sheet, context: null, disclosure: 'off:-:nod6:-' } })).toMatchObject({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('names the page by what was awarded and who awarded it', () => {
    const head = route.head({
      params: { id: sheet.id },
      loaderData: { id: sheet.id, contract: sheet },
      match: { context: { locale: 'ro', queryClient: queryClient() } },
    })
    const meta = Object.fromEntries(head.meta.map((entry) => [entry.name ?? entry.property ?? 'title', entry.content ?? entry.title]))
    expect(meta.title).toBe(`${sheet.title} — Compania Nationala de Investitii C.N.I. SA — Achiziții publice — Transparenta.eu`)
    expect(meta.description).toBe('descriere')
    expect(meta['og:url']).toBe('http://localhost:3000/procurement/contracts/1745168')
  })

  it('names the page in the request’s language: the record’s names as SEAP writes them, the page’s words translated', () => {
    const head = route.head({
      params: { id: sheet.id },
      loaderData: { id: sheet.id, contract: sheet },
      match: { context: { locale: 'en', queryClient: queryClient() } },
    })
    const title = head.meta.find((entry) => 'title' in entry)?.title
    expect(title).toBe(`${sheet.title} — Compania Nationala de Investitii C.N.I. SA — Public procurement — Transparenta.eu`)
  })
})
