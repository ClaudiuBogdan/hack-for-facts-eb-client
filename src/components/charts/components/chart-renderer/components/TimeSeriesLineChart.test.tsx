/**
 * TimeSeriesLineChart Component Tests
 *
 * This file tests the TimeSeriesLineChart component which renders
 * time-series data as line charts using Recharts.
 *
 * Pattern: Recharts Component Testing
 * - Mock Recharts components
 * - Mock chart hooks
 * - Test series rendering
 * - Test diff selection
 * - Test animation settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { TimeSeriesLineChart } from './TimeSeriesLineChart'
import type { Chart, SeriesConfiguration } from '@/schemas/charts'

// ============================================================================
// MOCKS
// ============================================================================

// Captured props for assertions
let capturedLineChartProps: any = null
let capturedLineProps: any[] = []

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, onClick, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, ...props }: any) => {
    capturedLineChartProps = { ...props, onMouseDown, onMouseMove, onMouseUp, onMouseLeave }
    return (
      <div
        data-testid="line-chart"
        onClick={() => onClick?.({ activeLabel: '2023' })}
        onMouseDown={() => onMouseDown?.({ activeLabel: '2022' })}
      >
        {typeof children === 'function' ? children((id: string) => `y-axis-${id}`) : children}
      </div>
    )
  },
  Line: ({ children, ...props }: any) => {
    capturedLineProps.push(props)
    return <div data-testid="line" data-series-id={props.name}>{children}</div>
  },
  LabelList: ({ content }: any) => {
    if (content) {
      const result = content({ value: { value: 100, year: '2023', unit: 'RON' }, x: 0, y: 0 })
      return result ? <div data-testid="label-list">{result}</div> : null
    }
    return <div data-testid="label-list" />
  },
  ReferenceLine: (props: any) => (
    <div data-testid="reference-line" data-x={props.x} />
  ),
}))

// Mock MultiAxisChartContainer - chart param intentionally ignored
vi.mock('./MultiAxisChartContainer', () => ({
  MultiAxisChartContainer: ({ children, disableTooltip }: any) => (
    <div data-testid="multi-axis-container" data-disable-tooltip={disableTooltip}>
      {children((id: string) => `y-axis-${id}`)}
    </div>
  ),
}))

// Mock ChartLabel
vi.mock('./ChartLabel', () => ({
  ChartLabel: (props: any) => <text data-testid="chart-label" data-value={props.value} />,
}))

// Mock DiffArea
vi.mock('./diff-select/DiffArea', () => ({
  DiffArea: ({ refAreaLeft, refAreaRight, diffs }: any) => (
    <div data-testid="diff-area" data-left={refAreaLeft} data-right={refAreaRight} data-diffs={diffs.length} />
  ),
}))

// Mock utils
vi.mock('../utils', () => ({
  yValueFormatter: (value: number, unit: string) => `${value} ${unit}`,
}))

// Mock hooks
const mockDiffState = {
  handleMouseDown: vi.fn(),
  handleMouseMove: vi.fn(),
  handleMouseUp: vi.fn(),
  handleMouseLeave: vi.fn(),
  refAreaLeft: null as string | number | null,
  refAreaRight: null as string | number | null,
  diffs: [] as any[],
}

vi.mock('../hooks/useChartDiff', () => ({
  useChartDiff: () => mockDiffState,
}))

vi.mock('../hooks/useChartAnimation', () => ({
  useChartAnimation: () => ({ isAnimationActive: true, animationDuration: 600 }),
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createMockSeries = (overrides: Partial<SeriesConfiguration> = {}): SeriesConfiguration => ({
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

const mockTimeSeriesData: any[] = [
  {
    year: 2021,
    'series-1': { id: 'dp-1', value: 100, unit: 'RON', year: 2021 },
  },
  {
    year: 2022,
    'series-1': { id: 'dp-2', value: 150, unit: 'RON', year: 2022 },
  },
  {
    year: 2023,
    'series-1': { id: 'dp-3', value: 200, unit: 'RON', year: 2023 },
  },
]

const mockUnitMap = new Map([['series-1', 'RON']])
const mockDataMap = new Map()
const mockAggregatedData: any[] = []

const defaultProps = {
  dataMap: mockDataMap,
  aggregatedData: mockAggregatedData,
}

// ============================================================================
// TESTS
// ============================================================================

describe('TimeSeriesLineChart', () => {
  const mockOnAnnotationPositionChange = vi.fn()
  const mockOnXAxisClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    capturedLineChartProps = null
    capturedLineProps = []
    mockDiffState.refAreaLeft = null
    mockDiffState.refAreaRight = null
    mockDiffState.diffs = []
  })

  describe('rendering', () => {
    it('renders ResponsiveContainer', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('renders LineChart', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    it('renders MultiAxisChartContainer', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(screen.getByTestId('multi-axis-container')).toBeInTheDocument()
    })
  })

  describe('series rendering', () => {
    it('renders Line for each enabled series', () => {
      const chart = createMockChart({
        series: [
          createMockSeries({ id: 's1', label: 'Series 1', enabled: true }),
          createMockSeries({ id: 's2', label: 'Series 2', enabled: true }),
        ],
      })

      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={chart}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(screen.getAllByTestId('line')).toHaveLength(2)
    })

    it('does not render Line for disabled series', () => {
      const chart = createMockChart({
        series: [
          createMockSeries({ id: 's1', label: 'Series 1', enabled: true }),
          createMockSeries({ id: 's2', label: 'Series 2', enabled: false }),
        ],
      })

      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={chart}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(screen.getAllByTestId('line')).toHaveLength(1)
    })

    it('uses series color for line stroke', () => {
      const chart = createMockChart({
        series: [createMockSeries({ config: { color: '#ff0000', showDataLabels: false } })],
      })

      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={chart}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].stroke).toBe('#ff0000')
    })

    it('uses series label for line name', () => {
      const chart = createMockChart({
        series: [createMockSeries({ label: 'My Custom Label' })],
      })

      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={chart}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].name).toBe('My Custom Label')
    })

    it('uses Untitled when no label', () => {
      const chart = createMockChart({
        series: [createMockSeries({ label: '' })],
      })

      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={chart}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].name).toBe('Untitled')
    })
  })

  describe('margins', () => {
    it('uses default margins', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineChartProps.margin).toEqual({ top: 30, right: 50, left: 50, bottom: 20 })
    })

    it('overrides margins when provided', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
          margins={{ top: 100 }}
        />
      )

      expect(capturedLineChartProps.margin.top).toBe(100)
    })
  })

  describe('x-axis click', () => {
    it('navigates only on click, using the active label at click time', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
          onXAxisClick={mockOnXAxisClick}
        />
      )

      const chart = screen.getByTestId('line-chart')
      fireEvent.mouseDown(chart)
      expect(mockOnXAxisClick).not.toHaveBeenCalled()
      fireEvent.click(chart)

      expect(mockOnXAxisClick).toHaveBeenCalledWith('2023')
    })
  })

  describe('reference line', () => {
    it('renders ReferenceLine when xAxisMarker is provided', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
          xAxisMarker="2022"
        />
      )

      expect(screen.getByTestId('reference-line')).toBeInTheDocument()
      expect(screen.getByTestId('reference-line')).toHaveAttribute('data-x', '2022')
    })

    it('does not render ReferenceLine when xAxisMarker is not provided', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument()
    })
  })

  describe('diff area', () => {
    it('renders DiffArea when diff is enabled', () => {
      mockDiffState.refAreaLeft = '2021'
      mockDiffState.refAreaRight = '2023'
      mockDiffState.diffs = [{ id: 'diff-1' }]

      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart({ config: { ...createMockChart().config, showDiffControl: true } })}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(screen.getByTestId('diff-area')).toBeInTheDocument()
    })

    it('does not render DiffArea when showDiffControl is false', () => {
      mockDiffState.refAreaLeft = '2021'
      mockDiffState.refAreaRight = '2023'

      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart({ config: { ...createMockChart().config, showDiffControl: false } })}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(screen.queryByTestId('diff-area')).not.toBeInTheDocument()
    })

    it('disables tooltip when diff is active', () => {
      mockDiffState.refAreaLeft = '2021'
      mockDiffState.refAreaRight = '2023'
      mockDiffState.diffs = [{ id: 'diff-1' }]

      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart({ config: { ...createMockChart().config, showDiffControl: true } })}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(screen.getByTestId('multi-axis-container')).toHaveAttribute('data-disable-tooltip', 'true')
    })
  })

  describe('animation', () => {
    it('enables animation', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].isAnimationActive).toBe(true)
    })

    it('sets animation duration', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].animationDuration).toBe(600)
    })

    it('staggers animation begin for multiple series', () => {
      const chart = createMockChart({
        series: [
          createMockSeries({ id: 's1', enabled: true }),
          createMockSeries({ id: 's2', enabled: true }),
          createMockSeries({ id: 's3', enabled: true }),
        ],
      })

      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={chart}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].animationBegin).toBe(0)
      expect(capturedLineProps[1].animationBegin).toBe(100)
      expect(capturedLineProps[2].animationBegin).toBe(200)
    })
  })

  describe('line configuration', () => {
    it('sets monotone type', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].type).toBe('monotone')
    })

    it('sets stroke width to 2', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].strokeWidth).toBe(2)
    })

    it('sets dot radius to 1', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].dot.r).toBe(1)
    })

    it('sets connectNulls to false', () => {
      render(
        <TimeSeriesLineChart
          {...defaultProps}
          chart={createMockChart()}
          unitMap={mockUnitMap}
          timeSeriesData={mockTimeSeriesData}
          onAnnotationPositionChange={mockOnAnnotationPositionChange}
        />
      )

      expect(capturedLineProps[0].connectNulls).toBe(false)
    })
  })
})
