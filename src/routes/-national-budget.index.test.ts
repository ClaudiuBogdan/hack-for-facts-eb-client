import { describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))

// The head's words through the tests' Lingui (the source text, its values put in): the real catalogs are the app's.
vi.mock('@/lib/i18n', async (importOriginal) => {
  const { i18n } = await import('@lingui/core')
  return { ...(await importOriginal<Record<string, unknown>>()), translatorFor: () => i18n }
})

const { Route } = await import('./national-budget.index')
const route = Route as unknown as {
  readonly ssr: boolean
  readonly validateSearch: (search: Record<string, unknown>) => Record<string, unknown>
  readonly headers: () => Record<string, string>
  readonly head: (input: { readonly match: { readonly context: { readonly locale: string }; readonly search: Record<string, unknown> } }) => {
    readonly meta: readonly Record<string, string>[]
    readonly links: readonly Record<string, string>[]
  }
}

const headOf = (search: Record<string, unknown>) => route.head({ match: { context: { locale: 'ro' }, search: route.validateSearch(search) } })

describe('/national-budget', () => {
  it('renders on the server', () => {
    expect(route.ssr).toBe(true)
  })

  it('keeps a year, as a number or as text, and leaves the rest of the address to the site', () => {
    expect(route.validateSearch({ an: 2024, lang: 'en' })).toEqual({ an: 2024 })
    expect(route.validateSearch({ an: '2019' })).toEqual({ an: 2019 })
  })

  it('drops a year it cannot read, and the page opens on its default', () => {
    expect(route.validateSearch({ an: 'ieri' })).toEqual({})
    expect(route.validateSearch({ an: 2024.5 })).toEqual({})
    expect(route.validateSearch({ an: 1066 })).toEqual({})
    expect(route.validateSearch({ an: [2024] })).toEqual({})
    expect(route.validateSearch({})).toEqual({})
  })

  it('is never cached, by a CDN or by the browser', () => {
    const headers = route.headers()
    // Private: the render reads the reader's cookies, so no shared cache may keep it (CACHE-001).
    expect(headers['Cache-Control']).toBe('private, no-store')
    expect(headers['CDN-Cache-Control']).toBe('no-store')
  })

  it('indexes the bare page under its canonical address', () => {
    const head = headOf({})
    expect(head.meta[0]?.title).toMatch(/^Bugetul național/)
    expect(head.meta).not.toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(head.links).toEqual([{ rel: 'canonical', href: expect.stringMatching(/\/national-budget$/) }])
  })

  it('shows a chosen year without indexing it', () => {
    expect(headOf({ an: 2020 }).meta).toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(headOf({ an: 2020 }).links).toEqual([])
    expect(headOf({ lang: 'en' }).links).toHaveLength(1)
  })

  it('shares the card of the year and language shown', () => {
    const image = (search: Record<string, unknown>, locale = 'ro') =>
      route.head({ match: { context: { locale }, search: route.validateSearch(search) } }).meta.find((entry) => entry.property === 'og:image')?.content
    expect(image({})).toMatch(/\/national-budget\/share-image\.png\?lang=ro$/)
    expect(image({ an: 2020 }, 'en')).toMatch(/\/national-budget\/share-image\.png\?an=2020&lang=en$/)
    expect(headOf({}).meta).toContainEqual({ name: 'twitter:image', content: image({}) })
  })
})
