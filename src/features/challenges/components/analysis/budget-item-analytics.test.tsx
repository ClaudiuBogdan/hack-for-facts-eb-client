import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { makeSingleTimePeriod } from '@/schemas/reporting'
import { BudgetItemAnalytics } from './budget-item-analytics'
import type { BudgetItemAnalyticsProps } from './budget-item-analytics-context'
import { getDefaultBudgetItemAnalyticsViewState } from './budget-item-analytics-search-state'

const useChartDataMock = vi.fn()
const convertToTimeSeriesDataMock = vi.fn()
const convertToAggregatedDataMock = vi.fn()
const chartRendererMock = vi.fn()
const useMapPreviewRuntimeStateMock = vi.fn()
const mapAnalyticsWorkspaceMock = vi.fn()
const useEntityDetailsMock = vi.fn()
const useGeoJsonDataMock = vi.fn()
const getEntityFeatureInfoMock = vi.fn()
const useBudgetItemAnalyticsTitleMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
  }) => {
    const href = Object.entries(params ?? {}).reduce(
      (resolvedPath, [key, value]) =>
        resolvedPath.replace(`$${key}`, encodeURIComponent(value)),
      to,
    )

    return <a href={href}>{children}</a>
  },
}))

vi.mock('@/components/charts/hooks/useChartData', () => ({
  useChartData: (...args: unknown[]) => useChartDataMock(...args),
  convertToTimeSeriesData: (...args: unknown[]) =>
    convertToTimeSeriesDataMock(...args),
  convertToAggregatedData: (...args: unknown[]) =>
    convertToAggregatedDataMock(...args),
}))

vi.mock(
  '@/components/charts/components/chart-renderer/components/ChartRenderer',
  () => ({
    ChartRenderer: (props: unknown) => {
      chartRendererMock(props)
      return <div data-testid="chart-renderer" />
    },
  }),
)

vi.mock(
  '@/features/advanced-map-analytics/hooks/use-map-preview-runtime-state',
  () => ({
    useMapPreviewRuntimeState: (...args: unknown[]) =>
      useMapPreviewRuntimeStateMock(...args),
  }),
)

vi.mock(
  '@/features/advanced-map-analytics/components/map-analytics-workspace',
  () => ({
    MapAnalyticsWorkspace: (props: unknown) => {
      mapAnalyticsWorkspaceMock(props)
      return <div data-testid="map-analytics-workspace" />
    },
  }),
)

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  useEntityDetails: (...args: unknown[]) => useEntityDetailsMock(...args),
}))

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: (...args: unknown[]) => useGeoJsonDataMock(...args),
}))

vi.mock('@/components/entities/utils', () => ({
  getEntityFeatureInfo: (...args: unknown[]) => getEntityFeatureInfoMock(...args),
}))

vi.mock('./use-budget-item-analytics-title', () => ({
  useBudgetItemAnalyticsTitle: (...args: unknown[]) =>
    useBudgetItemAnalyticsTitleMock(...args),
}))

const defaultAnalyticsProps: BudgetItemAnalyticsProps = {
  context: {
    entityCui: '12345678',
    selectedYear: 2025,
    subjectLabel: 'Salaries',
    language: 'en',
    functionalCode: '65',
    economicCode: '10.01',
    accountCategory: 'ch',
    currentReportPeriod: makeSingleTimePeriod('YEAR', '2025'),
    historyReportPeriod: {
      type: 'YEAR',
      selection: {
        interval: {
          start: '2018',
          end: '2025',
        },
      },
    },
    reportType: 'DETAILED',
    normalization: 'total',
    currency: 'RON',
    inflationAdjusted: false,
  },
  analyticsView: getDefaultBudgetItemAnalyticsViewState(),
  onAnalyticsViewChange: vi.fn(),
  onSelectionChange: vi.fn(),
  onReportTypeChange: vi.fn(),
  onNormalizationChange: vi.fn(),
  onInflationAdjustedChange: vi.fn(),
  onYearChange: vi.fn(),
  onEntityCuiChange: vi.fn(),
}

describe('BudgetItemAnalytics', () => {
  const resolvedTitle =
    'Town Hall of Example · Education · Salary expenses in cash'
  const seriesLabel = 'Education · Salary expenses in cash'

  beforeEach(() => {
    vi.clearAllMocks()
    useBudgetItemAnalyticsTitleMock.mockReturnValue({
      resolvedTitle,
      seriesLabel,
    })
    useMapPreviewRuntimeStateMock.mockReturnValue({
      mapState: {
        mapName: `Map (2025): ${seriesLabel}`,
        activeView: 'map',
        activeSeriesId: 'series-1',
        activeBinPresetId: 'preset-1',
        binsPresets: [],
        series: [],
      },
      setMapState: vi.fn(),
    })
    useChartDataMock.mockReturnValue({
      dataSeriesMap: new Map([
        [
          'series-1',
          {
            seriesId: 'series-1',
            data: [{ x: '2024', y: 10 }],
          },
        ],
      ]),
      isLoadingData: false,
      dataError: null,
    })
    convertToTimeSeriesDataMock.mockReturnValue({
      data: [{ year: 2024 }],
      unitMap: new Map([['series-1', 'RON']]),
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
      },
    })
    convertToAggregatedDataMock.mockReturnValue({
      data: [{ year: '2016-2026', value: 10 }],
      unitMap: new Map([['series-1', 'RON']]),
      validation: {
        isValid: true,
        errors: [],
        warnings: [],
      },
    })
    useEntityDetailsMock.mockReturnValue({
      data: {
        cui: '12345678',
        entity_type: 'admin_municipality',
        uat: {
          siruta_code: '12345',
        },
      },
    })
    useGeoJsonDataMock.mockReturnValue({
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    })
    getEntityFeatureInfoMock.mockReturnValue({
      center: [46.77, 23.59],
      zoom: 8.1,
      featureId: '12345',
    })
  })

  it('renders the analytics header, controls, chart, and map from one props object', () => {
    render(<BudgetItemAnalytics {...defaultAnalyticsProps} />)

    expect(screen.getByTestId('budget-item-analytics')).toBeInTheDocument()
    expect(screen.getByText('Analytics')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: resolvedTitle }),
    ).toBeInTheDocument()
    expect(screen.getByText('fn:65')).toBeInTheDocument()
    expect(screen.getByText('ec:10.01')).toBeInTheDocument()
    expect(screen.getByText('Budget execution evolution')).toBeInTheDocument()
    expect(screen.getByText('Map (2025)')).toBeInTheDocument()
    expect(screen.getByText('Execution')).toBeInTheDocument()
    expect(screen.getByText('Commitments')).toBeInTheDocument()
    expect(screen.getByText('Report type')).toBeInTheDocument()
    expect(screen.getByText('Only city hall')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Selected year: 2025' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2016-2025 total' })).toBeInTheDocument()
    expect(screen.getByTestId('chart-renderer')).toBeInTheDocument()
    expect(screen.getByTestId('map-analytics-workspace')).toBeInTheDocument()
    expect(chartRendererMock).toHaveBeenCalledWith(
      expect.objectContaining({
        timeSeriesData: [{ year: 2024 }],
        xAxisMarker: 2025,
      }),
    )
    expect(useMapPreviewRuntimeStateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mapKey: 'budget-item-analytics:12345678:ch:execution:selected:65:10.01:CREDITE_ANGAJAMENT',
        mapStateDefinition: expect.objectContaining({
          mapName: `Map (2025): ${seriesLabel}`,
          binsPresets: [
            expect.objectContaining({
              label: seriesLabel,
              config: expect.objectContaining({
                title: seriesLabel,
              }),
            }),
          ],
        }),
        forceMapActiveView: true,
        mapCenterOverride: [46.77, 23.59],
        mapZoomOverride: 8.1,
      }),
    )
    expect(useChartDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chart: expect.objectContaining({
          title: resolvedTitle,
          series: [
            expect.objectContaining({
              label: seriesLabel,
            }),
          ],
        }),
      }),
    )
    expect(useEntityDetailsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: '12345678',
        reportType: 'DETAILED',
      }),
    )
  })

  it('switches both chart and map to commitments mode', () => {
    render(<BudgetItemAnalytics {...defaultAnalyticsProps} />)

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Commitments' }))

    expect(defaultAnalyticsProps.onAnalyticsViewChange).toHaveBeenCalledWith({
      tab: 'commitments',
    })
  })

  it('commits a normalized manual fn prefix edit on Enter', () => {
    render(<BudgetItemAnalytics {...defaultAnalyticsProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit fn:65' }))
    const functionalInput = screen.getByLabelText('Functional prefix')

    fireEvent.change(functionalInput, { target: { value: '70.50.00' } })
    fireEvent.keyDown(functionalInput, { key: 'Enter' })

    expect(defaultAnalyticsProps.onSelectionChange).toHaveBeenCalledWith({
      functionalCode: '70.50',
      economicCode: '10.01',
    })
  })

  it('commits a manual ec prefix edit on blur', () => {
    render(<BudgetItemAnalytics {...defaultAnalyticsProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit ec:10.01' }))
    const economicInput = screen.getByLabelText('Economic prefix')

    fireEvent.change(economicInput, { target: { value: '20.30.00' } })
    fireEvent.blur(economicInput)

    expect(defaultAnalyticsProps.onSelectionChange).toHaveBeenCalledWith({
      functionalCode: '65',
      economicCode: '20.30',
    })
  })

  it('cancels manual chip edits on Escape', () => {
    render(<BudgetItemAnalytics {...defaultAnalyticsProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Edit fn:65' }))
    const functionalInput = screen.getByLabelText('Functional prefix')

    fireEvent.change(functionalInput, { target: { value: '80.01' } })
    fireEvent.keyDown(functionalInput, { key: 'Escape' })

    expect(defaultAnalyticsProps.onSelectionChange).not.toHaveBeenCalled()
  })

  it('renders add chips when one of the analytics codes is missing', () => {
    render(
      <BudgetItemAnalytics
        {...defaultAnalyticsProps}
        context={{
          ...defaultAnalyticsProps.context,
          economicCode: undefined,
        }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Edit fn:65' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add ec' })).toBeInTheDocument()
  })

  it('re-adds a missing code from the chip editor', () => {
    render(
      <BudgetItemAnalytics
        {...defaultAnalyticsProps}
        context={{
          ...defaultAnalyticsProps.context,
          economicCode: undefined,
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add ec' }))
    const economicInput = screen.getByLabelText('Economic prefix')

    fireEvent.change(economicInput, { target: { value: '20.30.00' } })
    fireEvent.keyDown(economicInput, { key: 'Enter' })

    expect(defaultAnalyticsProps.onSelectionChange).toHaveBeenCalledWith({
      functionalCode: '65',
      economicCode: '20.30',
    })
  })

  it('removes one active code while keeping the other active', () => {
    render(<BudgetItemAnalytics {...defaultAnalyticsProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove ec:10.01' }))

    expect(defaultAnalyticsProps.onSelectionChange).toHaveBeenCalledWith({
      functionalCode: '65',
      economicCode: undefined,
    })
  })

  it('clears analytics selection when the last active code is removed', () => {
    render(
      <BudgetItemAnalytics
        {...defaultAnalyticsProps}
        context={{
          ...defaultAnalyticsProps.context,
          economicCode: undefined,
        }}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Remove fn:65' }))

    expect(defaultAnalyticsProps.onSelectionChange).toHaveBeenCalledWith(null)
  })

  it('updates the report type from the analytics controls', () => {
    render(
      <BudgetItemAnalytics
        {...defaultAnalyticsProps}
        context={{
          ...defaultAnalyticsProps.context,
          reportType: 'DETAILED',
        }}
      />,
    )

    fireEvent.click(screen.getByRole('combobox', { name: 'Report type' }))
    fireEvent.click(screen.getByText('City hall + subordinates'))

    expect(defaultAnalyticsProps.onReportTypeChange).toHaveBeenCalledWith(
      'PRINCIPAL_AGGREGATED',
    )
  })

  it('shows the commitments metric dropdown only on the commitments tab', () => {
    render(
      <BudgetItemAnalytics
        {...defaultAnalyticsProps}
        analyticsView={{
          ...defaultAnalyticsProps.analyticsView,
          tab: 'commitments',
        }}
      />,
    )

    expect(screen.getByText('Metrică')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2019-2025 total' })).toBeInTheDocument()
  })

  it('hides the commitments tab for revenue analytics', () => {
    render(
      <BudgetItemAnalytics
        {...defaultAnalyticsProps}
        context={{
          ...defaultAnalyticsProps.context,
          accountCategory: 'vn',
        }}
        analyticsView={{
          ...defaultAnalyticsProps.analyticsView,
          tab: 'commitments',
        }}
      />,
    )

    expect(screen.queryByRole('tab', { name: 'Commitments' })).not.toBeInTheDocument()
    expect(chartRendererMock).toHaveBeenCalledWith(
      expect.objectContaining({
        chart: expect.objectContaining({
          series: [
            expect.objectContaining({
              type: 'line-items-aggregated-yearly',
            }),
          ],
        }),
      }),
    )
  })

  it('uses aggregated chart rendering and disables year selection in all timeframe mode', () => {
    render(
      <BudgetItemAnalytics
        {...defaultAnalyticsProps}
        analyticsView={{
          ...defaultAnalyticsProps.analyticsView,
          timeframe: 'all',
        }}
      />,
    )

    expect(chartRendererMock).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregatedData: [{ year: '2016-2026', value: 10 }],
        xAxisMarker: undefined,
      }),
    )
    expect(convertToAggregatedDataMock).toHaveBeenCalled()
  })

  it('shows the chart loading state without blocking the map section', () => {
    useChartDataMock.mockReturnValue({
      dataSeriesMap: null,
      isLoadingData: true,
      dataError: null,
    })

    render(<BudgetItemAnalytics {...defaultAnalyticsProps} />)

    expect(screen.getByText('Loading chart data…')).toBeInTheDocument()
    expect(screen.getByTestId('map-analytics-workspace')).toBeInTheDocument()
    expect(screen.queryByTestId('chart-renderer')).not.toBeInTheDocument()
  })
})
