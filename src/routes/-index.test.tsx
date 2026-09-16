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
    expect(meta.get('title')).toContain('Date publice, decizii informate')
    expect(meta.get('og:title')).toBe(meta.get('title'))
    expect(meta.get('description')).toBe(meta.get('og:description'))
    expect(meta.get('robots')).toBe('index,follow')
    expect(head.links).toEqual([{ rel: 'canonical', href: 'https://transparenta.eu' }])
  })

  it('renders the landing feature from the lazy route', async () => {
    const { Route } = await import('./index.lazy')
    const { LandingPage } = await import('@/features/landing/components/landing-page')
    expect(Route.options.component).toBe(LandingPage)
  })
})
