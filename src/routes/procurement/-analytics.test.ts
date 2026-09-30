import { describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
}))

const { Route } = await import('./analytics')
const { Route: Search } = await import('./search')
const route = Route as unknown as {
  readonly validateSearch: (search: Record<string, unknown>) => Record<string, unknown>
  readonly beforeLoad: (input: { readonly location: { readonly search: Record<string, unknown> } }) => void
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
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
