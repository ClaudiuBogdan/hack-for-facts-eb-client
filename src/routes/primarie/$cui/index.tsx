import { createFileRoute, redirect } from '@tanstack/react-router'
import { applyMapRuntimeConfig } from '@/features/advanced-map-analytics/map-runtime-config'
import {
  ChallengeEntityAnalysisLoadingShell,
} from '@/features/challenges/components/analysis/challenge-entity-analysis-loading-shell'
import {
  challengeEntitySubordinateRankingQueryOptions,
  type ChallengeEntityInitialSettings,
} from '@/features/challenges/components/analysis/challenge-entity-analysis-queries'
import {
  getChallengeEntityMapPreviewDefinition,
} from '@/features/challenges/components/analysis/challenge-entity-public-maps'
import {
  ChallengeEntityAnalysisRouteSearchSchema,
  type ChallengeEntityAnalysisRouteSearch,
} from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import {
  buildEntityPageLoaderPayload,
  getEntityPageQueryPlan,
  readEntityPageRequestOrigin,
  runEntityPageBlockingBootstrap,
  type EntityPageBlockingQueryId,
  type EntityPageLoaderPayload,
} from '@/features/entities/page-core'
import { resolveEntityPageRouteHeadContract } from '@/features/entities/page-core/seo/entity-page-route-policy'
import { buildEntityRouteHead } from '@/features/entities/seo/entity-share-seo'
import {
  applyPrimarieEntityCanonicalSearchPatch,
  filterPrimarieEntityRedirectSearchPatch,
  hasPrimarieEntityCanonicalSearchPatch,
  resolvePrimarieEntityRouteAdapter,
} from '@/features/entities/page-core/route-adapters/primarie-entity-route-adapter'
import { advancedMapAnalyticsSeriesDataQueryOptions } from '@/hooks/useAdvancedMapAnalyticsSeriesData'
import { geoJsonQueryOptions } from '@/hooks/useGeoJson'
import type { EntityDetailsData } from '@/lib/api/entities'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { toReportTypeValue } from '@/schemas/reporting'

type PrimarieRouteAdapterResult = ReturnType<typeof resolvePrimarieEntityRouteAdapter>

type EntityPageBootstrapPayload = {
  readonly executionContext: PrimarieRouteAdapterResult['executionContext']
  readonly exactQueryInputs: PrimarieRouteAdapterResult['exactQueryInputs']
  readonly queryPlan: ReturnType<typeof getEntityPageQueryPlan>
  readonly loaderPayload: EntityPageLoaderPayload
}

type PrimarieLoaderData = {
  readonly entityPageBootstrap: EntityPageBootstrapPayload
  readonly initialSettings: ChallengeEntityInitialSettings
}

const ENTITY_DETAILS_STEP_ID = 'entity-details' as const

function createEntityPageBootstrapPayload(
  primarieRoute: PrimarieRouteAdapterResult,
  loaderPayload: EntityPageLoaderPayload,
): EntityPageBootstrapPayload {
  return {
    executionContext: primarieRoute.executionContext,
    exactQueryInputs: primarieRoute.exactQueryInputs,
    queryPlan: getEntityPageQueryPlan({
      context: primarieRoute.executionContext,
    }),
    loaderPayload,
  }
}

function resolveBlockingQueryIds(
  { queryPlan }: {
  readonly queryPlan: EntityPageBootstrapPayload['queryPlan']
}): readonly EntityPageBlockingQueryId[] {
  const blockingQueryIds: EntityPageBlockingQueryId[] = [
    'entityExecutionLineItems',
  ]

  if (queryPlan.blocking.some((step) => step.id === ENTITY_DETAILS_STEP_ID)) {
    blockingQueryIds.unshift('entityDetails')
  }

  return blockingQueryIds
}

function resolvePrimarieHeadLoaderPayload(
  loaderData: PrimarieLoaderData | undefined,
): EntityPageLoaderPayload | undefined {
  // Integration seam until page-core exports a shared head payload helper.
  return loaderData?.entityPageBootstrap.loaderPayload
}

export const Route = createFileRoute('/primarie/$cui/')({
  ssr: true,
  validateSearch: ChallengeEntityAnalysisRouteSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  beforeLoad: ({ params, search }) => {
    const primarieRoute = resolvePrimarieEntityRouteAdapter({
      cui: params.cui,
      search: search as ChallengeEntityAnalysisRouteSearch | undefined,
    })
    const redirectSearchPatch = filterPrimarieEntityRedirectSearchPatch(
      search as Record<string, unknown> | undefined,
      primarieRoute.canonicalSearchPatch,
    )

    if (!hasPrimarieEntityCanonicalSearchPatch(redirectSearchPatch)) {
      return
    }

    throw redirect({
      to: '/primarie/$cui',
      params,
      search: applyPrimarieEntityCanonicalSearchPatch(
        search as Record<string, unknown>,
        redirectSearchPatch,
      ),
      replace: true,
    })
  },
  head: ({ params, match }: { params: { cui: string }; match: { loaderData?: Record<string, unknown>; search?: Record<string, unknown> } }) => {
    const loaderPayload = resolvePrimarieHeadLoaderPayload(
      match.loaderData as PrimarieLoaderData | undefined,
    )

    return buildEntityRouteHead(resolveEntityPageRouteHeadContract({
      routeId: 'primarie',
      cui: params.cui,
      seoSnapshot: loaderPayload?.entitySeoSnapshot,
      requestOrigin: loaderPayload?.requestSiteUrl,
      localeSearchContext: {
        lang: (match.search as ChallengeEntityAnalysisRouteSearch | undefined)?.lang,
      },
    }))
  },
  loader: async ({ context, params, location }: { context: { queryClient: import('@tanstack/react-query').QueryClient }; params: { cui: string }; location: { search: unknown } }) => {
    const queryClient = context.queryClient
    const requestSiteUrl = await readEntityPageRequestOrigin()
    const primarieRoute = resolvePrimarieEntityRouteAdapter({
      cui: params.cui,
      search: location.search as ChallengeEntityAnalysisRouteSearch | undefined,
    })
    const { normalizedSearch, initialSettings, executionContext, exactQueryInputs } =
      primarieRoute
    const baseLoaderPayload: EntityPageLoaderPayload = buildEntityPageLoaderPayload({
      executionContext,
      exactQueryInputs,
      requestSiteUrl,
    })
    const initialEntityPageBootstrap = createEntityPageBootstrapPayload(
      primarieRoute,
      baseLoaderPayload,
    )
    const reportPeriod = exactQueryInputs.entityDetails.reportPeriod
    const bootstrapResult = await runEntityPageBlockingBootstrap({
      queryClient,
      executionContext,
      exactQueryInputs,
      requestSiteUrl,
      blockingQueryIds: resolveBlockingQueryIds({
        queryPlan: initialEntityPageBootstrap.queryPlan,
      }),
    })
    const entityPageBootstrap = createEntityPageBootstrapPayload(
      primarieRoute,
      bootstrapResult.payload,
    )
    const entity = bootstrapResult.entityDetails as EntityDetailsData | undefined
    const isCountyEntity =
      entity?.entity_type === 'admin_county_council' || entity?.cui === '4267117'
    const selectedMapPreviewDefinition = getChallengeEntityMapPreviewDefinition(
      normalizedSearch.public_map,
    )
    const runtimeMapState = applyMapRuntimeConfig(
      selectedMapPreviewDefinition.mapState,
      {
        reportPeriodOverride: reportPeriod,
        selectedYearOverride: normalizedSearch.year,
        reportTypeOverride: toReportTypeValue(normalizedSearch.report_type),
        normalizationOverride: normalizedSearch.normalization,
        currencyOverride: executionContext.publicSettings.currency,
        inflationAdjustedOverride: executionContext.publicSettings.inflationAdjusted,
        forceMapActiveView: true,
      },
    )

    if (typeof window !== 'undefined') {
      void queryClient.prefetchQuery(
        challengeEntitySubordinateRankingQueryOptions({
          entityCui: normalizedSearch.main_creditor_cui ?? params.cui,
          reportPeriod,
          normalizationOptions: {
            currency: executionContext.publicSettings.currency,
            inflation_adjusted: executionContext.publicSettings.inflationAdjusted,
          },
        }),
      )

      void queryClient.prefetchQuery(geoJsonQueryOptions('UAT'))

      if (isCountyEntity) {
        void queryClient.prefetchQuery(geoJsonQueryOptions('County'))
      }

      void queryClient.prefetchQuery(
        advancedMapAnalyticsSeriesDataQueryOptions({
          series: runtimeMapState.series,
        }),
      )
    }

    return {
      entityPageBootstrap,
      initialSettings,
    } satisfies PrimarieLoaderData
  },
  pendingComponent: ChallengeEntityAnalysisLoadingShell,
})
