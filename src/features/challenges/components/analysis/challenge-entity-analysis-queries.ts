import { queryOptions } from '@tanstack/react-query'

import {
  fetchRedesignEntitySubordinateRanking,
  type EntitySubordinateRankingConnection,
} from '@/lib/api/entity-ranking-redesign'
import type { Currency } from '@/schemas/charts'
import { defaultYearRange } from '@/schemas/charts'
import type { ForcedOverrides } from '@/lib/globalSettings/params'
import type { NormalizationOptions } from '@/lib/normalization'
import {
  getInitialFilterState,
  makeTrendPeriod,
  type ReportPeriodInput,
  type ReportPeriodType,
  type TMonth,
  type TQuarter,
} from '@/schemas/reporting'

export type ChallengeEntityInitialSettings = {
  currency: Currency
  inflationAdjusted: boolean
}

export type ChallengeEntityForcedSettings = ForcedOverrides

export type ChallengeEntityAnalysisPeriodSelection = {
  readonly periodType: ReportPeriodType
  readonly selectedYear: number
  readonly month: TMonth
  readonly quarter: TQuarter
}

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
  enabled?: boolean
}) {
  const { entityCui, reportPeriod, normalizationOptions, enabled = true } = params

  return queryOptions<EntitySubordinateRankingConnection>({
    queryKey: [
      'challenge-entity-subordinates',
      entityCui,
      reportPeriod,
      normalizationOptions.currency,
      normalizationOptions.inflation_adjusted,
    ],
    queryFn: () =>
      fetchRedesignEntitySubordinateRanking({
        entityCui,
        reportPeriod,
        normalizationOptions,
      }),
    enabled: enabled && entityCui.length > 0,
    staleTime: 1000 * 60 * 5,
  })
}
