/**
 * EntityAnalyticsFilter Component Tests
 *
 * This file tests the EntityAnalyticsFilter component which provides
 * comprehensive filtering for entity analytics data. The component
 * manages filter state through URL search params via useEntityAnalyticsFilter hook.
 *
 * Pattern: Complex Filter Component Testing
 * - Mock all external dependencies (hooks, i18n)
 * - Test rendering of filter sections
 * - Test filter state management
 * - Test clear/reset functionality
 * - Test exclude filters section
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { EntityAnalyticsFilter } from './EntityAnalyticsFilter'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Lingui
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
}))

// Mock @/lib/utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  getNormalizationUnit: () => 'RON',
}))

// Mock period utils
vi.mock('@/lib/period-utils', () => ({
  getPeriodTags: () => [],
}))

// Mock chart filter utils
vi.mock('@/lib/chart-filter-utils', () => ({
  getEconomicPrefixLabel: (prefix: string) => prefix,
  getFunctionalPrefixLabel: (prefix: string) => prefix,
}))

// Mock user preferences hooks
vi.mock('@/lib/hooks/useUserCurrency', () => ({
  useUserCurrency: () => ['RON', vi.fn()],
}))

vi.mock('@/lib/hooks/useUserInflationAdjusted', () => ({
  useUserInflationAdjusted: () => [false, vi.fn()],
}))

// Mock the main filter hook
const mockSetFilter = vi.fn()
const mockResetFilter = vi.fn()
const mockSetView = vi.fn()
const mockFilter = {
  account_category: 'ch' as const,
  normalization: 'total',
}

vi.mock('@/hooks/useEntityAnalyticsFilter', () => ({
  useEntityAnalyticsFilter: () => ({
    filter: mockFilter,
    setFilter: mockSetFilter,
    resetFilter: mockResetFilter,
    view: 'table',
    setView: mockSetView,
  }),
}))

// Mock all filter label hooks
vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useEntityLabel: () => ({ map: (id: string) => `Entity ${id}`, add: vi.fn() }),
  useUatLabel: () => ({ map: (id: string) => `UAT ${id}`, add: vi.fn() }),
  useEconomicClassificationLabel: () => ({ map: (id: string) => `EC ${id}`, add: vi.fn() }),
  useFunctionalClassificationLabel: () => ({ map: (id: string) => `FC ${id}`, add: vi.fn() }),
  useBudgetSectorLabel: () => ({ map: (id: string) => `BS ${id}`, add: vi.fn() }),
  useFundingSourceLabel: () => ({ map: (id: string) => `FS ${id}`, add: vi.fn() }),
  useEntityTypeLabel: () => ({ map: (id: string) => `ET ${id}`, add: vi.fn() }),
  useEntityTagLabel: () => ({ map: (id: string) => `Tag ${id}`, add: vi.fn() }),
}))

// Mock filter components to simplify testing
vi.mock('./base-filter/FilterListContainer', () => ({
  FilterListContainer: ({ title }: { title: string }) => (
    <div data-testid={`filter-list-${title}`}>{title}</div>
  ),
}))

vi.mock('./base-filter/FilterRangeContainer', () => ({
  FilterRangeContainer: ({ title }: { title: string }) => (
    <div data-testid={`filter-range-${title}`}>{title}</div>
  ),
}))

vi.mock('./base-filter/FilterRadioContainer', () => ({
  FilterRadioContainer: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`filter-radio-${title}`}>
      <span>{title}</span>
      {children}
    </div>
  ),
}))

vi.mock('./base-filter/FilterContainer', () => ({
  FilterContainer: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`filter-container-${title}`}>
      <span>{title}</span>
      {children}
    </div>
  ),
}))

vi.mock('./prefix-filter', () => ({
  FilterPrefixContainer: ({ title }: { title: string }) => (
    <div data-testid={`filter-prefix-${title}`}>{title}</div>
  ),
  PrefixFilter: () => <div>Prefix Filter</div>,
}))

vi.mock('./report-type-filter', () => ({
  ReportTypeFilter: () => <div data-testid="report-type-filter">Report Type</div>,
}))

vi.mock('./flags-filter', () => ({
  IsUatFilter: () => <div data-testid="is-uat-filter">Is UAT</div>,
}))

vi.mock('./amount-range-filter', () => ({
  AmountRangeFilter: () => <div data-testid="amount-range-filter">Amount Range</div>,
}))

vi.mock('./period-filter/PeriodFilter', () => ({
  PeriodFilter: () => <div data-testid="period-filter">Period Filter</div>,
}))

vi.mock('./ViewTypeRadioGroup', () => ({
  ViewTypeRadioGroup: ({ onChange, viewOptions }: { value?: string; onChange: (v: string) => void; viewOptions: { id: string; label: string }[] }) => (
    <div data-testid={`view-radio-${viewOptions[0]?.id}`}>
      {viewOptions.map((opt) => (
        <button key={opt.id} data-testid={`view-option-${opt.id}`} onClick={() => onChange(opt.id)}>
          {opt.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/normalization/normalization-mode-select', () => ({
  NormalizationModeSelect: () => <div data-testid="normalization-select">Normalization</div>,
}))

// Mock list components
vi.mock('./entity-filter/EntityList', () => ({
  EntityList: () => <div data-testid="entity-list">Entity List</div>,
}))

vi.mock('./uat-filter/UatList', () => ({
  UatList: () => <div data-testid="uat-list">UAT List</div>,
}))

vi.mock('./county-filter/CountyList', () => ({
  CountyList: () => <div data-testid="county-list">County List</div>,
}))

vi.mock('./entity-type-filter/EntityTypeList', () => ({
  EntityTypeList: () => <div data-testid="entity-type-list">Entity Type List</div>,
}))

vi.mock('./functional-classification-filter', () => ({
  FunctionalClassificationList: () => <div data-testid="fc-list">FC List</div>,
}))

vi.mock('./economic-classification-filter', () => ({
  EconomicClassificationList: () => <div data-testid="ec-list">EC List</div>,
}))

vi.mock('./budget-sector-filter/BudgetSectorFilter', () => ({
  BudgetSectorList: () => <div data-testid="budget-sector-list">Budget Sector List</div>,
}))

vi.mock('./funding-source-filter/FundingSourceFilter', () => ({
  FundingSourceList: () => <div data-testid="funding-source-list">Funding Source List</div>,
}))

vi.mock('./tag-filter', () => ({
  TagList: () => <div data-testid="tag-list">Tag List</div>,
  TagExcludeList: () => <div data-testid="tag-exclude-list">Tag Exclude List</div>,
}))

// ============================================================================
// TESTS
// ============================================================================

describe('EntityAnalyticsFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the filter card', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('renders view type selection', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByText('View')).toBeInTheDocument()
      expect(screen.getByTestId('view-radio-table')).toBeInTheDocument()
    })

    it('renders revenues/expenses selection', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByText('Revenues/Expenses')).toBeInTheDocument()
    })

    it('renders normalization selection', () => {
      render(<EntityAnalyticsFilter />)

      // Check for the Normalization heading
      const normalizationHeadings = screen.getAllByText('Normalization')
      expect(normalizationHeadings.length).toBeGreaterThan(0)
      expect(screen.getByTestId('normalization-select')).toBeInTheDocument()
    })
  })

  describe('filter sections', () => {
    it('renders period filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-container-Period')).toBeInTheDocument()
    })

    it('renders entities filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-list-Entities')).toBeInTheDocument()
    })

    it('renders UAT filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-list-UAT')).toBeInTheDocument()
    })

    it('renders county filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-list-County')).toBeInTheDocument()
    })

    it('renders entity type filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-list-Entity Type')).toBeInTheDocument()
    })

    it('renders functional classification filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-list-Functional Classification')).toBeInTheDocument()
    })

    it('renders economic classification filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-list-Economic Classification')).toBeInTheDocument()
    })

    it('renders budget sector filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-list-Budget Sector')).toBeInTheDocument()
    })

    it('renders funding source filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-list-Funding Source')).toBeInTheDocument()
    })

    it('renders tags filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-list-Tags')).toBeInTheDocument()
    })

    it('renders report type filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-radio-Report Type')).toBeInTheDocument()
    })

    it('renders is UAT filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-container-Is UAT')).toBeInTheDocument()
    })

    it('renders amount range filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-range-Amount Range')).toBeInTheDocument()
    })

    it('renders population range filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-range-Population Range')).toBeInTheDocument()
    })
  })

  describe('exclude filters section', () => {
    it('renders exclude filters accordion', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByText('Exclude Filters')).toBeInTheDocument()
    })
  })

  describe('view type selection', () => {
    it('calls setView when view type is changed', () => {
      render(<EntityAnalyticsFilter />)

      const lineItemsButton = screen.getByTestId('view-option-line-items')
      fireEvent.click(lineItemsButton)

      expect(mockSetView).toHaveBeenCalledWith('line-items')
    })
  })

  describe('clear filters functionality', () => {
    it('does not show clear button when no filters are active', () => {
      render(<EntityAnalyticsFilter />)

      // No clear button should be visible when no filters active
      const clearButtons = screen.queryAllByRole('button', { name: /clear filters/i })
      expect(clearButtons.length).toBe(0)
    })
  })

  describe('prefix filters', () => {
    it('renders functional prefixes filter', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-prefix-Functional Prefixes')).toBeInTheDocument()
    })

    it('renders economic prefixes filter', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-prefix-Economic Prefixes')).toBeInTheDocument()
    })
  })

  describe('main creditor filter', () => {
    it('renders main creditor filter section', () => {
      render(<EntityAnalyticsFilter />)

      expect(screen.getByTestId('filter-container-Main Creditor')).toBeInTheDocument()
    })
  })
})
