import { queryOptions } from '@tanstack/react-query'

import { fetchEntityAnalytics } from '@/lib/api/entity-analytics'
import type { EntityAnalyticsConnection } from '@/schemas/entity-analytics'
import type { Currency } from '@/schemas/charts'
import { DEFAULT_SELECTED_YEAR, defaultYearRange } from '@/schemas/charts'
import type { NormalizationOptions } from '@/lib/normalization'
import {
  makeSingleTimePeriod,
  makeTrendPeriod,
  toReportTypeValue,
  type DateInput,
  type ReportPeriodInput,
} from '@/schemas/reporting'

export type ChallengeEntityInitialSettings = {
  currency: Currency
  inflationAdjusted: boolean
}

export const CHALLENGE_TREND_PERIOD = makeTrendPeriod(
  'YEAR',
  DEFAULT_SELECTED_YEAR,
  defaultYearRange.start,
  DEFAULT_SELECTED_YEAR,
) as ReportPeriodInput

const CHALLENGE_DETAILED_ANALYTICS_REPORT_TYPE = toReportTypeValue('DETAILED')
const CHALLENGE_SHOW_PERIOD_GROWTH = false
const MAX_VISIBLE_SUBORDINATE_CARDS = 5

export function buildChallengeEntityAnalysisReportPeriod(
  selectedYear: number,
): ReportPeriodInput {
  return makeSingleTimePeriod(
    'YEAR',
    `${selectedYear}` as DateInput,
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
