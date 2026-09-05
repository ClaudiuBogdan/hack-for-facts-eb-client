/**
 * FunctionalClassificationList Component Tests
 *
 * This file tests the FunctionalClassificationList component which renders
 * a virtualized list of functional classifications with search and selection.
 *
 * Pattern: List Component Testing
 * - Test loading states
 * - Test search functionality
 * - Test selection behavior
 * - Test error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { FunctionalClassificationList } from './FunctionalClassificationList'
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
const mockItems: Array<{ functional_code: string; functional_name: string }> = []
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
vi.mock('@/lib/graphql/graphql-client', () => ({
  graphqlQuery: vi.fn(),
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
    children,
  }: {
    label: string
    selected: boolean
    onClick: () => void
    children?: React.ReactNode
  }) => (
    <div
      data-testid={`list-option-${label}`}
      data-selected={selected}
      onClick={onClick}
      role="option"
      aria-selected={selected}
    >
      {label}
      {children}
    </div>
  ),
}))

// Mock ClassificationInfoLink
vi.mock('@/components/common/classification-info-link', () => ({
  ClassificationInfoLink: () => (
    <span data-testid="classification-info-link" />
  ),
}))

// ============================================================================
// TEST HELPER
// ============================================================================

// Helper to set mock data for tests
function setMockData(
  items: Array<{ functional_code: string; functional_name: string }>
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

describe('FunctionalClassificationList', () => {
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
      render(<FunctionalClassificationList {...defaultProps} />)

      expect(screen.getByTestId('search-input')).toBeInTheDocument()
    })

    it('renders list container', () => {
      render(<FunctionalClassificationList {...defaultProps} />)

      expect(screen.getByTestId('list-container')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      const { container } = render(
        <FunctionalClassificationList {...defaultProps} className="custom-class" />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('list items', () => {
    it('renders list options when items are available', () => {
      setMockData([
        { functional_code: '7.06', functional_name: 'Social assistance' },
        { functional_code: '8.01', functional_name: 'Recreation' },
      ])

      render(<FunctionalClassificationList {...defaultProps} />)

      expect(
        screen.getByTestId('list-option-7.06 - Social assistance')
      ).toBeInTheDocument()
      expect(
        screen.getByTestId('list-option-8.01 - Recreation')
      ).toBeInTheDocument()
    })

    it('marks selected items', () => {
      setMockData([{ functional_code: '7.06', functional_name: 'Social assistance' }])

      render(
        <FunctionalClassificationList
          {...defaultProps}
          selectedOptions={[{ id: '7.06', label: '7.06 - Social assistance' }]}
        />
      )

      const option = screen.getByTestId('list-option-7.06 - Social assistance')
      expect(option).toHaveAttribute('data-selected', 'true')
    })

    it('marks unselected items', () => {
      setMockData([{ functional_code: '7.06', functional_name: 'Social assistance' }])

      render(<FunctionalClassificationList {...defaultProps} />)

      const option = screen.getByTestId('list-option-7.06 - Social assistance')
      expect(option).toHaveAttribute('data-selected', 'false')
    })
  })

  describe('selection', () => {
    it('calls toggleSelect when item is clicked', () => {
      setMockData([{ functional_code: '7.06', functional_name: 'Social assistance' }])

      render(<FunctionalClassificationList {...defaultProps} />)

      fireEvent.click(screen.getByTestId('list-option-7.06 - Social assistance'))

      expect(mockToggleSelect).toHaveBeenCalledWith({
        id: '7.06',
        label: '7.06 - Social assistance',
      })
    })
  })

  describe('search', () => {
    it('renders search input with placeholder', () => {
      render(<FunctionalClassificationList {...defaultProps} />)

      expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder')
    })
  })

  describe('classification info link', () => {
    it('renders classification info link for each item', () => {
      setMockData([{ functional_code: '7.06', functional_name: 'Social assistance' }])

      render(<FunctionalClassificationList {...defaultProps} />)

      expect(screen.getByTestId('classification-info-link')).toBeInTheDocument()
    })
  })
})
