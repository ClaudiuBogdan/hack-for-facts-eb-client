import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const redirectMock = vi.fn((options: Record<string, unknown>) => ({
  __redirect: true,
  ...options,
}))
const createIsomorphicFnMock = vi.fn(() => {
  let clientImpl: (() => unknown) | undefined
  let serverImpl: (() => unknown | Promise<unknown>) | undefined

  const isomorphicFn = async () => {
    if (typeof window === 'undefined') {
      return serverImpl?.()
    }

    return clientImpl?.()
  }

  return Object.assign(isomorphicFn, {
    client(implementation: () => unknown) {
      clientImpl = implementation
      return this
    },
    server(implementation: () => unknown | Promise<unknown>) {
      serverImpl = implementation
      return this
    },
  })
})
const getRequestUrlMock = vi.fn(() => new URL('https://transparenta.eu/primarie/4305857'))
const entityDetailsQueryOptionsMock = vi.fn()
const entityExecutionLineItemsQueryOptionsMock = vi.fn()
const buildChallengeEntityAnalysisReportPeriodMock = vi.fn()
const buildChallengeEntityAnalysisTrendPeriodMock = vi.fn()
const challengeEntitySubordinateRankingQueryOptionsMock = vi.fn()
const getChallengeEntityMapPreviewDefinitionMock = vi.fn()
const applyMapRuntimeConfigMock = vi.fn()
const advancedMapAnalyticsSeriesDataQueryOptionsMock = vi.fn()
const geoJsonQueryOptionsMock = vi.fn()
const buildEntityRouteHeadMock = vi.fn(() => ({ meta: [] }))
const readClientCurrencyPreferenceMock = vi.fn(() => {
  throw new Error('persisted currency preference should not be read')
})
const readClientInflationAdjustedPreferenceMock = vi.fn(() => {
  throw new Error('persisted inflation preference should not be read')
})

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  redirect: redirectMock,
}))

vi.mock('@tanstack/react-start', () => ({
  createIsomorphicFn: createIsomorphicFnMock,
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequestUrl: getRequestUrlMock,
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: vi.fn(() => ({})),
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
    buildChallengeEntityAnalysisReportPeriod:
      buildChallengeEntityAnalysisReportPeriodMock,
    buildChallengeEntityAnalysisTrendPeriod:
      buildChallengeEntityAnalysisTrendPeriodMock,
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

vi.mock('@/features/entities/seo/entity-share-seo', () => ({
  buildEntityRouteHead: buildEntityRouteHeadMock,
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
}))

vi.mock('@/lib/user-preferences', () => ({
  readClientCurrencyPreference: readClientCurrencyPreferenceMock,
  readClientInflationAdjustedPreference: readClientInflationAdjustedPreferenceMock,
}))

async function importRoute() {
  const { Route } = await import('./index')

  return Route as unknown as {
    ssr: boolean
    beforeLoad: (input: Record<string, unknown>) => unknown
    head: (input: Record<string, unknown>) => unknown
    loader: (input: Record<string, unknown>) => Promise<{
      entityPageBootstrap: {
        executionContext: Record<string, unknown>
        exactQueryInputs: {
          entityDetails: Record<string, unknown>
          entityExecutionLineItems?: Record<string, unknown>
        }
        loaderPayload: {
          entitySeoSnapshot: Record<string, unknown>
          ssrEntityDetailsParams: Record<string, unknown>
          ssrEntityExecutionLineItemsParams?: Record<string, unknown>
          requestSiteUrl?: string
        }
        queryPlan: {
          blocking: ReadonlyArray<Record<string, unknown>>
          backgroundPrefetch: ReadonlyArray<Record<string, unknown>>
          clientOnly: ReadonlyArray<Record<string, unknown>>
        }
      }
      initialSettings: {
        currency: string
        inflationAdjusted: boolean
      }
      ssrEntityDetailsParams: Record<string, unknown>
      ssrEntityExecutionLineItemsParams?: Record<string, unknown>
      entitySeoSnapshot: Record<string, unknown>
      requestSiteUrl?: string
    }>
  }
}

describe('primarie index route', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    redirectMock.mockClear()
    createIsomorphicFnMock.mockClear()
    getRequestUrlMock.mockReset()
    entityDetailsQueryOptionsMock.mockReset()
    entityExecutionLineItemsQueryOptionsMock.mockReset()
    buildChallengeEntityAnalysisReportPeriodMock.mockReset()
    buildChallengeEntityAnalysisTrendPeriodMock.mockReset()
    challengeEntitySubordinateRankingQueryOptionsMock.mockReset()
    getChallengeEntityMapPreviewDefinitionMock.mockReset()
    applyMapRuntimeConfigMock.mockReset()
    advancedMapAnalyticsSeriesDataQueryOptionsMock.mockReset()
    geoJsonQueryOptionsMock.mockReset()
    buildEntityRouteHeadMock.mockReset()
    readClientCurrencyPreferenceMock.mockClear()
    readClientInflationAdjustedPreferenceMock.mockClear()

    delete (globalThis as { window?: unknown }).window

    getRequestUrlMock.mockReturnValue(
      new URL('https://transparenta.eu/primarie/4305857'),
    )
    buildEntityRouteHeadMock.mockReturnValue({ meta: [] })
    buildChallengeEntityAnalysisReportPeriodMock.mockImplementation((input) => ({
      type: 'report-period',
      input,
    }))
    buildChallengeEntityAnalysisTrendPeriodMock.mockImplementation((input) => ({
      type: 'trend-period',
      input,
    }))
    entityDetailsQueryOptionsMock.mockImplementation((input) => ({
      queryKey: ['entity-details', input],
    }))
    entityExecutionLineItemsQueryOptionsMock.mockImplementation((input) => ({
      queryKey: ['entity-line-items', input],
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

  it('enables SSR and redirects canonicalized search on the same primarie route', async () => {
    const route = await importRoute()

    expect(route.ssr).toBe(true)

    let thrown: unknown

    try {
      route.beforeLoad({
        params: { cui: '4305857' },
        search: {
          period: 'YEAR',
          month: '03',
          quarter: 'Q4',
          public_map: 'legacy-preview',
          commitments_grouping: 'invalid',
          commitments_detail_level: 'invalid',
          insSearch: 'drumuri',
          notificationModal: 'open',
        },
      })
    } catch (error) {
      thrown = error
    }

    expect(redirectMock).toHaveBeenCalledTimes(1)
    expect(thrown).toMatchObject({
      __redirect: true,
      to: '/primarie/$cui',
      params: { cui: '4305857' },
      replace: true,
      search: expect.objectContaining({
        period: 'YEAR',
        public_map: 'expenses',
        insSearch: 'drumuri',
        notificationModal: 'open',
      }),
    })
    expect((thrown as { search: Record<string, unknown> }).search).not.toHaveProperty(
      'month',
    )
    expect((thrown as { search: Record<string, unknown> }).search).not.toHaveProperty(
      'quarter',
    )
    expect((thrown as { search: Record<string, unknown> }).search).not.toHaveProperty(
      'commitments_grouping',
    )
    expect((thrown as { search: Record<string, unknown> }).search).not.toHaveProperty(
      'commitments_detail_level',
    )
  })

  it('does not redirect clean primarie URLs that omit default search params', async () => {
    const route = await importRoute()

    expect(
      route.beforeLoad({
        params: { cui: '4305857' },
        search: {},
      }),
    ).toBeUndefined()
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('uses the shared entity SEO builder for primarie metadata', async () => {
    const route = await importRoute()
    const loaderData = {
      entitySeoSnapshot: {
        cui: '4305857',
      },
      requestSiteUrl: 'https://transparenta.eu',
    }

    route.head({
      params: { cui: '4305857' },
      match: {
        search: { lang: 'en' },
        loaderData,
      },
    })

    expect(buildEntityRouteHeadMock).toHaveBeenCalledWith({
      routeId: 'primarie',
      cui: '4305857',
      snapshot: loaderData.entitySeoSnapshot,
      searchLang: 'en',
      siteUrl: 'https://transparenta.eu',
    })
  })

  it('warms blocking queries and background prefetches without waiting on them, and skips GeoJSON on the server', async () => {
    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockImplementation(
      () => new Promise(() => {}),
    )
    const getQueryData = vi.fn().mockReturnValue({
      cui: '4267117',
      name: 'CONSILIUL JUDETEAN TEST',
      entity_type: 'admin_county_council',
      default_report_type: 'DETAILED',
      uat: {
        county_name: 'Cluj',
        population: 123456,
      },
      totalIncome: 10,
      totalExpenses: 9,
      budgetBalance: 1,
    })

    const route = await importRoute()
    const loaderPromise = route.loader({
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

    const loaderResult = await loaderPromise

    expect(loaderResult).toMatchObject({
      entityPageBootstrap: {
        executionContext: {
          routeId: 'primarie',
          cui: '4267117',
          activeView: 'main-info',
          year: 2024,
          reportType: 'DETAILED',
          effectiveReportType: 'DETAILED',
          publicSettings: {
            normalization: 'per_capita',
            currency: 'RON',
            inflationAdjusted: false,
            showPeriodGrowth: false,
          },
        },
        exactQueryInputs: {
          entityDetails: expect.objectContaining({
            cui: '4267117',
            reportType: 'DETAILED',
            normalization: 'per_capita',
            currency: 'RON',
            inflation_adjusted: false,
          }),
          entityExecutionLineItems: expect.objectContaining({
            cui: '4267117',
            reportType: 'DETAILED',
            normalization: 'per_capita',
            currency: 'RON',
            inflation_adjusted: false,
          }),
        },
        queryPlan: {
          blocking: [
            expect.objectContaining({
              id: 'entity-details',
              executionClass: 'blocking',
            }),
          ],
          backgroundPrefetch: [],
          clientOnly: [],
        },
        loaderPayload: {
          entitySeoSnapshot: expect.objectContaining({
            cui: '4267117',
          }),
          ssrEntityDetailsParams: expect.objectContaining({
            cui: '4267117',
          }),
          ssrEntityExecutionLineItemsParams: expect.objectContaining({
            cui: '4267117',
          }),
          requestSiteUrl: 'https://transparenta.eu',
        },
      },
      initialSettings: {
        currency: 'RON',
        inflationAdjusted: false,
      },
      ssrEntityDetailsParams: expect.objectContaining({
        cui: '4267117',
        currency: 'RON',
        inflation_adjusted: false,
      }),
      ssrEntityExecutionLineItemsParams: expect.objectContaining({
        cui: '4267117',
        currency: 'RON',
        inflation_adjusted: false,
      }),
      entitySeoSnapshot: {
        cui: '4267117',
        name: 'CONSILIUL JUDETEAN TEST',
        entityType: 'admin_county_council',
        filterContext: {
          year: 2024,
          period: 'YEAR',
          reportType: 'DETAILED',
          normalization: 'per_capita',
          currency: 'RON',
          inflationAdjusted: false,
          showPeriodGrowth: false,
        },
      },
      requestSiteUrl: 'https://transparenta.eu',
    })
    expect(loaderResult.entityPageBootstrap.loaderPayload).toMatchObject({
      entitySeoSnapshot: loaderResult.entitySeoSnapshot,
      ssrEntityDetailsParams: loaderResult.ssrEntityDetailsParams,
      ssrEntityExecutionLineItemsParams:
        loaderResult.ssrEntityExecutionLineItemsParams,
      requestSiteUrl: loaderResult.requestSiteUrl,
    })
    expect(loaderResult.ssrEntityDetailsParams).toEqual(
      loaderResult.entityPageBootstrap.exactQueryInputs.entityDetails,
    )
    expect(loaderResult.ssrEntityExecutionLineItemsParams).toEqual(
      loaderResult.entityPageBootstrap.exactQueryInputs.entityExecutionLineItems,
    )

    expect(entityDetailsQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: '4267117',
        reportType: 'DETAILED',
        normalization: 'per_capita',
        currency: 'RON',
        inflation_adjusted: false,
        reportPeriod: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2024',
              end: '2024',
            },
          },
        },
        trendPeriod: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2016',
              end: '2026',
            },
          },
        },
      }),
    )
    expect(entityExecutionLineItemsQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: '4267117',
        reportType: 'DETAILED',
        normalization: 'per_capita',
        currency: 'RON',
        inflation_adjusted: false,
      }),
    )
    expect(ensureQueryData).toHaveBeenCalledTimes(2)
    expect(challengeEntitySubordinateRankingQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityCui: '4267117',
        normalizationOptions: {
          currency: 'RON',
          inflation_adjusted: false,
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
        currencyOverride: 'RON',
        inflationAdjustedOverride: false,
      }),
    )
    expect(advancedMapAnalyticsSeriesDataQueryOptionsMock).toHaveBeenCalledWith({
      series: [{ id: 'preview-series', enabled: true }],
    })
    expect(geoJsonQueryOptionsMock).not.toHaveBeenCalled()
    expect(prefetchQuery).toHaveBeenCalledTimes(2)
  })

  it('uses URL settings when present and otherwise falls back to URL-only defaults without reading persisted preferences', async () => {
    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockResolvedValue(undefined)
    const getQueryData = vi.fn().mockReturnValue({
      cui: '12345678',
      entity_type: 'admin_municipality',
    })

    const route = await importRoute()
    const loaderResult = await route.loader({
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
          inflation_adjusted: true,
        },
      },
    })

    expect(loaderResult.initialSettings).toEqual({
      currency: 'USD',
      inflationAdjusted: true,
    })
    expect(entityDetailsQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'USD',
        inflation_adjusted: true,
      }),
    )

    const defaultResult = await route.loader({
      context: {
        queryClient: {
          ensureQueryData,
          prefetchQuery,
          getQueryData,
        },
      },
      params: { cui: '12345678' },
      location: {
        search: {},
      },
    })

    expect(defaultResult.initialSettings).toEqual({
      currency: 'RON',
      inflationAdjusted: false,
    })
    expect(readClientCurrencyPreferenceMock).not.toHaveBeenCalled()
    expect(readClientInflationAdjustedPreferenceMock).not.toHaveBeenCalled()
  })

  it('prefetches GeoJSON only during client-side execution', async () => {
    ;(globalThis as { window?: { location: { origin: string } } }).window = {
      location: {
        origin: 'https://client.transparenta.eu',
      },
    }

    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockResolvedValue(undefined)
    const getQueryData = vi.fn().mockReturnValue({
      cui: '4267117',
      entity_type: 'admin_county_council',
    })

    const route = await importRoute()
    const loaderResult = await route.loader({
      context: {
        queryClient: {
          ensureQueryData,
          prefetchQuery,
          getQueryData,
        },
      },
      params: { cui: '4267117' },
      location: {
        search: {},
      },
    })

    expect(loaderResult.requestSiteUrl).toBe('https://client.transparenta.eu')
    expect(geoJsonQueryOptionsMock).toHaveBeenCalledWith('UAT')
    expect(geoJsonQueryOptionsMock).toHaveBeenCalledWith('County')
    expect(prefetchQuery).toHaveBeenCalledTimes(4)
  })
})
