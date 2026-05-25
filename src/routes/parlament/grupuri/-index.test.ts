import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const createFileRouteMock = vi.fn(() => routeStub)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({
  redirected: true,
  ...options,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: createFileRouteMock,
  redirect: redirectMock,
}))

describe('/parlament/grupuri route', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    createFileRouteMock.mockClear()
    redirectMock.mockClear()
  })

  it('preserves pagination search params when redirecting to the canonical tab', async () => {
    const { Route } = await import('./index')
    const route = Route as unknown as {
      beforeLoad: (input: { search: Record<string, unknown> }) => never
    }

    try {
      route.beforeLoad({
        search: {
          chamber: 'camera',
          judet: 'brasov',
          grup: 'pnl-camera',
          q: 'ana',
          page: 3,
          pageSize: 20,
        },
      })
    } catch {
      // The route intentionally throws the redirect returned by TanStack Router.
    }

    expect(redirectMock).toHaveBeenCalledWith({
      to: '/parlament',
      search: {
        tab: 'grupuri',
        chamber: 'camera',
        judet: 'brasov',
        grup: 'pnl-camera',
        q: 'ana',
        page: 3,
        pageSize: 20,
      },
      replace: true,
    })
  })
})
