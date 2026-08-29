import { QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { toReportTypeValue } from '@/schemas/reporting'
import {
  CHALLENGE_LESSON_DEFAULT_CURRENCY,
  CHALLENGE_LESSON_REPORT_PERIOD,
  useChallengeLessonNationalAggregatedLineItems,
  useChallengeLessonSubordinateRanking,
} from './use-challenge-lesson-entity-data'

const fetchAggregatedLineItemsMock = vi.fn()
const fetchEntityAnalyticsMock = vi.fn()

vi.mock('@/lib/api/entity-analytics', () => ({
  fetchAggregatedLineItems: (...args: unknown[]) => fetchAggregatedLineItemsMock(...args),
}))

vi.mock('@/lib/api/entity-ranking-redesign', () => ({
  fetchRedesignEntitySubordinateRanking: (...args: unknown[]) =>
    fetchEntityAnalyticsMock(...args),
}))

describe('useChallengeLessonNationalAggregatedLineItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchAggregatedLineItemsMock.mockResolvedValue({
      nodes: [],
      pageInfo: {
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
    fetchEntityAnalyticsMock.mockResolvedValue({
      nodes: [],
      pageInfo: {
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
  })

  it('requests an all-UAT aggregated filter with lesson defaults', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    renderHook(
      () =>
        useChallengeLessonNationalAggregatedLineItems({
          accountCategory: 'ch',
          excludeEconomicPrefixes: ['51.01', '51.02'],
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(fetchAggregatedLineItemsMock).toHaveBeenCalledTimes(1)
    })

    expect(fetchAggregatedLineItemsMock).toHaveBeenCalledWith({
      filter: {
        account_category: 'ch',
        report_period: CHALLENGE_LESSON_REPORT_PERIOD,
        report_type: toReportTypeValue('PRINCIPAL_AGGREGATED'),
        normalization: 'total',
        currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
        inflation_adjusted: false,
        is_uat: true,
        exclude: {
          economic_prefixes: ['51.01', '51.02'],
        },
      },
      limit: 150000,
    })
  })

  it('requests 2025 subordinate rankings with lesson defaults', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    renderHook(
      () =>
        useChallengeLessonSubordinateRanking({
          entityCui: '12345678',
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(fetchEntityAnalyticsMock).toHaveBeenCalledTimes(1)
    })

    expect(fetchEntityAnalyticsMock).toHaveBeenCalledWith({
      entityCui: '12345678',
      reportPeriod: CHALLENGE_LESSON_REPORT_PERIOD,
      normalizationOptions: {
        currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
        inflation_adjusted: false,
      },
    })
  })
})
