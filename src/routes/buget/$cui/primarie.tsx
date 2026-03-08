import { createFileRoute } from '@tanstack/react-router'
import { applyMapRuntimeConfig } from '@/features/advanced-map-analytics/map-runtime-config'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/buget/seo/campaign-seo'
import type { CampaignRouteSearch } from '@/features/campaigns/buget/types'
import {
  ChallengeEntityAnalysisLoadingShell,
} from '@/features/challenges/components/analysis/challenge-entity-analysis-loading-shell'
import {
  CHALLENGE_TREND_PERIOD,
  buildChallengeEntityAnalysisReportPeriod,
  challengeEntitySubordinateRankingQueryOptions,
  type ChallengeEntityInitialSettings,
} from '@/features/challenges/components/analysis/challenge-entity-analysis-queries'
import {
  getChallengeEntityMapPreviewDefinition,
} from '@/features/challenges/components/analysis/challenge-entity-public-maps'
import { ChallengeEntityAnalysisRouteSearchSchema } from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import {
  normalizeChallengeEntityAnalysisSearch,
  type ChallengeEntityAnalysisRouteSearch,
} from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import { advancedMapAnalyticsSeriesDataQueryOptions } from '@/hooks/useAdvancedMapAnalyticsSeriesData'
import { geoJsonQueryOptions } from '@/hooks/useGeoJson'
import type { EntityDetailsData } from '@/lib/api/entities'
import {
  entityDetailsQueryOptions,
  entityExecutionLineItemsQueryOptions,
} from '@/lib/hooks/useEntityDetails'
import {
  DEFAULT_CURRENCY,
  DEFAULT_INFLATION_ADJUSTED,
  parseBooleanParam,
  parseCurrencyParam,
} from '@/lib/globalSettings/params'
import {
  readClientCurrencyPreference,
  readClientInflationAdjustedPreference,
} from '@/lib/user-preferences'
import { toReportTypeValue } from '@/schemas/reporting'

type PrimarieSearchWithGlobalSettings = ChallengeEntityAnalysisRouteSearch & {
  currency?: unknown
  inflation_adjusted?: unknown
}

function resolveChallengeEntityInitialSettings(
  search: PrimarieSearchWithGlobalSettings | undefined,
): ChallengeEntityInitialSettings {
  const urlCurrency = parseCurrencyParam(search?.currency)
  const urlInflation = parseBooleanParam(search?.inflation_adjusted)
  const persistedCurrency = readClientCurrencyPreference()
  const persistedInflationAdjusted = readClientInflationAdjustedPreference()

  return {
    currency: urlCurrency ?? persistedCurrency ?? DEFAULT_CURRENCY,
    inflationAdjusted:
      urlInflation ?? persistedInflationAdjusted ?? DEFAULT_INFLATION_ADJUSTED,
  }
}

export const Route = createFileRoute('/buget/$cui/primarie')({
  ssr: false,
  validateSearch: ChallengeEntityAnalysisRouteSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ match }) => {
    const locale = resolveCampaignLocale(match.search as CampaignRouteSearch)
    return buildCampaignRouteHead({
      pageKind: 'primarie',
      locale,
      entityCui: match.params.cui,
    })
  },
  loader: async ({ context, params, location }: any) => {
    const queryClient = context.queryClient
    const search = location.search as PrimarieSearchWithGlobalSettings | undefined
    const normalizedSearch = normalizeChallengeEntityAnalysisSearch(search)
    const initialSettings = resolveChallengeEntityInitialSettings(search)
    const reportPeriod = buildChallengeEntityAnalysisReportPeriod(
      normalizedSearch.year,
    )
    const queryNormalizationOptions = {
      normalization: normalizedSearch.normalization,
      show_period_growth: false,
      currency: initialSettings.currency,
      inflation_adjusted: initialSettings.inflationAdjusted,
    } as const

    const entityDetailsOptions = entityDetailsQueryOptions({
      cui: params.cui,
      reportPeriod,
      reportType: normalizedSearch.report_type,
      trendPeriod: CHALLENGE_TREND_PERIOD,
      ...queryNormalizationOptions,
    })
    const entityLineItemsOptions = entityExecutionLineItemsQueryOptions({
      cui: params.cui,
      reportPeriod,
      reportType: normalizedSearch.report_type,
      ...queryNormalizationOptions,
    })

    await Promise.all([
      queryClient.ensureQueryData(entityDetailsOptions),
      queryClient.ensureQueryData(entityLineItemsOptions),
    ])

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
        selectedYearOverride: normalizedSearch.year,
        reportTypeOverride: toReportTypeValue(normalizedSearch.report_type),
        normalizationOverride: normalizedSearch.normalization,
        currencyOverride: initialSettings.currency,
        inflationAdjustedOverride: initialSettings.inflationAdjusted,
        forceMapActiveView: true,
      },
    )

    void queryClient.prefetchQuery(
      challengeEntitySubordinateRankingQueryOptions({
        entityCui: params.cui,
        reportPeriod,
        normalizationOptions: {
          currency: initialSettings.currency,
          inflation_adjusted: initialSettings.inflationAdjusted,
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

    return {
      initialSettings,
    }
  },
  pendingComponent: ChallengeEntityAnalysisLoadingShell,
})
