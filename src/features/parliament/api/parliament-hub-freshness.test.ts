/**
 * The Parliament shell prints "Actualizat <date>" on every page. That value
 * used to be `new Date().toISOString()` — REQUEST time — so the header always
 * claimed the data had just been refreshed, which is a data-trust claim the
 * platform could not back (DESIGN.md §Data Trust).
 *
 * The shell now reads it from the freshness query alone; the hub aggregate no
 * longer reads freshness a second time. These tests pin both halves: the sync
 * time is the API's real `parliamentDataFreshness.lastLoadedAt` or it is
 * absent, and the hub aggregate reads only the composition.
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

/** Route each query document to a canned payload by operation name. */
const respond = (freshness: unknown) => {
  graphqlQueryMock.mockImplementation(
    (_doc: string, vars: { chamber?: string } | undefined, opts?: { operationName?: string }) => {
      const op = opts?.operationName
      if (op === 'parliamentDataFreshness') return Promise.resolve(freshness)
      // One chamber's groups per call; the Senate has none in this fixture.
      return Promise.resolve(vars?.chamber === 'senat' ? { parliamentGroups: [] } : GROUPS)
    },
  )
}

const operations = () =>
  graphqlQueryMock.mock.calls.map(
    (call) => (call[2] as { operationName?: string } | undefined)?.operationName,
  )

beforeEach(() => {
  vi.resetModules()
  graphqlQueryMock.mockReset()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-26T12:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('fetchParliamentHubLive — the composition, read once', () => {
  it('reads the groups only: no freshness, no page of votes nobody renders', async () => {
    respond({ parliamentDataFreshness: { latestVoteDate: null, lastLoadedAt: null } })
    const { fetchParliamentHubLive } = await import('./parliament-api.live')

    const hub = await fetchParliamentHubLive()

    expect(new Set(operations())).toEqual(new Set(['parliamentGroups']))
    expect(hub.memberCountByChamber.camera).toBe(3)
    expect(() => ParliamentHubDataSchema.parse(hub)).not.toThrow()
  })
})

describe('fetchParliamentFreshnessLive — the sync time is REAL data freshness', () => {
  it('uses parliamentDataFreshness.lastLoadedAt, not the request time', async () => {
    respond({
      parliamentDataFreshness: {
        latestVoteDate: '2026-07-10',
        lastLoadedAt: '2026-07-22T05:40:00+03:00',
      },
    })
    const { fetchParliamentFreshnessLive } = await import('./parliament-api.live')

    const freshness = await fetchParliamentFreshnessLive()

    expect(freshness.lastLoadedAt).toBe('2026-07-22T05:40:00+03:00')
    // The bug was that this always equalled "now".
    expect(freshness.lastLoadedAt).not.toBe(new Date().toISOString())
  })

  it('OMITS lastLoadedAt when the API reports no freshness (never stamps now)', async () => {
    respond({ parliamentDataFreshness: { latestVoteDate: null, lastLoadedAt: null } })
    const { fetchParliamentFreshnessLive } = await import('./parliament-api.live')

    expect((await fetchParliamentFreshnessLive()).lastLoadedAt).toBeUndefined()
  })

  it('OMITS lastLoadedAt when the freshness root is null', async () => {
    respond({ parliamentDataFreshness: null })
    const { fetchParliamentFreshnessLive } = await import('./parliament-api.live')

    expect((await fetchParliamentFreshnessLive()).lastLoadedAt).toBeUndefined()
  })
})
