/**
 * CountyList Component Tests
 *
 * This file tests the CountyList component which renders
 * a virtualized list of counties with search and selection.
 *
 * Pattern: List Component Testing
 * - Test loading states
 * - Test search functionality
 * - Test selection behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { CountyList } from './CountyList'
import type { OptionItem } from '../base-filter/interfaces'

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))

// Mock the infinite scroll hook
const mockItems: Array<{ county_code: string; county_name: string }> = []
const mockVirtualItems: Array<{
  index: number
  size: number
  start: number
}> = []

vi.mock('../base-filter/hooks/useMultiSelectInfinite', () => ({
  useMultiSelectInfinite: () => ({
    items: mockItems,
    parentRef: { current: null },
    rowVirtualizer: {
      getTotalSize: () => mockItems.length * 48,
      getVirtualItems: () => mockVirtualItems,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetchingNextPage: false,
  }),
}))

// Mock graphql request
vi.mock('@/lib/api/reference-lookups', () => ({
  fetchCountyOptions: vi.fn(),
}))

// Mock SearchInput
vi.mock('../base-filter/SearchInput', () => ({
  SearchInput: ({
    onChange,
    placeholder,
  }: {
    onChange: (val: string) => void
    placeholder: string
  }) => (
    <input
      data-testid="search-input"
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

// Mock ErrorDisplay
vi.mock('../base-filter/ErrorDisplay', () => ({
  ErrorDisplay: ({ title }: { title: string }) => (
    <div data-testid="error-display">{title}</div>
  ),
}))

// Mock ListContainer
vi.mock('../base-filter/ListContainer', () => ({
  ListContainer: ({
    children,
    isLoading,
    isFetchingNextPage,
    isSearchResultsEmpty,
    isEmpty,
  }: {
    children: React.ReactNode
    isLoading: boolean
    isFetchingNextPage: boolean
    isSearchResultsEmpty: boolean
    isEmpty: boolean
  }) => (
    <div data-testid="list-container">
      {isLoading && <div data-testid="loading">Loading...</div>}
      {isFetchingNextPage && <div data-testid="fetching-next">Loading more...</div>}
      {isSearchResultsEmpty && <div data-testid="no-results">No results</div>}
      {isEmpty && <div data-testid="empty">Empty</div>}
      {children}
    </div>
  ),
}))

// Mock ListOption
vi.mock('../base-filter/ListOption', () => ({
  ListOption: ({
    label,
    selected,
    onClick,
  }: {
    label: string
    selected: boolean
    onClick: () => void
  }) => (
    <div
      data-testid={`list-option`}
      data-label={label}
      data-selected={selected}
      onClick={onClick}
      role="option"
      aria-selected={selected}
    >
      {label}
    </div>
  ),
}))

// ============================================================================
// TEST HELPER
// ============================================================================

// Helper to set mock data for tests
function setMockData(
  items: Array<{ county_code: string; county_name: string }>
) {
  mockItems.length = 0
  mockVirtualItems.length = 0

  items.forEach((item, index) => {
    mockItems.push(item)
    mockVirtualItems.push({
      index,
      size: 48,
      start: index * 48,
    })
  })
}

// ============================================================================
// TESTS
// ============================================================================

describe('CountyList', () => {
  const mockToggleSelect = vi.fn()

  const defaultProps = {
    selectedOptions: [] as OptionItem[],
    toggleSelect: mockToggleSelect,
    pageSize: 100,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    setMockData([])
  })

  describe('rendering', () => {
    it('renders search input', () => {
      render(<CountyList {...defaultProps} />)

      expect(screen.getByTestId('search-input')).toBeInTheDocument()
    })

    it('renders list container', () => {
      render(<CountyList {...defaultProps} />)

      expect(screen.getByTestId('list-container')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(
        <CountyList {...defaultProps} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('list items', () => {
    it('renders list options when items are available', () => {
      setMockData([
        { county_code: 'AR', county_name: 'Arad' },
        { county_code: 'CJ', county_name: 'Cluj' },
      ])

      render(<CountyList {...defaultProps} />)

      const options = screen.getAllByTestId('list-option')
      expect(options).toHaveLength(2)
    })

    it('displays county name with code', () => {
      setMockData([{ county_code: 'AR', county_name: 'Arad' }])

      render(<CountyList {...defaultProps} />)

      const option = screen.getByTestId('list-option')
      expect(option).toHaveAttribute('data-label', 'Arad (AR)')
    })

    it('marks selected items', () => {
      setMockData([{ county_code: 'AR', county_name: 'Arad' }])

      render(
        <CountyList
          {...defaultProps}
          selectedOptions={[{ id: 'AR', label: 'Arad (AR)' }]}
        />
      )

      const option = screen.getByTestId('list-option')
      expect(option).toHaveAttribute('data-selected', 'true')
    })

    it('marks unselected items', () => {
      setMockData([{ county_code: 'AR', county_name: 'Arad' }])

      render(<CountyList {...defaultProps} />)

      const option = screen.getByTestId('list-option')
      expect(option).toHaveAttribute('data-selected', 'false')
    })
  })

  describe('selection', () => {
    it('calls toggleSelect when item is clicked', () => {
      setMockData([{ county_code: 'AR', county_name: 'Arad' }])

      render(<CountyList {...defaultProps} />)

      fireEvent.click(screen.getByTestId('list-option'))

      expect(mockToggleSelect).toHaveBeenCalledWith({
        id: 'AR',
        label: 'Arad (AR)',
      })
    })
  })

  describe('search', () => {
    it('renders search input with placeholder', () => {
      render(<CountyList {...defaultProps} />)

      expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder')
    })
  })
})
