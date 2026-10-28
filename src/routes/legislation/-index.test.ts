import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegislationFrontDoor } from '@/schemas/legal'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const fetchFrontDoorMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))
vi.mock('@/features/legal/api/legal-api', () => ({
  fetchLegislationFrontDoor: fetchFrontDoorMock,
  fetchLegislationOverview: vi.fn(),
}))
vi.mock('@/lib/http-cache', () => ({
  createNoStoreHeaders: () => ({ 'Cache-Control': 'no-store' }),
  createPublicPageCacheHeaders: () => ({ 'Cache-Control': 'public' }),
}))

type LoaderData = { readonly seeded?: boolean }

async function importRoute() {
  const { Route } = await import('./index')
  return Route as unknown as {
    loader: (input: { readonly context: { readonly queryClient: QueryClient } }) => Promise<LoaderData>
    headers: (input: { readonly loaderData?: LoaderData }) => Record<string, string>
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

const frontDoor = (id: string): LegislationFrontDoor => ({
  latestGazetteIssues: [
    { moIssueId: id, partCode: 'I', issueLabel: `MO ${id}`, issueNumber: 1, issueYear: 2026, issueDate: '2026-07-09', pdfUrl: null, hasEmonitorLink: false },
  ],
  coverage: {
    authorities: ['Portal Legislativ', 'Monitorul Oficial'],
    yearsRange: [1990, 2026],
    retrievedAt: '2026-07-09',
    publishedAt: null,
    knownGaps: [],
    inaccessibleCount: 0,
    dataStatus: 'live',
  },
})

const FRONT_DOOR_KEY = ['legal', 'front-door']

describe('/legislation loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    fetchFrontDoorMock.mockReset()
  })

  it('fills the page’s query on the server from a read kept for the next render', async () => {
    fetchFrontDoorMock.mockResolvedValue(frontDoor('a'))
    const route = await importRoute()

    const first = new QueryClient()
    const data = await asServerRender(() => route.loader({ context: { queryClient: first } }))
    expect(data).toEqual({ seeded: true })
    expect(first.getQueryData(FRONT_DOOR_KEY)).toEqual(frontDoor('a'))
    expect(route.headers({ loaderData: data })).toEqual({ 'Cache-Control': 'public' })

    // A new request, a new query client: the server's kept read answers.
    const second = new QueryClient()
    await asServerRender(() => route.loader({ context: { queryClient: second } }))
    expect(second.getQueryData(FRONT_DOOR_KEY)).toEqual(frontDoor('a'))
    expect(fetchFrontDoorMock).toHaveBeenCalledTimes(1)
    // Under its own deadline, not a request's signal: the read is shared.
    expect(fetchFrontDoorMock).toHaveBeenCalledWith(expect.any(AbortSignal))
  })

  it('leaves a failed server read to the browser, uncached, and does not keep it', async () => {
    fetchFrontDoorMock.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(frontDoor('b'))
    const route = await importRoute()

    const failed = new QueryClient()
    const data = await asServerRender(() => route.loader({ context: { queryClient: failed } }))
    expect(data).toEqual({ seeded: false })
    // Nothing dehydrated for it, a failure included: the browser's query reads it.
    expect(failed.getQueryState(FRONT_DOOR_KEY)).toBeUndefined()
    expect(route.headers({ loaderData: data })).toEqual({ 'Cache-Control': 'no-store' })

    const next = new QueryClient()
    await asServerRender(() => route.loader({ context: { queryClient: next } }))
    expect(next.getQueryData(FRONT_DOOR_KEY)).toEqual(frontDoor('b'))
    expect(fetchFrontDoorMock).toHaveBeenCalledTimes(2)
  })

  it('starts the query’s read in the browser and returns at once', async () => {
    fetchFrontDoorMock.mockImplementation(() => new Promise(() => {}))
    const route = await importRoute()
    const queryClient = new QueryClient()

    await expect(route.loader({ context: { queryClient } })).resolves.toEqual({})
    expect(fetchFrontDoorMock).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryState(FRONT_DOOR_KEY)?.fetchStatus).toBe('fetching')
  })

  it('does not read again in the browser when the cache holds the band', async () => {
    const route = await importRoute()
    const queryClient = new QueryClient()
    queryClient.setQueryData(FRONT_DOOR_KEY, frontDoor('c'))

    await route.loader({ context: { queryClient } })
    expect(fetchFrontDoorMock).not.toHaveBeenCalled()
  })
})
