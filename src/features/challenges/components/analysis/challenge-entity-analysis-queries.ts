import { queryOptions } from '@tanstack/react-query'

import { fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import type { EntityAnalyticsConnection } from '@/schemas/entity-analytics'
import type { Currency } from '@/schemas/charts'
import { defaultYearRange } from '@/schemas/charts'
import type { NormalizationOptions } from '@/lib/normalization'
import {
  getInitialFilterState,
  makeTrendPeriod,
  toReportTypeValue,
  type ReportPeriodInput,
  type ReportPeriodType,
  type TMonth,
  type TQuarter,
} from '@/schemas/reporting'

export type ChallengeEntityInitialSettings = {
  currency: Currency
  inflationAdjusted: boolean
}

export type ChallengeEntityAnalysisPeriodSelection = {
  readonly periodType: ReportPeriodType
  readonly selectedYear: number
  readonly month: TMonth
  readonly quarter: TQuarter
}

const CHALLENGE_DETAILED_ANALYTICS_REPORT_TYPE = toReportTypeValue('DETAILED')
const CHALLENGE_SHOW_PERIOD_GROWTH = false
const MAX_VISIBLE_SUBORDINATE_CARDS = 5

export function buildChallengeEntityAnalysisReportPeriod(
  params: ChallengeEntityAnalysisPeriodSelection,
): ReportPeriodInput {
  return getInitialFilterState(
    params.periodType,
    params.selectedYear,
    params.month,
    params.quarter,
  ) as ReportPeriodInput
}

export function buildChallengeEntityAnalysisTrendPeriod(
  params: Pick<ChallengeEntityAnalysisPeriodSelection, 'periodType' | 'selectedYear'>,
): ReportPeriodInput {
  return makeTrendPeriod(
    params.periodType,
    params.selectedYear,
    defaultYearRange.start,
    defaultYearRange.end,
  ) as ReportPeriodInput
}

export function challengeEntitySubordinateRankingQueryOptions(params: {
  entityCui: string
  reportPeriod: ReportPeriodInput
  normalizationOptions: Pick<
    NormalizationOptions,
    'currency' | 'inflation_adjusted'
  >
}) {
  const { entityCui, reportPeriod, normalizationOptions } = params

  return queryOptions<EntityAnalyticsConnection>({
    queryKey: [
      'challenge-entity-subordinates',
      entityCui,
      reportPeriod,
      normalizationOptions.currency,
      normalizationOptions.inflation_adjusted,
    ],
    queryFn: () =>
      fetchEntityAnalytics({
        filter: {
          account_category: 'ch',
          main_creditor_cui: entityCui,
          report_period: reportPeriod,
          report_type: CHALLENGE_DETAILED_ANALYTICS_REPORT_TYPE,
          normalization: 'total',
          currency: normalizationOptions.currency,
          inflation_adjusted: normalizationOptions.inflation_adjusted,
          show_period_growth: CHALLENGE_SHOW_PERIOD_GROWTH,
          exclude: {
            entity_cuis: [entityCui],
          },
        },
        sort: {
          by: 'total_amount',
          order: 'desc',
        },
        limit: MAX_VISIBLE_SUBORDINATE_CARDS,
        offset: 0,
      }),
    enabled: entityCui.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}
