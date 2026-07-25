/**
 * The Parliament shell prints "Actualizat <date>" on every page from
 * `hub.lastSyncedAt`. That value used to be `new Date().toISOString()` — REQUEST
 * time — so the header always claimed the data had just been refreshed, which is
 * a data-trust claim the platform could not back (DESIGN.md §Data Trust).
 *
 * These tests pin the contract: `lastSyncedAt` is the API's real
 * `parliamentDataFreshness.lastLoadedAt`, or it is absent.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { ParliamentHubDataSchema } from '@/schemas/parliament'

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
const VOTES = {
  parliamentVotes: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
}

/** Route each query document to a canned payload by operation name. */
const respond = (freshness: unknown) => {
  graphqlQueryMock.mockImplementation((_doc: string, _vars: unknown, opts?: { operationName?: string }) => {
    const op = opts?.operationName
    if (op === 'parliamentDataFreshness') return Promise.resolve(freshness)
    if (op === 'parliamentVotes') return Promise.resolve(VOTES)
    return Promise.resolve(GROUPS)
  })
}

describe('fetchParliamentHubLive — lastSyncedAt is REAL data freshness', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-26T12:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses parliamentDataFreshness.lastLoadedAt, not the request time', async () => {
    respond({
      parliamentDataFreshness: {
        latestVoteDate: '2026-07-10',
        lastLoadedAt: '2026-07-22T05:40:00+03:00',
      },
    })
    const { fetchParliamentHubLive } = await import('./parliament-api.live')

    const hub = await fetchParliamentHubLive()

    expect(hub.lastSyncedAt).toBe('2026-07-22T05:40:00+03:00')
    // The bug was that this always equalled "now".
    expect(hub.lastSyncedAt).not.toBe(new Date().toISOString())
    expect(() => ParliamentHubDataSchema.parse(hub)).not.toThrow()
  })

  it('OMITS lastSyncedAt when the API reports no freshness (never stamps now)', async () => {
    respond({ parliamentDataFreshness: { latestVoteDate: null, lastLoadedAt: null } })
    const { fetchParliamentHubLive } = await import('./parliament-api.live')

    const hub = await fetchParliamentHubLive()

    expect(hub.lastSyncedAt).toBeUndefined()
    expect(() => ParliamentHubDataSchema.parse(hub)).not.toThrow()
  })

  it('OMITS lastSyncedAt when the freshness root is null', async () => {
    respond({ parliamentDataFreshness: null })
    const { fetchParliamentHubLive } = await import('./parliament-api.live')

    const hub = await fetchParliamentHubLive()

    expect(hub.lastSyncedAt).toBeUndefined()
  })
})
