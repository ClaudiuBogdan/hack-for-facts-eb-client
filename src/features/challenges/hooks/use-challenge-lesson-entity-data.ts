import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AnalyticsFilterType } from '@/schemas/charts'
import type { AnalyticsSeries, Currency } from '@/schemas/charts'
import type { EntityDetailsData, ExecutionLineItem } from '@/lib/api/entities'
import type { NormalizationOptions } from '@/lib/normalization'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES } from '@/lib/analytics-defaults'
import { fetchAggregatedLineItems } from '@/lib/api/entity-analytics'
import {
  buildChallengeEntityAnalysisReportPeriod,
  CHALLENGE_TREND_PERIOD,
  challengeEntitySubordinateRankingQueryOptions,
} from '@/features/challenges/components/analysis/challenge-entity-analysis-queries'
import {
  useEntityDetails,
  useEntityExecutionLineItems,
  useEntityRelationships,
} from '@/lib/hooks/useEntityDetails'
import type { GqlReportType } from '@/schemas/reporting'
import { toReportTypeValue } from '@/schemas/reporting'
import type {
  AggregatedLineItemConnection,
  EntityAnalyticsConnection,
} from '@/schemas/entity-analytics'
import type { ChallengeLocale } from '../types'

export const CHALLENGE_LESSON_YEAR = 2025
export const CHALLENGE_LESSON_REPORT_PERIOD =
  buildChallengeEntityAnalysisReportPeriod(CHALLENGE_LESSON_YEAR)
export const CHALLENGE_LESSON_DEFAULT_CURRENCY: Currency = 'RON'
export const CHALLENGE_LESSON_DEFAULT_REPORT_TYPE: Extract<
  GqlReportType,
  'PRINCIPAL_AGGREGATED' | 'DETAILED'
> = 'PRINCIPAL_AGGREGATED'

export type LessonReportType = Extract<
  GqlReportType,
  'PRINCIPAL_AGGREGATED' | 'DETAILED'
>

export type LessonMetricKey = 'income' | 'expenses'

export type LessonEntitySummaryTrend = {
  readonly currentValue: number | null | undefined
  readonly previousValue: number | null | undefined
}

const LESSON_BASE_NORMALIZATION_OPTIONS = {
  currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
  inflation_adjusted: false,
  show_period_growth: false,
} as const satisfies NormalizationOptions

export function buildLessonTrend(
  series: AnalyticsSeries | null | undefined,
): LessonEntitySummaryTrend | undefined {
  const seriesPoints = series?.data ?? []
  if (seriesPoints.length < 2) {
    return undefined
  }

  const currentPoint = seriesPoints[seriesPoints.length - 1]
  const previousPoint = seriesPoints[seriesPoints.length - 2]

  return {
    currentValue: currentPoint?.y,
    previousValue: previousPoint?.y,
  }
}

export function getLessonReportTypeLabel(
  reportType: LessonReportType,
  locale: ChallengeLocale,
): string {
  if (locale === 'en') {
    return reportType === 'DETAILED'
      ? 'Detailed budget execution'
      : 'Aggregated budget execution at main-creditor level'
  }

  return reportType === 'DETAILED'
    ? 'Execuție bugetară detaliată'
    : 'Execuție bugetară agregată la nivel de ordonator principal'
}

export function useChallengeLessonEntitySummary(params: {
  readonly entityCui: string
  readonly reportType?: LessonReportType
  readonly normalization?: 'total' | 'per_capita'
}) {
  const normalizationOptions = useMemo(
    () => ({
      ...LESSON_BASE_NORMALIZATION_OPTIONS,
      normalization: params.normalization ?? 'total',
    }),
    [params.normalization],
  )

  return useEntityDetails({
    cui: params.entityCui,
    reportPeriod: CHALLENGE_LESSON_REPORT_PERIOD,
    trendPeriod: CHALLENGE_TREND_PERIOD,
    reportType: params.reportType ?? CHALLENGE_LESSON_DEFAULT_REPORT_TYPE,
    ...normalizationOptions,
  })
}

export function useChallengeLessonExecutionLineItems(params: {
  readonly entityCui: string
  readonly reportType?: LessonReportType
  readonly normalization?: 'total' | 'per_capita'
  readonly enabled?: boolean
}) {
  const normalizationOptions = useMemo(
    () => ({
      ...LESSON_BASE_NORMALIZATION_OPTIONS,
      normalization: params.normalization ?? 'total',
    }),
    [params.normalization],
  )

  return useEntityExecutionLineItems({
    cui: params.entityCui,
    reportPeriod: CHALLENGE_LESSON_REPORT_PERIOD,
    reportType: params.reportType ?? CHALLENGE_LESSON_DEFAULT_REPORT_TYPE,
    enabled: params.enabled,
    ...normalizationOptions,
  })
}

export function useChallengeLessonEntityBundle(entityCui: string) {
  const totalSummaryQuery = useChallengeLessonEntitySummary({
    entityCui,
    reportType: 'PRINCIPAL_AGGREGATED',
    normalization: 'total',
  })
  const perCapitaSummaryQuery = useChallengeLessonEntitySummary({
    entityCui,
    reportType: 'PRINCIPAL_AGGREGATED',
    normalization: 'per_capita',
  })
  const lineItemsQuery = useChallengeLessonExecutionLineItems({
    entityCui,
    reportType: 'PRINCIPAL_AGGREGATED',
    normalization: 'total',
  })

  const summaryTrends = useMemo(
    () => ({
      income: buildLessonTrend(totalSummaryQuery.data?.incomeTrend),
      expenses: buildLessonTrend(totalSummaryQuery.data?.expenseTrend),
      balance: buildLessonTrend(totalSummaryQuery.data?.balanceTrend),
    }),
    [
      totalSummaryQuery.data?.balanceTrend,
      totalSummaryQuery.data?.expenseTrend,
      totalSummaryQuery.data?.incomeTrend,
    ],
  )

  return {
    selectedYear: CHALLENGE_LESSON_YEAR,
    reportPeriod: CHALLENGE_LESSON_REPORT_PERIOD,
    trendPeriod: CHALLENGE_TREND_PERIOD,
    aggregatedTotalSummaryQuery: totalSummaryQuery,
    aggregatedPerCapitaSummaryQuery: perCapitaSummaryQuery,
    aggregatedLineItemsQuery: lineItemsQuery,
    summaryTrends,
  }
}

export function useChallengeLessonNationalAggregatedLineItems(params?: {
  readonly accountCategory?: 'ch' | 'vn'
  readonly excludeEconomicPrefixes?: readonly string[]
  readonly excludeFunctionalPrefixes?: readonly string[]
  readonly enabled?: boolean
}) {
  const filter = useMemo<AnalyticsFilterType>(() => {
    const exclude: NonNullable<AnalyticsFilterType['exclude']> = {}
    const economicPrefixes = params?.excludeEconomicPrefixes ?? []
    const functionalPrefixes = params?.excludeFunctionalPrefixes ?? []

    if (economicPrefixes.length > 0) {
      exclude.economic_prefixes = [...economicPrefixes]
    }

    if (functionalPrefixes.length > 0) {
      exclude.functional_prefixes = [...functionalPrefixes]
    }

    return {
      account_category: params?.accountCategory ?? 'ch',
      report_period: CHALLENGE_LESSON_REPORT_PERIOD,
      report_type: toReportTypeValue(CHALLENGE_LESSON_DEFAULT_REPORT_TYPE),
      normalization: 'total',
      currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
      inflation_adjusted: false,
      is_uat: true,
      ...(Object.keys(exclude).length > 0 ? { exclude } : {}),
    }
  }, [
    params?.accountCategory,
    params?.excludeEconomicPrefixes,
    params?.excludeFunctionalPrefixes,
  ])

  return useQuery<AggregatedLineItemConnection>({
    queryKey: ['challenge-lesson-national-aggregated-line-items', filter],
    queryFn: () => fetchAggregatedLineItems({ filter, limit: 150000 }),
    staleTime: 1000 * 60 * 5,
    enabled: params?.enabled ?? true,
  })
}

export function useChallengeLessonSubordinateRanking(params: {
  readonly entityCui: string
  readonly enabled?: boolean
}) {
  const { entityCui, enabled = true } = params

  return useQuery<EntityAnalyticsConnection>({
    ...challengeEntitySubordinateRankingQueryOptions({
      entityCui,
      reportPeriod: CHALLENGE_LESSON_REPORT_PERIOD,
      normalizationOptions: {
        currency: CHALLENGE_LESSON_DEFAULT_CURRENCY,
        inflation_adjusted: false,
      },
    }),
    enabled: enabled && entityCui.length > 0,
    placeholderData: (previousData) => previousData,
  })
}

export function useChallengeLessonSubordinateInsights(params: {
  readonly entityCui: string
  readonly enabled?: boolean
}) {
  const { entityCui, enabled = true } = params
  const relationshipsQuery = useEntityRelationships({
    cui: entityCui,
    enabled,
  })
  const rankingQuery = useChallengeLessonSubordinateRanking({
    entityCui,
    enabled,
  })

  const children = relationshipsQuery.data?.children ?? []
  const rankingNodes = rankingQuery.data?.nodes ?? []
  const totalSubordinateCount =
    rankingQuery.data?.pageInfo?.totalCount ?? 0

  return {
    relationshipsQuery,
    rankingQuery,
    children,
    rankingNodes,
    totalSubordinateCount,
    hasLinkedSubordinates: children.length > 0,
  }
}

export const CHALLENGE_LESSON_DEFAULT_NATIONAL_EXPENSE_EXCLUSIONS =
  DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES

export function selectLessonMetricValue(
  metric: LessonMetricKey,
  entity: Pick<EntityDetailsData, 'totalIncome' | 'totalExpenses'> | null | undefined,
): number | null | undefined {
  return metric === 'income' ? entity?.totalIncome : entity?.totalExpenses
}

export function selectLessonMetricSeries(
  metric: LessonMetricKey,
  entity: Pick<EntityDetailsData, 'incomeTrend' | 'expenseTrend'> | null | undefined,
): AnalyticsSeries | null | undefined {
  return metric === 'income' ? entity?.incomeTrend : entity?.expenseTrend
}

export function filterLineItemsByAccountCategory(
  lineItems: readonly ExecutionLineItem[] | undefined,
  accountCategory: 'ch' | 'vn',
): readonly ExecutionLineItem[] {
  return (lineItems ?? []).filter(
    (lineItem) => lineItem.account_category === accountCategory,
  )
}
