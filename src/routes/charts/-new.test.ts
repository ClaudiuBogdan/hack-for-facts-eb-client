import { describe, expect, it, vi } from 'vitest'

const capture = vi.hoisted(() => vi.fn())
vi.mock('@/lib/analytics', () => ({
  Analytics: { capture, EVENTS: { ChartCreated: 'chart_created' } },
}))

describe('/charts/new', () => {
  it('creates nothing, and tells analytics nothing, when a hover only preloads it', async () => {
    const { Route } = await import('./new')
    const beforeLoad = Route.options.beforeLoad as (context: { preload: boolean }) => unknown
    expect(beforeLoad({ preload: true })).toBeUndefined()
    expect(capture).not.toHaveBeenCalled()
  })

  it('creates a chart and opens it on a real visit', async () => {
    const { Route } = await import('./new')
    const beforeLoad = Route.options.beforeLoad as (context: { preload: boolean }) => unknown
    let redirected: unknown
    try {
      beforeLoad({ preload: false })
    } catch (thrown) {
      redirected = thrown
    }
    expect(capture).toHaveBeenCalledTimes(1)
    expect(redirected).toMatchObject({ options: { to: '/charts/$chartId' } })
  })
})
