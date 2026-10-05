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

const { Route } = await import('./national-budget.analytics')
const { parseAdvanced } = await import('@/features/national-budget/analytics/lib/analytics-state')
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

describe('/national-budget/analytics', () => {
  it('renders on the server', () => {
    expect(route.ssr).toBe(true)
  })

  it('keeps the keys the page reads, as the router parsed them, and leaves the rest to the site', () => {
    expect(route.validateSearch({ tip: 'venituri', perioada: 2025, cumulat: false, rand: 'revenue.vat', lang: 'en', view: { x: 1 } })).toEqual({
      tip: 'venituri',
      perioada: 2025,
      cumulat: false,
      rand: 'revenue.vat',
    })
  })

  it('keeps a page key the router parsed as something else as text, and the page reads its default for it', () => {
    const search = route.validateSearch({ tip: ['lege', 'sold'], an: { year: 2025 } })
    expect(search).toEqual({ tip: '["lege","sold"]', an: '{"year":2025}' })
    expect(parseAdvanced(search)).toMatchObject({ tip: 'cheltuieli', an: null })
  })

  it('reads a year as the number it travels as, and a month or a quarter as text', () => {
    expect(parseAdvanced(route.validateSearch({ perioada: 2024 })).perioada).toBe('2024')
    expect(parseAdvanced(route.validateSearch({ perioada: '2026-Q2' })).perioada).toBe('2026-Q2')
    expect(parseAdvanced(route.validateSearch({ perioada: '2026-07', cumulat: false })).cumulat).toBe(false)
    expect(parseAdvanced(route.validateSearch({ perioada: 'ieri' })).perioada).toBeNull()
  })

  it('is never cached, by a CDN or by the browser', () => {
    const headers = route.headers()
    expect(headers['Cache-Control']).toMatch(/no-store/)
    expect(headers['CDN-Cache-Control']).toBe('no-store')
  })

  it('indexes the bare page under its canonical address', () => {
    const head = headOf({})
    expect(head.meta[0]?.title).toMatch(/^Bugetul național/)
    expect(head.meta).not.toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(head.links).toEqual([{ rel: 'canonical', href: expect.stringMatching(/\/national-budget\/analytics$/) }])
  })

  it('answers a question without indexing it, and ignores the site\'s own keys', () => {
    expect(headOf({ tip: 'lege', an: 2025 }).meta).toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(headOf({ tip: 'lege' }).links).toEqual([])
    expect(headOf({ lang: 'en' }).links).toHaveLength(1)
  })
})
