import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ ...options, options }),
  redirect: (options: unknown) => ({ redirect: options }),
  Outlet: () => null,
}))

type RouteModule = { readonly Route: { readonly options: { readonly beforeLoad: BeforeLoad } } }
type BeforeLoad = (context: { readonly params: Record<string, string>; readonly search: Record<string, unknown> }) => unknown

function thrownBy(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  return undefined
}

describe('the Romanian paths of the first release', () => {
  it.each([
    ['./ong-uri/index', '/ngos', {}, { indicator: 'total' }],
    ['./ong-uri.$cui', '/ngos/$cui', { cui: '3151288' }, { an: '2024' }],
    ['./ong-uri.registru.$recordId', '/ngos/registry/$recordId', { recordId: '42' }, {}],
    ['./ong-uri.sursa.$snapshotId', '/ngos/sources/$snapshotId', { snapshotId: 'abc' }, {}],
  ])('%s answers with a 301 to %s, its parameters and search carried over', async (module, to, params, search) => {
    const { Route } = (await import(module)) as unknown as RouteModule
    const redirect = thrownBy(() => Route.options.beforeLoad({ params, search })) as { readonly redirect: Record<string, unknown> }
    expect(redirect.redirect).toMatchObject({ to, search, replace: true, statusCode: 301 })
    if (Object.keys(params).length > 0) expect(redirect.redirect.params).toEqual(params)
  })
})

describe('the Romanian paths whose target cleans its search', () => {
  it('sends the registry its search in the registry’s own shape, in one hop, the site’s keys kept', async () => {
    const { Route } = (await import('./ong-uri.registru.index')) as unknown as RouteModule
    const redirect = thrownBy(() => Route.options.beforeLoad({ params: {}, search: { q: 'salvati', county: 'CLUJ', lang: 'en' } })) as { readonly redirect: Record<string, unknown> }
    expect(redirect.redirect).toMatchObject({ to: '/ngos/registry', statusCode: 301 })
    expect(redirect.redirect.search).toEqual({ q: 'salvati', county: 'CLUJ', category: '', status: '', registryNumber: '', publicUtility: '', after: '', lang: 'en' })
  })

  it('sends the services page its search with the page’s defaults filled in, in one hop', async () => {
    const { Route } = (await import('./ong-uri.servicii')) as unknown as RouteModule
    const redirect = thrownBy(() => Route.options.beforeLoad({ params: {}, search: { lang: 'en' } })) as { readonly redirect: Record<string, unknown> }
    expect(redirect.redirect).toMatchObject({ to: '/ngos/services', statusCode: 301 })
    expect(redirect.redirect.search).toMatchObject({ lang: 'en', view: 'lista', page: 1 })
  })
})
