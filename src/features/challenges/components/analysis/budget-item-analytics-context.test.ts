import { describe, expect, it } from 'vitest'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults'
import { toReportTypeValue } from '@/schemas/reporting'
import {
  buildBudgetItemAnalyticsFilters,
  getBudgetItemAnalyticsAllTimeframePeriod,
  type BudgetItemAnalyticsPageContext,
} from './budget-item-analytics-context'
import { buildBudgetItemAnalyticsViewState } from './budget-item-analytics-view-state'
import { getDefaultBudgetItemAnalyticsViewState } from './budget-item-analytics-search-state'

const CURRENT_REPORT_PERIOD = {
  type: 'YEAR',
  selection: {
    interval: {
      start: '2025',
      end: '2025',
    },
  },
} as const

const HISTORY_REPORT_PERIOD = {
  type: 'YEAR',
  selection: {
    interval: {
      start: '2018',
      end: '2025',
    },
  },
} as const

const defaultContext: BudgetItemAnalyticsPageContext = {
  entityCui: '12345678',
  selectedYear: 2025,
  accountCategory: 'ch',
  reportType: 'DETAILED',
  currentReportPeriod: CURRENT_REPORT_PERIOD,
  historyReportPeriod: HISTORY_REPORT_PERIOD,
  normalization: 'per_capita',
  currency: 'EUR',
  inflationAdjusted: true,
  subjectLabel: 'Salaries',
  language: 'en',
  functionalCode: '65.00',
  economicCode: '10.01.00',
}

describe('buildBudgetItemAnalyticsFilters', () => {
  it('builds selected-timeframe execution and commitments filters from raw analytics context', () => {
    const analyticsView = getDefaultBudgetItemAnalyticsViewState()
    const result = buildBudgetItemAnalyticsFilters(defaultContext, analyticsView)

    expect(result.normalizedFunctionalCode).toBe('65')
    expect(result.normalizedEconomicCode).toBe('10.01')
    expect(result.executionChartFilter).toMatchObject({
      entity_cuis: ['12345678'],
      account_category: 'ch',
      report_period: HISTORY_REPORT_PERIOD,
      report_type: toReportTypeValue('DETAILED'),
      normalization: 'per_capita',
      currency: 'EUR',
      inflation_adjusted: true,
      show_period_growth: false,
      functional_prefixes: ['65'],
      economic_prefixes: ['10.01'],
      exclude: {
        economic_prefixes: DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
      },
    })
    expect(result.executionMapFilter).toMatchObject({
      account_category: 'ch',
      report_period: CURRENT_REPORT_PERIOD,
      report_type: toReportTypeValue('DETAILED'),
      normalization: 'per_capita',
      currency: 'EUR',
      inflation_adjusted: true,
      show_period_growth: false,
      functional_prefixes: ['65'],
      economic_prefixes: ['10.01'],
      exclude: {
        economic_prefixes: DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
      },
    })
    expect(result.commitmentsChartFilter).toMatchObject({
      entity_cuis: ['12345678'],
      report_period: HISTORY_REPORT_PERIOD,
      report_type: 'DETAILED',
      normalization: 'per_capita',
      currency: 'EUR',
      inflation_adjusted: true,
      functional_prefixes: ['65'],
      economic_prefixes: ['10.01'],
      exclude_transfers: true,
      exclude: {
        economic_prefixes: DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
      },
    })
    expect(result.commitmentsMapFilter).toMatchObject({
      report_period: CURRENT_REPORT_PERIOD,
      report_type: 'DETAILED',
      exclude_transfers: true,
    })
  })

  it('uses the full all-timeframe period for chart and map filters in all mode', () => {
    const result = buildBudgetItemAnalyticsFilters(defaultContext, {
      ...getDefaultBudgetItemAnalyticsViewState(),
      timeframe: 'all',
    })

    expect(result.executionChartFilter.report_period).toEqual(
      getBudgetItemAnalyticsAllTimeframePeriod('execution'),
    )
    expect(result.executionMapFilter.report_period).toEqual(
      getBudgetItemAnalyticsAllTimeframePeriod('execution'),
    )
    expect(result.commitmentsChartFilter.report_period).toEqual(
      getBudgetItemAnalyticsAllTimeframePeriod('commitments'),
    )
    expect(result.commitmentsMapFilter.report_period).toEqual(
      getBudgetItemAnalyticsAllTimeframePeriod('commitments'),
    )
    expect(result.executionAllTimeframeLabel).toBe('2016-2025 total')
    expect(result.commitmentsAllTimeframeLabel).toBe('2019-2025 total')
  })

  it('keeps the all-timeframe period pinned to the hardcoded 2025 end year', () => {
    const result = buildBudgetItemAnalyticsFilters(
      {
        ...defaultContext,
        selectedYear: 2024,
        currentReportPeriod: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2024',
              end: '2024',
            },
          },
        },
      },
      {
        ...getDefaultBudgetItemAnalyticsViewState(),
        timeframe: 'all',
      },
    )

    expect(result.executionMapFilter.report_period).toEqual(
      getBudgetItemAnalyticsAllTimeframePeriod('execution'),
    )
    expect(result.commitmentsMapFilter.report_period).toEqual(
      getBudgetItemAnalyticsAllTimeframePeriod('commitments'),
    )
  })

  it('adds expense_types only to execution filters when an expense type is selected', () => {
    const result = buildBudgetItemAnalyticsFilters(
      {
        ...defaultContext,
        expenseType: 'dezvoltare',
      },
      getDefaultBudgetItemAnalyticsViewState(),
    )

    expect(result.executionChartFilter.expense_types).toEqual(['dezvoltare'])
    expect(result.executionMapFilter.expense_types).toEqual(['dezvoltare'])
    expect(result.commitmentsChartFilter).not.toHaveProperty('expense_types')
    expect(result.commitmentsMapFilter).not.toHaveProperty('expense_types')
  })

  it('omits fn/ec prefixes when no analytics codes are selected', () => {
    const result = buildBudgetItemAnalyticsFilters(
      {
        ...defaultContext,
        functionalCode: undefined,
        economicCode: undefined,
      },
      getDefaultBudgetItemAnalyticsViewState(),
    )

    expect(result.executionChartFilter).not.toHaveProperty('functional_prefixes')
    expect(result.executionChartFilter).not.toHaveProperty('economic_prefixes')
    expect(result.executionMapFilter).not.toHaveProperty('functional_prefixes')
    expect(result.executionMapFilter).not.toHaveProperty('economic_prefixes')
    expect(result.commitmentsChartFilter).not.toHaveProperty('functional_prefixes')
    expect(result.commitmentsChartFilter).not.toHaveProperty('economic_prefixes')
    expect(result.commitmentsMapFilter).not.toHaveProperty('functional_prefixes')
    expect(result.commitmentsMapFilter).not.toHaveProperty('economic_prefixes')
  })
})

describe('buildBudgetItemAnalyticsViewState', () => {
  it('derives execution chart and map state from the shared filter context and resolved title', () => {
    const filters = buildBudgetItemAnalyticsFilters(
      defaultContext,
      getDefaultBudgetItemAnalyticsViewState(),
    )
    const resolvedTitle =
      'Town Hall of Example · Education · Salary expenses in cash'
    const seriesLabel = 'Education · Salary expenses in cash'
    const context = buildBudgetItemAnalyticsViewState({
      resolvedTitle,
      seriesLabel,
      language: defaultContext.language,
      context: defaultContext,
      analyticsView: getDefaultBudgetItemAnalyticsViewState(),
      normalizedFunctionalCode: filters.normalizedFunctionalCode,
      normalizedEconomicCode: filters.normalizedEconomicCode,
      executionChartFilter: filters.executionChartFilter,
      executionMapFilter: filters.executionMapFilter,
      commitmentsChartFilter: filters.commitmentsChartFilter,
      commitmentsMapFilter: filters.commitmentsMapFilter,
    })

    expect(context.title).toBe('Analytics')
    expect(context.activeTab).toBe('execution')
    expect(context.chartSearch.chart.config).toMatchObject({
      chartType: 'line',
      showLegend: true,
      showTooltip: true,
      showGridLines: true,
      showDiffControl: false,
    })
    expect(context.chartSearch.chart.series[0]).toMatchObject({
      label: seriesLabel,
      enabled: true,
      filter: filters.executionChartFilter,
    })
    expect(context.chartSearch.chart.title).toBe(resolvedTitle)
    expect(context.mapTitle).toBe('Map (2025)')
    expect(context.mapStateDefinition).toMatchObject({
      mapName: `Map (2025): ${seriesLabel}`,
      activeView: 'map',
      activeSeriesId: context.mapStateDefinition.series[0]?.id,
      activeBinPresetId: context.mapStateDefinition.binsPresets[0]?.id,
    })
    expect(context.mapStateDefinition.binsPresets[0]).toMatchObject({
      label: seriesLabel,
      config: expect.objectContaining({
        title: seriesLabel,
      }),
    })
    expect(context.mapStateDefinition.series).toEqual([
      expect.objectContaining({
        type: 'line-items-aggregated-yearly',
        label: seriesLabel,
        filter: filters.executionMapFilter,
      }),
      expect.objectContaining({
        type: 'geojson-dataset-series',
        label: 'Population',
        unit: 'inhabitants',
      }),
    ])
    expect(context.subjectLabel).toBe(resolvedTitle)
    expect(context.mapDescription).toContain(`**${seriesLabel}**`)
    expect(context.mapDescription).not.toContain('Town Hall of Example')
    expect(context.mapDescription).toContain('fn:65')
    expect(context.mapDescription).toContain('ec:10.01')
  })

  it('includes the selected execution expense type in the map key and description', () => {
    const expenseContext: BudgetItemAnalyticsPageContext = {
      ...defaultContext,
      expenseType: 'functionare',
    }
    const filters = buildBudgetItemAnalyticsFilters(
      expenseContext,
      getDefaultBudgetItemAnalyticsViewState(),
    )
    const viewState = buildBudgetItemAnalyticsViewState({
      resolvedTitle: 'Town Hall of Example · Education',
      seriesLabel: 'Education',
      language: expenseContext.language,
      context: expenseContext,
      analyticsView: getDefaultBudgetItemAnalyticsViewState(),
      normalizedFunctionalCode: filters.normalizedFunctionalCode,
      normalizedEconomicCode: filters.normalizedEconomicCode,
      executionChartFilter: filters.executionChartFilter,
      executionMapFilter: filters.executionMapFilter,
      commitmentsChartFilter: filters.commitmentsChartFilter,
      commitmentsMapFilter: filters.commitmentsMapFilter,
    })

    expect(viewState.mapKey).toContain('functionare')
    expect(viewState.mapDescription).toContain('Expense type: Operations')
  })
})
