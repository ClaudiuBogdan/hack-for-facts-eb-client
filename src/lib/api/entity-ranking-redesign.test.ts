import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
}))

import { graphqlQuery } from '@/lib/graphql/graphql-client'

import { fetchRedesignEntitySubordinateRanking } from './entity-ranking-redesign'

describe('fetchRedesignEntitySubordinateRanking', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries the redesign endpoint and maps ranked entities', async () => {
    vi.mocked(graphqlQuery).mockResolvedValue({
      budgetEntityRanking: [
        {
          entityCui: '123',
          entityName: 'Școala Exemplu',
          amount: '1250.50',
          perCapita: null,
          population: 500,
          countyCode: 'CJ',
          entity: {
            reference: {
              entityType: 'school',
              territory: { countyName: 'Cluj' },
            },
          },
        },
      ],
    })

    const result = await fetchRedesignEntitySubordinateRanking({
      entityCui: '4270740',
      reportPeriod: {
        type: 'QUARTER',
        selection: { interval: { start: '2025-Q3', end: '2025-Q3' } },
      },
      normalizationOptions: {
        currency: 'RON',
        inflation_adjusted: false,
      },
    })

    expect(graphqlQuery).toHaveBeenCalledWith(
      expect.stringContaining('query EntitySubordinateRanking'),
      {
        filter: {
          year: { eq: 2025 },
          frequency: { eq: 'QUARTER' },
          reportType: { eq: 'EXECUTION_DETAILED' },
          mainCreditorCui: { eq: '4270740' },
          exclude: { excludeEntityCuis: { in: ['4270740'] } },
          quarter: { eq: 3 },
        },
        normalization: 'TOTAL',
        limit: 5,
      },
      { operationName: 'entity-subordinate-ranking', auth: 'none' },
    )
    expect(result).toEqual({
      nodes: [
        {
          entity_cui: '123',
          entity_name: 'Școala Exemplu',
          entity_type: 'school',
          county_code: 'CJ',
          county_name: 'Cluj',
          population: 500,
          amount: 1250.5,
          total_amount: 1250.5,
          per_capita_amount: null,
        },
      ],
      pageInfo: {
        totalCount: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
  })

  it('rejects a multi-period ranking before dispatch', async () => {
    await expect(
      fetchRedesignEntitySubordinateRanking({
        entityCui: '4270740',
        reportPeriod: {
          type: 'YEAR',
          selection: { interval: { start: '2024', end: '2025' } },
        },
        normalizationOptions: {
          currency: 'RON',
          inflation_adjusted: false,
        },
      }),
    ).rejects.toThrow('requires one selected period')
    expect(graphqlQuery).not.toHaveBeenCalled()
  })

  it.each([
    { currency: 'USD' as const, inflation_adjusted: false },
    { currency: 'RON' as const, inflation_adjusted: true },
  ])('degrades unsupported normalization %# to TOTAL instead of failing', async (options) => {
    // The Chronos API has no CPI mode and no USD rate yet; the request must
    // still be dispatched (nominal RON) rather than take the panel down — the
    // entity page reports the degrade from the entity-details caveats.
    vi.mocked(graphqlQuery).mockResolvedValueOnce({ budgetEntityRanking: [] })
    await fetchRedesignEntitySubordinateRanking({
      entityCui: '4270740',
      reportPeriod: {
        type: 'YEAR',
        selection: { interval: { start: '2025', end: '2025' } },
      },
      normalizationOptions: options,
    })
    expect(graphqlQuery).toHaveBeenCalledTimes(1)
    expect(vi.mocked(graphqlQuery).mock.calls[0]?.[1]).toMatchObject({
      normalization: 'TOTAL',
    })
  })
})
