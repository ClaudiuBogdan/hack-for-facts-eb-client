import { t } from '@lingui/core/macro'
import type {
  AnalyticsFilterType,
  CommitmentsFilterType,
  Currency,
} from '@/schemas/charts'
import {
  defaultCommitmentsPeriodStartYear,
  defaultExecutionPeriodStartYear,
} from '@/schemas/charts'
import {
  DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES,
  DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES,
} from '@/lib/analytics-defaults'
import type { ReportPeriodInput, GqlReportType } from '@/schemas/reporting'
import {
  makeTrendPeriod,
  toReportTypeValue,
} from '@/schemas/reporting'
import type { ChallengeLocale } from '../../types'
import {
  normalizeBudgetItemAnalyticsCode,
} from './budget-item-analytics-target'
import type {
  BudgetItemAnalyticsTimeframe,
  BudgetItemAnalyticsViewState,
} from './budget-item-analytics-search-state'

type BudgetItemAnalyticsReportType = Extract<
  GqlReportType,
  'PRINCIPAL_AGGREGATED' | 'DETAILED'
>

export type BudgetItemAnalyticsPageContext = {
  readonly entityCui: string
  readonly selectedYear: number
  readonly accountCategory: 'ch' | 'vn'
  readonly reportType: BudgetItemAnalyticsReportType
  readonly currentReportPeriod: ReportPeriodInput
  readonly historyReportPeriod?: ReportPeriodInput
  readonly normalization: 'total' | 'per_capita'
  readonly currency: Currency
  readonly inflationAdjusted: boolean
  readonly subjectLabel: string
  readonly language?: ChallengeLocale
  readonly functionalCode?: string
  readonly economicCode?: string
}

export type BudgetItemAnalyticsProps = {
  readonly context: BudgetItemAnalyticsPageContext
  readonly analyticsView: BudgetItemAnalyticsViewState
  readonly onAnalyticsViewChange?: (
    patch: Partial<BudgetItemAnalyticsViewState>,
  ) => void
  readonly onSelectionChange?: (
    selection: {
      functionalCode?: string
      economicCode?: string
    } | null,
  ) => void
  readonly onReportTypeChange?: (next: BudgetItemAnalyticsReportType) => void
  readonly onNormalizationChange?: (next: 'total' | 'per_capita') => void
  readonly onInflationAdjustedChange?: (next: boolean) => void
  readonly onYearChange?: (year: number) => void
  readonly onEntityCuiChange?: (entityCui: string) => void
  readonly className?: string
}

export type BudgetItemAnalyticsFilters = {
  readonly normalizedFunctionalCode?: string
  readonly normalizedEconomicCode?: string
  readonly executionChartFilter: AnalyticsFilterType
  readonly executionMapFilter: AnalyticsFilterType
  readonly commitmentsChartFilter: CommitmentsFilterType
  readonly commitmentsMapFilter: CommitmentsFilterType
  readonly executionAllTimeframePeriod: ReportPeriodInput
  readonly commitmentsAllTimeframePeriod: ReportPeriodInput
  readonly executionAllTimeframeLabel: string
  readonly commitmentsAllTimeframeLabel: string
}

const BUDGET_ITEM_ANALYTICS_CONTROL_END_YEAR = 2025

export { normalizeBudgetItemAnalyticsCode }

function buildControlAllTimeframeLabel(startYear: number): string {
  return `${startYear}-${BUDGET_ITEM_ANALYTICS_CONTROL_END_YEAR} total`
}

function buildAllTimeframePeriod(
  startYear: number,
): ReportPeriodInput {
  return makeTrendPeriod(
    'YEAR',
    BUDGET_ITEM_ANALYTICS_CONTROL_END_YEAR,
    startYear,
    BUDGET_ITEM_ANALYTICS_CONTROL_END_YEAR,
  ) as ReportPeriodInput
}

function buildExecutionReportPeriod(
  context: BudgetItemAnalyticsPageContext,
  timeframe: BudgetItemAnalyticsTimeframe,
  surface: 'chart' | 'map',
  allTimeframePeriod: ReportPeriodInput,
): ReportPeriodInput {
  if (surface === 'chart') {
    if (timeframe === 'all') {
      return allTimeframePeriod
    }

    return context.historyReportPeriod ?? allTimeframePeriod
  }

  return timeframe === 'all' ? allTimeframePeriod : context.currentReportPeriod
}

function buildCommitmentsReportPeriod(
  context: BudgetItemAnalyticsPageContext,
  timeframe: BudgetItemAnalyticsTimeframe,
  surface: 'chart' | 'map',
  allTimeframePeriod: ReportPeriodInput,
): ReportPeriodInput {
  if (surface === 'chart') {
    if (timeframe === 'all') {
      return allTimeframePeriod
    }

    return context.historyReportPeriod ?? allTimeframePeriod
  }

  return timeframe === 'all' ? allTimeframePeriod : context.currentReportPeriod
}

function buildBaseExecutionFilter(
  context: BudgetItemAnalyticsPageContext,
  normalizedFunctionalCode: string | undefined,
  normalizedEconomicCode: string | undefined,
): AnalyticsFilterType {
  return {
    account_category: context.accountCategory,
    report_period: context.currentReportPeriod,
    report_type: toReportTypeValue(context.reportType),
    normalization: context.normalization,
    currency: context.currency,
    inflation_adjusted: context.inflationAdjusted,
    show_period_growth: false,
    ...(normalizedFunctionalCode
      ? { functional_prefixes: [normalizedFunctionalCode] }
      : {}),
    ...(normalizedEconomicCode
      ? { economic_prefixes: [normalizedEconomicCode] }
      : {}),
    exclude:
      context.accountCategory === 'ch'
        ? {
            economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
          }
        : {
            functional_prefixes: [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES],
          },
  }
}

function buildBaseCommitmentsFilter(
  context: BudgetItemAnalyticsPageContext,
  normalizedFunctionalCode: string | undefined,
  normalizedEconomicCode: string | undefined,
): CommitmentsFilterType {
  return {
    report_period: context.currentReportPeriod,
    report_type: context.reportType,
    normalization: context.normalization,
    currency: context.currency,
    inflation_adjusted: context.inflationAdjusted,
    show_period_growth: false,
    ...(normalizedFunctionalCode
      ? { functional_prefixes: [normalizedFunctionalCode] }
      : {}),
    ...(normalizedEconomicCode
      ? { economic_prefixes: [normalizedEconomicCode] }
      : {}),
    exclude: {
      economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
    },
    exclude_transfers: true,
  }
}

export function buildBudgetItemAnalyticsFilters(
  context: Readonly<BudgetItemAnalyticsPageContext>,
  analyticsView: Readonly<BudgetItemAnalyticsViewState>,
): BudgetItemAnalyticsFilters {
  const normalizedFunctionalCode = normalizeBudgetItemAnalyticsCode(
    context.functionalCode,
  )
  const normalizedEconomicCode = normalizeBudgetItemAnalyticsCode(
    context.economicCode,
  )
  const executionBaseFilter = buildBaseExecutionFilter(
    context,
    normalizedFunctionalCode,
    normalizedEconomicCode,
  )
  const commitmentsBaseFilter = buildBaseCommitmentsFilter(
    context,
    normalizedFunctionalCode,
    normalizedEconomicCode,
  )
  const executionAllTimeframePeriod = buildAllTimeframePeriod(
    defaultExecutionPeriodStartYear,
  )
  const commitmentsAllTimeframePeriod = buildAllTimeframePeriod(
    defaultCommitmentsPeriodStartYear,
  )
  const executionChartPeriod = buildExecutionReportPeriod(
    context,
    analyticsView.timeframe,
    'chart',
    executionAllTimeframePeriod,
  )
  const executionMapPeriod = buildExecutionReportPeriod(
    context,
    analyticsView.timeframe,
    'map',
    executionAllTimeframePeriod,
  )
  const commitmentsChartPeriod = buildCommitmentsReportPeriod(
    context,
    analyticsView.timeframe,
    'chart',
    commitmentsAllTimeframePeriod,
  )
  const commitmentsMapPeriod = buildCommitmentsReportPeriod(
    context,
    analyticsView.timeframe,
    'map',
    commitmentsAllTimeframePeriod,
  )

  return {
    normalizedFunctionalCode,
    normalizedEconomicCode,
    executionChartFilter: {
      ...executionBaseFilter,
      entity_cuis: [context.entityCui],
      report_period: executionChartPeriod,
    },
    executionMapFilter: {
      ...executionBaseFilter,
      report_period: executionMapPeriod,
    },
    commitmentsChartFilter: {
      ...commitmentsBaseFilter,
      entity_cuis: [context.entityCui],
      report_period: commitmentsChartPeriod,
    },
    commitmentsMapFilter: {
      ...commitmentsBaseFilter,
      report_period: commitmentsMapPeriod,
    },
    executionAllTimeframePeriod,
    commitmentsAllTimeframePeriod,
    executionAllTimeframeLabel: buildControlAllTimeframeLabel(
      defaultExecutionPeriodStartYear,
    ),
    commitmentsAllTimeframeLabel: buildControlAllTimeframeLabel(
      defaultCommitmentsPeriodStartYear,
    ),
  }
}

export function getBudgetItemAnalyticsEmptyStateMessage() {
  return t`No data is available for this analytics view.`
}

export function getBudgetItemAnalyticsAllTimeframePeriod(
  tab: 'execution' | 'commitments',
) {
  return buildAllTimeframePeriod(
    tab === 'commitments'
      ? defaultCommitmentsPeriodStartYear
      : defaultExecutionPeriodStartYear,
  )
}
