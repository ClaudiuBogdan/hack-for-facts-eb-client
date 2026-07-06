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

describe('/parlament/comisii routes', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    createFileRouteMock.mockClear()
    cacheHeadersMock.mockClear()
  })

  it('committee browse index sets public page cache headers', async () => {
    const { Route } = await import('./index')
    const route = Route as unknown as { headers: () => unknown }
    expect(typeof route.headers).toBe('function')
    route.headers()
    expect(cacheHeadersMock).toHaveBeenCalledWith({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    })
  })

  it('committee detail route sets public page cache headers', async () => {
    const { Route } = await import('./$committeeKey')
    const route = Route as unknown as { headers: () => unknown }
    expect(typeof route.headers).toBe('function')
    route.headers()
    expect(cacheHeadersMock).toHaveBeenCalledWith({
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    })
  })
})
