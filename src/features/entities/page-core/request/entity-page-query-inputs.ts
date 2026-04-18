import { defaultYearRange } from '@/schemas/charts'
import { getInitialFilterState, makeTrendPeriod, toExecutionReportType } from '@/schemas/reporting'
import type { EntityPageExactQueryInputs, EntityPageExecutionContext } from '../types'

export type ResolveEntityPageQueryInputsInput = {
  readonly context: EntityPageExecutionContext
}

// Implemented as part of the shared exact query-input contract.
export function resolveEntityPageQueryInputs(
  input: ResolveEntityPageQueryInputsInput,
): EntityPageExactQueryInputs {
  const { context } = input
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
  const reportType = toExecutionReportType(context.effectiveReportType ?? context.reportType)
  const sharedExecutionInput = {
    cui: context.cui,
    reportPeriod,
    reportType,
    mainCreditorCui: context.mainCreditorCui,
    normalization: context.publicSettings.normalization,
    currency: context.publicSettings.currency,
    inflation_adjusted: context.publicSettings.inflationAdjusted,
  } as const

  return {
    entityDetails: {
      ...sharedExecutionInput,
      trendPeriod,
      show_period_growth: context.publicSettings.showPeriodGrowth,
    },
    entityExecutionLineItems: {
      ...sharedExecutionInput,
    },
  }
}
