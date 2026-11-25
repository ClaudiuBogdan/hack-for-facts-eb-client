import { QueryClient, dehydrate } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegalAnalyticsArgs, LegalAnalyticsView } from '@/schemas/legal-analytics'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const fetchAnalyticsMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))
vi.mock('@/features/legal/api/legal-analytics-api', async () => {
  const live = await vi.importActual<typeof import('@/features/legal/api/legal-analytics-api.live')>('@/features/legal/api/legal-analytics-api.live')
  return {
    LegalAnalyticsError: live.LegalAnalyticsError,
    LEGAL_ANALYTICS_UNAVAILABLE: live.LEGAL_ANALYTICS_UNAVAILABLE,
    fetchLegalAnalytics: fetchAnalyticsMock,
  }
})
vi.mock('@/lib/http-cache', () => ({
  createNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }),
  createPublicPageCacheHeaders: () => ({ 'Cache-Control': 'public' }),
}))

type LoaderData = { readonly seeded?: boolean; readonly analyticsUnavailable?: boolean }

async function importRoute() {
  const { Route } = await import('./index')
  return Route as unknown as {
    loader: (input: { readonly context: { readonly queryClient: QueryClient } }) => Promise<LoaderData>
    headers: (input: { readonly loaderData?: LoaderData; readonly match?: { readonly status: string } }) => Record<string, string>
  }
}

/** Runs `body` with `globalThis.window` removed: the SSR branch, with its real guard. */
async function asServerRender<T>(body: () => Promise<T>): Promise<T> {
  const realWindow = globalThis.window
  Reflect.deleteProperty(globalThis, 'window')
  try {
    return await body()
  } finally {
    Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true, writable: true })
  }
}

const { legislationAnalyticsFixture } = await import('@/features/legal/mocks/fixtures/legislation-analytics')

/** The committed server answer of a view (the mock lane's), as the live adapter returns it. */
function answerOf(view: LegalAnalyticsView, args: LegalAnalyticsArgs) {
  const name = view === 'breakdown' && args.lens === 'issuer' ? 'breakdown-issuer' : view
  const fixture = legislationAnalyticsFixture[name as keyof typeof legislationAnalyticsFixture]
  return Promise.resolve({ data: fixture.data, layer: fixture.layer, args: fixture.args })
}

const viewsRead = () => fetchAnalyticsMock.mock.calls.map((call) => call[0] as LegalAnalyticsView)

describe('/legislation loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    fetchAnalyticsMock.mockReset()
  })

  it('renders the aggregate answers on the server, all started together, and goes out publicly cached', async () => {
    let started = 0
    const answers: (() => void)[] = []
    fetchAnalyticsMock.mockImplementation((view: LegalAnalyticsView, args: LegalAnalyticsArgs) => {
      started += 1
      return new Promise((resolve) => answers.push(() => resolve(answerOf(view, args))))
    })
    const route = await importRoute()
    const queryClient = new QueryClient()
    const pending = asServerRender(() => route.loader({ context: { queryClient } }))
    // every read is in flight before any answers: one first-paint budget, not four in a row
    await vi.waitFor(() => expect(started).toBe(4))
    answers.forEach((answer) => answer())
    const data = await pending
    expect(data).toEqual({ seeded: true, analyticsUnavailable: false })
    expect(viewsRead().sort()).toEqual(['breakdown', 'head', 'series', 'summary'])
    expect(route.headers({ loaderData: data, match: { status: 'success' } })).toEqual({ 'Cache-Control': 'public' })
  })

  it('puts nothing that names an act into the server payload', async () => {
    fetchAnalyticsMock.mockImplementation(answerOf)
    const route = await importRoute()
    const queryClient = new QueryClient()
    await asServerRender(() => route.loader({ context: { queryClient } }))
    expect(viewsRead()).not.toContain('acts')
    expect(viewsRead()).not.toContain('links')
    const payload = JSON.stringify(dehydrate(queryClient))
    // no act id, citation or title from the views that name acts
    const named = [...legislationAnalyticsFixture.acts.data.rows.slice(0, 5), ...legislationAnalyticsFixture.links.data.topTargets.slice(0, 5).map((row) => row.target)]
    for (const act of named) {
      expect(payload).not.toContain(`"actId":"${act.actId}"`)
      expect(payload).not.toContain(act.citation)
      if (act.title) expect(payload).not.toContain(act.title)
    }
    expect(payload).not.toContain('actId')
  })

  it('leaves a failed server read to the browser, uncached', async () => {
    fetchAnalyticsMock.mockImplementation((view: LegalAnalyticsView, args: LegalAnalyticsArgs) =>
      view === 'summary' ? Promise.reject(new Error('down')) : answerOf(view, args),
    )
    const route = await importRoute()
    const queryClient = new QueryClient()
    const data = await asServerRender(() => route.loader({ context: { queryClient } }))
    expect(data).toEqual({ seeded: false, analyticsUnavailable: false })
    expect(queryClient.getQueryState(['legal', 'analytics', 'summary', {}])).toBeUndefined()
    expect(queryClient.getQueryData(['legal', 'analytics', 'head', {}])).toBeDefined()
    expect(route.headers({ loaderData: data, match: { status: 'success' } })).toEqual({ 'Cache-Control': 'no-store' })
  })

  it('says when no layer is published yet (503)', async () => {
    const { LegalAnalyticsError } = await import('@/features/legal/api/legal-analytics-api')
    fetchAnalyticsMock.mockRejectedValue(new LegalAnalyticsError('unavailable', 'no layer', 503))
    const route = await importRoute()
    const data = await asServerRender(() => route.loader({ context: { queryClient: new QueryClient() } }))
    expect(data).toEqual({ seeded: false, analyticsUnavailable: true })
  })

  it('never goes out public on an answer kept from before an outage', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    try {
      vi.setSystemTime(new Date('2026-11-25T08:00:00Z'))
      fetchAnalyticsMock.mockImplementation(answerOf)
      const route = await importRoute()
      const warm = await asServerRender(() => route.loader({ context: { queryClient: new QueryClient() } }))
      expect(warm).toEqual({ seeded: true, analyticsUnavailable: false })
      // eleven minutes on, the API refuses every read: the kept answers are too old to serve
      vi.setSystemTime(new Date('2026-11-25T08:11:00Z'))
      const { LegalAnalyticsError } = await import('@/features/legal/api/legal-analytics-api')
      fetchAnalyticsMock.mockRejectedValue(new LegalAnalyticsError('unavailable', 'busy', 503))
      const data = await asServerRender(() => route.loader({ context: { queryClient: new QueryClient() } }))
      expect(data).toEqual({ seeded: false, analyticsUnavailable: true })
      expect(route.headers({ loaderData: data, match: { status: 'success' } })).toEqual({ 'Cache-Control': 'no-store' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('starts the reads in the browser and returns at once', async () => {
    fetchAnalyticsMock.mockImplementation(() => new Promise(() => {}))
    const route = await importRoute()
    const queryClient = new QueryClient()
    await expect(route.loader({ context: { queryClient } })).resolves.toEqual({})
    expect(viewsRead().sort()).toEqual(['breakdown', 'head', 'series', 'summary'])
  })
})
