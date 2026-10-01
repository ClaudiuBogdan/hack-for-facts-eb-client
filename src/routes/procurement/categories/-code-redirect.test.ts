// The CPV category page's old address: every category goes to the analytics page, the category as its filter.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundError = new Error('not-found')
const redirectMock = vi.fn((options: Record<string, unknown>) => ({ kind: 'redirect', options }))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: () => notFoundError,
  redirect: redirectMock,
}))

type CategoryRoute = {
  readonly params: { readonly parse: (params: { readonly code: string }) => { readonly code: string } }
  readonly beforeLoad: (input: { readonly params: { readonly code: string }; readonly location: { readonly search: Record<string, unknown> } }) => never
}

async function categoryRoute(): Promise<CategoryRoute> {
  const { Route } = await import('./$code')
  return Route as unknown as CategoryRoute
}

describe('/procurement/categories/$code', () => {
  beforeEach(() => {
    vi.resetModules()
    redirectMock.mockClear()
  })

  it.each([
    ['a division', '45', { cpv: 45 }],
    ['a group', '336', { cpv: 336 }],
    ['a code', '33600000', { cpv: 33600000 }],
  ] as const)('redirects %s to the analytics page with it as the filter', async (_, code, search) => {
    const route = await categoryRoute()
    expect(() => route.beforeLoad({ params: { code }, location: { search: {} } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith({ to: '/procurement/analytics', search, replace: true, statusCode: 301 })
  })

  it('keeps the site’s own keys, and none of the explorer’s', async () => {
    const route = await categoryRoute()
    expect(() => route.beforeLoad({ params: { code: '45' }, location: { search: { lang: 'en', view: 'list' } } })).toThrow()
    expect(redirectMock).toHaveBeenCalledWith(expect.objectContaining({ search: { lang: 'en', cpv: 45 } }))
  })

  it('answers a code that is no CPV code with a 404', async () => {
    const route = await categoryRoute()
    expect(() => route.params.parse({ code: 'abc' })).toThrow(notFoundError)
    expect(route.params.parse({ code: '45' })).toEqual({ code: '45' })
  })
})
