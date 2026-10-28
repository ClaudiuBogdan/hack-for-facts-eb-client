/**
 * On the server the groups read sits in a memo shared by every render. A
 * stalled request must fail at its deadline and leave the memo, so the next
 * render asks the API again instead of waiting on the same stalled flight.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { GraphQLRequestError } from '@/lib/graphql/graphql-client'

const graphqlQueryMock = vi.fn()
vi.mock('@/lib/graphql/graphql-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/graphql/graphql-client')>(
    '@/lib/graphql/graphql-client',
  )
  return { ...actual, graphqlQuery: (...args: unknown[]) => graphqlQueryMock(...args) }
})

const GROUPS = {
  parliamentGroups: [
    { groupId: 'pnl-camera', chamber: 'camera_deputatilor', name: 'PNL', memberCount: 3 },
  ],
}

beforeEach(() => {
  // A server render: the directory reads take their deadline only there.
  vi.stubGlobal('window', undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.resetModules()
  graphqlQueryMock.mockReset()
})

describe('parliament directory reads on the server', () => {
  it('drop a stalled groups read at its deadline, so the next render reads again', async () => {
    vi.useFakeTimers()
    let stall = true
    graphqlQueryMock.mockImplementation(
      (_doc: string, _vars: unknown, options?: { signal?: AbortSignal }) => {
        if (!stall) return Promise.resolve(GROUPS)
        // A transport that never answers, until its signal gives up on it.
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(options.signal?.reason))
        })
      },
    )
    const { fetchParliamentHubLive } = await import('./parliament-api.live')

    const first = fetchParliamentHubLive().then(
      () => 'answered',
      () => 'failed',
    )
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await first).toBe('failed')

    stall = false
    const hub = await fetchParliamentHubLive()
    expect(hub.groups.map((group) => group.groupId)).toContain('pnl-camera')
  })

  it('seed the hub after a stall once the API answers again', async () => {
    vi.useFakeTimers()
    let stall = true
    graphqlQueryMock.mockImplementation(
      (_doc: string, _vars: unknown, options?: { signal?: AbortSignal; operationName?: string }) => {
        if (!stall || options?.operationName !== 'parliamentGroups') {
          return Promise.resolve(options?.operationName === 'parliamentGroups' ? GROUPS : {})
        }
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () => reject(options.signal?.reason))
        })
      },
    )
    const { seedParliamentHubForSsr } = await import('./parliament-hub-ssr')
    const { parliamentHubQuery } = await import('../hooks/parliament-hub-queries')
    const today = new Date('2026-07-29T09:00:00Z')

    const first = seedParliamentHubForSsr(new QueryClient(), today)
    await vi.advanceTimersByTimeAsync(5_000)
    expect((await first).complete).toBe(false)

    stall = false
    const client = new QueryClient()
    await seedParliamentHubForSsr(client, today)
    expect(client.getQueryData(parliamentHubQuery().queryKey)).toBeDefined()
  })

  it('abort every hub read at the transport when it stalls, not only the wait for it', async () => {
    vi.useFakeTimers()
    const signals = new Map<string, AbortSignal | undefined>()
    graphqlQueryMock.mockImplementation(
      (_doc: string, _vars: unknown, options?: { signal?: AbortSignal; operationName?: string }) => {
        signals.set(options?.operationName ?? '?', options?.signal)
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(options.signal?.reason))
        })
      },
    )
    const { seedParliamentHubForSsr } = await import('./parliament-hub-ssr')

    const seed = seedParliamentHubForSsr(new QueryClient(), new Date('2026-07-29T09:00:00Z'))
    await vi.advanceTimersByTimeAsync(5_000)
    expect((await seed).complete).toBe(false)

    for (const operation of [
      'parliamentGroups',
      'parliamentDataFreshness',
      'ParliamentAgendas',
      'parliamentVotes',
      'parliamentBills',
      'parliamentVoteActivity',
      'parliamentBillActivity',
    ]) {
      expect(signals.get(operation)?.aborted, operation).toBe(true)
    }
  })

  it('do not keep a failed freshness read as an empty answer', async () => {
    let down = true
    graphqlQueryMock.mockImplementation(
      (_doc: string, _vars: unknown, options?: { operationName?: string }) => {
        if (options?.operationName === 'parliamentDataFreshness') {
          return down
            ? Promise.reject(new GraphQLRequestError('GraphQL request failed: 503', { status: 503 }))
            : Promise.resolve({ parliamentDataFreshness: { latestVoteDate: '2026-07-10', lastLoadedAt: null } })
        }
        return Promise.resolve(options?.operationName === 'parliamentGroups' ? GROUPS : {})
      },
    )
    const { seedParliamentHubForSsr } = await import('./parliament-hub-ssr')
    const { parliamentFreshnessQuery } = await import('../hooks/parliament-hub-queries')
    const today = new Date('2026-07-29T09:00:00Z')

    const first = new QueryClient()
    expect((await seedParliamentHubForSsr(first, today)).complete).toBe(false)
    expect(first.getQueryData(parliamentFreshnessQuery().queryKey)).toBeUndefined()

    down = false
    const next = new QueryClient()
    await seedParliamentHubForSsr(next, today)
    expect(next.getQueryData(parliamentFreshnessQuery().queryKey)).toEqual({ latestVoteDate: '2026-07-10' })
  })
})
