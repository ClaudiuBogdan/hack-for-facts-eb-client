import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({
  kind: 'redirect',
  options,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
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

describe('legacy achizitii redirects', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    redirectMock.mockClear()
  })

  it.each([
    ['index', '/procurement', undefined],
    ['search', '/procurement', undefined],
    ['category', '/procurement/categories/$code', { code: '45' }],
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
        } as never)
      } catch (error) {
        thrown = error
      }

      expect(redirectMock).toHaveBeenCalledWith({
        to: expectedTo,
        ...(params ? { params } : {}),
        search:
          legacyRoute === 'search'
            ? expect.objectContaining({ view: 'list', q: 'spital', page: 2 })
            : search,
        replace: true,
        statusCode: 301,
      })
      expect(thrown).toEqual({
        kind: 'redirect',
        options: {
          to: expectedTo,
          ...(params ? { params } : {}),
          search:
            legacyRoute === 'search'
              ? expect.objectContaining({ view: 'list', q: 'spital', page: 2 })
              : search,
          replace: true,
          statusCode: 301,
        },
      })
    },
  )
})
