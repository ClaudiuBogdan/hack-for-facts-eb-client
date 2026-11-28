import { beforeEach, describe, expect, it, vi } from 'vitest'

const { readMandatesForSsr, mandatesOptions } = vi.hoisted(() => ({
  readMandatesForSsr: vi.fn(),
  mandatesOptions: vi.fn(() => ({ queryKey: ['mandates'] })),
}))

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => options }))
vi.mock('@/features/elections/analytics/api/elections-analytics-ssr', () => ({ readLocalMandatesForSsr: readMandatesForSsr }))
vi.mock('@/features/elections/analytics/hooks/use-elections-analytics', () => ({ localMandatesQueryOptions: mandatesOptions }))
vi.mock('@/config/env', () => ({ getSiteUrl: () => 'https://transparenta.eu' }))
vi.mock('@/lib/i18n', () => ({ translatorFor: () => ({ _: (descriptor: unknown) => String(descriptor) }) }))

const { Route } = await import('./analize')

type LoaderInput = {
  readonly context: { readonly queryClient: { readonly prefetchQuery: ReturnType<typeof vi.fn> } }
  readonly abortController: AbortController
}
const route = Route as unknown as {
  readonly validateSearch: (search: unknown) => Record<string, unknown>
  readonly loader: (input: LoaderInput) => Promise<Record<string, unknown>>
  readonly headers: () => Record<string, string>
  readonly head: (input: { readonly match: { readonly context: { readonly locale: string }; readonly search: Record<string, unknown> } }) => {
    readonly meta: readonly Record<string, string>[]
    readonly links: readonly Record<string, string>[]
  }
}

const input = (): LoaderInput => ({
  context: { queryClient: { prefetchQuery: vi.fn(() => new Promise(() => undefined)) } },
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

const MANDATES = { mayors: null, councillors: null, countyCouncil: { first: null, second: null }, counties: [], missing: [], suspect: false }

beforeEach(() => {
  readMandatesForSsr.mockReset()
  mandatesOptions.mockClear()
})

describe('/alegeri/analize', () => {
  it('reads the view, its section and the county, and returns every key, an unreadable one as undefined', () => {
    expect(route.validateSearch(undefined)).toEqual({ tip: undefined, dupa: undefined, judet: undefined })
    expect(route.validateSearch({ tip: 'harta', dupa: 'fluxuri', judet: 'CJ', lang: 'en' })).toEqual({ tip: 'harta', dupa: 'fluxuri', judet: 'CJ' })
    expect(route.validateSearch({ tip: 'nimic', dupa: 'nimic', judet: 'XX' })).toEqual({ tip: undefined, dupa: undefined, judet: undefined })
    // A section is the view's own: the Mandate view (the default) has no „fluxuri"; „toString" is no view.
    expect(route.validateSearch({ dupa: 'fluxuri', tip: 'toString' })).toEqual({ tip: undefined, dupa: undefined, judet: undefined })
    expect(route.validateSearch({ dupa: 'consiliu', judet: 'B' })).toEqual({ tip: undefined, dupa: 'consiliu', judet: 'B' })
  })

  it('starts the read in the browser and returns at once', async () => {
    const loaderInput = input()
    await expect(route.loader(loaderInput)).resolves.toEqual({})
    expect(loaderInput.context.queryClient.prefetchQuery).toHaveBeenCalledWith({ queryKey: ['mandates'] })
    expect(readMandatesForSsr).not.toHaveBeenCalled()
  })

  it('reads the mandates while server-rendering, and leaves a failed read to the page', async () => {
    readMandatesForSsr.mockResolvedValue(MANDATES)
    const loaderInput = input()
    await expect(asServerRender(() => route.loader(loaderInput))).resolves.toEqual({ mandates: MANDATES })
    expect(readMandatesForSsr).toHaveBeenCalledWith(loaderInput.abortController.signal)
    readMandatesForSsr.mockResolvedValue(undefined)
    await expect(asServerRender(() => route.loader(input()))).resolves.toEqual({})
  })

  it('indexes the bare page under its canonical address, and a reader’s question not at all', () => {
    const bare = route.head({ match: { context: { locale: 'ro' }, search: { tip: undefined, dupa: undefined, judet: undefined } } })
    expect(bare.links).toEqual([{ rel: 'canonical', href: 'https://transparenta.eu/alegeri/analize' }])
    expect(bare.meta).not.toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(bare.meta).toContainEqual({ property: 'og:url', content: 'https://transparenta.eu/alegeri/analize' })
    // The language is the site's key, not a question.
    const english = route.head({ match: { context: { locale: 'en' }, search: { lang: 'en', tip: undefined, dupa: undefined, judet: undefined } } })
    expect(english.links).toEqual([{ rel: 'canonical', href: 'https://transparenta.eu/alegeri/analize' }])
    expect(english.meta).not.toContainEqual({ name: 'robots', content: 'noindex, follow' })
    const asked = route.head({ match: { context: { locale: 'ro' }, search: { tip: 'mandate', dupa: undefined, judet: 'CJ' } } })
    expect(asked.links).toEqual([])
    expect(asked.meta).toContainEqual({ name: 'robots', content: 'noindex, follow' })
  })

  it('is served once and never kept', () => {
    expect(route.headers()).toMatchObject({ 'CDN-Cache-Control': 'no-store' })
  })
})
