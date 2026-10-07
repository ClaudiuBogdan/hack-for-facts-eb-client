import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_CASE, FIXTURE_COURT, FIXTURE_YEAR, caseSheetFixture, courtSheetFixture } from '@/features/justice/fixtures/judicial-fixtures'
import { justiceKeys } from '@/features/justice/lib/justice-keys'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: () => notFoundError,
  redirect: redirectMock,
}))

const readCourt = vi.fn()
const readCase = vi.fn()
vi.mock('@/features/justice/api/justice-ssr', () => ({
  readCourtForSsr: (...args: unknown[]) => readCourt(...args),
  readCaseForSsr: (...args: unknown[]) => readCase(...args),
}))
vi.mock('@/lib/utils', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/utils')>()), getUserLocale: () => 'ro' }))
// The head speaks the request's language through a translator; the macros already give the message as its source text.
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (descriptor: unknown) => (typeof descriptor === 'string' ? descriptor : JSON.stringify(descriptor)) }) }))

interface QueryClientStub {
  readonly prefetchQuery: ReturnType<typeof vi.fn>
  readonly getQueryData: ReturnType<typeof vi.fn>
}
type Head = { readonly meta: readonly Record<string, string>[]; readonly links: readonly Record<string, string>[] }
type Match = { readonly context: { readonly locale: string; readonly queryClient: QueryClientStub } }

function queryClient(data?: unknown): QueryClientStub {
  return { prefetchQuery: vi.fn(() => new Promise(() => undefined)), getQueryData: vi.fn(() => data) }
}

/** Runs `body` with `globalThis.window` removed: the loader-blocking sniff then says „server". */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
  }
}

const metaOf = (head: Head) => Object.fromEntries(head.meta.map((entry) => [entry.name ?? entry.property ?? 'title', entry.content ?? entry.title]))
const match = (): Match => ({ context: { locale: 'ro', queryClient: queryClient() } })

const courtRoute = (await import('./courts/$code')).Route as unknown as {
  readonly params: { readonly parse: (params: { readonly code: string }) => { readonly code: string } }
  readonly loaderDeps: (input: { readonly search: { readonly an?: number } }) => { readonly year: number }
  readonly loader: (input: { readonly context: { readonly queryClient: QueryClientStub }; readonly params: { readonly code: string }; readonly deps: { readonly year: number } }) => Promise<Record<string, unknown>>
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
  readonly head: (input: { readonly params: { readonly code: string }; readonly loaderData?: Record<string, unknown>; readonly match: Match }) => Head
}
const caseRoute = (await import('./cases/$code/$')).Route as unknown as {
  readonly params: { readonly parse: (params: { readonly code: string; readonly _splat?: string }) => { readonly code: string; readonly _splat: string } }
  readonly loader: (input: { readonly context: { readonly queryClient: QueryClientStub }; readonly params: { readonly code: string; readonly _splat: string } }) => Promise<Record<string, unknown>>
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
  readonly head: (input: { readonly params: { readonly code: string; readonly _splat: string }; readonly loaderData?: Record<string, unknown>; readonly match: Match }) => Head
}

beforeEach(() => {
  readCourt.mockReset()
  readCase.mockReset()
  redirectMock.mockClear()
})

describe('/justice/courts/$code', () => {
  const court = courtSheetFixture()

  it('answers a code that cannot be a court with a 404, before any read', () => {
    expect(courtRoute.params.parse({ code: FIXTURE_COURT })).toEqual({ code: FIXTURE_COURT })
    for (const code of ['', 'Tribunalul CLUJ', '../x', 'abc']) expect(() => courtRoute.params.parse({ code })).toThrow(notFoundError)
  })

  it('describes the front door’s year unless the address asks for one the capture holds whole, or its last', () => {
    expect(courtRoute.loaderDeps({ search: {} }).year).toBe(FIXTURE_YEAR)
    expect(courtRoute.loaderDeps({ search: { an: 2023 } }).year).toBe(2023)
    expect(courtRoute.loaderDeps({ search: { an: 2026 } }).year).toBe(2026)
    // A year before the capture went whole, or after it stopped, is no page of its own.
    expect(courtRoute.loaderDeps({ search: { an: 2015 } }).year).toBe(FIXTURE_YEAR)
    expect(courtRoute.loaderDeps({ search: { an: 2027 } }).year).toBe(FIXTURE_YEAR)
  })

  it('reads the court while server-rendering, and answers a court the API does not know with a 404', async () => {
    readCourt.mockResolvedValueOnce({ code: FIXTURE_COURT, year: FIXTURE_YEAR, court })
    const data = await asServerRender(() => courtRoute.loader({ context: { queryClient: queryClient() }, params: { code: FIXTURE_COURT }, deps: { year: FIXTURE_YEAR } }))
    expect(data.court).toBe(court)
    readCourt.mockResolvedValueOnce({ code: 'TribunalulNIMIC', year: FIXTURE_YEAR, court: null })
    await expect(asServerRender(() => courtRoute.loader({ context: { queryClient: queryClient() }, params: { code: 'TribunalulNIMIC' }, deps: { year: FIXTURE_YEAR } }))).rejects.toBe(notFoundError)
  })

  it('never holds a client-side navigation: it starts the page’s read and returns', async () => {
    const client = queryClient()
    await expect(courtRoute.loader({ context: { queryClient: client }, params: { code: FIXTURE_COURT }, deps: { year: FIXTURE_YEAR } })).resolves.toEqual({ code: FIXTURE_COURT, year: FIXTURE_YEAR })
    expect(readCourt).not.toHaveBeenCalled()
    expect(client.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(justiceKeys.court(FIXTURE_COURT, FIXTURE_YEAR))
  })

  it('caches only a whole render', () => {
    vi.stubEnv('DEV', false)
    try {
      expect(courtRoute.headers({ loaderData: { court } })['CDN-Cache-Control']).toContain('s-maxage=600')
      for (const loaderData of [{ code: FIXTURE_COURT }, { court: courtSheetFixture('failed') }]) expect(courtRoute.headers({ loaderData })['CDN-Cache-Control']).toBe('no-store')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('names the page after the court, canonical at its own address', () => {
    const head = courtRoute.head({ params: { code: FIXTURE_COURT }, loaderData: { code: FIXTURE_COURT, year: FIXTURE_YEAR, court }, match: match() })
    const meta = metaOf(head)
    expect(meta.title).toBe('Tribunalul Sălaj — Justiție — Transparenta.eu')
    expect(meta.description).toContain('Persoanele nu sunt numite')
    expect(head.links).toEqual([{ rel: 'canonical', href: 'http://localhost:3000/justice/courts/TribunalulSALAJ' }])
  })
})

describe('/justice/cases/$code/$', () => {
  const sheet = caseSheetFixture()

  it('takes the number from the rest of the path, slashes and stars kept; anything else is a 404', () => {
    expect(caseRoute.params.parse({ code: 'TribunalulBUCURESTI', _splat: '1234/3/2024*' })).toEqual({ code: 'TribunalulBUCURESTI', _splat: '1234/3/2024*' })
    for (const _splat of [undefined, '', '../../x', 'a b', '1//2']) expect(() => caseRoute.params.parse({ code: 'TribunalulBUCURESTI', _splat })).toThrow(notFoundError)
    expect(() => caseRoute.params.parse({ code: 'Tribunalul 1', _splat: '1/2/2024' })).toThrow(notFoundError)
    // The ÎCCJ renders before a read: only a number's exact shape.
    expect(caseRoute.params.parse({ code: 'InaltaCurtedeCasatiesiJustitie', _splat: '380/100/2018**/a1' })._splat).toBe('380/100/2018**/a1')
    expect(() => caseRoute.params.parse({ code: 'InaltaCurtedeCasatiesiJustitie', _splat: '1/2/Popescu' })).toThrow(notFoundError)
  })

  it('reads the case while server-rendering, and answers a number the court does not have with a 404', async () => {
    const params = { code: FIXTURE_CASE.code, _splat: FIXTURE_CASE.number }
    readCase.mockResolvedValueOnce({ code: params.code, number: params._splat, sheet })
    await expect(asServerRender(() => caseRoute.loader({ context: { queryClient: queryClient() }, params }))).resolves.toMatchObject({ sheet })
    expect(readCase).toHaveBeenCalledWith(FIXTURE_CASE.code, FIXTURE_CASE.number)
    readCase.mockResolvedValueOnce({ code: params.code, number: params._splat, sheet: null })
    await expect(asServerRender(() => caseRoute.loader({ context: { queryClient: queryClient() }, params }))).rejects.toBe(notFoundError)
  })

  it('leaves the ÎCCJ’s cases, too slow to read within a render, to the browser', async () => {
    const params = { code: 'InaltaCurtedeCasatiesiJustitie', _splat: '656/1/2025' }
    await expect(asServerRender(() => caseRoute.loader({ context: { queryClient: queryClient() }, params }))).resolves.toEqual({ code: params.code, number: params._splat })
    expect(readCase).not.toHaveBeenCalled()
    // No sheet: the render is served once, never cached.
    vi.stubEnv('DEV', false)
    try {
      expect(caseRoute.headers({ loaderData: { code: params.code, number: params._splat } })['CDN-Cache-Control']).toBe('no-store')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('never holds a client-side navigation', async () => {
    const client = queryClient()
    const params = { code: FIXTURE_CASE.code, _splat: FIXTURE_CASE.number }
    await expect(caseRoute.loader({ context: { queryClient: client }, params })).resolves.toEqual({ code: FIXTURE_CASE.code, number: FIXTURE_CASE.number })
    expect(client.prefetchQuery.mock.calls[0]?.[0].queryKey).toEqual(justiceKeys.case(FIXTURE_CASE.code, FIXTURE_CASE.number))
  })

  it('caches only a whole render', () => {
    vi.stubEnv('DEV', false)
    try {
      expect(caseRoute.headers({ loaderData: { sheet } })['CDN-Cache-Control']).toContain('s-maxage=600')
      expect(caseRoute.headers({ loaderData: { sheet: caseSheetFixture('failed') } })['CDN-Cache-Control']).toBe('no-store')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('keeps the page out of search engines, canonical at its court and number with the slashes kept', () => {
    const params = { code: FIXTURE_CASE.code, _splat: FIXTURE_CASE.number }
    const head = caseRoute.head({ params, loaderData: { code: params.code, number: params._splat, sheet }, match: match() })
    const meta = metaOf(head)
    expect(meta.robots).toBe('noindex, follow')
    expect(meta.title).toBe('Dosarul 5180/118/2021/a3 — Curtea de Apel Constanța — Justiție — Transparenta.eu')
    expect(head.links).toEqual([{ rel: 'canonical', href: 'http://localhost:3000/justice/cases/CurteadeApelCONSTANTA/5180/118/2021/a3' }])
  })
})

describe('/justitie', () => {
  it('sends the front door and every old page to /justice, permanently, carrying nothing', async () => {
    for (const path of ['../justitie/index', '../justitie/$']) {
      const { Route } = (await import(/* @vite-ignore */ path)) as { Route: { beforeLoad: () => never } }
      expect(() => Route.beforeLoad()).toThrow()
    }
    for (const [options] of redirectMock.mock.calls as [Record<string, unknown>][]) {
      expect(options).toEqual({ to: '/justice', replace: true, statusCode: 301 })
    }
    expect(redirectMock).toHaveBeenCalledTimes(2)
  })
})
