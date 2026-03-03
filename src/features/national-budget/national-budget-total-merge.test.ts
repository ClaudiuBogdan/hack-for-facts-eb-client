import { describe, expect, it } from 'vitest'

import type { AnalyticsFilterType } from '@/schemas/charts'
import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'

import { buildTotalBudgetLineItemsFilter, mergeNationalBudgetSectionNodes } from './national-budget-total-merge'

const baseFilter: AnalyticsFilterType = {
  account_category: 'ch',
  report_period: {
    type: 'YEAR',
    selection: {
      interval: {
        start: '2025',
        end: '2025',
      },
    },
  },
  normalization: 'total',
  report_type: 'Executie bugetara agregata la nivel de ordonator principal',
  exclude: {
    county_codes: ['B'],
  },
}

describe('mergeNationalBudgetSectionNodes', () => {
  it('merges duplicate (fn, ec, names) nodes and preserves signed totals', () => {
    const sectionA: AggregatedNode[] = [
      { fn_c: '65', fn_n: 'Invatamant', ec_c: '10', ec_n: 'Personal', amount: 100, count: 2 },
      { fn_c: '66', fn_n: 'Sanatate', ec_c: '20', ec_n: 'Bunuri', amount: -40, count: 1 },
    ]
    const sectionB: AggregatedNode[] = [
      { fn_c: '65', fn_n: 'Invatamant', ec_c: '10', ec_n: 'Personal', amount: -30, count: 3 },
      { fn_c: '84', fn_n: 'Transporturi', ec_c: '71', ec_n: 'Investitii', amount: 25, count: 1 },
    ]

    const mergedNodes = mergeNationalBudgetSectionNodes([sectionA, sectionB])
    const education = mergedNodes.find((node) => node.fn_c === '65' && node.ec_c === '10')
    const health = mergedNodes.find((node) => node.fn_c === '66' && node.ec_c === '20')

    expect(mergedNodes).toHaveLength(3)
    expect(education?.amount).toBe(70)
    expect(education?.count).toBe(5)
    expect(health?.amount).toBe(-40)
  })
})

describe('buildTotalBudgetLineItemsFilter', () => {
  it('builds combined filter with unions and transfer exclusions in no-transfers mode', () => {
    const combinedFilter = buildTotalBudgetLineItemsFilter({
      baseFilter,
      transferFilter: 'no-transfers',
      sectionLineItemsFilters: [
        {
          ...baseFilter,
          budget_sector_ids: ['1'],
          funding_source_ids: ['1', '4'],
          exclude: {
            county_codes: ['B'],
            economic_prefixes: ['51.01'],
          },
        },
        {
          ...baseFilter,
          budget_sector_ids: ['2', '1'],
          funding_source_ids: ['6'],
          exclude: {
            county_codes: ['B'],
            functional_prefixes: ['43.09'],
            economic_prefixes: ['51.02'],
          },
        },
      ],
    })

    expect(combinedFilter.budget_sector_ids).toEqual(['1', '2'])
    expect(combinedFilter.funding_source_ids).toEqual(['1', '4', '6'])
    expect(combinedFilter.exclude).toEqual({
      county_codes: ['B'],
      economic_prefixes: ['51.01', '51.02'],
      functional_prefixes: ['43.09'],
    })
  })

  it('keeps funding sources unconstrained when any section is unconstrained', () => {
    const combinedFilter = buildTotalBudgetLineItemsFilter({
      baseFilter,
      transferFilter: 'no-transfers',
      sectionLineItemsFilters: [
        {
          ...baseFilter,
          budget_sector_ids: ['1'],
          funding_source_ids: ['1'],
          exclude: {
            county_codes: ['B'],
            economic_prefixes: ['51.01'],
          },
        },
        {
          ...baseFilter,
          budget_sector_ids: ['4'],
          funding_source_ids: undefined,
          exclude: {
            county_codes: ['B'],
          },
        },
      ],
    })

    expect(combinedFilter.budget_sector_ids).toEqual(['1', '4'])
    expect(combinedFilter.funding_source_ids).toBeUndefined()
  })

  it('keeps transfer prefixes out in all mode', () => {
    const combinedFilter = buildTotalBudgetLineItemsFilter({
      baseFilter,
      transferFilter: 'all',
      sectionLineItemsFilters: [
        {
          ...baseFilter,
          budget_sector_ids: ['1'],
          funding_source_ids: ['1'],
          exclude: {
            county_codes: ['B'],
            economic_prefixes: ['51.01'],
            functional_prefixes: ['04'],
          },
        },
      ],
    })

    expect(combinedFilter.exclude).toEqual({
      county_codes: ['B'],
      economic_prefixes: undefined,
      functional_prefixes: undefined,
    })
  })
})
