/**
 * EntityFinancialTrends Component Tests
 *
 * This file tests the EntityFinancialTrends component which displays
 * financial trend charts with income, expense, and balance data.
 *
 * Pattern: Chart Component Testing
 * - Mock Recharts components
 * - Mock TanStack Router (useParams, Link)
 * - Mock useMediaQuery hook
 * - Test rendering states
 * - Test normalization controls
 * - Test growth toggle
 * - Test loading state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { EntityFinancialTrends } from './EntityFinancialTrends'
import type { AnalyticsSeries } from '@/schemas/charts'
import type { NormalizationOptions } from '@/lib/normalization'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Lingui
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} data-testid="router-link" {...props}>
      {children}
    </a>
  ),
}))

// Mock useMediaQuery
vi.mock('@/hooks/use-media-query', () => ({
  useMediaQuery: () => false, // Default to desktop
}))

// Mock buildEntityIncomeExpenseChartLink
vi.mock('@/lib/chart-links', () => ({
  buildEntityIncomeExpenseChartLink: (cui: string) => ({
    to: `/charts/income-expense-${cui}`,
    params: { chartId: `income-expense-${cui}` },
    search: {},
  }),
}))

// Mock NormalizationModeSelect
vi.mock('@/components/normalization/normalization-mode-select', () => ({
  NormalizationModeSelect: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (value: string) => void
  }) => (
    <select
      data-testid="normalization-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="total">Total</option>
      <option value="per_capita">Per Capita</option>
      <option value="percent_gdp">% of GDP</option>
    </select>
  ),
}))

// Mock EntityFinancialTrendsSkeleton
vi.mock('./EntityFinancialTrendsSkeleton', () => ({
  EntityFinancialTrendsSkeleton: () => (
    <div data-testid="financial-trends-skeleton">Loading...</div>
  ),
}))

// Mock yValueFormatter
vi.mock('../charts/components/chart-renderer/utils', () => ({
  yValueFormatter: (value: number, unit: string) => `${value} ${unit}`,
}))

// Mock normalization utilities
vi.mock('@/lib/normalization', () => ({
  normalizeNormalizationOptions: (opts: NormalizationOptions) => ({
    normalization: opts.normalization || 'total',
    currency: opts.currency || 'RON',
    show_period_growth: opts.show_period_growth || false,
    inflation_adjusted: opts.inflation_adjusted || false,
  }),
}))

vi.mock('@/lib/utils', () => ({
  getNormalizationUnit: () => 'RON',
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
}))

// Mock Recharts - simplified for testing
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children, data, onClick, onMouseMove }: any) => (
    <div
      data-testid="composed-chart"
      data-points={data?.length}
      onClick={() => onClick?.({ activeLabel: '2024' })}
      onMouseMove={() => onMouseMove?.({ activeLabel: '2023' })}
    >
      {children}
    </div>
  ),
  Bar: ({ dataKey, name }: any) => (
    <div data-testid={`bar-${dataKey}`} data-name={name} />
  ),
  Line: ({ dataKey, name }: any) => (
    <div data-testid={`line-${dataKey}`} data-name={name} />
  ),
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ReferenceLine: ({ x, y }: any) => (
    <div data-testid="reference-line" data-x={x} data-y={y} />
  ),
  LabelList: () => null,
}))

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

const createMockTrendSeries = (
  type: 'income' | 'expense' | 'balance',
  overrides: Partial<AnalyticsSeries> = {}
): AnalyticsSeries => ({
  seriesId: `${type}-series`,
  xAxis: { name: 'Year', type: 'STRING', unit: '' },
  yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' },
  data: [
    { x: '2022', y: type === 'income' ? 1000000 : type === 'expense' ? 900000 : 100000 },
    { x: '2023', y: type === 'income' ? 1100000 : type === 'expense' ? 950000 : 150000 },
    { x: '2024', y: type === 'income' ? 1200000 : type === 'expense' ? 1000000 : 200000 },
  ],
  ...overrides,
})

const createDefaultNormalizationOptions = (
  overrides: Partial<NormalizationOptions> = {}
): NormalizationOptions => ({
  normalization: 'total',
  currency: 'RON',
  show_period_growth: false,
  inflation_adjusted: false,
  ...overrides,
})

// ============================================================================
// TESTS
// ============================================================================

describe('EntityFinancialTrends', () => {
  const mockOnNormalizationChange = vi.fn()
  const mockOnYearChange = vi.fn()
  const mockOnPrefetchPeriod = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders card with title', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          expenseTrend={createMockTrendSeries('expense')}
          balanceTrend={createMockTrendSeries('balance')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      expect(screen.getByText('Financial Trends')).toBeInTheDocument()
    })

    it('renders trending up icon', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      // TrendingUp icon should be present
      expect(document.querySelector('.lucide-trending-up')).toBeInTheDocument()
    })

    it('renders external link to chart editor', () => {
      render(
        <EntityFinancialTrends
          entityCui="entity-123"
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      expect(screen.getByLabelText('Open in chart editor')).toBeInTheDocument()
    })

    it('hides challenge-only controls when requested', () => {
      render(
        <EntityFinancialTrends
          entityCui="entity-123"
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
          showControls={false}
          showChartEditorLink={false}
        />
      )

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
      expect(screen.queryByTestId('normalization-select')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Open in chart editor')).not.toBeInTheDocument()
    })

    it('renders chart components when data available', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          expenseTrend={createMockTrendSeries('expense')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
      expect(screen.getByTestId('bar-income')).toBeInTheDocument()
      expect(screen.getByTestId('bar-expense')).toBeInTheDocument()
    })

    it('renders balance line chart', () => {
      render(
        <EntityFinancialTrends
          balanceTrend={createMockTrendSeries('balance')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      expect(screen.getByTestId('line-balance')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('renders skeleton when loading', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
          isLoading={true}
        />
      )

      expect(screen.getByTestId('financial-trends-skeleton')).toBeInTheDocument()
    })

    it('does not render chart when loading', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
          isLoading={true}
        />
      )

      expect(screen.queryByTestId('composed-chart')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows no data message when no trends available', () => {
      render(
        <EntityFinancialTrends
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      expect(
        screen.getByText('No data available to display financial evolution.')
      ).toBeInTheDocument()
    })

    it('does not render chart when no data', () => {
      render(
        <EntityFinancialTrends
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      expect(screen.queryByTestId('composed-chart')).not.toBeInTheDocument()
    })
  })

  describe('growth toggle', () => {
    it('renders growth toggle checkbox', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      expect(screen.getByText('Show growth (%)')).toBeInTheDocument()
    })

    it('calls onNormalizationChange when growth toggle is clicked', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      expect(mockOnNormalizationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          show_period_growth: true,
        })
      )
    })

    it('checkbox reflects current state', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions({ show_period_growth: true })}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })
  })

  describe('normalization select', () => {
    it('renders normalization mode select', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      expect(screen.getByTestId('normalization-select')).toBeInTheDocument()
    })

    it('calls onNormalizationChange when normalization changes', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      const select = screen.getByTestId('normalization-select')
      fireEvent.change(select, { target: { value: 'per_capita' } })

      expect(mockOnNormalizationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          normalization: 'per_capita',
        })
      )
    })
  })

  describe('chart interactions', () => {
    it('calls onYearChange when chart is clicked in YEAR mode', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
          onYearChange={mockOnYearChange}
          periodType="YEAR"
        />
      )

      const chart = screen.getByTestId('composed-chart')
      fireEvent.click(chart)

      expect(mockOnYearChange).toHaveBeenCalledWith(2024)
    })

    it('calls onPrefetchPeriod on chart hover', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
          onPrefetchPeriod={mockOnPrefetchPeriod}
          periodType="YEAR"
        />
      )

      const chart = screen.getByTestId('composed-chart')
      fireEvent.mouseMove(chart)

      expect(mockOnPrefetchPeriod).toHaveBeenCalledWith('2023')
    })
  })

  describe('reference lines', () => {
    it('renders reference line for current year in YEAR mode', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
          periodType="YEAR"
        />
      )

      const referenceLines = screen.getAllByTestId('reference-line')
      const yearLine = referenceLines.find((el) => el.getAttribute('data-x') === '2024')
      expect(yearLine).toBeInTheDocument()
    })

    it('renders reference line at y=0', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      const referenceLines = screen.getAllByTestId('reference-line')
      const zeroLine = referenceLines.find((el) => el.getAttribute('data-y') === '0')
      expect(zeroLine).toBeInTheDocument()
    })
  })

  describe('period types', () => {
    it('accepts QUARTER period type', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
          periodType="QUARTER"
          selectedQuarter="Q2"
        />
      )

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })

    it('accepts MONTH period type', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
          periodType="MONTH"
          selectedMonth="06"
        />
      )

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument()
    })
  })

  describe('allowPerCapita prop', () => {
    it('passes allowPerCapita to NormalizationModeSelect', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
          allowPerCapita={true}
        />
      )

      // Component renders without error
      expect(screen.getByTestId('normalization-select')).toBeInTheDocument()
    })
  })

  describe('data merging', () => {
    it('renders correct number of data points', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          expenseTrend={createMockTrendSeries('expense')}
          balanceTrend={createMockTrendSeries('balance')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      const chart = screen.getByTestId('composed-chart')
      expect(chart).toHaveAttribute('data-points', '3')
    })
  })

  describe('accessibility', () => {
    it('external link button has aria-label', () => {
      render(
        <EntityFinancialTrends
          entityCui="entity-123"
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      expect(screen.getByLabelText('Open in chart editor')).toBeInTheDocument()
    })

    it('growth checkbox has associated label', () => {
      render(
        <EntityFinancialTrends
          incomeTrend={createMockTrendSeries('income')}
          currentYear={2024}
          entityName="Test Entity"
          normalizationOptions={createDefaultNormalizationOptions()}
          onNormalizationChange={mockOnNormalizationChange}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('id', 'entity-growth-toggle')
    })
  })
})
