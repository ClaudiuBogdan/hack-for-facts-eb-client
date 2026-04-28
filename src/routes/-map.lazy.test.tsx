import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'

const navigateMock = vi.fn()
const entityRoutingSummaryQueryFnMock = vi.fn()
let mockedMapViewType: 'UAT' | 'County' = 'UAT'
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
  InteractiveMap: ({
    onFeatureClick,
  }: {
    readonly onFeatureClick: (properties: Record<string, unknown>) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onFeatureClick(
          mockedMapViewType === 'UAT'
            ? { natcode: '1017' }
            : { mnemonic: 'CJ' },
        )}
    >
      Select map feature
    </button>
  ),
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
      mapZoom: 7,
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
    entityRoutingSummaryQueryFnMock.mockReset()
    mockedMapViewType = 'UAT'
    mockedHeatmapData = [
      {
        siruta_code: '1017',
        uat_code: '4305857',
      },
    ]
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
