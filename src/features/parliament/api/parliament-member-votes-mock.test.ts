import { describe, expect, it } from 'vitest'
import { buildMemberVotesFilter } from '../lib/member-votes-filter'
import {
  fetchParliamentMemberVoteActivityMock,
  fetchParliamentMemberVotingHistoryMock,
} from './parliament-api.mock'

/**
 * Mock-mode fetcher checks (VITE_USE_MOCK_DATA path). `dep-001` is a Camera
 * member with exactly two fixture votes: cam-v-001 (2026-05-15, pentru) and
 * cam-v-002 (2026-05-10, impotriva). The mock applies the GraphQL-shape filter
 * client-side, mirroring the live server semantics.
 */
const MEMBER = 'dep-001'

describe('fetchParliamentMemberVotingHistoryMock (filtered)', () => {
  it('returns all votes when unfiltered', async () => {
    const res = await fetchParliamentMemberVotingHistoryMock(MEMBER)
    expect(res?.total).toBe(2)
  })

  it('applies a choice filter', async () => {
    const filter = buildMemberVotesFilter({ choice: 'impotriva' }, 'camera')
    const res = await fetchParliamentMemberVotingHistoryMock(MEMBER, undefined, filter)
    expect(res?.total).toBe(1)
    expect(res?.votes[0]?.choice).toBe('impotriva')
  })

  it('applies a date-range filter on heldAt', async () => {
    const filter = buildMemberVotesFilter({ from: '2026-05-12' }, 'camera')
    const res = await fetchParliamentMemberVotingHistoryMock(MEMBER, undefined, filter)
    expect(res?.total).toBe(1)
    expect(res?.votes[0]?.heldAt.slice(0, 10)).toBe('2026-05-15')
  })

  it('session=proprie matches the member chamber; comun matches none', async () => {
    const proprie = buildMemberVotesFilter({ session: 'proprie' }, 'camera')
    expect((await fetchParliamentMemberVotingHistoryMock(MEMBER, undefined, proprie))?.total).toBe(2)

    const comun = buildMemberVotesFilter({ session: 'comun' }, 'camera')
    expect((await fetchParliamentMemberVotingHistoryMock(MEMBER, undefined, comun))?.total).toBe(0)
  })
})

describe('fetchParliamentMemberVoteActivityMock', () => {
  it('aggregates votes per day for the year, with availableYears', async () => {
    const res = await fetchParliamentMemberVoteActivityMock(MEMBER, 2026)
    expect(res?.availableYears).toEqual([2026])
    expect(res?.days.map((d) => d.date)).toEqual(['2026-05-10', '2026-05-15'])
    expect(res?.days.every((d) => d.total === 1)).toBe(true)
  })

  it('applies non-date filters (choice) to the aggregate', async () => {
    const filter = buildMemberVotesFilter({ choice: 'impotriva' }, 'camera')
    const res = await fetchParliamentMemberVoteActivityMock(MEMBER, 2026, filter)
    expect(res?.days).toHaveLength(1)
    expect(res?.days[0]).toMatchObject({ date: '2026-05-10', total: 1, impotriva: 1 })
  })

  it('returns an empty year when no votes fall in it', async () => {
    const res = await fetchParliamentMemberVoteActivityMock(MEMBER, 2019)
    expect(res?.days).toEqual([])
  })
})
