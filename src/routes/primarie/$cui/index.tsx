import { createFileRoute, redirect } from '@tanstack/react-router'
import { createIsomorphicFn } from '@tanstack/react-start'
import { applyMapRuntimeConfig } from '@/features/advanced-map-analytics/map-runtime-config'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
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
import { ChallengeEntityAnalysisRouteSearchSchema } from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import type { ChallengeEntityAnalysisRouteSearch } from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import { advancedMapAnalyticsSeriesDataQueryOptions } from '@/hooks/useAdvancedMapAnalyticsSeriesData'
import { geoJsonQueryOptions } from '@/hooks/useGeoJson'
import type { EntityDetailsData } from '@/lib/api/entities'
import { buildEntityRouteHead, type EntitySeoSnapshot } from '@/features/entities/seo/entity-share-seo'
import {
  applyPrimarieEntityCanonicalSearchPatch,
  filterPrimarieEntityRedirectSearchPatch,
  hasPrimarieEntityCanonicalSearchPatch,
  resolvePrimarieEntityRouteAdapter,
} from '@/features/entities/page-core/route-adapters/primarie-entity-route-adapter'
import {
  entityDetailsQueryOptions,
  entityExecutionLineItemsQueryOptions,
} from '@/lib/hooks/useEntityDetails'
import { toReportTypeValue } from '@/schemas/reporting'

type PrimarieLoaderData = {
  initialSettings: ChallengeEntityInitialSettings
  entitySeoSnapshot: EntitySeoSnapshot
  ssrEntityDetailsParams: Parameters<typeof entityDetailsQueryOptions>[0]
  ssrEntityExecutionLineItemsParams?: Parameters<
    typeof entityExecutionLineItemsQueryOptions
  >[0]
  requestSiteUrl?: string
}

const readRequestOrigin = createIsomorphicFn()
  .client(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    return window.location.origin
  })
  .server(async (): Promise<string | undefined> => {
    const { getRequestUrl } = await import('@tanstack/react-start/server')
      return getRequestUrl().origin
  })

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
  head: ({ params, match }: any) =>
    buildEntityRouteHead({
      routeId: 'primarie',
      cui: params.cui,
      snapshot: (match.loaderData as PrimarieLoaderData | undefined)?.entitySeoSnapshot,
      searchLang: (match.search as ChallengeEntityAnalysisRouteSearch | undefined)?.lang,
      siteUrl: (match.loaderData as PrimarieLoaderData | undefined)?.requestSiteUrl,
    }),
  loader: async ({ context, params, location }: any) => {
    const queryClient = context.queryClient
    const requestSiteUrl = await readRequestOrigin()
    const primarieRoute = resolvePrimarieEntityRouteAdapter({
      cui: params.cui,
      search: location.search as ChallengeEntityAnalysisRouteSearch | undefined,
    })
    const { normalizedSearch, initialSettings, executionContext, exactQueryInputs } =
      primarieRoute
    const reportPeriod = exactQueryInputs.entityDetails.reportPeriod

    const entityDetailsOptions = entityDetailsQueryOptions(
      exactQueryInputs.entityDetails,
    )
    const entityLineItemsOptions = entityExecutionLineItemsQueryOptions(
      exactQueryInputs.entityExecutionLineItems!,
    )

    await Promise.all([
      queryClient.ensureQueryData(entityDetailsOptions),
      queryClient.ensureQueryData(entityLineItemsOptions),
    ])

    const entitySeoSnapshotBase: EntitySeoSnapshot = {
      cui: params.cui,
      filterContext: {
        year: normalizedSearch.year,
        period: normalizedSearch.period,
        month: normalizedSearch.month,
        quarter: normalizedSearch.quarter,
        reportType: normalizedSearch.report_type,
        mainCreditorCui: normalizedSearch.main_creditor_cui,
        normalization: executionContext.publicSettings.normalization,
        currency: executionContext.publicSettings.currency,
        inflationAdjusted: executionContext.publicSettings.inflationAdjusted,
        showPeriodGrowth: executionContext.publicSettings.showPeriodGrowth,
        lang: normalizedSearch.lang,
      },
    }
    const entity = queryClient.getQueryData(
      entityDetailsOptions.queryKey,
    ) as EntityDetailsData | undefined
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
    if (typeof window !== 'undefined') {
      void queryClient.prefetchQuery(geoJsonQueryOptions('UAT'))
      if (isCountyEntity) {
        void queryClient.prefetchQuery(geoJsonQueryOptions('County'))
      }
    }
    void queryClient.prefetchQuery(
      advancedMapAnalyticsSeriesDataQueryOptions({
        series: runtimeMapState.series,
      }),
    )

    return {
      initialSettings,
      entitySeoSnapshot: entity
        ? {
          ...entitySeoSnapshotBase,
          name: entity.name,
          entityType: entity.entity_type,
          defaultReportType: entity.default_report_type,
          countyName: entity.uat?.county_name,
          population: entity.uat?.population,
          totalIncome: entity.totalIncome,
          totalExpenses: entity.totalExpenses,
          budgetBalance: entity.budgetBalance,
        }
        : entitySeoSnapshotBase,
      ssrEntityDetailsParams: exactQueryInputs.entityDetails,
      ssrEntityExecutionLineItemsParams: exactQueryInputs.entityExecutionLineItems,
      requestSiteUrl,
    }
  },
  pendingComponent: ChallengeEntityAnalysisLoadingShell,
})
