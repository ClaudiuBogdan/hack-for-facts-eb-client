import { describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))

// The head's words through the tests' Lingui (the source text): the real catalogs are the app's.
vi.mock('@/lib/i18n', async (importOriginal) => {
  const { i18n } = await import('@lingui/core')
  i18n.loadAndActivate({ locale: 'ro', messages: {} })
  return { ...(await importOriginal<Record<string, unknown>>()), translatorFor: () => i18n }
})

const { Route } = await import('./public-institutions')
const { Route: OldRoute } = await import('./entity-analytics')

type Head = { readonly meta: readonly Record<string, string>[]; readonly links: readonly Record<string, string>[] }
const route = Route as unknown as {
  readonly headers: () => Record<string, string>
  readonly head: (input: { readonly match: { readonly context: { readonly locale: string }; readonly search: Record<string, unknown> } }) => Head
}
const oldRoute = OldRoute as unknown as {
  readonly headers: () => Record<string, string>
  readonly head: (input: { readonly match: { readonly context: { readonly locale: string }; readonly search: Record<string, unknown> } }) => Head
}

describe('/public-institutions', () => {
  it('is kept by no browser and no CDN: it renders from the reader’s cookies (CACHE-001)', () => {
    expect(route.headers()).toEqual({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' })
  })

  it('indexes the bare page under its own address', () => {
    const head = route.head({ match: { context: { locale: 'ro' }, search: {} } })
    expect(head.links).toEqual([{ rel: 'canonical', href: expect.stringMatching(/\/public-institutions$/) }])
    expect(head.meta).not.toContainEqual(expect.objectContaining({ name: 'robots' }))
    expect(head.meta[0].title).toMatch(/^Instituții publice/)
  })

  it('answers a reader’s own selection without indexing it', () => {
    const head = route.head({ match: { context: { locale: 'ro' }, search: { filter: { account_category: 'vn' }, page: 2 } } })
    expect(head.meta).toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(head.links).toEqual([])
  })

  it('ignores keys that are not the page’s (the language, the currency)', () => {
    const head = route.head({ match: { context: { locale: 'ro' }, search: { lang: 'en', currency: 'EUR' } } })
    expect(head.meta).not.toContainEqual(expect.objectContaining({ name: 'robots' }))
  })
})

describe('/entity-analytics, kept for its links', () => {
  it('points search engines to /public-institutions', () => {
    const head = oldRoute.head({ match: { context: { locale: 'ro' }, search: {} } })
    expect(head.links).toEqual([{ rel: 'canonical', href: expect.stringMatching(/\/public-institutions$/) }])
  })

  it('is kept by no browser and no CDN either', () => {
    expect(oldRoute.headers()).toEqual({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' })
  })
})
