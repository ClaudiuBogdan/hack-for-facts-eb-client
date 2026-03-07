/**
 * MultiAxisChartContainer Component Tests
 *
 * This file tests the MultiAxisChartContainer component which renders
 * chart axes, grid, tooltip, legend, and annotations.
 *
 * Pattern: Recharts Container Testing
 * - Mock Recharts components
 * - Test unit-based Y-axis grouping
 * - Test conditional rendering (grid, tooltip, legend)
 * - Test annotations rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { MultiAxisChartContainer } from './MultiAxisChartContainer'
import type { Chart, SeriesConfiguration } from '@/schemas/charts'

// ============================================================================
// MOCKS
// ============================================================================

// Captured props for assertions
let capturedXAxisProps: any = null
let capturedYAxisProps: any[] = []
let capturedLegendProps: any = null

vi.mock('recharts', () => ({
  XAxis: (props: any) => {
    capturedXAxisProps = props
    return <div data-testid="x-axis" data-datakey={props.dataKey} />
  },
  YAxis: (props: any) => {
    capturedYAxisProps.push(props)
    return (
      <div
        data-testid="y-axis"
        data-yaxisid={props.yAxisId}
        data-orientation={props.orientation}
      />
    )
  },
  CartesianGrid: (props: any) => (
    <div data-testid="cartesian-grid" data-strokedasharray={props.strokeDasharray} />
  ),
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: (props: any) => {
    capturedLegendProps = props
    return <div data-testid="legend" />
  },
}))

// Mock ChartAnnotation
vi.mock('./ChartAnnotation', () => ({
  ChartAnnotation: ({ annotation }: any) => (
    <div data-testid="chart-annotation" data-id={annotation.id} />
  ),
}))

// Mock CustomSeriesTooltip
vi.mock('./Tooltips', () => ({
  CustomSeriesTooltip: ({ chartConfig }: any) => (
    <div data-testid="series-tooltip" data-showlegend={chartConfig?.showLegend} />
  ),
}))

// Mock utils
vi.mock('../utils', () => ({
  yValueFormatter: (value: number, unit?: string) =>
    `${value?.toLocaleString() ?? 0} ${unit ?? ''}`.trim(),
  yTickFormatter: (value: number) =>
    `${value?.toLocaleString() ?? 0}`,
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createMockSeries = (
  overrides: Partial<SeriesConfiguration> = {}
): SeriesConfiguration => ({
  id: 'series-1',
  type: 'line-items-aggregated-yearly',
  enabled: true,
  label: 'Test Series',
  unit: 'RON',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  filter: { account_category: 'ch', normalization: 'total' },
  config: { color: '#0000ff', showDataLabels: false },
  ...overrides,
})

const createMockChart = (overrides: Partial<Chart> = {}): Chart => ({
  id: 'chart-1',
  title: 'Test Chart',
  config: {
    chartType: 'line',
    color: '#000000',
    showLegend: true,
    showTooltip: true,
    showGridLines: true,
    editAnnotations: true,
    showAnnotations: true,
    showDiffControl: false,
    showDataLabels: false,
  },
  series: [createMockSeries()],
  annotations: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const mockUnitMap = new Map([['series-1', 'RON']])

// ============================================================================
// TESTS
// ============================================================================

describe('MultiAxisChartContainer', () => {
  const mockOnAnnotationPositionChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    capturedXAxisProps = null
    capturedYAxisProps = []
    capturedLegendProps = null
  })

  describe('rendering', () => {
    it('renders XAxis with year dataKey', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart()}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Chart content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getByTestId('x-axis')).toBeInTheDocument()
      expect(capturedXAxisProps.dataKey).toBe('year')
    })

    it('renders YAxis for each unique unit', () => {
      const chart = createMockChart({
        series: [
          createMockSeries({ id: 's1', enabled: true }),
          createMockSeries({ id: 's2', enabled: true }),
        ],
      })
      const unitMap = new Map([
        ['s1', 'RON'],
        ['s2', 'EUR'],
      ])

      render(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={unitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Chart content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getAllByTestId('y-axis')).toHaveLength(2)
    })

    it('renders children when passed as ReactNode', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart()}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div data-testid="child-content">Chart content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
    })

    it('passes getYAxisId function to children when passed as function', () => {
      let capturedGetYAxisId: ((id: string) => string) | null = null

      render(
        <MultiAxisChartContainer
          chart={createMockChart()}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          {(getYAxisId) => {
            capturedGetYAxisId = getYAxisId
            return <div data-testid="child-content">Chart content</div>
          }}
        </MultiAxisChartContainer>
      )

      expect(capturedGetYAxisId).not.toBeNull()
      expect(capturedGetYAxisId!('series-1')).toBe('yaxis-0')
    })
  })

  describe('Y-axis grouping', () => {
    it('groups series by unit', () => {
      const chart = createMockChart({
        series: [
          createMockSeries({ id: 's1', enabled: true }),
          createMockSeries({ id: 's2', enabled: true }),
          createMockSeries({ id: 's3', enabled: true }),
        ],
      })
      const unitMap = new Map([
        ['s1', 'RON'],
        ['s2', 'RON'],
        ['s3', 'EUR'],
      ])

      render(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={unitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      // Should have 2 Y-axes (RON and EUR)
      expect(screen.getAllByTestId('y-axis')).toHaveLength(2)
    })

    it('alternates Y-axis orientation (left/right)', () => {
      const chart = createMockChart({
        series: [
          createMockSeries({ id: 's1', enabled: true }),
          createMockSeries({ id: 's2', enabled: true }),
        ],
      })
      const unitMap = new Map([
        ['s1', 'AAA'],
        ['s2', 'ZZZ'],
      ])

      render(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={unitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(capturedYAxisProps[0].orientation).toBe('left')
      expect(capturedYAxisProps[1].orientation).toBe('right')
    })

    it('excludes disabled series from Y-axis grouping', () => {
      const chart = createMockChart({
        series: [
          createMockSeries({ id: 's1', enabled: true }),
          createMockSeries({ id: 's2', enabled: false }),
        ],
      })
      const unitMap = new Map([
        ['s1', 'RON'],
        ['s2', 'EUR'],
      ])

      render(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={unitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      // Only 1 Y-axis (for enabled series)
      expect(screen.getAllByTestId('y-axis')).toHaveLength(1)
    })

    it('returns default axis ID for unknown series', () => {
      let capturedGetYAxisId: ((id: string) => string) | null = null

      render(
        <MultiAxisChartContainer
          chart={createMockChart()}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          {(getYAxisId) => {
            capturedGetYAxisId = getYAxisId
            return <div>Content</div>
          }}
        </MultiAxisChartContainer>
      )

      expect(capturedGetYAxisId!('unknown-series')).toBe('yaxis-0')
    })
  })

  describe('grid lines', () => {
    it('renders CartesianGrid when showGridLines is true', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart({ config: { ...createMockChart().config, showGridLines: true } })}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument()
    })

    it('does not render CartesianGrid when showGridLines is false', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart({ config: { ...createMockChart().config, showGridLines: false } })}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.queryByTestId('cartesian-grid')).not.toBeInTheDocument()
    })
  })

  describe('tooltip', () => {
    it('renders Tooltip when showTooltip is true', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart({ config: { ...createMockChart().config, showTooltip: true } })}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })

    it('does not render Tooltip when showTooltip is false', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart({ config: { ...createMockChart().config, showTooltip: false } })}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()
    })

    it('does not render Tooltip when disableTooltip is true', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart({ config: { ...createMockChart().config, showTooltip: true } })}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
          disableTooltip={true}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()
    })
  })

  describe('legend', () => {
    it('renders Legend when showLegend is true', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart({ config: { ...createMockChart().config, showLegend: true } })}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getByTestId('legend')).toBeInTheDocument()
    })

    it('does not render Legend when showLegend is false', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart({ config: { ...createMockChart().config, showLegend: false } })}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.queryByTestId('legend')).not.toBeInTheDocument()
    })

    it('configures Legend with bottom alignment', () => {
      render(
        <MultiAxisChartContainer
          chart={createMockChart({ config: { ...createMockChart().config, showLegend: true } })}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(capturedLegendProps.verticalAlign).toBe('bottom')
      expect(capturedLegendProps.height).toBe(36)
    })

    it('truncates long legend labels', () => {
      const longLabel =
        'Cote și sume defalcate din impozitul pe venit pentru bugetul local'

      render(
        <MultiAxisChartContainer
          chart={createMockChart({
            config: { ...createMockChart().config, showLegend: true },
            series: [
              createMockSeries({
                label: longLabel,
              }),
            ],
          })}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      const formattedLabel = capturedLegendProps.formatter(longLabel)

      expect(formattedLabel).not.toBe(longLabel)
      expect(formattedLabel.endsWith('…')).toBe(true)
      expect(formattedLabel.length).toBe(36)
    })
  })

  describe('annotations', () => {
    it('renders annotations when showAnnotations is true', () => {
      const chart = createMockChart({
        config: { ...createMockChart().config, showAnnotations: true },
        annotations: [
          {
            id: 'ann-1',
            type: 'annotation',
            enabled: true,
            pX: 0.5,
            pY: 0.5,
            pXDelta: 0.1,
            pYDelta: 0.1,
            color: '#ff0000',
            title: 'Test',
            subtitle: '',
            connector: true,
            subject: true,
            label: true,
            locked: false,
          },
        ],
      })

      render(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getByTestId('chart-annotation')).toBeInTheDocument()
    })

    it('does not render annotations when showAnnotations is false', () => {
      const chart = createMockChart({
        config: { ...createMockChart().config, showAnnotations: false },
        annotations: [
          {
            id: 'ann-1',
            type: 'annotation',
            enabled: true,
            pX: 0.5,
            pY: 0.5,
            pXDelta: 0.1,
            pYDelta: 0.1,
            color: '#ff0000',
            title: 'Test',
            subtitle: '',
            connector: true,
            subject: true,
            label: true,
            locked: false,
          },
        ],
      })

      render(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.queryByTestId('chart-annotation')).not.toBeInTheDocument()
    })

    it('does not render disabled annotations', () => {
      const chart = createMockChart({
        config: { ...createMockChart().config, showAnnotations: true },
        annotations: [
          {
            id: 'ann-1',
            type: 'annotation',
            enabled: false,
            pX: 0.5,
            pY: 0.5,
            pXDelta: 0.1,
            pYDelta: 0.1,
            color: '#ff0000',
            title: 'Test',
            subtitle: '',
            connector: true,
            subject: true,
            label: true,
            locked: false,
          },
        ],
      })

      render(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.queryByTestId('chart-annotation')).not.toBeInTheDocument()
    })

    it('renders multiple annotations', () => {
      const chart = createMockChart({
        config: { ...createMockChart().config, showAnnotations: true },
        annotations: [
          {
            id: 'ann-1',
            type: 'annotation',
            enabled: true,
            pX: 0.3,
            pY: 0.3,
            pXDelta: 0.1,
            pYDelta: 0.1,
            color: '#ff0000',
            title: 'First',
            subtitle: '',
            connector: true,
            subject: true,
            label: true,
            locked: false,
          },
          {
            id: 'ann-2',
            type: 'annotation',
            enabled: true,
            pX: 0.7,
            pY: 0.7,
            pXDelta: 0.1,
            pYDelta: 0.1,
            color: '#00ff00',
            title: 'Second',
            subtitle: '',
            connector: true,
            subject: true,
            label: true,
            locked: false,
          },
        ],
      })

      render(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div>Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getAllByTestId('chart-annotation')).toHaveLength(2)
    })
  })

  describe('memoization', () => {
    it('renders with all required props', () => {
      const chart = createMockChart()

      const { rerender } = render(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div data-testid="content">Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getByTestId('content')).toBeInTheDocument()

      // Re-render with same props
      rerender(
        <MultiAxisChartContainer
          chart={chart}
          unitMap={mockUnitMap}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        >
          <div data-testid="content">Content</div>
        </MultiAxisChartContainer>
      )

      expect(screen.getByTestId('content')).toBeInTheDocument()
    })
  })
})
