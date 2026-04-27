import { t } from '@lingui/core/macro'
import type { MapEntitySelection } from '@/features/advanced-map-analytics/types/map-entity-selection'
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
  type ReportPeriodType,
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
  'PRINCIPAL_AGGREGATED' | 'SECONDARY_AGGREGATED' | 'DETAILED'
>

export type BudgetItemAnalyticsReportCopyVariant =
  | 'city-hall'
  | 'entity'

export type BudgetItemAnalyticsPageContext = {
  readonly entityCui: string
  readonly selectedYear: number
  readonly accountCategory: 'ch' | 'vn'
  readonly expenseType?: 'functionare' | 'dezvoltare'
  readonly reportType: BudgetItemAnalyticsReportType
  readonly reportCopyVariant?: BudgetItemAnalyticsReportCopyVariant
  readonly canChangeReportType?: boolean
  readonly canChangeNormalization?: boolean
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
  readonly onExpenseTypeChange?: (
    next?: 'functionare' | 'dezvoltare',
  ) => void
  readonly onYearChange?: (year: number) => void
  readonly onPeriodChange?: (label: string) => void
  readonly onEntityCuiChange?: (selection: MapEntitySelection) => void
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

function getReportPeriodAnchor(
  reportPeriod:
    | ReportPeriodInput
    | AnalyticsFilterType['report_period']
    | CommitmentsFilterType['report_period']
    | undefined,
): string | undefined {
  if (!reportPeriod) {
    return undefined
  }

  if ('interval' in reportPeriod.selection && reportPeriod.selection.interval) {
    const { start, end } = reportPeriod.selection.interval
    if (start === end) {
      return String(start)
    }

    return `${start} - ${end}`
  }

  const selectedDates = reportPeriod.selection.dates ?? []
  if (selectedDates.length === 1) {
    return String(selectedDates[0])
  }

  if (selectedDates.length > 1) {
    return selectedDates.map(String).join(', ')
  }

  return undefined
}

export function formatBudgetItemAnalyticsPeriodLabel(
  reportPeriod:
    | ReportPeriodInput
    | AnalyticsFilterType['report_period']
    | CommitmentsFilterType['report_period']
    | undefined,
): string | undefined {
  if (!reportPeriod) {
    return undefined
  }

  return getReportPeriodAnchor(reportPeriod)
}

function buildControlAllTimeframeLabel(
  startYear: number,
  periodType: ReportPeriodType,
  language: ChallengeLocale | undefined,
): string {
  const baseLabel = `${startYear}-${BUDGET_ITEM_ANALYTICS_CONTROL_END_YEAR}`
  const suffix =
    language === 'en'
      ? periodType === 'MONTH'
        ? 'monthly'
        : periodType === 'QUARTER'
          ? 'quarterly'
          : 'yearly'
      : periodType === 'MONTH'
        ? 'lunar'
        : periodType === 'QUARTER'
          ? 'trimestrial'
          : 'anual'

  return `${baseLabel} ${suffix}`
}

function buildAllTimeframePeriod(
  startYear: number,
  periodType: ReportPeriodType,
): ReportPeriodInput {
  if (periodType === 'QUARTER') {
    return {
      type: 'QUARTER',
      selection: {
        interval: {
          start: `${startYear}-Q1`,
          end: `${BUDGET_ITEM_ANALYTICS_CONTROL_END_YEAR}-Q4`,
        },
      },
    } as ReportPeriodInput
  }

  if (periodType === 'MONTH') {
    return {
      type: 'MONTH',
      selection: {
        interval: {
          start: `${startYear}-01`,
          end: `${BUDGET_ITEM_ANALYTICS_CONTROL_END_YEAR}-12`,
        },
      },
    } as ReportPeriodInput
  }

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
    ...(context.accountCategory === 'ch' && context.expenseType
      ? { expense_types: [context.expenseType] }
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
    context.currentReportPeriod.type,
  )
  const commitmentsAllTimeframePeriod = buildAllTimeframePeriod(
    defaultCommitmentsPeriodStartYear,
    context.currentReportPeriod.type,
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
      context.currentReportPeriod.type,
      context.language,
    ),
    commitmentsAllTimeframeLabel: buildControlAllTimeframeLabel(
      defaultCommitmentsPeriodStartYear,
      context.currentReportPeriod.type,
      context.language,
    ),
  }
}

export function getBudgetItemAnalyticsEmptyStateMessage() {
  return t`No data is available for this analytics view.`
}

export function getBudgetItemAnalyticsAllTimeframePeriod(
  tab: 'execution' | 'commitments',
  periodType: ReportPeriodType = 'YEAR',
) {
  return buildAllTimeframePeriod(
    tab === 'commitments'
      ? defaultCommitmentsPeriodStartYear
      : defaultExecutionPeriodStartYear,
    periodType,
  )
}
