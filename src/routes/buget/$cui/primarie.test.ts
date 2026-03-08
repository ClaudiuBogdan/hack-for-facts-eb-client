import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const entityDetailsQueryOptionsMock = vi.fn()
const entityExecutionLineItemsQueryOptionsMock = vi.fn()
const reportsConnectionQueryOptionsMock = vi.fn()
const buildChallengeEntityAnalysisReportPeriodMock = vi.fn()
const challengeEntitySubordinateRankingQueryOptionsMock = vi.fn()
const getChallengeEntityMapPreviewDefinitionMock = vi.fn()
const applyMapRuntimeConfigMock = vi.fn()
const advancedMapAnalyticsSeriesDataQueryOptionsMock = vi.fn()
const geoJsonQueryOptionsMock = vi.fn()
const readClientCurrencyPreferenceMock = vi.fn()
const readClientInflationAdjustedPreferenceMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: vi.fn(() => ({})),
}))

vi.mock('@/features/campaigns/buget/schemas/campaign-route-search-schema', () => ({
  resolveCampaignLocale: vi.fn(() => 'ro'),
}))

vi.mock('@/features/campaigns/buget/seo/campaign-seo', () => ({
  buildCampaignRouteHead: vi.fn(() => ({ meta: [] })),
}))

vi.mock(
  '@/features/challenges/components/analysis/challenge-entity-analysis-loading-shell',
  () => ({
    ChallengeEntityAnalysisLoadingShell: () => null,
  }),
)

vi.mock(
  '@/features/challenges/components/analysis/challenge-entity-analysis-queries',
  () => ({
    CHALLENGE_TREND_PERIOD: { type: 'challenge-trend-period' },
    buildChallengeEntityAnalysisReportPeriod:
      buildChallengeEntityAnalysisReportPeriodMock,
    challengeEntitySubordinateRankingQueryOptions:
      challengeEntitySubordinateRankingQueryOptionsMock,
  }),
)

vi.mock(
  '@/features/challenges/components/analysis/challenge-entity-public-maps',
  () => ({
    DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY: 'expenses',
    getChallengeEntityMapPreviewDefinition:
      getChallengeEntityMapPreviewDefinitionMock,
    normalizeChallengeEntityMapPreviewKey: vi.fn((value?: string) =>
      value === 'local-taxes' ? value : 'expenses',
    ),
  }),
)

vi.mock('@/features/advanced-map-analytics/map-runtime-config', () => ({
  applyMapRuntimeConfig: applyMapRuntimeConfigMock,
}))

vi.mock('@/hooks/useAdvancedMapAnalyticsSeriesData', () => ({
  advancedMapAnalyticsSeriesDataQueryOptions:
    advancedMapAnalyticsSeriesDataQueryOptionsMock,
}))

vi.mock('@/hooks/useGeoJson', () => ({
  geoJsonQueryOptions: geoJsonQueryOptionsMock,
}))

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  entityDetailsQueryOptions: entityDetailsQueryOptionsMock,
  entityExecutionLineItemsQueryOptions:
    entityExecutionLineItemsQueryOptionsMock,
  reportsConnectionQueryOptions: reportsConnectionQueryOptionsMock,
}))

vi.mock('@/lib/user-preferences', () => ({
  readClientCurrencyPreference: readClientCurrencyPreferenceMock,
  readClientInflationAdjustedPreference: readClientInflationAdjustedPreferenceMock,
}))

describe('primarie route loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    entityDetailsQueryOptionsMock.mockReset()
    entityExecutionLineItemsQueryOptionsMock.mockReset()
    reportsConnectionQueryOptionsMock.mockReset()
    buildChallengeEntityAnalysisReportPeriodMock.mockReset()
    challengeEntitySubordinateRankingQueryOptionsMock.mockReset()
    getChallengeEntityMapPreviewDefinitionMock.mockReset()
    applyMapRuntimeConfigMock.mockReset()
    advancedMapAnalyticsSeriesDataQueryOptionsMock.mockReset()
    geoJsonQueryOptionsMock.mockReset()
    readClientCurrencyPreferenceMock.mockReset()
    readClientInflationAdjustedPreferenceMock.mockReset()

    buildChallengeEntityAnalysisReportPeriodMock.mockImplementation((year) => ({
      type: 'report-period',
      year,
    }))
    entityDetailsQueryOptionsMock.mockImplementation((input) => ({
      queryKey: ['entity-details', input],
    }))
    entityExecutionLineItemsQueryOptionsMock.mockImplementation((input) => ({
      queryKey: ['entity-line-items', input],
    }))
    reportsConnectionQueryOptionsMock.mockImplementation((input) => ({
      queryKey: ['reports', input],
    }))
    challengeEntitySubordinateRankingQueryOptionsMock.mockImplementation(
      (input) => ({
        queryKey: ['subordinates', input],
      }),
    )
    getChallengeEntityMapPreviewDefinitionMock.mockReturnValue({
      mapState: {
        series: [{ id: 'preview-series', enabled: true }],
      },
    })
    applyMapRuntimeConfigMock.mockImplementation((mapState) => mapState)
    advancedMapAnalyticsSeriesDataQueryOptionsMock.mockImplementation(
      (input) => ({
        queryKey: ['advanced-map-series', input],
      }),
    )
    geoJsonQueryOptionsMock.mockImplementation((mapViewType) => ({
      queryKey: ['geo-json', mapViewType],
    }))
  })

  it('warms only the core queries before returning and starts the secondary prefetches in the background', async () => {
    readClientCurrencyPreferenceMock.mockReturnValue('EUR')
    readClientInflationAdjustedPreferenceMock.mockReturnValue(true)

    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockImplementation(
      () => new Promise(() => {}),
    )
    const getQueryData = vi.fn().mockReturnValue({
      cui: '4267117',
      entity_type: 'admin_county_council',
    })

    const { Route } = await import('./primarie')
    const routeWithLoader = Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<unknown>
    }
    expect(routeWithLoader.loader).toBeTypeOf('function')
    const loader = routeWithLoader.loader
    const loaderPromise = loader({
      context: {
        queryClient: {
          ensureQueryData,
          prefetchQuery,
          getQueryData,
        },
      },
      params: { cui: '4267117' },
      location: {
        search: {
          year: 2024,
          report_type: 'DETAILED',
          normalization: 'per_capita',
          public_map: 'local-taxes',
        },
      },
    })

    await expect(
      Promise.race([
        loaderPromise,
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 25)),
      ]),
    ).resolves.not.toBe('timeout')

    await expect(loaderPromise).resolves.toEqual({
      initialSettings: {
        currency: 'EUR',
        inflationAdjusted: true,
      },
    })

    expect(buildChallengeEntityAnalysisReportPeriodMock).toHaveBeenCalledWith(
      2024,
    )
    expect(entityDetailsQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: '4267117',
        reportType: 'DETAILED',
        normalization: 'per_capita',
        currency: 'EUR',
        inflation_adjusted: true,
        trendPeriod: { type: 'challenge-trend-period' },
      }),
    )
    expect(entityExecutionLineItemsQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: '4267117',
        reportType: 'DETAILED',
        normalization: 'per_capita',
        currency: 'EUR',
        inflation_adjusted: true,
      }),
    )
    expect(ensureQueryData).toHaveBeenCalledTimes(2)
    expect(reportsConnectionQueryOptionsMock).not.toHaveBeenCalled()
    expect(challengeEntitySubordinateRankingQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityCui: '4267117',
        normalizationOptions: {
          currency: 'EUR',
          inflation_adjusted: true,
        },
      }),
    )
    expect(applyMapRuntimeConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        series: [{ id: 'preview-series', enabled: true }],
      }),
      expect.objectContaining({
        selectedYearOverride: 2024,
        reportTypeOverride: 'Executie bugetara detaliata',
        normalizationOverride: 'per_capita',
        currencyOverride: 'EUR',
        inflationAdjustedOverride: true,
      }),
    )
    expect(advancedMapAnalyticsSeriesDataQueryOptionsMock).toHaveBeenCalledWith({
      series: [{ id: 'preview-series', enabled: true }],
    })
    expect(geoJsonQueryOptionsMock).toHaveBeenCalledWith('UAT')
    expect(geoJsonQueryOptionsMock).toHaveBeenCalledWith('County')
    expect(prefetchQuery).toHaveBeenCalledTimes(4)
  })

  it('prefers URL currency settings over persisted preferences', async () => {
    readClientCurrencyPreferenceMock.mockReturnValue('EUR')
    readClientInflationAdjustedPreferenceMock.mockReturnValue(true)

    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockResolvedValue(undefined)
    const getQueryData = vi.fn().mockReturnValue({
      cui: '12345678',
      entity_type: 'admin_municipality',
    })

    const { Route } = await import('./primarie')
    const routeWithLoader = Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<unknown>
    }
    expect(routeWithLoader.loader).toBeTypeOf('function')
    const loader = routeWithLoader.loader
    const loaderResult = await loader({
      context: {
        queryClient: {
          ensureQueryData,
          prefetchQuery,
          getQueryData,
        },
      },
      params: { cui: '12345678' },
      location: {
        search: {
          currency: 'USD',
          inflation_adjusted: false,
        },
      },
    })

    expect(loaderResult).toEqual({
      initialSettings: {
        currency: 'USD',
        inflationAdjusted: false,
      },
    })
    expect(entityDetailsQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'USD',
        inflation_adjusted: false,
      }),
    )
    expect(geoJsonQueryOptionsMock).toHaveBeenCalledTimes(1)
    expect(geoJsonQueryOptionsMock).toHaveBeenCalledWith('UAT')
  })
})
