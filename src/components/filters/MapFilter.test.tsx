/**
 * MapFilter Component Tests
 *
 * This file tests the MapFilter component which provides
 * comprehensive filtering for map data visualization.
 * It manages filter state through useMapFilter hook.
 *
 * Pattern: Complex Filter Component Testing
 * - Mock all external dependencies (hooks, i18n)
 * - Test rendering of filter sections
 * - Test view/map type selection
 * - Test exclude filters section
 * - Test clear functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { MapFilter } from './MapFilter'

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

// Mock useUserCurrency hook
vi.mock('@/lib/hooks/useUserCurrency', () => ({
  useUserCurrency: () => ['RON', vi.fn()],
}))

// Mock useMapFilter hook
const mockClearAllFilters = vi.fn()
const mockSetMapViewType = vi.fn()
const mockSetActiveView = vi.fn()
const mockSetAccountCategory = vi.fn()
const mockSetNormalization = vi.fn()
const mockClearAllExcludeFilters = vi.fn()

const mockMapState = {
  mapViewType: 'UAT',
  activeView: 'map',
  filters: {
    account_category: 'ch',
    normalization: 'total',
    exclude: {},
  },
}

vi.mock('@/hooks/useMapFilter', () => ({
  useMapFilter: () => ({
    mapState: mockMapState,
    clearAllFilters: mockClearAllFilters,
    setMapViewType: mockSetMapViewType,
    setActiveView: mockSetActiveView,
    selectedFunctionalClassificationOptions: [],
    setSelectedFunctionalClassificationOptions: vi.fn(),
    selectedEconomicClassificationOptions: [],
    setSelectedEconomicClassificationOptions: vi.fn(),
    setAccountCategory: mockSetAccountCategory,
    setNormalization: mockSetNormalization,
    setReportPeriod: vi.fn(),
    selectedUatOptions: [],
    selectedEntityOptions: [],
    setSelectedUatOptions: vi.fn(),
    setSelectedEntityOptions: vi.fn(),
    setSelectedCountyOptions: vi.fn(),
    setSelectedEntityTypeOptions: vi.fn(),
    setSelectedBudgetSectorOptions: vi.fn(),
    setSelectedFundingSourceOptions: vi.fn(),
    setFunctionalPrefixes: vi.fn(),
    setEconomicPrefixes: vi.fn(),
    setMinPopulation: vi.fn(),
    setMaxPopulation: vi.fn(),
    setAggregateMinAmount: vi.fn(),
    setAggregateMaxAmount: vi.fn(),
    setReportType: vi.fn(),
    setIsUat: vi.fn(),
    setMainCreditorCui: vi.fn(),
    excludeSelectedEntityOptions: [],
    setExcludeSelectedEntityOptions: vi.fn(),
    excludeSelectedMainCreditorOption: [],
    setExcludeMainCreditorCui: vi.fn(),
    excludeSelectedUatOptions: [],
    setExcludeSelectedUatOptions: vi.fn(),
    excludeSelectedCountyOptions: [],
    setExcludeSelectedCountyOptions: vi.fn(),
    excludeSelectedEntityTypeOptions: [],
    setExcludeSelectedEntityTypeOptions: vi.fn(),
    excludeSelectedFunctionalClassificationOptions: [],
    setExcludeSelectedFunctionalClassificationOptions: vi.fn(),
    excludeSelectedEconomicClassificationOptions: [],
    setExcludeSelectedEconomicClassificationOptions: vi.fn(),
    excludeSelectedBudgetSectorOptions: [],
    setExcludeSelectedBudgetSectorOptions: vi.fn(),
    excludeSelectedFundingSourceOptions: [],
    setExcludeSelectedFundingSourceOptions: vi.fn(),
    setExcludeFunctionalPrefixes: vi.fn(),
    setExcludeEconomicPrefixes: vi.fn(),
    clearAllExcludeFilters: mockClearAllExcludeFilters,
  }),
}))

// Mock filter label hooks
vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useEntityLabel: () => ({ map: (id: string) => `Entity ${id}`, add: vi.fn() }),
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
  BooleanFilter: () => <div data-testid="is-uat-filter">Is UAT</div>,
}))

vi.mock('./amount-range-filter', () => ({
  AmountRangeFilter: () => <div data-testid="amount-range-filter">Amount Range</div>,
}))

vi.mock('./period-filter/PeriodFilter', () => ({
  PeriodFilter: () => <div data-testid="period-filter">Period Filter</div>,
}))

vi.mock('./ViewTypeRadioGroup', () => ({
  ViewTypeRadioGroup: ({ onChange, viewOptions }: {
    value?: string
    onChange: (v: string) => void
    viewOptions: { id: string; label: string }[]
  }) => (
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

// ============================================================================
// TESTS
// ============================================================================

describe('MapFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the filter card', () => {
      render(<MapFilter />)

      expect(screen.getByText('Map Filters')).toBeInTheDocument()
    })

    it('renders as accessible region', () => {
      render(<MapFilter />)

      const region = screen.getByRole('region', { name: /map filters/i })
      expect(region).toBeInTheDocument()
    })
  })

  describe('data view selection', () => {
    it('renders data view section', () => {
      render(<MapFilter />)

      expect(screen.getByText('Data View')).toBeInTheDocument()
    })

    it('renders view type options', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('view-radio-map')).toBeInTheDocument()
    })

    it('calls setActiveView when view type is changed', () => {
      render(<MapFilter />)

      const tableButton = screen.getByTestId('view-option-table')
      fireEvent.click(tableButton)

      expect(mockSetActiveView).toHaveBeenCalledWith('table')
    })
  })

  describe('map view selection', () => {
    it('renders map view section', () => {
      render(<MapFilter />)

      expect(screen.getByText('Map View')).toBeInTheDocument()
    })

    it('renders UAT and County options', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('view-option-UAT')).toBeInTheDocument()
      expect(screen.getByTestId('view-option-County')).toBeInTheDocument()
    })

    it('calls setMapViewType when map view is changed', () => {
      render(<MapFilter />)

      const countyButton = screen.getByTestId('view-option-County')
      fireEvent.click(countyButton)

      expect(mockSetMapViewType).toHaveBeenCalledWith('County')
    })
  })

  describe('income/expenses selection', () => {
    it('renders income/expenses section', () => {
      render(<MapFilter />)

      expect(screen.getByText('Income/Expenses')).toBeInTheDocument()
    })

    it('renders expense and income options', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('view-option-ch')).toBeInTheDocument()
      expect(screen.getByTestId('view-option-vn')).toBeInTheDocument()
    })

    it('calls setAccountCategory when changed', () => {
      render(<MapFilter />)

      const incomeButton = screen.getByTestId('view-option-vn')
      fireEvent.click(incomeButton)

      expect(mockSetAccountCategory).toHaveBeenCalledWith('vn')
    })
  })

  describe('normalization section', () => {
    it('renders normalization section', () => {
      render(<MapFilter />)

      // Normalization text appears in heading and mock component
      const normalizationElements = screen.getAllByText('Normalization')
      expect(normalizationElements.length).toBeGreaterThan(0)
      expect(screen.getByTestId('normalization-select')).toBeInTheDocument()
    })
  })

  describe('filter sections', () => {
    it('renders period filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-container-Period')).toBeInTheDocument()
    })

    it('renders entities filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-list-Entities')).toBeInTheDocument()
    })

    it('renders main creditor filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-container-Main Creditor')).toBeInTheDocument()
    })

    it('renders UATs filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-list-UATs')).toBeInTheDocument()
    })

    it('renders counties filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-list-Counties')).toBeInTheDocument()
    })

    it('renders functional classification filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-list-Functional Classification')).toBeInTheDocument()
    })

    it('renders economic classification filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-list-Economic Classification')).toBeInTheDocument()
    })

    it('hides the DEPRECATED entity type section unless a legacy URL carries values', () => {
      render(<MapFilter />)

      expect(screen.queryByTestId('filter-list-Entity Type')).not.toBeInTheDocument()
    })

    it('renders the tags filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-list-Tags')).toBeInTheDocument()
    })

    it('renders budget sector filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-list-Budget Sector')).toBeInTheDocument()
    })

    it('renders funding source filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-list-Funding Source')).toBeInTheDocument()
    })

    it('renders report type filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-radio-Report Type')).toBeInTheDocument()
    })

    it('renders is UAT filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-container-Is UAT')).toBeInTheDocument()
    })

    it('renders amount range filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-range-Amount Range')).toBeInTheDocument()
    })

    it('renders population range filter section', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-range-Population Range')).toBeInTheDocument()
    })
  })

  describe('prefix filters', () => {
    it('renders functional classification prefix filter', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-prefix-Functional Classification Prefix')).toBeInTheDocument()
    })

    it('renders economic classification prefix filter', () => {
      render(<MapFilter />)

      expect(screen.getByTestId('filter-prefix-Economic Classification Prefix')).toBeInTheDocument()
    })
  })

  describe('exclude filters section', () => {
    it('renders exclude filters accordion', () => {
      render(<MapFilter />)

      expect(screen.getByText('Exclude Filters')).toBeInTheDocument()
    })

    it('shows exclude filter explanation when expanded', () => {
      render(<MapFilter />)

      // Click to expand accordion
      const trigger = screen.getByText('Exclude Filters')
      fireEvent.click(trigger)

      expect(screen.getByText(/filters marked as exclude/i)).toBeInTheDocument()
    })
  })

  describe('clear filters functionality', () => {
    it('does not show clear button when no filters are active', () => {
      render(<MapFilter />)

      // When totalOptionalFilters + totalExcludeFilters = 0, no clear button
      const clearButtons = screen.queryAllByRole('button', { name: /clear filters/i })
      expect(clearButtons.length).toBe(0)
    })
  })

  describe('accessibility', () => {
    it('has proper section headings with icons', () => {
      render(<MapFilter />)

      // Each section has an accessible heading
      expect(screen.getByText('Data View')).toBeInTheDocument()
      expect(screen.getByText('Map View')).toBeInTheDocument()
      expect(screen.getByText('Income/Expenses')).toBeInTheDocument()
      // Normalization appears multiple times (heading + mock)
      expect(screen.getAllByText('Normalization').length).toBeGreaterThan(0)
    })

    it('uses role groups for radio selections', () => {
      render(<MapFilter />)

      // Radio groups should have group role
      const groups = screen.getAllByRole('group')
      expect(groups.length).toBeGreaterThan(0)
    })
  })
})
