import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { entitySearchSchema } from '@/components/entities/validation'
import { ViewLoading } from '@/components/ui/ViewLoading'
import {
  buildEntityPageLoaderPayload,
  getEntityPageQueryPlan,
  readEntityPageRequestOrigin,
  runEntityPageBlockingBootstrap,
  type EntityPageExecutionContext,
  type EntityPageLoaderPayload,
} from '@/features/entities/page-core'
import { resolveEntitiesEntityRouteAdapter } from '@/features/entities/page-core/route-adapters/entities-entity-route-adapter'
import {
  buildEntityRouteHead,
  type EntitySeoSnapshot,
} from '@/features/entities/seo/entity-share-seo'
import { geoJsonQueryOptions } from '@/hooks/useGeoJson'
import { heatmapJudetQueryOptions, heatmapUATQueryOptions } from '@/hooks/useHeatmapData'
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from '@/lib/analytics-defaults'
import { getTopFunctionalGroupCodes } from '@/lib/analytics-utils'
import { getChartAnalytics } from '@/lib/api/charts'
import type { EntityDetailsData, ExecutionLineItem } from '@/lib/api/entities'
import { prepareFilterForServer, withDefaultExcludes } from '@/lib/filterUtils'
import {
  parseBooleanParam,
  parseCurrencyParam,
  resolveNormalizationSettings,
} from '@/lib/globalSettings/params'
import { entityDetailsQueryOptions } from '@/lib/hooks/useEntityDetails'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { readClientCurrencyPreference, readClientInflationAdjustedPreference } from '@/lib/user-preferences'
import { generateHash } from '@/lib/utils'
import {
  AnalyticsFilterType,
  AnalyticsInput,
  defaultYearRange,
} from '@/schemas/charts'
import {
  getInitialFilterState,
  makeTrendPeriod,
  toExecutionReportType,
  toReportTypeValue,
} from '@/schemas/reporting'

export type EntitySearchSchema = z.infer<typeof entitySearchSchema>

type EntityPageBootstrapPayload = {
  readonly executionContext: EntityPageExecutionContext
  readonly exactQueryInputs: ReturnType<
    typeof resolveEntitiesEntityRouteAdapter
  >['exactQueryInputs']
  readonly queryPlan: ReturnType<typeof getEntityPageQueryPlan>
  readonly loaderPayload: EntityPageLoaderPayload
}

type EntityRouteLoaderData = {
  readonly entityPageBootstrap: EntityPageBootstrapPayload
  readonly entityPageLoaderPayload: EntityPageLoaderPayload
  readonly ssrParams: Parameters<typeof entityDetailsQueryOptions>[0]
  readonly ssrSettings: {
    readonly currency: 'RON' | 'EUR' | 'USD'
    readonly inflationAdjusted: boolean
  }
  readonly forcedOverrides: ReturnType<typeof resolveNormalizationSettings>['forcedOverrides']
  readonly entitySeoSnapshot: EntitySeoSnapshot
  readonly requestSiteUrl?: string
}

const ENTITY_DETAILS_STEP_ID = 'entity-details' as const
const MAP_GEOJSON_WARMUP_STEP_ID = 'map-geojson-warmup' as const
const MAP_HEATMAP_WARMUP_STEP_ID = 'map-heatmap-warmup' as const
const INCOME_TRENDS_CHART_WARMUP_STEP_ID = 'income-trends-chart-warmup' as const
const EXPENSE_TRENDS_CHART_WARMUP_STEP_ID = 'expense-trends-chart-warmup' as const

function hasPlannedStep(
  steps: readonly { id: string }[],
  stepId: string,
): boolean {
  return steps.some((step) => step.id === stepId)
}

function resolveEffectiveEntitiesPublicSettings(
  cui: string,
  search: EntitySearchSchema,
): {
  readonly adapter: ReturnType<typeof resolveEntitiesEntityRouteAdapter>
  readonly forcedOverrides: ReturnType<typeof resolveNormalizationSettings>['forcedOverrides']
  readonly ssrSettings: EntityRouteLoaderData['ssrSettings']
} {
  const adapter = resolveEntitiesEntityRouteAdapter({
    cui,
    search,
  })
  const normalizationRaw = adapter.normalizedSearch.normalization
  const { forcedOverrides } = resolveNormalizationSettings(normalizationRaw)
  const isClient = typeof globalThis.window !== 'undefined'
  const clientCurrency = isClient ? readClientCurrencyPreference() : null
  const clientInflationAdjusted = isClient
    ? readClientInflationAdjustedPreference()
    : null
  const currency =
    forcedOverrides.currency
    ?? parseCurrencyParam(search.currency)
    ?? clientCurrency
    ?? adapter.urlPublicSettings.currency
  const inflationAdjusted =
    forcedOverrides.inflationAdjusted
    ?? parseBooleanParam(
      (search as { inflation_adjusted?: unknown }).inflation_adjusted,
    )
    ?? clientInflationAdjusted
    ?? adapter.urlPublicSettings.inflationAdjusted
  const publicSettings = {
    ...adapter.urlPublicSettings,
    currency,
    inflationAdjusted,
  }

  return {
    adapter: resolveEntitiesEntityRouteAdapter({
      cui,
      search,
      publicSettingsOverride: publicSettings,
    }),
    forcedOverrides,
    ssrSettings: {
      currency,
      inflationAdjusted,
    },
  }
}

function resolveEntitiesExecutionContext(
  cui: string,
  search: EntitySearchSchema,
): {
  readonly adapter: ReturnType<typeof resolveEntitiesEntityRouteAdapter>
  readonly executionContext: EntityPageExecutionContext
  readonly ssrSettings: EntityRouteLoaderData['ssrSettings']
  readonly forcedOverrides: EntityRouteLoaderData['forcedOverrides']
} {
  const { adapter, ssrSettings, forcedOverrides } =
    resolveEffectiveEntitiesPublicSettings(cui, search)

  return {
    adapter,
    executionContext: adapter.executionContext,
    ssrSettings,
    forcedOverrides,
  }
}

function createEntityPageBootstrapPayload(
  adapter: ReturnType<typeof resolveEntitiesEntityRouteAdapter>,
  loaderPayload: EntityPageLoaderPayload,
): EntityPageBootstrapPayload {
  return {
    executionContext: adapter.executionContext,
    exactQueryInputs: adapter.exactQueryInputs,
    queryPlan: getEntityPageQueryPlan({
      context: adapter.executionContext,
    }),
    loaderPayload,
  }
}

function resolveMapViewType(entity: EntityDetailsData): 'County' | 'UAT' {
  return entity.entity_type === 'admin_county_council' || entity.cui === '4267117'
    ? 'County'
    : 'UAT'
}

function warmTrendCharts({
  entity,
  executionContext,
  queryClient,
  queryPlan,
}: {
  readonly entity: EntityDetailsData
  readonly executionContext: EntityPageExecutionContext
  readonly queryClient: {
    prefetchQuery: (options: Record<string, unknown>) => Promise<unknown>
  }
  readonly queryPlan: EntityPageBootstrapPayload['queryPlan']
}): void {
  let accountCategory: 'vn' | 'ch' | undefined

  if (
    hasPlannedStep(
      queryPlan.backgroundPrefetch,
      INCOME_TRENDS_CHART_WARMUP_STEP_ID,
    )
  ) {
    accountCategory = 'vn'
  } else if (
    hasPlannedStep(
      queryPlan.backgroundPrefetch,
      EXPENSE_TRENDS_CHART_WARMUP_STEP_ID,
    )
  ) {
    accountCategory = 'ch'
  }

  if (!accountCategory) {
    return
  }

  const topGroups = getTopFunctionalGroupCodes(
    (entity.executionLineItems?.nodes ?? []).filter(
      (lineItem) => lineItem.account_category === accountCategory,
    ) as ExecutionLineItem[],
    10,
  )

  if (topGroups.length === 0) {
    return
  }

  const defaultExclude =
    accountCategory === 'ch'
      ? { economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES] }
      : { functional_prefixes: [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES] }
  const inputs = topGroups.map((prefix) => ({
    seriesId: `${prefix}${executionContext.cui}-${accountCategory === 'vn' ? 'income' : 'expense'}`,
    filter: {
      entity_cuis: [executionContext.cui],
      functional_prefixes: [prefix],
      account_category: accountCategory,
      report_type: toReportTypeValue(
        toExecutionReportType(entity.default_report_type)
        ?? 'PRINCIPAL_AGGREGATED',
      ),
      normalization: executionContext.publicSettings.normalization,
      currency: executionContext.publicSettings.currency,
      inflation_adjusted: executionContext.publicSettings.inflationAdjusted,
      show_period_growth: executionContext.publicSettings.showPeriodGrowth,
      exclude: defaultExclude,
    },
  })) satisfies AnalyticsInput[]
  const trendPeriod = makeTrendPeriod(
    'YEAR',
    executionContext.year,
    defaultYearRange.start,
    defaultYearRange.end,
  )
  const preparedInputs = inputs.map((input) => ({
    ...input,
    filter: prepareFilterForServer(
      input.filter as unknown as AnalyticsFilterType,
      {
        period: trendPeriod,
      },
    ),
  }))
  const payloadHash = preparedInputs
    .slice()
    .sort((left, right) => left.seriesId.localeCompare(right.seriesId))
    .reduce(
      (hashSeed, input) =>
        hashSeed + input.seriesId + '::' + JSON.stringify(input.filter),
      '',
    )

  void queryClient.prefetchQuery({
    queryKey: ['chart-data', generateHash(payloadHash)],
    queryFn: () => getChartAnalytics(preparedInputs),
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 3,
  })
}

function warmMapResources({
  entity,
  executionContext,
  queryClient,
  queryPlan,
  search,
}: {
  readonly entity: EntityDetailsData
  readonly executionContext: EntityPageExecutionContext
  readonly queryClient: {
    prefetchQuery: (options: Record<string, unknown>) => Promise<unknown>
  }
  readonly queryPlan: EntityPageBootstrapPayload['queryPlan']
  readonly search: EntitySearchSchema
}): void {
  if (typeof window === 'undefined' || !entity.is_uat) {
    return
  }

  const shouldWarmGeoJson = hasPlannedStep(
    queryPlan.clientOnly,
    MAP_GEOJSON_WARMUP_STEP_ID,
  )
  const shouldWarmHeatmap = hasPlannedStep(
    queryPlan.clientOnly,
    MAP_HEATMAP_WARMUP_STEP_ID,
  )

  if (!shouldWarmGeoJson && !shouldWarmHeatmap) {
    return
  }

  const mapViewType = resolveMapViewType(entity)

  if (shouldWarmGeoJson) {
    void queryClient.prefetchQuery(geoJsonQueryOptions(mapViewType))
  }

  if (!shouldWarmHeatmap) {
    return
  }

  const filters =
    (search.mapFilters as AnalyticsFilterType | undefined)
    ?? withDefaultExcludes({
      account_category: 'ch',
      normalization: 'per_capita',
      currency: executionContext.publicSettings.currency,
      inflation_adjusted: executionContext.publicSettings.inflationAdjusted,
      report_period: getInitialFilterState('YEAR', executionContext.year, '12', 'Q4'),
    })

  void queryClient.prefetchQuery(
    mapViewType === 'UAT'
      ? heatmapUATQueryOptions(filters)
      : heatmapJudetQueryOptions(filters),
  )
}

export const Route = createFileRoute('/entities/$cui')({
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 86400,
    }),
  validateSearch: entitySearchSchema,
  head: ({ params, match }: any) =>
    buildEntityRouteHead({
      routeId: 'entities',
      cui: params.cui,
      snapshot: (match.loaderData as EntityRouteLoaderData | undefined)?.entitySeoSnapshot,
      searchLang: (match.search as EntitySearchSchema | undefined)?.lang,
      siteUrl: (match.loaderData as EntityRouteLoaderData | undefined)?.requestSiteUrl,
    }),
  loader: (async ({ context, params, location }: any) => {
    const queryClient = context.queryClient
    const requestSiteUrl = await readEntityPageRequestOrigin()
    const search = entitySearchSchema.parse(location.search)
    const { adapter, executionContext, ssrSettings, forcedOverrides } =
      resolveEntitiesExecutionContext(params.cui, search)
    const queryPlan = getEntityPageQueryPlan({
      context: executionContext,
    })
    const blockingQueryIds = hasPlannedStep(queryPlan.blocking, ENTITY_DETAILS_STEP_ID)
      ? ['entityDetails' as const]
      : []
    const baseLoaderPayload = buildEntityPageLoaderPayload({
      executionContext,
      exactQueryInputs: adapter.exactQueryInputs,
      requestSiteUrl,
    })

    let entityPageBootstrap = createEntityPageBootstrapPayload(
      adapter,
      baseLoaderPayload,
    )

    try {
      const bootstrapResult = await runEntityPageBlockingBootstrap({
        queryClient,
        executionContext,
        exactQueryInputs: adapter.exactQueryInputs,
        requestSiteUrl,
        blockingQueryIds,
      })
      entityPageBootstrap = createEntityPageBootstrapPayload(
        adapter,
        bootstrapResult.payload,
      )

      if (!bootstrapResult.entityDetails) {
        return {
          entityPageBootstrap,
          entityPageLoaderPayload: bootstrapResult.payload,
          ssrParams: bootstrapResult.payload.ssrEntityDetailsParams,
          ssrSettings,
          forcedOverrides,
          entitySeoSnapshot: bootstrapResult.payload.entitySeoSnapshot,
          requestSiteUrl,
        } satisfies EntityRouteLoaderData
      }

      warmTrendCharts({
        entity: bootstrapResult.entityDetails,
        executionContext,
        queryClient,
        queryPlan: entityPageBootstrap.queryPlan,
      })
      warmMapResources({
        entity: bootstrapResult.entityDetails,
        executionContext,
        queryClient,
        queryPlan: entityPageBootstrap.queryPlan,
        search,
      })

      return {
        entityPageBootstrap,
        entityPageLoaderPayload: bootstrapResult.payload,
        ssrParams: bootstrapResult.payload.ssrEntityDetailsParams,
        ssrSettings,
        forcedOverrides,
        entitySeoSnapshot: bootstrapResult.payload.entitySeoSnapshot,
        requestSiteUrl,
      } satisfies EntityRouteLoaderData
    } catch (error) {
      if (!import.meta.env.DEV) {
        throw error
      }

      console.warn('[entities/$cui] SSR entity prefetch failed', {
        cui: params.cui,
        error,
      })

      return {
        entityPageBootstrap,
        entityPageLoaderPayload: entityPageBootstrap.loaderPayload,
        ssrParams: entityPageBootstrap.loaderPayload.ssrEntityDetailsParams,
        ssrSettings,
        forcedOverrides,
        entitySeoSnapshot: entityPageBootstrap.loaderPayload.entitySeoSnapshot,
        requestSiteUrl,
      } satisfies EntityRouteLoaderData
    }
  }) as any,
  pendingComponent: ViewLoading,
  component: () => null,
})
