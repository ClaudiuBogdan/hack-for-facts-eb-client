import { describe, expect, it, vi } from 'vitest'

const fetchRedesignEntitySubordinateRankingMock = vi.fn()

vi.mock('@/lib/api/entity-ranking-redesign', () => ({
  fetchRedesignEntitySubordinateRanking: (...args: unknown[]) =>
    fetchRedesignEntitySubordinateRankingMock(...args),
}))

import {
  buildChallengeEntityAnalysisTrendPeriod,
  challengeEntitySubordinateRankingQueryOptions,
} from './challenge-entity-analysis-queries'

describe('buildChallengeEntityAnalysisTrendPeriod', () => {
  it('extends yearly trend periods through 2026 when that year is available', () => {
    expect(
      buildChallengeEntityAnalysisTrendPeriod({
        periodType: 'YEAR',
        selectedYear: 2026,
      }),
    ).toEqual({
      type: 'YEAR',
      selection: {
        interval: {
          start: '2016',
          end: '2026',
        },
      },
    })
  })
})

describe('challengeEntitySubordinateRankingQueryOptions', () => {
  it('uses the redesign ranking adapter with the selected period', async () => {
    fetchRedesignEntitySubordinateRankingMock.mockResolvedValue({
      nodes: [],
      pageInfo: {
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
    const reportPeriod = {
      type: 'QUARTER',
      selection: { interval: { start: '2025-Q2', end: '2025-Q2' } },
    } as const
    const options = challengeEntitySubordinateRankingQueryOptions({
      entityCui: '4270740',
      reportPeriod,
      normalizationOptions: {
        currency: 'RON',
        inflation_adjusted: false,
      },
    })

    await options.queryFn!({} as never)

    expect(fetchRedesignEntitySubordinateRankingMock).toHaveBeenCalledWith({
      entityCui: '4270740',
      reportPeriod,
      normalizationOptions: {
        currency: 'RON',
        inflation_adjusted: false,
      },
    })
  })

  it('does not enable an empty entity CUI', () => {
    const options = challengeEntitySubordinateRankingQueryOptions({
      entityCui: '',
      reportPeriod: {
        type: 'YEAR',
        selection: { interval: { start: '2025', end: '2025' } },
      },
      normalizationOptions: {
        currency: 'RON',
        inflation_adjusted: false,
      },
    })

    expect(options.enabled).toBe(false)
  })
})
