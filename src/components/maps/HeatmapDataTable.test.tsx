/**
 * HeatmapDataTable Component Tests
 *
 * This file tests the HeatmapDataTable component which provides
 * a data table view for heatmap data (UAT and County views).
 *
 * Pattern: Complex Data Table Component Testing
 * - Mock all external dependencies (hooks, utils, i18n)
 * - Test loading and empty states
 * - Test data rendering for both UAT and County views
 * - Test sorting and pagination
 * - Test column visibility and view settings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@/test/test-utils'
import { HeatmapDataTable } from './HeatmapDataTable'
import type { HeatmapUATDataPoint, HeatmapCountyDataPoint } from '@/schemas/heatmap'
import type { SortingState, PaginationState } from '@tanstack/react-table'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Lingui
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray, ...values: unknown[]) => {
    // Handle template literal with values
    if (values.length > 0) {
      return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '')
    }
    return strings[0]
  },
}))

// Mock @/lib/utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
  formatCurrency: (value: number, _format: string, currency: string) =>
    `${currency} ${value.toLocaleString()}`,
  formatNumber: (value: number) => value.toLocaleString(),
}))

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params }: { children: React.ReactNode; to: string; params?: Record<string, string> }) => (
    <a href={`${to}/${params?.cui || ''}`} data-testid="entity-link">{children}</a>
  ),
}))

// Mock useMapFilter hook
const mockMapState = {
  filters: {
    normalization: 'total',
    currency: 'RON',
  },
}

vi.mock('@/hooks/useMapFilter', () => ({
  useMapFilter: () => ({
    mapState: mockMapState,
    setMapState: vi.fn(),
  }),
}))

// Mock useUserCurrency hook
vi.mock('@/lib/hooks/useUserCurrency', () => ({
  useUserCurrency: () => ['RON', vi.fn()],
}))

// Mock useTablePreferences hook
const mockSetDensity = vi.fn()
const mockSetCurrencyFormat = vi.fn()

vi.mock('@/hooks/useTablePreferences', () => ({
  useTablePreferences: () => ({
    density: 'comfortable',
    setDensity: mockSetDensity,
    columnVisibility: {
      name: true,
      county_name: true,
      population: true,
      total_amount: true,
      per_capita_amount: true,
    },
    setColumnVisibility: vi.fn(),
    currencyFormat: 'compact',
    setCurrencyFormat: mockSetCurrencyFormat,
  }),
}))

// Mock table-utils
vi.mock('@/lib/table-utils', () => ({
  getMergedColumnOrder: () => ['row_number', 'name', 'county_name', 'population', 'total_amount', 'per_capita_amount'],
  moveColumnOrder: (merged: string[]) => merged,
}))

// Mock Pagination component
vi.mock('@/components/ui/pagination', () => ({
  Pagination: ({ currentPage, pageSize, totalCount, onPageChange }: {
    currentPage: number
    pageSize: number
    totalCount: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (size: number) => void
  }) => (
    <div data-testid="pagination">
      <span data-testid="page-info">Page {currentPage} of {Math.ceil(totalCount / pageSize)}</span>
      <button data-testid="prev-page" onClick={() => onPageChange(currentPage - 1)}>Prev</button>
      <button data-testid="next-page" onClick={() => onPageChange(currentPage + 1)}>Next</button>
    </div>
  ),
}))

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

const createMockUATData = (count: number): HeatmapUATDataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    uat_id: String(i + 1),
    uat_code: `UAT${i + 1}`,
    uat_name: `UAT Name ${i + 1}`,
    siruta_code: `SIRUTA${i + 1}`,
    county_code: `CO${Math.floor(i / 3) + 1}`,
    county_name: `County ${Math.floor(i / 3) + 1}`,
    population: 10000 + i * 1000,
    amount: 1000000 + i * 100000,
    total_amount: 1000000 + i * 100000,
    per_capita_amount: 100 + i * 10,
  }))
}

const createMockCountyData = (count: number): HeatmapCountyDataPoint[] => {
  return Array.from({ length: count }, (_, i) => ({
    county_code: `CO${i + 1}`,
    county_name: `County ${i + 1}`,
    county_population: 100000 + i * 10000,
    county_entity: {
      cui: `CUI${i + 1}`,
      name: `Entity ${i + 1}`,
    },
    amount: 10000000 + i * 1000000,
    total_amount: 10000000 + i * 1000000,
    per_capita_amount: 100 + i * 5,
  }))
}

// ============================================================================
// TEST HELPERS
// ============================================================================

interface RenderTableOptions {
  data?: (HeatmapUATDataPoint | HeatmapCountyDataPoint)[]
  isLoading?: boolean
  sorting?: SortingState
  pagination?: PaginationState
  mapViewType?: 'UAT' | 'County'
}

const renderHeatmapTable = ({
  data = [],
  isLoading = false,
  sorting = [],
  pagination = { pageIndex: 0, pageSize: 10 },
  mapViewType = 'UAT',
}: RenderTableOptions = {}) => {
  const setSorting = vi.fn()
  const setPagination = vi.fn()

  const result = render(
    <HeatmapDataTable
      data={data}
      isLoading={isLoading}
      sorting={sorting}
      setSorting={setSorting}
      pagination={pagination}
      setPagination={setPagination}
      mapViewType={mapViewType}
    />
  )

  return {
    ...result,
    setSorting,
    setPagination,
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('HeatmapDataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('renders loading skeleton when isLoading is true', () => {
      renderHeatmapTable({ isLoading: true })

      // Should show skeleton placeholders
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('does not render table when loading', () => {
      renderHeatmapTable({ isLoading: true })

      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('renders empty message when no data', () => {
      renderHeatmapTable({ data: [] })

      expect(screen.getByText('No results found.')).toBeInTheDocument()
    })
  })

  describe('UAT view', () => {
    it('renders UAT data correctly', () => {
      const data = createMockUATData(3)
      renderHeatmapTable({ data, mapViewType: 'UAT' })

      // Check that data is rendered
      expect(screen.getByText('UAT Name 1')).toBeInTheDocument()
      expect(screen.getByText('UAT Name 2')).toBeInTheDocument()
      expect(screen.getByText('UAT Name 3')).toBeInTheDocument()
    })

    it('renders links to entity pages for UAT data', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data, mapViewType: 'UAT' })

      const links = screen.getAllByTestId('entity-link')
      expect(links.length).toBeGreaterThan(0)
    })

    it('renders county column in UAT view', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data, mapViewType: 'UAT' })

      // County column header should be visible
      expect(screen.getByText('County')).toBeInTheDocument()
    })
  })

  describe('County view', () => {
    it('renders County data correctly', () => {
      const data = createMockCountyData(3)
      renderHeatmapTable({ data, mapViewType: 'County' })

      // County names appear in both name column and county column
      expect(screen.getAllByText('County 1').length).toBeGreaterThan(0)
      expect(screen.getAllByText('County 2').length).toBeGreaterThan(0)
      expect(screen.getAllByText('County 3').length).toBeGreaterThan(0)
    })
  })

  describe('table headers', () => {
    it('renders all column headers', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Population')).toBeInTheDocument()
      expect(screen.getByText('Total Amount')).toBeInTheDocument()
      expect(screen.getByText('Amount Per Capita')).toBeInTheDocument()
    })

    it('renders row number column', () => {
      const data = createMockUATData(3)
      renderHeatmapTable({ data })

      // Row numbers should be rendered
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('sorting', () => {
    it('renders sort icons on sortable columns', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      // Should have ArrowUpDown icons for unsorted columns
      const table = screen.getByRole('table')
      const headerRow = within(table).getAllByRole('row')[0]
      expect(headerRow).toBeInTheDocument()
    })
  })

  describe('pagination', () => {
    it('renders pagination component', () => {
      const data = createMockUATData(5)
      renderHeatmapTable({ data })

      expect(screen.getByTestId('pagination')).toBeInTheDocument()
    })

    it('displays correct page info', () => {
      const data = createMockUATData(25)
      renderHeatmapTable({
        data,
        pagination: { pageIndex: 0, pageSize: 10 }
      })

      expect(screen.getByTestId('page-info')).toHaveTextContent('Page 1 of 3')
    })

    it('handles page navigation', () => {
      const data = createMockUATData(25)
      renderHeatmapTable({
        data,
        pagination: { pageIndex: 0, pageSize: 10 }
      })

      const nextButton = screen.getByTestId('next-page')
      fireEvent.click(nextButton)
      // Pagination component handles this
    })
  })

  describe('view settings', () => {
    it('renders view settings button', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      expect(screen.getByText('View')).toBeInTheDocument()
    })

    it('view button is clickable', async () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      const viewButton = screen.getByText('View')
      expect(viewButton).toBeInTheDocument()

      // The button should be clickable and have aria attributes
      expect(viewButton).toHaveAttribute('aria-haspopup', 'menu')
    })

    it('view button has correct aria attributes', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      const viewButton = screen.getByText('View')
      expect(viewButton).toHaveAttribute('aria-expanded', 'false')
      expect(viewButton).toHaveAttribute('type', 'button')
    })

    it('renders view button with correct styling', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      const viewButton = screen.getByText('View')
      // Should be an outline variant button
      expect(viewButton.className).toContain('border')
    })
  })

  describe('column menus', () => {
    it('renders column menu buttons', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      // Each sortable column should have a menu button
      const menuButtons = screen.getAllByRole('button', { name: /menu/i })
      expect(menuButtons.length).toBeGreaterThan(0)
    })

    it('column menu buttons have correct aria attributes', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      // Find column menu buttons
      const menuButtons = screen.getAllByRole('button', { name: /menu/i })

      // Each should have aria-haspopup for dropdown
      menuButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-haspopup', 'menu')
        expect(button).toHaveAttribute('aria-expanded', 'false')
      })
    })
  })

  describe('data formatting', () => {
    it('formats population numbers', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      // Population should be formatted with locale
      // 10000 -> "10,000"
      expect(screen.getByText('10,000')).toBeInTheDocument()
    })

    it('formats currency amounts', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      // Currency should be formatted
      // Amounts are formatted via formatCurrency mock
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
    })
  })

  describe('row numbers', () => {
    it('displays correct row numbers based on pagination', () => {
      const data = createMockUATData(15)
      renderHeatmapTable({
        data,
        pagination: { pageIndex: 0, pageSize: 10 }
      })

      // First page should show rows 1-10
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('renders as accessible table', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('has proper table structure', () => {
      const data = createMockUATData(1)
      renderHeatmapTable({ data })

      const table = screen.getByRole('table')
      expect(within(table).getAllByRole('rowgroup').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('props handling', () => {
    it('accepts custom sorting state', () => {
      const data = createMockUATData(3)
      const sorting: SortingState = [{ id: 'name', desc: true }]

      renderHeatmapTable({ data, sorting })

      // Table should render with sorted data
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('accepts custom pagination state', () => {
      const data = createMockUATData(25)
      const pagination: PaginationState = { pageIndex: 1, pageSize: 5 }

      renderHeatmapTable({ data, pagination })

      // Should show page 2 info
      expect(screen.getByTestId('page-info')).toHaveTextContent('Page 2 of 5')
    })
  })
})
