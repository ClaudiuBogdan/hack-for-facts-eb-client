import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { fetchLegislationFreshnessLive } from './legal-freshness-api.live'

const graphqlQueryMock = vi.mocked(graphqlQuery)

/** Noon UTC on 2026-11-20 — the same day in Bucharest. */
const NOW = new Date('2026-11-20T12:00:00Z')

/** The shape the dev API answered on 2026-11-20 (legacy source). */
const answer = (overrides: Record<string, unknown> = {}) => ({
  latestIssue: { edges: [{ node: { issueDate: '2026-07-09' } }] },
  latestChange: { edges: [{ node: { effectiveDate: '2026-09-25' } }] },
  ccrDecisions: {
    bucketsTruncated: false,
    otherCount: 0,
    buckets: [{ count: 22_780 }, { count: 49 }, { count: 17 }, { count: 10 }],
  },
  ...overrides,
})

describe('fetchLegislationFreshnessLive', () => {
  beforeEach(() => {
    graphqlQueryMock.mockReset()
  })

  it('reads both frontiers and the CCR count in one round-trip, bounded to today', async () => {
    graphqlQueryMock.mockResolvedValue(answer() as never)

    const freshness = await fetchLegislationFreshnessLive({ now: NOW })

    expect(freshness).toEqual({
      latestIssueDate: '2026-07-09',
      latestEffectiveChangeDate: '2026-09-25',
      ccrDecisionCount: 22_856,
    })
    expect(graphqlQueryMock).toHaveBeenCalledTimes(1)
    const [query, variables] = graphqlQueryMock.mock.calls[0] as unknown as [string, unknown]
    expect(variables).toEqual({ moYear: 2026, today: '2026-11-20' })
    // Already in force only: the feed leads with future-dated events otherwise.
    expect(query).toMatch(/legalRecentChanges\(until: \$today, first: 1\)/)
    expect(query).toMatch(/sort: ISSUE_DATE_DESC/)
    expect(query).toMatch(/issuerSlug: \{ in: \["curtea-constitutionala"\] \}/)
  })

  it('reads the previous year once when this year has no issue yet', async () => {
    graphqlQueryMock
      .mockResolvedValueOnce(answer({ latestIssue: { edges: [] } }) as never)
      .mockResolvedValueOnce(
        answer({ latestIssue: { edges: [{ node: { issueDate: '2025-12-30' } }] } }) as never,
      )

    const freshness = await fetchLegislationFreshnessLive({ now: NOW })

    expect(freshness.latestIssueDate).toBe('2025-12-30')
    expect(graphqlQueryMock.mock.calls[1]?.[1]).toMatchObject({ moYear: 2025 })
  })

  it('leaves the CCR count unknown unless the partition is complete', async () => {
    graphqlQueryMock.mockResolvedValue(
      answer({ ccrDecisions: { bucketsTruncated: true, otherCount: 0, buckets: [{ count: 5 }] } }) as never,
    )
    expect((await fetchLegislationFreshnessLive({ now: NOW })).ccrDecisionCount).toBeNull()

    graphqlQueryMock.mockResolvedValue(
      answer({ ccrDecisions: { bucketsTruncated: false, otherCount: 3, buckets: [{ count: 5 }] } }) as never,
    )
    expect((await fetchLegislationFreshnessLive({ now: NOW })).ccrDecisionCount).toBeNull()

    graphqlQueryMock.mockResolvedValue(
      answer({ ccrDecisions: { bucketsTruncated: false, otherCount: 0, buckets: [{ count: 'x' }] } }) as never,
    )
    expect((await fetchLegislationFreshnessLive({ now: NOW })).ccrDecisionCount).toBeNull()
  })

  it('leaves a frontier unknown when the server serves no date', async () => {
    graphqlQueryMock.mockResolvedValue(
      answer({ latestChange: { edges: [{ node: { effectiveDate: null } }] } }) as never,
    )
    expect(
      (await fetchLegislationFreshnessLive({ now: NOW })).latestEffectiveChangeDate,
    ).toBeNull()
  })
})
