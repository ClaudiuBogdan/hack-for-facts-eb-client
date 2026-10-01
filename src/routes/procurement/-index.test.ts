import { describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
}))

const { Route } = await import('./index')
const route = Route as unknown as {
  readonly beforeLoad: (input: { readonly location: { readonly search: Record<string, unknown> } }) => void
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
}

// The explorer's own default when a link named no period: the previous calendar year.
const LAST_YEAR = new Date().getFullYear() - 1

describe('/procurement', () => {
  it('sends an old explorer link to /procurement/analytics, its question in the page’s words, with what else it carried, less its own choices', () => {
    let thrown: unknown
    try {
      route.beforeLoad({ location: { search: { view: 'list', q: 'spital', lang: 'en', cumparatori: 'contracte' } } })
    } catch (error) {
      thrown = error
    }
    expect(thrown).toEqual({
      kind: 'redirect',
      options: { to: '/procurement/analytics', search: { lang: 'en', tip: 'contracte', perioada: LAST_YEAR, titlu: 'spital' }, replace: true },
    })
  })

  it('keeps a front-door link on the front door', () => {
    expect(() => route.beforeLoad({ location: { search: {} } })).not.toThrow()
    expect(() => route.beforeLoad({ location: { search: { cumparatori: 'contracte', lang: 'en' } } })).not.toThrow()
  })

  it('never caches a render with a failed read for everyone', () => {
    vi.stubEnv('DEV', false)
    try {
      const failed = route.headers({ loaderData: { national: {}, categories: {} } })
      expect(failed['Cache-Control']).toBe('no-store')
      expect(failed['CDN-Cache-Control']).toBe('no-store')
      expect(route.headers({})['CDN-Cache-Control']).toBe('no-store')
      const whole = route.headers({ loaderData: { national: {}, categories: {}, bigContracts: [] } })
      expect(whole['CDN-Cache-Control']).toContain('s-maxage=600')
      expect(whole.Vary).toBe('Accept-Encoding, Cookie')
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
