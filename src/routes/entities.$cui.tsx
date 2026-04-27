import { createFileRoute } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { entitySearchSchema } from '@/components/entities/validation'
import { ViewLoading } from '@/components/ui/ViewLoading'
import {
  buildEntityPageLoaderPayload,
  getEntityPageQueryPlan,
  readEntityPageRequestOrigin,
  resolveEntityPageQueryInputs,
  runEntityPageBlockingBootstrap,
  type EntityPageBlockingQueryId,
  type EntityPageExecutionContext,
  type EntityPageLoaderPayload,
} from '@/features/entities/page-core'
import { resolveEntityPageRouteHeadContract } from '@/features/entities/page-core/seo/entity-page-route-policy'
import { resolveEntitiesEntityRouteAdapter } from '@/features/entities/page-core/route-adapters/entities-entity-route-adapter'
import { buildEntityRouteHead } from '@/features/entities/seo/entity-share-seo'
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
  readonly initialSettings: {
    readonly currency: 'RON' | 'EUR' | 'USD'
    readonly inflationAdjusted: boolean
  }
  readonly ssrSettings: {
    readonly currency: 'RON' | 'EUR' | 'USD'
    readonly inflationAdjusted: boolean
  }
  readonly forcedOverrides: ReturnType<typeof resolveNormalizationSettings>['forcedOverrides']
}

type EntitiesEntityRouteAdapter = ReturnType<typeof resolveEntitiesEntityRouteAdapter>

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

function resolveAdapterWithEffectiveReportType(
  adapter: EntitiesEntityRouteAdapter,
  effectiveReportType: EntityPageExecutionContext['effectiveReportType'],
): EntitiesEntityRouteAdapter {
  const executionContext: EntityPageExecutionContext = {
    ...adapter.executionContext,
    effectiveReportType,
  }

  return {
    ...adapter,
    executionContext,
    exactQueryInputs: resolveEntityPageQueryInputs({
      context: executionContext,
    }),
  }
}

function resolveMapViewType(entity: EntityDetailsData): 'County' | 'UAT' {
  return entity.entity_type === 'admin_county_council' || entity.cui === '4267117'
    ? 'County'
    : 'UAT'
}

function supportsMapWarmup(entity: EntityDetailsData): boolean {
  return Boolean(
    entity.is_uat ||
    entity.uat?.siruta_code != null ||
    entity.entity_type === 'admin_county_council' ||
    entity.cui === '4267117',
  )
}

function warmTrendCharts({
  entity,
  executionContext,
  queryClient,
  queryPlan,
}: {
  readonly entity: EntityDetailsData
  readonly executionContext: EntityPageExecutionContext
  readonly queryClient: QueryClient
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
  readonly queryClient: QueryClient
  readonly queryPlan: EntityPageBootstrapPayload['queryPlan']
  readonly search: EntitySearchSchema
}): void {
  if (typeof window === 'undefined' || !supportsMapWarmup(entity)) {
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

  if (mapViewType === 'UAT') {
    void queryClient.prefetchQuery(heatmapUATQueryOptions(filters))
    return
  }

  void queryClient.prefetchQuery(heatmapJudetQueryOptions(filters))
}

export const Route = createFileRoute('/entities/$cui')({
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 86400,
    }),
  validateSearch: entitySearchSchema,
  head: ({ params, match }) => {
    const loaderData = match.loaderData as EntityRouteLoaderData | undefined
    const loaderPayload = loaderData?.entityPageBootstrap?.loaderPayload

    return buildEntityRouteHead(resolveEntityPageRouteHeadContract({
      routeId: 'entities',
      cui: params.cui,
      seoSnapshot: loaderPayload?.entitySeoSnapshot,
      requestOrigin: loaderPayload?.requestSiteUrl,
      localeSearchContext: {
        lang: (match.search as EntitySearchSchema | undefined)?.lang,
      },
    }))
  },
  loader: async ({ context, params, location }) => {
    const queryClient = context.queryClient
    const requestSiteUrl = await readEntityPageRequestOrigin()
    const search = entitySearchSchema.parse(location.search)
    const { adapter, executionContext, ssrSettings, forcedOverrides } =
      resolveEntitiesExecutionContext(params.cui, search)
    const queryPlan = getEntityPageQueryPlan({
      context: executionContext,
    })
    const shouldResolveDefaultReportType =
      executionContext.reportType === undefined &&
      executionContext.effectiveReportType === undefined
    const blockingQueryIds: EntityPageBlockingQueryId[] =
      shouldResolveDefaultReportType
        ? ['entityDetails']
        : (
            hasPlannedStep(queryPlan.blocking, ENTITY_DETAILS_STEP_ID)
              ? ['entityDetails', 'entityExecutionLineItems']
              : ['entityExecutionLineItems']
          )
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
      let activeAdapter = adapter
      let bootstrapResult = await runEntityPageBlockingBootstrap({
        queryClient,
        executionContext,
        exactQueryInputs: adapter.exactQueryInputs,
        requestSiteUrl,
        blockingQueryIds,
      })
      const defaultExecutionReportType = toExecutionReportType(
        bootstrapResult.entityDetails?.default_report_type,
      )

      if (
        shouldResolveDefaultReportType &&
        defaultExecutionReportType !== undefined
      ) {
        activeAdapter = resolveAdapterWithEffectiveReportType(
          adapter,
          defaultExecutionReportType,
        )
        const effectiveQueryPlan = getEntityPageQueryPlan({
          context: activeAdapter.executionContext,
        })
        const effectiveBlockingQueryIds: EntityPageBlockingQueryId[] =
          hasPlannedStep(effectiveQueryPlan.blocking, ENTITY_DETAILS_STEP_ID)
            ? ['entityDetails', 'entityExecutionLineItems']
            : ['entityExecutionLineItems']

        bootstrapResult = await runEntityPageBlockingBootstrap({
          queryClient,
          executionContext: activeAdapter.executionContext,
          exactQueryInputs: activeAdapter.exactQueryInputs,
          requestSiteUrl,
          blockingQueryIds: effectiveBlockingQueryIds,
        })
      }

      entityPageBootstrap = createEntityPageBootstrapPayload(
        activeAdapter,
        bootstrapResult.payload,
      )

      if (!bootstrapResult.entityDetails) {
        return {
          entityPageBootstrap,
          initialSettings: ssrSettings,
          ssrSettings,
          forcedOverrides,
        } satisfies EntityRouteLoaderData
      }

      warmTrendCharts({
        entity: bootstrapResult.entityDetails,
        executionContext: activeAdapter.executionContext,
        queryClient,
        queryPlan: entityPageBootstrap.queryPlan,
      })
      warmMapResources({
        entity: bootstrapResult.entityDetails,
        executionContext: activeAdapter.executionContext,
        queryClient,
        queryPlan: entityPageBootstrap.queryPlan,
        search,
      })

      return {
        entityPageBootstrap,
        initialSettings: ssrSettings,
        ssrSettings,
        forcedOverrides,
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
        initialSettings: ssrSettings,
        ssrSettings,
        forcedOverrides,
      } satisfies EntityRouteLoaderData
    }
  },
  pendingComponent: ViewLoading,
  component: () => null,
})
