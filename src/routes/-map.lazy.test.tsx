import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { Profiler, type ComponentType, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'

const navigateMock = vi.fn()
const entityRoutingSummaryQueryFnMock = vi.fn()
const interactiveMapPropsMock = vi.fn()
let mockedMapViewType: 'UAT' | 'County' = 'UAT'
let mockedMapZoom: number | undefined
let mockedMapCenter: [number, number] | undefined
let mockedHeatmapData: unknown[] = [
  {
    siruta_code: '1017',
    uat_code: '4305857',
  },
]

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
  useNavigate: () => navigateMock,
}))

vi.mock('@/components/maps/InteractiveMap', () => ({
  InteractiveMap: (props: {
    readonly minZoom?: number
    readonly onFeatureClick: (properties: Record<string, unknown>) => void
    readonly onViewChange?: (center: [number, number], zoom: number) => void
    readonly center?: [number, number]
    readonly zoom?: number
    readonly scrollWheelZoom?: boolean
    readonly defaultScrollWheelZoomEnabled?: boolean
  }) => {
    interactiveMapPropsMock(props)

    return (
      <div>
        <button
          type="button"
          onClick={() =>
            props.onFeatureClick(
              mockedMapViewType === 'UAT'
                ? { natcode: '1017' }
                : { mnemonic: 'CJ' },
            )}
        >
          Select map feature
        </button>
        <button
          type="button"
          onClick={() => props.onViewChange?.([46.123456, 24.987654], 7.26)}
        >
          Move map
        </button>
      </div>
    )
  },
}))

vi.mock('@/components/ssr/ClientOnly', () => ({
  ClientOnly: ({ children }: { readonly children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({
    data: { type: 'FeatureCollection', features: [] },
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/hooks/useHeatmapData', () => ({
  useHeatmapData: () => ({
    data: mockedHeatmapData,
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}))

vi.mock('@/hooks/useMapFilter', () => ({
  useMapFilter: () => ({
    mapState: {
      mapViewType: mockedMapViewType,
      activeView: 'map',
      mapZoom: mockedMapZoom,
      mapCenter: mockedMapCenter,
      filters: {
        report_period: {
          type: 'YEAR',
          selection: { interval: { start: '2024', end: '2024' } },
        },
        account_category: 'ch',
        normalization: 'total',
      },
    },
    setFilters: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('@/lib/hooks/useUserCurrency', () => ({
  useUserCurrency: () => ['RON', vi.fn()],
}))

vi.mock('@/lib/hooks/useUserInflationAdjusted', () => ({
  useUserInflationAdjusted: () => [false, vi.fn()],
}))

vi.mock('@/components/filters/MapFilter', () => ({
  MapFilter: () => <div>Map filter</div>,
}))

vi.mock('@/components/maps/MapLegend', () => ({
  MapLegend: () => <div>Legend</div>,
}))

vi.mock('@/components/maps/charts/UatDataCharts', () => ({
  UatDataCharts: () => <div>Charts</div>,
}))

vi.mock('@/components/maps/HeatmapDataTable', () => ({
  HeatmapDataTable: () => <div>Data table</div>,
}))

vi.mock('@/components/ui/FloatingQuickNav', () => ({
  FloatingQuickNav: () => <div>Quick nav</div>,
}))

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  entityRoutingSummaryQueryOptions: ({ cui }: { readonly cui: string }) => ({
    queryKey: ['entityRoutingSummary', cui],
    queryFn: () => entityRoutingSummaryQueryFnMock(cui),
    staleTime: 1000 * 60 * 5,
  }),
}))

describe('Map route', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    interactiveMapPropsMock.mockReset()
    entityRoutingSummaryQueryFnMock.mockReset()
    mockedMapViewType = 'UAT'
    mockedMapZoom = undefined
    mockedMapCenter = undefined
    mockedHeatmapData = [
      {
        siruta_code: '1017',
        uat_code: '4305857',
      },
    ]
  })

  it('starts the map route with a wider default camera', async () => {
    const { Route } = await import('./map.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />, { queryClient: createTestQueryClient() })

    await screen.findByRole('button', { name: 'Select map feature' })

    expect(interactiveMapPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        minZoom: 4,
        center: [45.9432, 24.9668],
        zoom: 6,
        scrollWheelZoom: true,
        defaultScrollWheelZoomEnabled: true,
      }),
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('uses URL camera params only as the initial map viewport', async () => {
    mockedMapCenter = [46.11, 24.22]
    mockedMapZoom = 7.4
    const { Route } = await import('./map.lazy')
    const RouteComponent = Route.options.component as ComponentType
    const profileCommits: string[] = []

    const renderProfiledRoute = () => (
      <Profiler
        id="map-route-camera"
        onRender={(_id, phase) => {
          profileCommits.push(phase)
        }}
      >
        <RouteComponent />
      </Profiler>
    )

    const { rerender } = render(renderProfiledRoute(), { queryClient: createTestQueryClient() })

    await screen.findByRole('button', { name: 'Select map feature' })

    expect(interactiveMapPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: [46.11, 24.22],
        zoom: 7.4,
      }),
    )

    mockedMapCenter = [47.33, 25.44]
    mockedMapZoom = 8.6
    rerender(renderProfiledRoute())

    expect(interactiveMapPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        center: [46.11, 24.22],
        zoom: 7.4,
      }),
    )
    expect(profileCommits).toContain('update')
  })

  it('writes rounded map viewport changes back to the URL once', async () => {
    const { Route } = await import('./map.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />, { queryClient: createTestQueryClient() })

    fireEvent.click(await screen.findByRole('button', { name: 'Move map' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move map' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledTimes(1)
    })

    const navigateCall = navigateMock.mock.calls[0]?.[0]
    expect(navigateCall).toEqual(
      expect.objectContaining({
        replace: true,
        resetScroll: false,
      }),
    )
    expect(navigateCall.search({ filters: {} })).toEqual({
      filters: {},
      mapCenter: [46.12346, 24.98765],
      mapZoom: 7.3,
    })
  })

  it('routes UAT feature clicks to the entity page and preserves map filter search', async () => {
    const { Route } = await import('./map.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />, { queryClient: createTestQueryClient() })

    fireEvent.click(await screen.findByRole('button', { name: 'Select map feature' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/entities/4305857',
        search: {
          mapFilters: {
            account_category: 'ch',
            normalization: 'total',
            period: {
              type: 'YEAR',
              selection: { interval: { start: '2024', end: '2024' } },
            },
          },
        },
      })
    })

    expect(entityRoutingSummaryQueryFnMock).not.toHaveBeenCalled()
  })

  it('routes county feature clicks to the entity page and preserves map filter search', async () => {
    mockedMapViewType = 'County'
    mockedHeatmapData = [
      {
        county_code: 'CJ',
        county_entity: {
          cui: '4267117',
        },
      },
    ]
    const { Route } = await import('./map.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />, { queryClient: createTestQueryClient() })

    fireEvent.click(await screen.findByRole('button', { name: 'Select map feature' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/entities/4267117',
        search: {
          mapFilters: {
            account_category: 'ch',
            normalization: 'total',
            period: {
              type: 'YEAR',
              selection: { interval: { start: '2024', end: '2024' } },
            },
          },
        },
      })
    })
  })
})
