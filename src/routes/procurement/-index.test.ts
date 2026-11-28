import { describe, expect, it, vi } from 'vitest'
// The publication a server render was read under (D6): known unless a test says otherwise.
vi.mock('@/features/procurement/api/procurement-da-release-status', () => ({ seededUnder: async (read: () => Promise<object>) => ({ ...(await read()), disclosure: 'v1' }) }))

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
}))

const { Route } = await import('./index')
const route = Route as unknown as {
  readonly beforeLoad: (input: { readonly abortController: AbortController; readonly location: { readonly search: Record<string, unknown> } }) => Promise<void>
  readonly headers: (input: { readonly loaderData?: Record<string, unknown> }) => Record<string, string>
}

// The explorer's own default when a link named no period: the previous calendar year.
const LAST_YEAR = new Date().getFullYear() - 1

describe('/procurement', () => {
  it('sends an old explorer link to /procurement/analytics, its question in the page’s words, with what else it carried, less its own choices', async () => {
    let thrown: unknown
    try {
      await route.beforeLoad({ abortController: new AbortController(), location: { search: { view: 'list', q: 'spital', lang: 'en', cumparatori: 'contracte' } } })
    } catch (error) {
      thrown = error
    }
    expect(thrown).toEqual({
      kind: 'redirect',
      options: { to: '/procurement/analytics', search: { lang: 'en', tip: 'contracte', perioada: LAST_YEAR, titlu: 'spital' }, replace: true },
    })
  })

  it('keeps a front-door link on the front door', async () => {
    await expect(route.beforeLoad({ abortController: new AbortController(), location: { search: {} } })).resolves.toBeUndefined()
    await expect(route.beforeLoad({ abortController: new AbortController(), location: { search: { cumparatori: 'contracte', lang: 'en' } } })).resolves.toBeUndefined()
  })

  it('never caches a render with a failed read for everyone', () => {
    vi.stubEnv('DEV', false)
    try {
      const failed = route.headers({ loaderData: { national: {}, categories: {} } })
      expect(failed['Cache-Control']).toBe('no-store')
      expect(failed['CDN-Cache-Control']).toBe('no-store')
      expect(route.headers({})['CDN-Cache-Control']).toBe('no-store')
      const whole = route.headers({ loaderData: { national: {}, categories: {}, bigContracts: [], disclosure: 'v1' } })
      // D6: a render whose publication is unknown is kept nowhere.
      expect(route.headers({ loaderData: { national: {}, categories: {}, bigContracts: [], disclosure: null } })['CDN-Cache-Control']).toBe('no-store')
      expect(whole).toMatchObject({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' })
      expect(whole.Vary).toBeUndefined()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
