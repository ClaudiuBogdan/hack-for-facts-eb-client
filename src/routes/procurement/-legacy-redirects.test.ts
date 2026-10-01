import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({
  kind: 'redirect',
  options,
}))

const notFoundError = new Error('not-found')

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
  notFound: () => notFoundError,
}))

async function importLegacyRoute(path: string) {
  switch (path) {
    case 'index': {
      const { Route } = await import('../achizitii/index')
      return Route as unknown as {
        beforeLoad: (input: { readonly search: Record<string, unknown> }) => never
      }
    }
    case 'search': {
      const { Route } = await import('../achizitii/cautare')
      return Route as unknown as {
        beforeLoad: (input: { readonly search: Record<string, unknown> }) => never
      }
    }
    case 'category': {
      const { Route } = await import('../achizitii/cpv/$code')
      return Route as unknown as {
        beforeLoad: (input: {
          readonly params: { readonly code: string }
          readonly search: Record<string, unknown>
        }) => never
      }
    }
    case 'contract': {
      const { Route } = await import('../achizitii/contracte/$id')
      return Route as unknown as {
        beforeLoad: (input: {
          readonly params: { readonly id: string }
          readonly search: Record<string, unknown>
        }) => never
      }
    }
    case 'procedure': {
      const { Route } = await import('../achizitii/proceduri/$id')
      return Route as unknown as {
        beforeLoad: (input: {
          readonly params: { readonly id: string }
          readonly search: Record<string, unknown>
        }) => never
      }
    }
    case 'direct-acquisition': {
      const { Route } = await import('../achizitii/achizitii-directe/$id')
      return Route as unknown as {
        beforeLoad: (input: {
          readonly params: { readonly id: string }
          readonly search: Record<string, unknown>
        }) => never
      }
    }
    default:
      throw new Error(`Unknown legacy route: ${path}`)
  }
}

// The explorer's own default when a link named no period: the previous calendar year.
const LAST_YEAR = new Date().getFullYear() - 1

describe('legacy achizitii redirects', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    redirectMock.mockClear()
  })

  it('answers the old category alias with a 404 for a code that is no CPV code, and drops a check digit', async () => {
    const route = (await importLegacyRoute('category')) as unknown as { readonly params: { readonly parse: (params: { readonly code: string }) => { readonly code: string } } }
    for (const code of ['abc', '45 33', '45,33']) expect(() => route.params.parse({ code })).toThrow(notFoundError)
    expect(route.params.parse({ code: '45000000-7' })).toEqual({ code: '45000000' })
  })

  it('sends the old category alias straight to the analytics page, its category the filter, the site keys kept', async () => {
    const route = await importLegacyRoute('category')
    expect(() => route.beforeLoad({ params: { code: '45' }, search: { lang: 'en', q: 'spital', page: 2 } } as never)).toThrow()
    // The explorer's keys stay behind: beside the page's defaults they would read as an explorer link.
    expect(redirectMock).toHaveBeenCalledWith({ to: '/procurement/analytics', search: { lang: 'en', cpv: 45 }, replace: true, statusCode: 301 })
  })

  it.each([
    ['index', '/procurement', undefined],
    ['search', '/procurement/analytics', undefined],
    ['contract', '/procurement/contracts/$id', { id: 'contract-key-001' }],
    ['procedure', '/procurement/procedures/$id', { id: 'proc-001' }],
    [
      'direct-acquisition',
      '/procurement/direct-acquisitions/$id',
      { id: 'da-key-001' },
    ],
  ] as const)(
    'permanently redirects %s to %s while preserving params and search',
    async (legacyRoute, expectedTo, params) => {
      const route = await importLegacyRoute(legacyRoute)
      const search = { q: 'spital', page: 2 }

      let thrown: unknown
      try {
        route.beforeLoad({
          params: params ?? {},
          search,
          location: { search },
        } as never)
      } catch (error) {
        thrown = error
      }

      expect(redirectMock).toHaveBeenCalledWith({
        to: expectedTo,
        ...(params ? { params } : {}),
        // The explorer's list is the analytics page's records: the title's words open on them, the page number stays behind.
        search: legacyRoute === 'search' ? { tip: 'contracte', perioada: LAST_YEAR, titlu: 'spital' } : search,
        replace: true,
        statusCode: 301,
      })
      expect(thrown).toEqual({
        kind: 'redirect',
        options: {
          to: expectedTo,
          ...(params ? { params } : {}),
          search: legacyRoute === 'search' ? { tip: 'contracte', perioada: LAST_YEAR, titlu: 'spital' } : search,
          replace: true,
          statusCode: 301,
        },
      })
    },
  )
})
