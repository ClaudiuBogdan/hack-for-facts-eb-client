import { useState } from 'react'
import { fireEvent, render, screen } from '@/test/test-utils'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { makeSingleTimePeriod } from '@/schemas/reporting'
import { BudgetItemAnalytics } from './budget-item-analytics'
import type { BudgetItemAnalyticsProps } from './budget-item-analytics-context'
import { getDefaultBudgetItemAnalyticsViewState } from './budget-item-analytics-search-state'

const navigateMock = vi.fn()
const createMapCloneHandoffMock = vi.fn()
const analyticsCaptureMock = vi.fn()
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
    ...props
  }: {
    children: React.ReactNode
    to: string
    params?: Record<string, string>
  } & Record<string, unknown>) => {
    const href = Object.entries(params ?? {}).reduce(
      (resolvedPath, [key, value]) =>
        resolvedPath.replace(`$${key}`, encodeURIComponent(value)),
      to,
    )

    return <a href={href} {...props}>{children}</a>
  },
  useNavigate: () => navigateMock,
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

vi.mock('@/features/advanced-map-analytics/store/map-clone-handoff', () => ({
  createMapCloneHandoff: (...args: unknown[]) =>
    createMapCloneHandoffMock(...args),
}))

vi.mock('@/lib/analytics', () => ({
  Analytics: {
    capture: (...args: unknown[]) => analyticsCaptureMock(...args),
    EVENTS: {
      AdvancedMapAnalyticsCloneHandoffUsed:
        'advanced_map_analytics_clone_handoff_used',
    },
  },
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
  onExpenseTypeChange: vi.fn(),
  onYearChange: vi.fn(),
  onPeriodChange: vi.fn(),
  onEntityCuiChange: vi.fn(),
}

describe('BudgetItemAnalytics', () => {
  const resolvedTitle =
    'Town Hall of Example · Education · Salary expenses in cash'
  const seriesLabel = 'Education · Salary expenses in cash'
  const runtimeMapState = {
    mapName: `Map (2025): ${seriesLabel}`,
    activeView: 'map',
    activeSeriesId: 'runtime-series-1',
    activeBinPresetId: 'runtime-preset-1',
    binsPresets: [],
    series: [],
    mapCenter: [45.12345, 24.98765] as [number, number],
    mapZoom: 9.3,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    createMapCloneHandoffMock.mockReturnValue('clone_ref_1')
    useBudgetItemAnalyticsTitleMock.mockReturnValue({
      resolvedTitle,
      seriesLabel,
    })
    useMapPreviewRuntimeStateMock.mockReturnValue({
      mapState: runtimeMapState,
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
    expect(
      screen.getByRole('link', { name: 'search fn' }),
    ).toHaveAttribute('href', '/classifications/functional')
    expect(
      screen.getByRole('link', { name: 'search fn' }),
    ).toHaveAttribute('target', '_blank')
    expect(
      screen.getByRole('link', { name: 'search fn' }),
    ).toHaveAttribute('rel', 'noopener noreferrer')
    expect(
      screen.getByRole('link', { name: 'search ec' }),
    ).toHaveAttribute('href', '/classifications/economic')
    expect(
      screen.getByRole('link', { name: 'search ec' }),
    ).toHaveAttribute('target', '_blank')
    expect(
      screen.getByRole('link', { name: 'search ec' }),
    ).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('Budget execution evolution')).toBeInTheDocument()
    expect(screen.getByText('Map (2025)')).toBeInTheDocument()
    expect(screen.getByText('Execution')).toBeInTheDocument()
    expect(screen.getByText('Commitments')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Selected period: 2025' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2016-2025 yearly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show extra options' })).toBeInTheDocument()
    expect(screen.queryByText('Report type')).not.toBeInTheDocument()
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
        mapKey: 'budget-item-analytics:12345678:ch:execution:selected:65:10.01:all-expense-types:CREDITE_ANGAJAMENT',
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

  it('keeps secondary controls collapsed by default and expands them with the plus button', () => {
    render(<BudgetItemAnalytics {...defaultAnalyticsProps} />)

    expect(screen.queryByText('Report type')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Expense type: All' }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show extra options' }))

    expect(screen.getByText('Report type')).toBeInTheDocument()
    expect(screen.getByText('Only city hall')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Expense type: All' }),
    ).toBeInTheDocument()
  })

  it('updates the execution expense type from the analytics controls', () => {
    const onExpenseTypeChange = vi.fn()

    function TestHarness() {
      const [expenseType, setExpenseType] = useState<
        BudgetItemAnalyticsProps['context']['expenseType']
      >(undefined)

      return (
        <BudgetItemAnalytics
          {...defaultAnalyticsProps}
          context={{
            ...defaultAnalyticsProps.context,
            expenseType,
          }}
          onExpenseTypeChange={(nextExpenseType) => {
            onExpenseTypeChange(nextExpenseType)
            setExpenseType(nextExpenseType)
          }}
        />
      )
    }

    render(<TestHarness />)

    fireEvent.click(screen.getByRole('button', { name: 'Show extra options' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expense type: All' }))

    expect(
      screen.getByRole('button', { name: 'Expense type: Operations' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Expense type: Operations' }),
    )

    expect(
      screen.getByRole('button', { name: 'Expense type: Development' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Expense type: Development' }),
    )

    expect(
      screen.getByRole('button', { name: 'Expense type: All' }),
    ).toBeInTheDocument()

    expect(onExpenseTypeChange).toHaveBeenNthCalledWith(1, 'functionare')
    expect(onExpenseTypeChange).toHaveBeenNthCalledWith(2, 'dezvoltare')
    expect(onExpenseTypeChange).toHaveBeenNthCalledWith(3, undefined)
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

  it('keeps an empty analytics selection when the last active code is removed', () => {
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

    expect(defaultAnalyticsProps.onSelectionChange).toHaveBeenCalledWith({
      functionalCode: undefined,
      economicCode: undefined,
    })
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

    fireEvent.click(screen.getByRole('button', { name: 'Show extra options' }))
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

    expect(screen.getByRole('button', { name: '2019-2025 yearly' })).toBeInTheDocument()
    expect(screen.queryByText('Metric')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show extra options' }))

    expect(screen.getByText('Metric')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Expense type: All' }),
    ).not.toBeInTheDocument()
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

  it('uses time-series rendering and disables period selection in all timeframe mode', () => {
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
        aggregatedData: [],
        timeSeriesData: [{ year: 2024 }],
        xAxisMarker: undefined,
      }),
    )
    expect(convertToAggregatedDataMock).not.toHaveBeenCalled()
  })

  it('shows quarter labels and forwards quarter selection when the current period is quarterly', () => {
    render(
      <BudgetItemAnalytics
        {...defaultAnalyticsProps}
        context={{
          ...defaultAnalyticsProps.context,
          currentReportPeriod: {
            type: 'QUARTER',
            selection: {
              interval: {
                start: '2025-Q3',
                end: '2025-Q3',
              },
            },
          },
          historyReportPeriod: {
            type: 'QUARTER',
            selection: {
              interval: {
                start: '2025-Q1',
                end: '2025-Q4',
              },
            },
          },
        }}
      />,
    )

    expect(screen.getByText('Map (2025-Q3)')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Selected period: 2025-Q3' }),
    ).toBeInTheDocument()

    const latestQuarterChartCall =
      chartRendererMock.mock.calls[chartRendererMock.mock.calls.length - 1]
    const onXAxisClick = latestQuarterChartCall?.[0]?.onXAxisClick as
      | ((value: string) => void)
      | undefined
    onXAxisClick?.('2025-Q2')

    expect(defaultAnalyticsProps.onPeriodChange).toHaveBeenCalledWith('Q2')
  })

  it('shows month labels and forwards month selection when the current period is monthly', () => {
    render(
      <BudgetItemAnalytics
        {...defaultAnalyticsProps}
        context={{
          ...defaultAnalyticsProps.context,
          currentReportPeriod: {
            type: 'MONTH',
            selection: {
              interval: {
                start: '2025-11',
                end: '2025-11',
              },
            },
          },
          historyReportPeriod: {
            type: 'MONTH',
            selection: {
              interval: {
                start: '2025-01',
                end: '2025-12',
              },
            },
          },
        }}
      />,
    )

    expect(screen.getByText('Map (2025-11)')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Selected period: 2025-11' }),
    ).toBeInTheDocument()

    const latestMonthChartCall =
      chartRendererMock.mock.calls[chartRendererMock.mock.calls.length - 1]
    const onXAxisClick = latestMonthChartCall?.[0]?.onXAxisClick as
      | ((value: string) => void)
      | undefined
    onXAxisClick?.('2025-03')

    expect(defaultAnalyticsProps.onPeriodChange).toHaveBeenCalledWith('03')
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

  it('opens the current map preview in the map editor', () => {
    render(<BudgetItemAnalytics {...defaultAnalyticsProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open in map editor' }))

    const handoffPayload = createMapCloneHandoffMock.mock.calls[0]?.[0] as
      | {
        mapState: unknown
        mapDescription: string
      }
      | undefined

    expect(handoffPayload?.mapState).toEqual(runtimeMapState)
    expect(handoffPayload?.mapDescription).toContain(`**${seriesLabel}**`)
    expect(handoffPayload?.mapDescription).toContain('fn:65')
    expect(handoffPayload?.mapDescription).toContain('ec:10.01')
    expect(analyticsCaptureMock).toHaveBeenCalledWith(
      'advanced_map_analytics_clone_handoff_used',
      {
        source: 'budget_item_analytics_modal',
      },
    )
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/maps/editor/new',
      search: { cloneRef: 'clone_ref_1' },
    })
  })
})
