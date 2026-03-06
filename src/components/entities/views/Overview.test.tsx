/**
 * Overview Component Tests
 *
 * This file tests the Overview component which is the main
 * entity overview page with financial summary, trends, treemap, and tabs.
 *
 * Pattern: Complex View Testing
 * - Mock multiple hooks (useEntityExecutionLineItems, useTreemapDrilldown, etc.)
 * - Mock all child components
 * - Test toggle interactions
 * - Test callback handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { Overview } from './Overview'
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
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to} data-testid="router-link">
      {children}
    </a>
  ),
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
      account_category: 'vn',
      amount: 1500000,
      functionalClassification: { functional_code: '01', functional_name: 'Income' },
      economicClassification: { economic_code: '01', economic_name: 'Taxes' },
    },
  ],
  fundingSources: [{ source_id: 1, source_description: 'State Budget' }],
}

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  useEntityExecutionLineItems: () => ({
    data: mockLineItemsData,
    isLoading: false,
  }),
  entityDetailsQueryOptions: () => ({}),
}))

// Mock filterLineItems
vi.mock('@/lib/api/entities', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/entities')>('@/lib/api/entities')
  return {
    ...actual,
    filterLineItems: (items: unknown[]) => items,
  }
})

// Mock debounced callback
vi.mock('@/lib/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: (fn: () => void) => fn,
}))

// Mock useTreemapDrilldown
const mockSetPrimary = vi.fn()
const mockOnNodeClick = vi.fn()
const mockOnBreadcrumbClick = vi.fn()
const mockReset = vi.fn()

vi.mock('@/components/budget-explorer/useTreemapDrilldown', () => ({
  useTreemapDrilldown: () => ({
    primary: 'fn',
    activePrimary: 'fn',
    setPrimary: mockSetPrimary,
    treemapData: [{ name: 'Test', value: 1000, code: '51' }],
    breadcrumbs: [],
    excludedItemsSummary: null,
    onNodeClick: mockOnNodeClick,
    onBreadcrumbClick: mockOnBreadcrumbClick,
    reset: mockReset,
  }),
}))

// Mock period label hook
vi.mock('@/hooks/use-period-label', () => ({
  usePeriodLabel: () => '2024',
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

// Mock reporting schema
vi.mock('@/schemas/reporting', () => ({
  toExecutionReportType: (type: string) => type,
  toReportTypeValue: (type: string) => type,
  getInitialFilterState: () => ({
    type: 'YEAR',
    selection: { dates: ['2024'] },
  }),
  makeTrendPeriod: () => ({
    type: 'YEAR',
    selection: { dates: ['2020', '2021', '2022', '2023', '2024'] },
  }),
}))

// Mock utils
vi.mock('../utils', () => ({
  getYearLabel: (year: number) => String(year),
}))

// Mock child components
vi.mock('../EntityFinancialSummary', () => ({
  EntityFinancialSummary: ({
    periodLabel,
    isLoading,
  }: {
    totalIncome?: number
    totalExpenses?: number
    budgetBalance?: number
    periodLabel: string
    isLoading: boolean
    normalizationOptions: NormalizationOptions
  }) => (
    <div data-testid="financial-summary" data-loading={isLoading}>
      Financial Summary - {periodLabel}
    </div>
  ),
}))

vi.mock('../EntityFinancialTrends', () => ({
  EntityFinancialTrends: ({
    currentYear,
    onYearChange,
    isLoading,
  }: {
    incomeTrend: unknown
    expenseTrend: unknown
    balanceTrend: unknown
    currentYear: number
    entityName: string
    normalizationOptions: NormalizationOptions
    onNormalizationChange: () => void
    allowPerCapita: boolean
    onYearChange: (year: number) => void
    periodType: string
    onSelectPeriod?: () => void
    selectedQuarter?: string
    selectedMonth?: string
    isLoading: boolean
    onPrefetchPeriod?: () => void
  }) => (
    <div data-testid="financial-trends" data-year={currentYear} data-loading={isLoading}>
      <button onClick={() => onYearChange(2023)}>Change Year</button>
    </div>
  ),
}))

vi.mock('@/components/budget-explorer/BudgetTreemap', () => ({
  BudgetTreemap: ({ data }: { data: unknown[] }) => (
    <div data-testid="budget-treemap" data-count={data?.length}>
      Budget Treemap
    </div>
  ),
}))

vi.mock('../EntityLineItemsTabs', () => ({
  EntityLineItemsTabs: ({
    onYearChange,
    onSearchChange,
    isLoading,
  }: {
    lineItems: unknown[]
    fundingSources: unknown[]
    currentYear: number
    month?: string
    quarter?: string
    years: number[]
    onYearChange: (year: number) => void
    onPrefetchYear?: (year: number) => void
    initialExpenseSearchTerm: string
    initialIncomeSearchTerm: string
    onSearchChange: (type: 'expense' | 'income', term: string) => void
    isLoading: boolean
    normalization: string
    currency: string
    lineItemsTab?: string
    onLineItemsTabChange?: () => void
    selectedFundingKey?: string
    selectedExpenseTypeKey?: string
    onSelectedFundingKeyChange?: () => void
    onSelectedExpenseTypeKeyChange?: () => void
    transferFilter?: string
    onTransferFilterChange?: () => void
    advancedFilter?: string
    onAdvancedFilterChange?: () => void
  }) => (
    <div data-testid="line-items-tabs" data-loading={isLoading}>
      <button data-testid="tabs-year-change" onClick={() => onYearChange(2022)}>
        Year Change
      </button>
      <button data-testid="tabs-search" onClick={() => onSearchChange('expense', 'test')}>
        Search
      </button>
    </div>
  ),
}))

vi.mock('../LineItemsAnalytics', () => ({
  LineItemsAnalytics: ({
    chartType,
    dataType,
    onChartTypeChange,
    onDataTypeChange,
  }: {
    lineItems: unknown
    analyticsYear: number
    month?: string
    quarter?: string
    years: number[]
    onYearChange: () => void
    onPrefetchYear?: () => void
    chartType: string
    onChartTypeChange: (type: 'bar' | 'pie') => void
    dataType: string
    onDataTypeChange: (type: 'income' | 'expense') => void
    isLoading: boolean
    normalization: string
    currency: string
  }) => (
    <div data-testid="line-items-analytics" data-chart={chartType} data-data={dataType}>
      <button onClick={() => onChartTypeChange('pie')}>Change Chart</button>
      <button onClick={() => onDataTypeChange('income')}>Change Data</button>
    </div>
  ),
}))

vi.mock('../EntityReportsSummary', () => ({
  EntityReportsSummary: ({ cui, limit }: { cui: string; reportPeriod: unknown; reportType: string; mainCreditorCui?: string; limit: number }) => (
    <div data-testid="reports-summary" data-cui={cui} data-limit={limit}>
      Reports Summary
    </div>
  ),
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
  totalIncome: 1500000,
  totalExpenses: 1000000,
  budgetBalance: 500000,
  incomeTrend: null,
  expenseTrend: null,
  balanceTrend: null,
  ...overrides,
})

const defaultReportPeriod: ReportPeriodInput = {
  type: 'YEAR',
  selection: { dates: ['2024'] },
}

const defaultNormalization: NormalizationOptions = {
  normalization: 'total',
  currency: 'RON',
  inflation_adjusted: false,
}

const defaultSearch = {
  expenseSearch: '',
  incomeSearch: '',
  analyticsChartType: 'bar' as const,
  analyticsDataType: 'expense' as const,
}

// ============================================================================
// TESTS
// ============================================================================

describe('Overview', () => {
  const mockOnChartNormalizationChange = vi.fn()
  const mockOnYearChange = vi.fn()
  const mockOnSearchChange = vi.fn()
  const mockOnAnalyticsChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders EntityFinancialSummary', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByTestId('financial-summary')).toBeInTheDocument()
    })

    it('renders EntityFinancialTrends', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByTestId('financial-trends')).toBeInTheDocument()
    })

    it('renders BudgetTreemap', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByTestId('budget-treemap')).toBeInTheDocument()
    })

    it('renders EntityLineItemsTabs', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByTestId('line-items-tabs')).toBeInTheDocument()
    })

    it('renders LineItemsAnalytics', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByTestId('line-items-analytics')).toBeInTheDocument()
    })

    it('renders EntityReportsSummary when entity exists', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByTestId('reports-summary')).toBeInTheDocument()
    })

    it('does not render EntityReportsSummary when entity is null', () => {
      render(
        <Overview
          cui="test-cui"
          entity={null}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.queryByTestId('reports-summary')).not.toBeInTheDocument()
    })
  })

  describe('toggle buttons', () => {
    it('renders Income/Expenses toggle', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByText('Income')).toBeInTheDocument()
      expect(screen.getByText('Expenses')).toBeInTheDocument()
    })

    it('renders Functional/Economic toggle', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByText('Functional')).toBeInTheDocument()
      expect(screen.getByText('Economic')).toBeInTheDocument()
    })
  })

  describe('budget distribution heading', () => {
    it('renders Budget Distribution heading', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByText(/Budget Distribution/)).toBeInTheDocument()
    })

    it('renders the treemap info button in the header', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(
        screen.getByRole('button', { name: 'Spending Calculation' })
      ).toBeInTheDocument()
    })

    it('renders external link to entity analytics', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      const link = screen.getByTestId('router-link')
      expect(link).toHaveAttribute('href', '/entity-analytics')
    })
  })

  describe('callbacks', () => {
    it('calls onYearChange when year is changed from trends', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      fireEvent.click(screen.getByText('Change Year'))

      expect(mockOnYearChange).toHaveBeenCalledWith(2023)
    })

    it('calls onYearChange when year is changed from tabs', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      fireEvent.click(screen.getByTestId('tabs-year-change'))

      expect(mockOnYearChange).toHaveBeenCalledWith(2022)
    })

    it('calls onSearchChange when search is triggered', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      fireEvent.click(screen.getByTestId('tabs-search'))

      expect(mockOnSearchChange).toHaveBeenCalledWith('expense', 'test')
    })

    it('calls onAnalyticsChange when chart type changes', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      fireEvent.click(screen.getByText('Change Chart'))

      expect(mockOnAnalyticsChange).toHaveBeenCalledWith('analyticsChartType', 'pie')
    })

    it('calls onAnalyticsChange when data type changes', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      fireEvent.click(screen.getByText('Change Data'))

      expect(mockOnAnalyticsChange).toHaveBeenCalledWith('analyticsDataType', 'income')
    })
  })

  describe('loading state', () => {
    it('passes loading state to child components', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={true}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByTestId('financial-summary')).toHaveAttribute('data-loading', 'true')
      expect(screen.getByTestId('financial-trends')).toHaveAttribute('data-loading', 'true')
    })
  })

  describe('optional callbacks', () => {
    it('renders without optional callbacks', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      // Should render without errors
      expect(screen.getByTestId('budget-treemap')).toBeInTheDocument()
    })
  })

  describe('props passing', () => {
    it('passes correct year to financial trends', () => {
      render(
        <Overview
          cui="test-cui"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2023}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByTestId('financial-trends')).toHaveAttribute('data-year', '2023')
    })

    it('passes CUI to reports summary', () => {
      render(
        <Overview
          cui="my-cui-123"
          entity={createMockEntity()}
          isLoading={false}
          selectedYear={2024}
          normalizationOptions={defaultNormalization}
          years={[2020, 2021, 2022, 2023, 2024]}
          reportPeriod={defaultReportPeriod}
          search={defaultSearch}
          onChartNormalizationChange={mockOnChartNormalizationChange}
          onYearChange={mockOnYearChange}
          onSearchChange={mockOnSearchChange}
          onAnalyticsChange={mockOnAnalyticsChange}
        />
      )

      expect(screen.getByTestId('reports-summary')).toHaveAttribute('data-cui', 'my-cui-123')
    })
  })
})
