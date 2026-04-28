import { entityDetailsQueryOptions } from '@/lib/hooks/useEntityDetails'
import { defaultYearRange } from '@/schemas/charts'
import {
  getInitialFilterState,
  makeTrendPeriod,
  toExecutionReportType,
} from '@/schemas/reporting'
import type {
  EntityPageExecutionContext,
  EntityPageQueryPlan,
  EntityPageQueryPlanStep,
} from '../types'

export type GetEntityPageQueryPlanInput = {
  readonly context: EntityPageExecutionContext
}

const ENTITY_DETAILS_STEP_ID = 'entity-details' as const

function resolveEntityDetailsStep(
  context: EntityPageExecutionContext,
): EntityPageQueryPlanStep {
  const reportPeriod = getInitialFilterState(
    context.period,
    context.year,
    context.month ?? '01',
    context.quarter ?? 'Q1',
  )
  const trendPeriod = makeTrendPeriod(
    context.period,
    context.year,
    defaultYearRange.start,
    defaultYearRange.end,
  )
  const reportType =
    context.effectiveReportType ?? toExecutionReportType(context.reportType)

  const queryKey = entityDetailsQueryOptions({
    cui: context.cui,
    normalization: context.publicSettings.normalization,
    currency: context.publicSettings.currency,
    inflation_adjusted: context.publicSettings.inflationAdjusted,
    show_period_growth: context.publicSettings.showPeriodGrowth,
    reportPeriod,
    reportType,
    trendPeriod,
    mainCreditorCui: context.mainCreditorCui,
  }).queryKey

  return {
    id: ENTITY_DETAILS_STEP_ID,
    queryKey,
    executionClass: 'blocking',
  }
}

export function getEntityPageQueryPlan(
  input: GetEntityPageQueryPlanInput,
): EntityPageQueryPlan {
  const { context } = input

  return {
    blocking: [resolveEntityDetailsStep(context)],
    backgroundPrefetch: [],
    clientOnly: [],
  }
}
