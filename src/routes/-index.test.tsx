import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ ...options, options }),
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({ ...options, options }),
}))

vi.mock('@/config/env', () => ({
  getSiteUrl: () => 'https://transparenta.eu',
}))

const createPublicPageCacheHeaders = vi.hoisted(() =>
  vi.fn(() => ({ 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=604800' })),
)
vi.mock('@/lib/http-cache', () => ({ createPublicPageCacheHeaders }))

vi.mock('@/features/landing/components/landing-page', () => ({
  LandingPage: () => null,
}))

describe('Index route', () => {
  it('server-renders with a public cache policy', async () => {
    const { Route } = await import('./index')
    expect(Route.options.ssr).toBe(true)
    // The real helper answers `no-store` under `import.meta.env.DEV`, which is
    // what Vitest runs as, so it is mocked and the contract held here is the
    // policy the route asks it for.
    const headers = (Route.options.headers as () => Record<string, string>)()
    expect(headers['Cache-Control']).toBeDefined()
    expect(createPublicPageCacheHeaders).toHaveBeenCalledWith({
      browserMaxAgeSeconds: 3600,
      sharedMaxAgeSeconds: 3600,
      staleWhileRevalidateSeconds: 604800,
    })
  })

  it('describes the page with the landing headline and a canonical link', async () => {
    const { buildHomeHead } = await import('./index')
    const head = buildHomeHead()
    const meta = new Map(
      head.meta.map((entry) => [
        'title' in entry ? 'title' : ((entry as { name?: string; property?: string }).name ?? (entry as { property?: string }).property),
        'title' in entry ? entry.title : (entry as { content: string }).content,
      ]),
    )
    expect(meta.get('title')).toContain('Date publice, pe înțeles')
    expect(meta.get('og:title')).toBe(meta.get('title'))
    expect(meta.get('description')).toBe(meta.get('og:description'))
    expect(meta.get('robots')).toBe('index,follow')
    expect(head.links).toEqual([{ rel: 'canonical', href: 'https://transparenta.eu' }])
  })

  it('owns both of its keys: the budget map’s and the search a link opens', async () => {
    const { Route } = await import('./index')
    const validate = Route.options.validateSearch as (search: Record<string, unknown>) => Record<string, unknown>
    expect(validate({})).toStrictEqual({ harta: undefined, q: undefined })
    expect(validate({ harta: 'venituri', q: 'primaria cluj' })).toStrictEqual({ harta: 'venituri', q: 'primaria cluj' })
    // As the router read it, so the address serialises back to itself: a CUI stays a number.
    expect(validate({ q: 2816464 })).toStrictEqual({ harta: undefined, q: 2816464 })
    expect(validate({ q: ['a', 'b'] })).toStrictEqual({ harta: undefined, q: undefined })
    expect(validate({ q: { a: 1 } })).toStrictEqual({ harta: undefined, q: undefined })
  })

  it('keeps a search link out of search results, on the same canonical page', async () => {
    const { Route } = await import('./index')
    type Head = ReturnType<typeof import('./index').buildHomeHead>
    const robots = (head: Head) => head.meta.find((entry) => 'name' in entry && entry.name === 'robots')
    const head = Route.options.head as (context: { match: { search: Record<string, unknown> } }) => Head
    expect(robots(head({ match: { search: { q: 'primaria' } } }))).toEqual({ name: 'robots', content: 'noindex,follow' })
    expect(head({ match: { search: { q: 'primaria' } } }).links).toEqual([{ rel: 'canonical', href: 'https://transparenta.eu' }])
    expect(robots(head({ match: { search: { q: '   ' } } }))).toEqual({ name: 'robots', content: 'index,follow' })
    expect(robots(head({ match: { search: {} } }))).toEqual({ name: 'robots', content: 'index,follow' })
  })

  it('renders the landing feature from the lazy route', async () => {
    const { Route } = await import('./index.lazy')
    const { LandingPage } = await import('@/features/landing/components/landing-page')
    expect(Route.options.component).toBe(LandingPage)
  })
})
