import { describe, expect, it } from 'vitest'
import type { AnalyticsFilterType } from '@/schemas/charts'
import type { GroupedChapter } from '@/schemas/financial'
import { generateChartFromTopGroups } from './chart-generation-utils'

const groups: GroupedChapter[] = [
  {
    prefix: '65',
    description: 'Education',
    totalAmount: 600,
    functionals: [],
  },
  {
    prefix: '66',
    description: 'Health',
    totalAmount: 300,
    functionals: [],
  },
  {
    prefix: '84',
    description: 'Transport',
    totalAmount: 100,
    functionals: [],
  },
]

const baseFilter = {
  account_category: 'ch',
  functional_prefixes: ['old-fn'],
  economic_prefixes: ['old-ec'],
} as AnalyticsFilterType

describe('generateChartFromTopGroups', () => {
  it('uses functional prefixes when grouping by fn', () => {
    const chart = generateChartFromTopGroups(
      groups,
      1000,
      baseFilter,
      'Expenses',
      'fn',
      'chart-fn'
    )
    const seriesOneFilter = chart.series[0]?.filter as AnalyticsFilterType
    const seriesTwoFilter = chart.series[1]?.filter as AnalyticsFilterType

    expect(chart.series).toHaveLength(2)
    expect(seriesOneFilter.functional_prefixes).toEqual(['65'])
    expect(seriesTwoFilter.functional_prefixes).toEqual(['66'])
    expect(seriesOneFilter.economic_prefixes).toBeUndefined()
    expect(seriesTwoFilter.economic_prefixes).toBeUndefined()
  })

  it('uses economic prefixes when grouping by ec', () => {
    const chart = generateChartFromTopGroups(
      groups,
      1000,
      baseFilter,
      'Expenses',
      'ec',
      'chart-ec'
    )
    const seriesOneFilter = chart.series[0]?.filter as AnalyticsFilterType
    const seriesTwoFilter = chart.series[1]?.filter as AnalyticsFilterType

    expect(chart.series).toHaveLength(2)
    expect(seriesOneFilter.economic_prefixes).toEqual(['65'])
    expect(seriesTwoFilter.economic_prefixes).toEqual(['66'])
    expect(seriesOneFilter.functional_prefixes).toBeUndefined()
    expect(seriesTwoFilter.functional_prefixes).toBeUndefined()
  })
})
