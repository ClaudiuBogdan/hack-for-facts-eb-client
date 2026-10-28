import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

const fetchers = vi.hoisted(() => ({
  fetchParliamentHub: vi.fn(),
  fetchParliamentFreshness: vi.fn(),
  fetchParliamentAgendas: vi.fn(),
  fetchParliamentVotes: vi.fn(),
  fetchParliamentBills: vi.fn(),
  fetchParliamentVoteActivity: vi.fn(),
  fetchParliamentBillActivity: vi.fn(),
}))
vi.mock('./parliament-api', () => fetchers)

/** Mid-year: the 12-month window spans two calendar years (2025 and 2026). */
const TODAY = new Date('2026-07-29T09:00:00Z')

function answerAll() {
  fetchers.fetchParliamentHub.mockResolvedValue({ hub: true })
  fetchers.fetchParliamentFreshness.mockResolvedValue({ lastLoadedAt: '2026-07-28T05:00:00+03:00' })
  fetchers.fetchParliamentAgendas.mockResolvedValue({ agendas: [] })
  fetchers.fetchParliamentVotes.mockImplementation((search: { chamber: string }) =>
    Promise.resolve({ votes: [], chamber: search.chamber }),
  )
  fetchers.fetchParliamentBills.mockResolvedValue({ bills: [] })
  fetchers.fetchParliamentVoteActivity.mockImplementation((year: number) => Promise.resolve({ year }))
  fetchers.fetchParliamentBillActivity.mockImplementation((year: number) => Promise.resolve({ year }))
}

beforeEach(() => {
  vi.resetModules()
  for (const fetcher of Object.values(fetchers)) fetcher.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('seedParliamentHubForSsr', () => {
  it('puts every hub read in the cache under the key its hook asks for', async () => {
    answerAll()
    const { seedParliamentHubForSsr } = await import('./parliament-hub-ssr')
    const queries = await import('../hooks/parliament-hub-queries')
    const client = new QueryClient()

    const seed = await seedParliamentHubForSsr(client, TODAY)

    expect(seed).toEqual({ complete: true })
    expect(client.getQueryData(queries.parliamentHubQuery().queryKey)).toEqual({ hub: true })
    expect(client.getQueryData(queries.parliamentAgendasQuery(1).queryKey)).toEqual({ agendas: [] })
    expect(
      client.getQueryData(queries.parliamentVotesQuery(queries.hubChamberVotesSearch('senat')).queryKey),
    ).toEqual({ votes: [], chamber: 'senat' })
    expect(client.getQueryData(queries.parliamentBillsQuery(queries.HUB_BILLS_SEARCH).queryKey)).toEqual({ bills: [] })
    for (const year of [2025, 2026]) {
      expect(client.getQueryData(queries.parliamentVoteActivityQuery(year).queryKey)).toEqual({ year })
      expect(client.getQueryData(queries.parliamentBillActivityQuery(year).queryKey)).toEqual({ year })
    }
    // The hub's own heatmap asks with the all-chambers filter, which is no filter.
    expect(queries.voteActivityFilterFor(queries.HUB_VOTE_DAY_SEARCH)).toBeUndefined()
  })

  it('leaves a failed read out, keeps the rest, and says the render is incomplete', async () => {
    answerAll()
    fetchers.fetchParliamentBills.mockRejectedValue(new Error('down'))
    const { seedParliamentHubForSsr } = await import('./parliament-hub-ssr')
    const queries = await import('../hooks/parliament-hub-queries')
    const client = new QueryClient()

    const seed = await seedParliamentHubForSsr(client, TODAY)

    expect(seed).toEqual({ complete: false })
    // Not an error state the page would render: no entry, so the browser reads it.
    expect(client.getQueryCache().find({ queryKey: queries.parliamentBillsQuery(queries.HUB_BILLS_SEARCH).queryKey })).toBeUndefined()
    expect(client.getQueryData(queries.parliamentHubQuery().queryKey)).toEqual({ hub: true })
  })

  it('stops waiting at the deadline, never sets a late answer, and asks again next time', async () => {
    vi.useFakeTimers()
    answerAll()
    let answerHub: (value: unknown) => void = () => undefined
    fetchers.fetchParliamentHub.mockReturnValueOnce(new Promise((resolve) => (answerHub = resolve)))
    const { seedParliamentHubForSsr } = await import('./parliament-hub-ssr')
    const queries = await import('../hooks/parliament-hub-queries')
    const client = new QueryClient()

    const pending = seedParliamentHubForSsr(client, TODAY)
    await vi.advanceTimersByTimeAsync(5_000)
    const seed = await pending
    answerHub({ hub: 'late' })
    await vi.advanceTimersByTimeAsync(0)

    expect(seed).toEqual({ complete: false })
    expect(client.getQueryData(queries.parliamentHubQuery().queryKey)).toBeUndefined()
    expect(client.getQueryData(queries.parliamentFreshnessQuery().queryKey)).toEqual({
      lastLoadedAt: '2026-07-28T05:00:00+03:00',
    })

    // The stalled flight was dropped from the shared memo: the next render reads again.
    const next = new QueryClient()
    expect(await seedParliamentHubForSsr(next, TODAY)).toEqual({ complete: true })
    expect(fetchers.fetchParliamentHub).toHaveBeenCalledTimes(2)
    expect(next.getQueryData(queries.parliamentHubQuery().queryKey)).toEqual({ hub: true })
  })

  it('keeps a read for the next render instead of asking the API again', async () => {
    answerAll()
    const { seedParliamentHubForSsr } = await import('./parliament-hub-ssr')

    await seedParliamentHubForSsr(new QueryClient(), TODAY)
    await seedParliamentHubForSsr(new QueryClient(), TODAY)

    expect(fetchers.fetchParliamentHub).toHaveBeenCalledTimes(1)
    expect(fetchers.fetchParliamentVoteActivity).toHaveBeenCalledTimes(2) // two years, once each
  })
})
