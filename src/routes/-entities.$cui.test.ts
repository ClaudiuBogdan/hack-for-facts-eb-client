import { beforeEach, describe, expect, it, vi } from 'vitest'

const deployment = vi.hoisted(() => ({ native: false }))
vi.mock('@/lib/api/api-mode', () => ({ isRedesignOnlyApiDeployment: () => deployment.native }))
const routeStub = vi.fn((options: Record<string, unknown>) => options)
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
const getRequestUrlMock = vi.fn(
  () => new URL('https://transparenta.eu/entities/4305857'),
)
const entityDetailsQueryOptionsMock = vi.fn()
const entityExecutionLineItemsQueryOptionsMock = vi.fn()
const buildEntityRouteHeadMock = vi.fn(() => ({ meta: [] }))
const geoJsonQueryOptionsMock = vi.fn()
const heatmapUATQueryOptionsMock = vi.fn()
const heatmapJudetQueryOptionsMock = vi.fn()
const getTopFunctionalGroupCodesMock = vi.fn()
const getChartAnalyticsMock = vi.fn()
const generateHashMock = vi.fn(() => 'hash-123')
const readClientCurrencyPreferenceMock = vi.fn(() => null)
const readClientInflationAdjustedPreferenceMock = vi.fn(() => null)

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
}))

vi.mock('@tanstack/react-start', () => ({
  createIsomorphicFn: createIsomorphicFnMock,
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequestUrl: getRequestUrlMock,
}))

vi.mock('@/components/entities/validation', () => ({
  entitySearchSchema: {
    parse: (value: unknown) => value,
  },
}))

vi.mock('@/components/ui/ViewLoading', () => ({
  ViewLoading: () => null,
}))

vi.mock('@/lib/http-cache', () => ({
  createPublicPageCacheHeaders: vi.fn(() => ({})),
}))

vi.mock('@/features/entities/seo/entity-share-seo', () => ({
  buildEntityRouteHead: buildEntityRouteHeadMock,
}))

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  entityDetailsQueryOptions: entityDetailsQueryOptionsMock,
  entityExecutionLineItemsQueryOptions:
    entityExecutionLineItemsQueryOptionsMock,
}))

vi.mock('@/hooks/useGeoJson', () => ({
  geoJsonQueryOptions: geoJsonQueryOptionsMock,
}))

vi.mock('@/hooks/useHeatmapData', () => ({
  heatmapUATQueryOptions: heatmapUATQueryOptionsMock,
  heatmapJudetQueryOptions: heatmapJudetQueryOptionsMock,
}))

vi.mock('@/lib/analytics-utils', () => ({
  getTopFunctionalGroupCodes: getTopFunctionalGroupCodesMock,
}))

vi.mock('@/lib/api/charts', () => ({
  getChartAnalytics: getChartAnalyticsMock,
}))

vi.mock('@/lib/utils', () => ({
  generateHash: generateHashMock,
}))

vi.mock('@/lib/user-preferences', () => ({
  readClientCurrencyPreference: readClientCurrencyPreferenceMock,
  readClientInflationAdjustedPreference:
    readClientInflationAdjustedPreferenceMock,
}))

async function importRoute() {
  const { Route } = await import('./entities.$cui')

  return Route as unknown as {
    head: (input: Record<string, unknown>) => unknown
    loader: (input: Record<string, unknown>) => Promise<{
      entityPageBootstrap: {
        executionContext: Record<string, unknown>
        exactQueryInputs: {
          entityDetails: Record<string, unknown>
          entityExecutionLineItems: Record<string, unknown>
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
      ssrSettings: {
        currency: string
        inflationAdjusted: boolean
      }
      forcedOverrides: Record<string, unknown>
    }>
  }
}

function createEntityDetailsData(overrides: Record<string, unknown> = {}) {
  return {
    cui: '4305857',
    name: 'TEST ENTITY',
    entity_type: 'admin_municipality',
    default_report_type: 'DETAILED',
    is_uat: true,
    uat: {
      county_name: 'Cluj',
      population: 123456,
    },
    totalIncome: 10,
    totalExpenses: 9,
    budgetBalance: 1,
    executionLineItems: {
      nodes: [
        {
          account_category: 'vn',
          amount: 100,
          functionalClassification: {
            functional_code: '65.02',
          },
        },
      ],
    },
    ...overrides,
  }
}

describe('entities route', () => {
  beforeEach(() => {
    deployment.native = false
    vi.resetModules()
    routeStub.mockClear()
    createIsomorphicFnMock.mockClear()
    getRequestUrlMock.mockReset()
    entityDetailsQueryOptionsMock.mockReset()
    entityExecutionLineItemsQueryOptionsMock.mockReset()
    buildEntityRouteHeadMock.mockReset()
    geoJsonQueryOptionsMock.mockReset()
    heatmapUATQueryOptionsMock.mockReset()
    heatmapJudetQueryOptionsMock.mockReset()
    getTopFunctionalGroupCodesMock.mockReset()
    getChartAnalyticsMock.mockReset()
    generateHashMock.mockReset()
    readClientCurrencyPreferenceMock.mockReset()
    readClientInflationAdjustedPreferenceMock.mockReset()

    delete (globalThis as { window?: unknown }).window

    getRequestUrlMock.mockReturnValue(
      new URL('https://transparenta.eu/entities/4305857'),
    )
    entityDetailsQueryOptionsMock.mockImplementation((input) => ({
      queryKey: ['entity-details', input],
    }))
    entityExecutionLineItemsQueryOptionsMock.mockImplementation((input) => ({
      queryKey: ['entity-line-items', input],
    }))
    buildEntityRouteHeadMock.mockReturnValue({ meta: [] })
    geoJsonQueryOptionsMock.mockImplementation((mapViewType) => ({
      queryKey: ['geo-json', mapViewType],
    }))
    heatmapUATQueryOptionsMock.mockImplementation((filters) => ({
      queryKey: ['heatmap-uat', filters],
    }))
    heatmapJudetQueryOptionsMock.mockImplementation((filters) => ({
      queryKey: ['heatmap-judet', filters],
    }))
    getTopFunctionalGroupCodesMock.mockReturnValue(['65'])
    generateHashMock.mockReturnValue('hash-123')
    readClientCurrencyPreferenceMock.mockReturnValue(null)
    readClientInflationAdjustedPreferenceMock.mockReturnValue(null)
  })

  it('uses the shared entity SEO builder for entities metadata', async () => {
    const route = await importRoute()
    const loaderData = {
      entityPageBootstrap: {
        loaderPayload: {
          entitySeoSnapshot: {
            cui: '4305857',
          },
          ssrEntityDetailsParams: {
            cui: '4305857',
          },
          requestSiteUrl: 'https://transparenta.eu',
        },
      },
    }

    route.head({
      params: { cui: '4305857' },
      match: {
        search: { lang: 'en' },
        loaderData,
      },
    })

    expect(buildEntityRouteHeadMock).toHaveBeenCalledWith({
      cui: '4305857',
      routePolicy: expect.objectContaining({
        routeId: 'entities',
        canonicalPathname: '/entities/4305857',
      }),
      seoSnapshot: loaderData.entityPageBootstrap.loaderPayload.entitySeoSnapshot,
      requestOrigin: 'https://transparenta.eu',
      localeSearchContext: { lang: 'en' },
    })
  })

  it('returns the shared bootstrap payload without old map warmups', async () => {
    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockResolvedValue(undefined)
    const getQueryData = vi.fn().mockReturnValue(
      createEntityDetailsData({
        cui: '4267117',
        entity_type: 'admin_county_council',
      }),
    )
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
        search: {
          view: 'map',
          year: 2024,
          report_type: 'DETAILED',
          normalization: 'per_capita',
        },
      },
    })

    expect(loaderResult.entityPageBootstrap).toMatchObject({
      executionContext: {
        routeId: 'entities',
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
        requestSiteUrl: 'https://transparenta.eu',
      },
    })
    expect(loaderResult.entityPageBootstrap.loaderPayload.ssrEntityDetailsParams).toEqual(
      loaderResult.entityPageBootstrap.exactQueryInputs.entityDetails,
    )
    expect(
      loaderResult.entityPageBootstrap.loaderPayload
        .ssrEntityExecutionLineItemsParams,
    ).toEqual(
      loaderResult.entityPageBootstrap.exactQueryInputs.entityExecutionLineItems,
    )
    expect(loaderResult.entityPageBootstrap.loaderPayload.entitySeoSnapshot).toMatchObject({
      cui: '4267117',
      name: 'TEST ENTITY',
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
    })
    expect(loaderResult.entityPageBootstrap.loaderPayload.requestSiteUrl).toBe(
      'https://transparenta.eu',
    )
    expect(ensureQueryData).toHaveBeenCalledTimes(2)
    expect(prefetchQuery).not.toHaveBeenCalled()
    expect(geoJsonQueryOptionsMock).not.toHaveBeenCalled()
    expect(heatmapJudetQueryOptionsMock).not.toHaveBeenCalled()
  })

  it('resolves omitted report_type from the entity default before exposing SSR params', async () => {
    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockResolvedValue(undefined)
    const getQueryData = vi.fn().mockReturnValue(
      createEntityDetailsData({
        cui: '4266324',
        default_report_type: 'DETAILED',
      }),
    )
    const route = await importRoute()

    const loaderResult = await route.loader({
      context: {
        queryClient: {
          ensureQueryData,
          prefetchQuery,
          getQueryData,
        },
      },
      params: { cui: '4266324' },
      location: {
        search: {
          year: 2025,
        },
      },
    })

    expect(loaderResult.entityPageBootstrap.executionContext).toMatchObject({
      cui: '4266324',
      reportType: undefined,
      effectiveReportType: 'DETAILED',
    })
    expect(loaderResult.entityPageBootstrap.exactQueryInputs).toMatchObject({
      entityDetails: {
        cui: '4266324',
        reportType: 'DETAILED',
        mainCreditorCui: undefined,
      },
      entityExecutionLineItems: {
        cui: '4266324',
        reportType: 'DETAILED',
        mainCreditorCui: undefined,
      },
    })
    expect(
      loaderResult.entityPageBootstrap.loaderPayload.ssrEntityDetailsParams,
    ).toEqual(loaderResult.entityPageBootstrap.exactQueryInputs.entityDetails)
    expect(
      loaderResult.entityPageBootstrap.loaderPayload
        .ssrEntityExecutionLineItemsParams,
    ).toEqual(
      loaderResult.entityPageBootstrap.exactQueryInputs.entityExecutionLineItems,
    )
    expect(ensureQueryData).toHaveBeenCalledTimes(3)
    expect(entityDetailsQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: '4266324',
        reportType: undefined,
      }),
    )
    expect(entityDetailsQueryOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: '4266324',
        reportType: 'DETAILED',
      }),
    )
  })

  it('does not run old map warmups during client-side execution', async () => {
    ;(globalThis as { window?: { location: { origin: string } } }).window = {
      location: {
        origin: 'https://client.transparenta.eu',
      },
    }

    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockResolvedValue(undefined)
    const getQueryData = vi.fn().mockReturnValue(
      createEntityDetailsData({
        cui: '12345678',
      }),
    )
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
          view: 'map',
          year: 2024,
        },
      },
    })

    expect(loaderResult.entityPageBootstrap.loaderPayload.requestSiteUrl).toBe(
      'https://client.transparenta.eu',
    )
    expect(loaderResult.entityPageBootstrap.queryPlan.clientOnly).toEqual([])
    expect(geoJsonQueryOptionsMock).not.toHaveBeenCalled()
    expect(heatmapUATQueryOptionsMock).not.toHaveBeenCalled()
    expect(prefetchQuery).not.toHaveBeenCalled()
  })

  it('does not run old county map warmups for county councils on the client', async () => {
    ;(globalThis as { window?: { location: { origin: string } } }).window = {
      location: {
        origin: 'https://client.transparenta.eu',
      },
    }

    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockResolvedValue(undefined)
    const getQueryData = vi.fn().mockReturnValue(
      createEntityDetailsData({
        cui: '4267117',
        entity_type: 'admin_county_council',
        is_uat: false,
      }),
    )
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
        search: {
          view: 'map',
          year: 2024,
        },
      },
    })

    expect(loaderResult.entityPageBootstrap.queryPlan.clientOnly).toEqual([])
    expect(geoJsonQueryOptionsMock).not.toHaveBeenCalled()
    expect(heatmapJudetQueryOptionsMock).not.toHaveBeenCalled()
    expect(heatmapUATQueryOptionsMock).not.toHaveBeenCalled()
    expect(prefetchQuery).not.toHaveBeenCalled()
  })

  it('does not run old trend warmups for legacy trend URLs', async () => {
    const ensureQueryData = vi.fn().mockResolvedValue(undefined)
    const prefetchQuery = vi.fn().mockResolvedValue(undefined)
    const getQueryData = vi.fn().mockReturnValue(
      createEntityDetailsData({
        cui: '87654321',
      }),
    )
    const route = await importRoute()
    const loaderResult = await route.loader({
      context: {
        queryClient: {
          ensureQueryData,
          prefetchQuery,
          getQueryData,
        },
      },
      params: { cui: '87654321' },
      location: {
        search: {
          view: 'income-trends',
          year: 2024,
          report_type: 'DETAILED',
        },
      },
    })

    expect(loaderResult.entityPageBootstrap.queryPlan.backgroundPrefetch).toEqual([])
    expect(generateHashMock).not.toHaveBeenCalled()
    expect(prefetchQuery).not.toHaveBeenCalled()
    expect(geoJsonQueryOptionsMock).not.toHaveBeenCalled()
  })
  it.each(['ins', 'ins-stats'])('bootstraps native %s deep links with canonical identity only', async (view) => {
    deployment.native = true
    const ensureQueryData = vi.fn().mockImplementation((options) => {
      if (options.queryKey[0] !== 'entityIdentity') throw new Error('Unexpected fiscal prerequisite')
      return Promise.resolve({ cui: '4305857', name: 'Entity', uat: null })
    })
    const prefetchQuery = vi.fn()
    const route = await importRoute()
    const result = await route.loader({
      context: { queryClient: { ensureQueryData, prefetchQuery, getQueryData: vi.fn() } },
      params: { cui: '4305857' },
      location: { search: { view, year: 2025, normalization: 'per_capita' } },
    })
    expect(result.entityPageBootstrap).toBeDefined()
    expect(ensureQueryData).toHaveBeenCalledTimes(1)
    expect(ensureQueryData).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['entityIdentity', '4305857'] }))
    expect(prefetchQuery).not.toHaveBeenCalled()
  })

})
