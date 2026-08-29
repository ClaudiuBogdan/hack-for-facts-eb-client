import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const createFileRouteMock = vi.fn(() => routeStub)
const cacheHeadersMock = vi.fn((opts: Record<string, unknown>) => ({
  'cache-control': 'public',
  ...opts,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: createFileRouteMock,
}))
vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: cacheHeadersMock,
}))

describe('/parlament/voturi/$chamber/$voteId route', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    createFileRouteMock.mockClear()
    cacheHeadersMock.mockClear()
  })

  it('validates the vote tab out of the URL', async () => {
    const { Route } = await import('./$voteId')
    const route = Route as unknown as {
      validateSearch: (search: Record<string, unknown>) => unknown
    }

    // The tab a link names is the tab the FIRST paint shows — validated here,
    // on the server side of the render, with no client correction step.
    expect(route.validateSearch({ alegere: 'toate' })).toEqual({
      alegere: 'toate',
    })
    // Unrelated params are the router's to carry, not this schema's to invent.
    expect(route.validateSearch({})).toEqual({})
    // A junk value falls back to the section default rather than throwing.
    expect(route.validateSearch({ alegere: 'nu-exista' })).toEqual({})
  })

  it('still parses its params and sets public cache headers', async () => {
    const { Route } = await import('./$voteId')
    const route = Route as unknown as {
      params: { parse: (input: unknown) => unknown }
      headers: () => unknown
    }

    expect(route.params.parse({ chamber: 'senat', voteId: 'senat:8D1' })).toEqual(
      { chamber: 'senat', voteId: 'senat:8D1' },
    )
    route.headers()
    expect(cacheHeadersMock).toHaveBeenCalledWith({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    })
  })
})
