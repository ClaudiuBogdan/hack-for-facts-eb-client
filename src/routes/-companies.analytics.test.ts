import { describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))

vi.mock('@/lib/i18n', async (importOriginal) => {
  const { i18n } = await import('@lingui/core')
  return { ...(await importOriginal<Record<string, unknown>>()), translatorFor: () => i18n }
})

const { Route } = await import('./companies.analytics')
const route = Route as unknown as {
  readonly validateSearch: (search: Record<string, unknown>) => Record<string, unknown>
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
  readonly head: (input: { readonly match: { readonly context: { readonly locale: string }; readonly search: Record<string, unknown> } }) => {
    readonly meta: readonly Record<string, string>[]
    readonly links: readonly Record<string, string>[]
  }
}

describe('/companies/analytics', () => {
  it('keeps the keys the page reads, as strings or bare numbers, and leaves the rest to the site', () => {
    expect(route.validateSearch({ an: 2008, judet: 'CJ,B', editie: 7, lang: 'en' })).toEqual({ an: 2008, judet: 'CJ,B', editie: 7 })
    // A page key the router parsed as something else stays as text, for the page to say it could not read it.
    expect(route.validateSearch({ judet: ['CJ', 'B'] })).toEqual({ judet: '["CJ","B"]' })
  })

  it('never lets a CDN or a browser keep any response, a complete render included: a withdrawn release must stop at the next request', () => {
    vi.stubEnv('DEV', false)
    try {
      for (const loaderData of [{ seed: [], complete: false }, { seed: [{ key: ['companies', 'analytics', 'stats', '7'], data: {} }], complete: true }, undefined]) {
        const headers = route.headers({ loaderData })
        expect(headers['Cache-Control']).toBe('no-store')
        expect(headers['CDN-Cache-Control']).toBe('no-store')
        expect(Object.values(headers).join(' ')).not.toMatch(/max-age|stale-while-revalidate/u)
      }
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('indexes the bare page and keeps a reader’s own question out of the index', () => {
    const bare = route.head({ match: { context: { locale: 'ro' }, search: {} } })
    expect(bare.meta.some((tag) => tag.name === 'robots')).toBe(false)
    expect(bare.links[0]?.href).toMatch(/\/companies\/analytics$/u)
    const own = route.head({ match: { context: { locale: 'ro' }, search: { judet: 'CJ', editie: 7 } } })
    expect(own.meta).toContainEqual({ name: 'robots', content: 'noindex, follow' })
    expect(own.links).toEqual([])
  })
})
