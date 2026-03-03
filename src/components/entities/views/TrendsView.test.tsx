/**
 * TrendsView Component Tests
 *
 * This file tests the TrendsView component which displays
 * budget trends, treemaps, and line items.
 *
 * Pattern: Complex View Testing
 * - Mock useParams, useIsMobile, useEntityExecutionLineItems
 * - Mock useTreemapDrilldown hook
 * - Mock child components (ChartCard, BudgetTreemap, etc.)
 * - Test loading state
 * - Test data display
 * - Test classification toggle
 * - Test chart interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { TrendsView } from './TrendsView'
import type { EntityDetailsData } from '@/lib/api/entities'
import type { ReportPeriodInput, GqlReportType } from '@/schemas/reporting'
import type { NormalizationOptions } from '@/lib/normalization'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Lingui
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) => {
    // Handle template literal interpolation
    return strings.reduce((result, str, i) => {
      return result + str + (values[i] !== undefined ? String(values[i]) : '')
    }, '')
  },
  msg: (strings: TemplateStringsArray) => strings[0],
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ cui: 'test-cui-123' }),
}))

// Mock mobile hook
const mockIsMobile = vi.fn(() => false)
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile(),
}))

// Mock period label hook
vi.mock('@/hooks/use-period-label', () => ({
  usePeriodLabel: () => '2024',
}))

// Mock analytics utils
vi.mock('@/lib/analytics-utils', () => ({
  getChapterMap: () => new Map([
    ['51', 'Public Administration'],
    ['54', 'Education'],
    ['61', 'Health'],
  ]),
  getTopFunctionalGroupCodes: () => ['51', '54', '61'],
}))

// Mock chart utils
vi.mock('@/components/charts/components/chart-renderer/utils', () => ({
  getSeriesColor: (index: number) => `#color-${index}`,
}))

// Mock entity line items hook
const mockLineItemsData = {
  nodes: [
    {
      line_item_id: 'li-1',
      account_category: 'ch',
      amount: 1000000,
      functionalClassification: { functional_code: '51', functional_name: 'Public Administration' },
      economicClassification: { economic_code: '10', economic_name: 'Personnel' },
    },
    {
      line_item_id: 'li-2',
      account_category: 'ch',
      amount: 500000,
      functionalClassification: { functional_code: '54', functional_name: 'Education' },
      economicClassification: { economic_code: '20', economic_name: 'Goods and Services' },
    },
  ],
  fundingSources: [
    { source_id: 1, source_description: 'State Budget' },
  ],
}

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  useEntityExecutionLineItems: () => ({
    data: mockLineItemsData,
    isLoading: false,
  }),
}))

// Mock filterLineItems
vi.mock('@/lib/api/entities', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/entities')>('@/lib/api/entities')
  return {
    ...actual,
    filterLineItems: (items: unknown[]) => items,
  }
})

// Mock useTreemapDrilldown
const mockSetPrimary = vi.fn()
const mockOnNodeClick = vi.fn()
const mockOnBreadcrumbClick = vi.fn()

vi.mock('@/components/budget-explorer/useTreemapDrilldown', () => ({
  useTreemapDrilldown: () => ({
    primary: 'fn',
    activePrimary: 'fn',
    setPrimary: mockSetPrimary,
    treemapData: [
      { name: 'Public Administration', value: 1000000, code: '51' },
      { name: 'Education', value: 500000, code: '54' },
    ],
    breadcrumbs: [],
    excludedItemsSummary: null,
    onNodeClick: mockOnNodeClick,
    onBreadcrumbClick: mockOnBreadcrumbClick,
  }),
}))

// Mock child components
vi.mock('./TrendsViewSkeleton', () => ({
  TrendsViewSkeleton: () => <div data-testid="trends-skeleton">Loading...</div>,
}))

vi.mock('./ChartCard', () => ({
  ChartCard: ({
    chart,
    onXAxisItemClick,
    onYearClick,
  }: {
    chart: { title: string }
    onXAxisItemClick?: (value: number | string) => void
    onYearClick?: (year: number) => void
    currentYear: number
    normalizationOptions: NormalizationOptions
    onNormalizationChange: (options: NormalizationOptions) => void
    xAxisMarker?: number | string
    allowPerCapita?: boolean
  }) => (
    <div data-testid="chart-card">
      <span data-testid="chart-title">{chart.title}</span>
      <button data-testid="x-axis-click" onClick={() => onXAxisItemClick?.('2024')}>
        X-Axis Click
      </button>
      <button data-testid="year-click" onClick={() => onYearClick?.(2023)}>
        Year Click
      </button>
    </div>
  ),
}))

vi.mock('@/components/budget-explorer/BudgetTreemap', () => ({
  BudgetTreemap: ({
    onNodeClick,
    data,
  }: {
    data: unknown[]
    primary: string
    onNodeClick: () => void
    onBreadcrumbClick: () => void
    path: string[]
    normalization: string
    currency: string
    excludedItemsSummary: unknown
  }) => (
    <div data-testid="budget-treemap" data-count={data?.length}>
      <button onClick={onNodeClick}>Node Click</button>
    </div>
  ),
}))

vi.mock('../EntityLineItemsTabs', () => ({
  EntityLineItemsTabs: ({
    onYearChange,
    onSearchChange,
    types,
  }: {
    lineItems: unknown[]
    fundingSources: unknown[]
    currentYear: number
    month?: string
    quarter?: string
    years: number[]
    onYearChange: (year: number) => void
    initialExpenseSearchTerm: string
    initialIncomeSearchTerm: string
    onSearchChange: (type: 'income' | 'expense', search: string) => void
    isLoading: boolean
    normalization: string
    currency: string
    lineItemsTab?: string
    onLineItemsTabChange?: (tab: string) => void
    selectedFundingKey?: string
    selectedExpenseTypeKey?: string
    onSelectedFundingKeyChange?: (key: string) => void
    onSelectedExpenseTypeKeyChange?: (key: string) => void
    transferFilter?: string
    onTransferFilterChange?: (filter: string) => void
    advancedFilter?: string
    onAdvancedFilterChange?: (filter: string | undefined) => void
    types: string[]
  }) => (
    <div data-testid="entity-line-items-tabs" data-types={types.join(',')}>
      <button data-testid="tabs-year-change" onClick={() => onYearChange(2022)}>
        Change Year
      </button>
      <button data-testid="tabs-search" onClick={() => onSearchChange('expense', 'test')}>
        Search
      </button>
    </div>
  ),
}))

// Mock normalization
vi.mock('@/lib/normalization', () => ({
  normalizeNormalizationOptions: (options: NormalizationOptions) => ({
    normalization: options.normalization || 'total',
    currency: options.currency || 'RON',
    inflation_adjusted: options.inflation_adjusted || false,
    show_period_growth: false,
  }),
}))

// Mock utils
vi.mock('@/lib/utils', () => ({
  getNormalizationUnit: () => 'RON',
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

// Mock reporting schema
vi.mock('@/schemas/reporting', () => ({
  toExecutionReportType: (type: string) => type,
  toReportTypeValue: (type: string) => type,
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createMockEntity = (overrides: Partial<EntityDetailsData> = {}): EntityDetailsData => ({
  cui: 'test-cui-123',
  name: 'Test Entity',
  entity_type: 'admin_county_council',
  is_uat: true,
  default_report_type: 'PRINCIPAL_AGGREGATED' as GqlReportType,
  uat: {
    siruta_code: 12345,
    name: 'Test UAT',
    county_name: 'Test County',
    county_code: 'TC',
  },
  ...overrides,
})

const defaultReportPeriod: ReportPeriodInput = {
  type: 'YEAR',
  selection: { dates: ['2024'] },
}

const defaultTrendPeriod: ReportPeriodInput = {
  type: 'YEAR',
  selection: { dates: ['2020', '2021', '2022', '2023', '2024'] },
}

const defaultNormalization: NormalizationOptions = {
  normalization: 'total',
  currency: 'RON',
  inflation_adjusted: false,
}

// ============================================================================
// TESTS
// ============================================================================

describe('TrendsView', () => {
  const mockOnYearClick = vi.fn()
  const mockOnSearchChange = vi.fn()
  const mockOnNormalizationChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile.mockReturnValue(false)
  })

  describe('loading state', () => {
    it('renders skeleton when isLoading is true', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
          isLoading={true}
        />
      )

      expect(screen.getByTestId('trends-skeleton')).toBeInTheDocument()
    })

    it('renders skeleton when entity is null', () => {
      render(
        <TrendsView
          entity={null}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByTestId('trends-skeleton')).toBeInTheDocument()
    })
  })

  describe('rendering', () => {
    it('renders budget distribution heading', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByText(/Budget Distribution/)).toBeInTheDocument()
    })

    it('renders BudgetTreemap', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByTestId('budget-treemap')).toBeInTheDocument()
    })

    it('renders ChartCard', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByTestId('chart-card')).toBeInTheDocument()
    })

    it('renders EntityLineItemsTabs', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByTestId('entity-line-items-tabs')).toBeInTheDocument()
    })
  })

  describe('classification toggle', () => {
    it('renders Functional toggle option', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByText('Functional')).toBeInTheDocument()
    })

    it('renders Economic toggle option', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByText('Economic')).toBeInTheDocument()
    })

    it('disables Economic toggle for income type', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="income"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      const economicToggle = screen.getByText('Economic').closest('button')
      expect(economicToggle).toBeDisabled()
    })
  })

  describe('chart interactions', () => {
    it('calls onYearClick when year click button is triggered', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      fireEvent.click(screen.getByTestId('year-click'))

      expect(mockOnYearClick).toHaveBeenCalledWith(2023)
    })
  })

  describe('line items tabs integration', () => {
    it('passes expense type to EntityLineItemsTabs', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      const tabs = screen.getByTestId('entity-line-items-tabs')
      expect(tabs).toHaveAttribute('data-types', 'expense')
    })

    it('passes income type to EntityLineItemsTabs', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="income"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      const tabs = screen.getByTestId('entity-line-items-tabs')
      expect(tabs).toHaveAttribute('data-types', 'income')
    })

    it('calls onYearClick when tabs year change is triggered', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      fireEvent.click(screen.getByTestId('tabs-year-change'))

      expect(mockOnYearClick).toHaveBeenCalledWith(2022)
    })

    it('calls onSearchChange when tabs search is triggered', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      fireEvent.click(screen.getByTestId('tabs-search'))

      expect(mockOnSearchChange).toHaveBeenCalledWith('expense', 'test')
    })
  })

  describe('treemap integration', () => {
    it('renders treemap with data', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      const treemap = screen.getByTestId('budget-treemap')
      expect(treemap).toHaveAttribute('data-count', '2')
    })
  })

  describe('chart title', () => {
    it('displays spending title for expense type', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByTestId('chart-title')).toHaveTextContent(/Spending/)
    })

    it('displays income title for income type', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="income"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByTestId('chart-title')).toHaveTextContent(/Income/)
    })
  })

  describe('mobile behavior', () => {
    it('handles mobile view without errors', () => {
      mockIsMobile.mockReturnValue(true)

      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
        />
      )

      expect(screen.getByTestId('budget-treemap')).toBeInTheDocument()
    })
  })

  describe('optional props', () => {
    it('renders with years array', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
          years={[2020, 2021, 2022, 2023, 2024]}
        />
      )

      expect(screen.getByTestId('chart-card')).toBeInTheDocument()
    })

    it('renders with lineItemsTab prop', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
          lineItemsTab="funding"
        />
      )

      expect(screen.getByTestId('entity-line-items-tabs')).toBeInTheDocument()
    })

    it('renders with search terms', () => {
      render(
        <TrendsView
          entity={createMockEntity()}
          type="expense"
          currentYear={2024}
          onYearClick={mockOnYearClick}
          onSearchChange={mockOnSearchChange}
          normalizationOptions={defaultNormalization}
          onNormalizationChange={mockOnNormalizationChange}
          reportPeriod={defaultReportPeriod}
          trendPeriod={defaultTrendPeriod}
          initialExpenseSearch="education"
          initialIncomeSearch="taxes"
        />
      )

      expect(screen.getByTestId('entity-line-items-tabs')).toBeInTheDocument()
    })
  })
})
