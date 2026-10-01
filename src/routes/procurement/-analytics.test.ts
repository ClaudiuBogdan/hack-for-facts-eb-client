import { describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
}))

// The head's words through the tests' Lingui (the source text, its values put in): the real catalogs are the app's.
vi.mock('@/lib/i18n', async (importOriginal) => {
  const { i18n } = await import('@lingui/core')
  return { ...(await importOriginal<Record<string, unknown>>()), translatorFor: () => i18n }
})

const { Route } = await import('./analytics')
const { Route: Search } = await import('./search')
const route = Route as unknown as {
  readonly validateSearch: (search: Record<string, unknown>) => Record<string, unknown>
  readonly beforeLoad: (input: { readonly location: { readonly search: Record<string, unknown> } }) => void
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
  readonly head: (input: { readonly match: { readonly context: { readonly locale: string }; readonly search: Record<string, unknown> }; readonly loaderData?: Record<string, unknown> }) => {
    readonly meta: readonly Record<string, string>[]
    readonly links: readonly Record<string, string>[]
  }
}
const search = Search as unknown as { readonly beforeLoad: (input: { readonly location: { readonly search: Record<string, unknown> } }) => void }

// The explorer's own default when a link named no period: the previous calendar year.
const LAST_YEAR = new Date().getFullYear() - 1

function thrownBy(run: () => void): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  return undefined
}

describe('/procurement/analytics', () => {
  it('keeps the keys the page reads, as strings or bare numbers, and leaves the rest to their routes', () => {
    expect(route.validateSearch({ cumparator: 4305857, perioada: '2023-01..2024-12', titlu: 'laptop', lang: 'en', view: { x: 1 } })).toEqual({
      cumparator: 4305857,
      perioada: '2023-01..2024-12',
      titlu: 'laptop',
    })
  })

  it('keeps a page key the router parsed as something else, as text, for the page to say it could not read it', () => {
    expect(route.validateSearch({ cpv: true, tip: ['contracte', 'directe'] })).toEqual({ cpv: 'true', tip: '["contracte","directe"]' })
    const head = route.head({ match: { context: { locale: 'ro' }, search: route.validateSearch({ cpv: true }) } })
    expect(head.meta).toContainEqual({ name: 'robots', content: 'noindex, follow' })
  })

  it('answers its own address, a stray explorer key and all', () => {
    expect(() => route.beforeLoad({ location: { search: { cumparator: 4305857, dupa: 'firma' } } })).not.toThrow()
    expect(() => route.beforeLoad({ location: { search: {} } })).not.toThrow()
    expect(() => route.beforeLoad({ location: { search: { tip: 'directe', cumparator: 4305857, dupa: 'inregistrari', page: 2 } } })).not.toThrow()
  })

  it('asks an explorer question again in its own words, permanently', () => {
    expect(thrownBy(() => route.beforeLoad({ location: { search: { view: 'overview', mapGrain: 'county', lang: 'en' } } }))).toEqual({
      kind: 'redirect',
      options: { to: '/procurement/analytics', search: { lang: 'en', tip: 'contracte', perioada: LAST_YEAR }, replace: true, statusCode: 301 },
    })
  })

  it('makes a category alone a landing: its own title, its own canonical address', () => {
    const head = route.head({ match: { context: { locale: 'ro' }, search: { cpv: 336, lang: 'en' } }, loaderData: { seed: [], complete: true, landingName: { ro: 'Produse farmaceutice', en: 'Pharmaceutical products' } } })
    expect(head.meta[0]).toEqual({ title: 'Produse farmaceutice (CPV 336): achiziții directe — Transparenta.eu' })
    expect(head.meta.some((tag) => tag.name === 'robots')).toBe(false)
    expect(head.links[0]?.href).toMatch(/\/procurement\/analytics\?cpv=336$/u)
    // The population's own word; the page's default population is not written.
    const contracts = route.head({ match: { context: { locale: 'ro' }, search: { tip: 'contracte', cpv: 45 } } })
    expect(contracts.meta[0]?.title).toMatch(/^Lucrări de construcții \(CPV 45\): contracte atribuite/u)
    expect(route.head({ match: { context: { locale: 'ro' }, search: { tip: 'directe', cpv: 336 } }, loaderData: { seed: [], complete: true, landingName: { ro: 'Produse farmaceutice', en: null } } }).links[0]?.href).toMatch(/\?cpv=336$/u)
  })

  it('keeps a reader’s own question out of the index, and the bare page in it', () => {
    const own = route.head({ match: { context: { locale: 'ro' }, search: { cpv: 336, judet: 'SB' } } })
    expect(own.meta).toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(own.links).toEqual([])
    expect(own.meta.some((tag) => tag.property === 'og:url')).toBe(false)
    // A well-formed code that names no category is no landing: no soft 404 in the index.
    const unnamed = route.head({ match: { context: { locale: 'ro' }, search: { cpv: 999 } }, loaderData: { seed: [], complete: true } })
    expect(unnamed.meta).toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(unnamed.links).toEqual([])
    const bare = route.head({ match: { context: { locale: 'ro' }, search: { lang: 'en' } } })
    expect(bare.meta.some((tag) => tag.name === 'robots')).toBe(false)
    expect(bare.links[0]?.href).toMatch(/\/procurement\/analytics$/u)
  })

  it('never caches a render with a failed read for everyone', () => {
    vi.stubEnv('DEV', false)
    try {
      const failed = route.headers({ loaderData: { seed: [], complete: false } })
      expect(failed['Cache-Control']).toBe('no-store')
      expect(failed['CDN-Cache-Control']).toBe('no-store')
      expect(route.headers({})['CDN-Cache-Control']).toBe('no-store')
      const whole = route.headers({ loaderData: { seed: [], complete: true } })
      expect(whole['CDN-Cache-Control']).toContain('s-maxage=600')
      expect(whole.Vary).toBe('Accept-Encoding, Cookie')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})

describe('/procurement/search', () => {
  it('sends every explorer link to the analytics page, its list as the records', () => {
    expect(thrownBy(() => search.beforeLoad({ location: { search: { view: 'list', grain: 'direct_acquisitions', authority_cui: '4305857', sort: 'date_desc', page: 2 } } }))).toEqual({
      kind: 'redirect',
      options: { to: '/procurement/analytics', search: { cumparator: 4305857, perioada: LAST_YEAR, dupa: 'inregistrari' }, replace: true, statusCode: 301 },
    })
  })
})
