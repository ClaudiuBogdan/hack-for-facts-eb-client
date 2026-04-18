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

const DEFAULT_ENTITY_PAGE_VIEW = 'overview' as const

const ENTITY_DETAILS_STEP_ID = 'entity-details' as const
const MAP_GEOJSON_WARMUP_STEP_ID = 'map-geojson-warmup' as const
const MAP_HEATMAP_WARMUP_STEP_ID = 'map-heatmap-warmup' as const
const INCOME_TRENDS_CHART_WARMUP_STEP_ID = 'income-trends-chart-warmup' as const
const EXPENSE_TRENDS_CHART_WARMUP_STEP_ID = 'expense-trends-chart-warmup' as const

function resolveActiveView(
  context: EntityPageExecutionContext,
): EntityPageExecutionContext['activeView'] | typeof DEFAULT_ENTITY_PAGE_VIEW {
  return context.activeView ?? DEFAULT_ENTITY_PAGE_VIEW
}

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

// Some warmup keys depend on bootstrap data that is not exposed in the current
// shared entity-page types yet (for example map view type, resolved map filters,
// or top trend groups). Keep those keys stable at the planner-contract level so
// a later executor can refine them once bootstrap is available.
function buildPlannerStepQueryKey(
  stepId: string,
  context: EntityPageExecutionContext,
): readonly unknown[] {
  const reportType =
    context.effectiveReportType ?? toExecutionReportType(context.reportType)

  return [
    'entityPageQueryPlan',
    stepId,
    context.routeId,
    context.cui,
    resolveActiveView(context),
    context.period,
    context.year,
    context.month ?? null,
    context.quarter ?? null,
    reportType ?? null,
    context.mainCreditorCui ?? null,
    context.publicSettings.normalization,
    context.publicSettings.currency,
    context.publicSettings.inflationAdjusted,
    context.publicSettings.showPeriodGrowth,
  ] as const
}

function resolveMapWarmupSteps(
  context: EntityPageExecutionContext,
): readonly EntityPageQueryPlanStep[] {
  if (resolveActiveView(context) !== 'map') {
    return []
  }

  return [
    {
      id: MAP_GEOJSON_WARMUP_STEP_ID,
      queryKey: buildPlannerStepQueryKey(MAP_GEOJSON_WARMUP_STEP_ID, context),
      executionClass: 'clientOnly',
      requiresEntityDetails: true,
    },
    {
      id: MAP_HEATMAP_WARMUP_STEP_ID,
      queryKey: buildPlannerStepQueryKey(MAP_HEATMAP_WARMUP_STEP_ID, context),
      executionClass: 'clientOnly',
      requiresEntityDetails: true,
    },
  ]
}

function resolveTrendWarmupSteps(
  context: EntityPageExecutionContext,
): readonly EntityPageQueryPlanStep[] {
  const activeView = resolveActiveView(context)

  if (activeView === 'income-trends') {
    return [
      {
        id: INCOME_TRENDS_CHART_WARMUP_STEP_ID,
        queryKey: buildPlannerStepQueryKey(
          INCOME_TRENDS_CHART_WARMUP_STEP_ID,
          context,
        ),
        executionClass: 'backgroundPrefetch',
        requiresEntityDetails: true,
      },
    ]
  }

  if (activeView === 'expense-trends') {
    return [
      {
        id: EXPENSE_TRENDS_CHART_WARMUP_STEP_ID,
        queryKey: buildPlannerStepQueryKey(
          EXPENSE_TRENDS_CHART_WARMUP_STEP_ID,
          context,
        ),
        executionClass: 'backgroundPrefetch',
        requiresEntityDetails: true,
      },
    ]
  }

  return []
}

export function getEntityPageQueryPlan(
  input: GetEntityPageQueryPlanInput,
): EntityPageQueryPlan {
  const { context } = input

  return {
    blocking: [resolveEntityDetailsStep(context)],
    backgroundPrefetch: resolveTrendWarmupSteps(context),
    clientOnly: resolveMapWarmupSteps(context),
  }
}
