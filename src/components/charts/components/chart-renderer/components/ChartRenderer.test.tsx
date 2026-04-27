/**
 * ChartRenderer Component Tests
 *
 * This file demonstrates the testing pattern for components with conditional
 * rendering based on props. The ChartRenderer routes to different chart
 * implementations based on the chart type configuration.
 *
 * Pattern: Conditional Rendering Testing
 * - Mock child components to isolate the router logic
 * - Test that correct child is rendered for each chart type
 * - Test empty states and error conditions
 * - Use test data factories for consistent test data
 *
 * @see docs/COMPONENT_TESTING.md for full testing guidelines
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { ChartRenderer } from './ChartRenderer'
import { Chart } from '@/schemas/charts'
import { DataPointPayload, DataSeriesMap, Unit } from '@/components/charts/hooks/useChartData'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Lingui i18n
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
}))

// Mock all chart type implementations
// We mock these to isolate the ChartRenderer's routing logic
vi.mock('./TimeSeriesLineChart', () => ({
  TimeSeriesLineChart: () => <div data-testid="time-series-line-chart" />
}))

vi.mock('./TimeSeriesBarChart', () => ({
  TimeSeriesBarChart: () => <div data-testid="time-series-bar-chart" />
}))

vi.mock('./TimeSeriesAreaChart', () => ({
  TimeSeriesAreaChart: () => <div data-testid="time-series-area-chart" />
}))

vi.mock('./aggregated-charts/AggregatedBarChart', () => ({
  AggregatedBarChart: () => <div data-testid="aggregated-bar-chart" />
}))

vi.mock('./aggregated-charts/AggregatedPieChart', () => ({
  AggregatedPieChart: () => <div data-testid="aggregated-pie-chart" />
}))

vi.mock('./aggregated-charts/AggregatedTreemapChart', () => ({
  AggregatedTreemapChart: () => <div data-testid="aggregated-treemap-chart" />
}))

vi.mock('./aggregated-charts/AggregatedSankeyChart', () => ({
  AggregatedSankeyChart: () => <div data-testid="aggregated-sankey-chart" />
}))

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Creates a base mock chart object.
 * Use this factory to generate consistent test data.
 */
const createMockChart = (
  chartType: string = 'line',
  options: { seriesEnabled?: boolean; seriesCount?: number } = {}
): Chart => ({
  id: '123',
  title: 'Test Chart',
  config: {
    chartType: chartType as Chart['config']['chartType'],
    color: '#000',
    showGridLines: true,
    showLegend: true,
    showTooltip: true,
    editAnnotations: false,
    showAnnotations: false,
  },
  series: Array.from({ length: options.seriesCount ?? 1 }, (_, i) => ({
    id: `s${i + 1}`,
    type: 'line-items-aggregated-yearly',
    enabled: options.seriesEnabled ?? true,
    label: `Series ${i + 1}`,
    filter: {},
    config: {},
   
  })) as any,
  annotations: [],
  createdAt: '',
  updatedAt: ''
})

// Shared mock data for all tests
const mockDataMap: DataSeriesMap = new Map()
const mockUnitMap: Map<string, Unit> = new Map()
 
const mockTimeSeriesData: any[] = []
const mockAggregatedData: DataPointPayload[] = []

/**
 * Helper to render ChartRenderer with all required props
 */
const renderChartRenderer = (chart: Chart) => {
  return render(
    <ChartRenderer
      chart={chart}
      dataMap={mockDataMap}
      unitMap={mockUnitMap}
      timeSeriesData={mockTimeSeriesData}
      aggregatedData={mockAggregatedData}
      onAnnotationPositionChange={vi.fn()}
    />
  )
}

// ============================================================================
// TESTS
// ============================================================================

describe('ChartRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty states', () => {
    it('renders "No enabled series" message when all series are disabled', () => {
      const chart = createMockChart('line', { seriesEnabled: false })

      renderChartRenderer(chart)

      expect(screen.getByText('No enabled series data available to display.')).toBeInTheDocument()
    })

    it('renders "No enabled series" when series array is empty', () => {
      const chart = createMockChart('line', { seriesCount: 0 })

      renderChartRenderer(chart)

      expect(screen.getByText('No enabled series data available to display.')).toBeInTheDocument()
    })
  })

  describe('unsupported chart types', () => {
    it('renders "Unsupported chart type" message for invalid type', () => {
       
      const chart = createMockChart('invalid' as any)

      renderChartRenderer(chart)

      expect(screen.getByText('Unsupported chart type: invalid')).toBeInTheDocument()
    })
  })

  describe('time series chart types', () => {
    it('renders TimeSeriesLineChart for line chart type', () => {
      const chart = createMockChart('line')

      renderChartRenderer(chart)

      expect(screen.getByTestId('time-series-line-chart')).toBeInTheDocument()
    })

    it('renders TimeSeriesBarChart for bar chart type', () => {
      const chart = createMockChart('bar')

      renderChartRenderer(chart)

      expect(screen.getByTestId('time-series-bar-chart')).toBeInTheDocument()
    })

    it('renders TimeSeriesAreaChart for area chart type', () => {
      const chart = createMockChart('area')

      renderChartRenderer(chart)

      expect(screen.getByTestId('time-series-area-chart')).toBeInTheDocument()
    })
  })

  describe('aggregated chart types', () => {
    it('renders AggregatedBarChart for bar-aggr chart type', () => {
      const chart = createMockChart('bar-aggr')

      renderChartRenderer(chart)

      expect(screen.getByTestId('aggregated-bar-chart')).toBeInTheDocument()
    })

    it('renders AggregatedPieChart for pie-aggr chart type', () => {
      const chart = createMockChart('pie-aggr')

      renderChartRenderer(chart)

      expect(screen.getByTestId('aggregated-pie-chart')).toBeInTheDocument()
    })

    it('renders AggregatedTreemapChart for treemap-aggr chart type', () => {
      const chart = createMockChart('treemap-aggr')

      renderChartRenderer(chart)

      expect(screen.getByTestId('aggregated-treemap-chart')).toBeInTheDocument()
    })

    it('renders AggregatedSankeyChart for sankey-aggr chart type', () => {
      const chart = createMockChart('sankey-aggr')

      renderChartRenderer(chart)

      expect(screen.getByTestId('aggregated-sankey-chart')).toBeInTheDocument()
    })
  })

  describe('chart type coverage (using test.each)', () => {
    // This pattern is useful for testing multiple similar cases
    const supportedTypes = [
      ['line', 'time-series-line-chart'],
      ['bar', 'time-series-bar-chart'],
      ['area', 'time-series-area-chart'],
      ['bar-aggr', 'aggregated-bar-chart'],
      ['pie-aggr', 'aggregated-pie-chart'],
      ['treemap-aggr', 'aggregated-treemap-chart'],
      ['sankey-aggr', 'aggregated-sankey-chart'],
    ] as const

    it.each(supportedTypes)(
      'renders correct component for "%s" chart type',
      (chartType, expectedTestId) => {
        const chart = createMockChart(chartType)

        renderChartRenderer(chart)

        expect(screen.getByTestId(expectedTestId)).toBeInTheDocument()
      }
    )
  })

  describe('mixed series states', () => {
    it('renders chart when at least one series is enabled', () => {
      const chart = createMockChart('line', { seriesCount: 3 })
      // Disable some series but keep one enabled
      chart.series[0].enabled = false
      chart.series[1].enabled = false
      // series[2] remains enabled

      renderChartRenderer(chart)

      expect(screen.getByTestId('time-series-line-chart')).toBeInTheDocument()
    })

    it('renders empty state when all series become disabled', () => {
      const chart = createMockChart('line', { seriesCount: 2 })
      chart.series[0].enabled = false
      chart.series[1].enabled = false

      renderChartRenderer(chart)

      expect(screen.getByText('No enabled series data available to display.')).toBeInTheDocument()
    })
  })
})
