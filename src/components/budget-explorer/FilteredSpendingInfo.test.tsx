/**
 * FilteredSpendingInfo Component Tests
 *
 * This file tests the FilteredSpendingInfo component which displays
 * spending calculation breakdown and amount filter controls.
 *
 * Pattern: Interactive Component Testing
 * - Test conditional rendering
 * - Test mobile vs desktop layouts
 * - Test amount filter interactions
 * - Test excluded items display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { FilteredSpendingInfo } from './FilteredSpendingInfo'
import type { ExcludedItemsSummary } from './budget-transform'

// ============================================================================
// MOCKS
// ============================================================================

// Mock ResizeObserver for Radix UI components
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))

// Mock the yValueFormatter
vi.mock('@/components/charts/components/chart-renderer/utils', () => ({
  yValueFormatter: (value: number, _unit: string, format: string) => {
    if (format === 'compact') return `${value.toLocaleString()} (compact)`
    return `${value.toLocaleString()} (standard)`
  },
}))

// Mock useIsMobile hook
let mockIsMobile = false
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

// Mock useDebouncedCallback
vi.mock('@/lib/hooks/useDebouncedCallback', () => ({
  useDebouncedCallback: <T extends unknown[]>(fn: (...args: T) => void) => fn,
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createExcludedSummary = (
  overrides: Partial<ExcludedItemsSummary> = {}
): ExcludedItemsSummary => ({
  totalBeforeExclusion: 10000,
  totalExcluded: 2000,
  totalAfterExclusion: 8000,
  items: [
    { code: 'ec:51', label: 'Transfers', amount: 1500 },
    { code: 'ec:55.01', label: 'Internal', amount: 500 },
  ],
  ...overrides,
})

const createAmountFilter = (overrides = {}) => ({
  minValue: 0,
  maxValue: 10000,
  range: [0, 10000] as [number, number],
  onChange: vi.fn(),
  ...overrides,
})

// ============================================================================
// TESTS
// ============================================================================

describe('FilteredSpendingInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMobile = false
  })

  describe('conditional rendering', () => {
    it('returns null when no excluded items and no amount filter', () => {
      const { container } = render(
        <FilteredSpendingInfo unit="RON" excludedItemsSummary={undefined} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('returns null when excluded items total is zero', () => {
      const summary = createExcludedSummary({ totalExcluded: 0 })
      const { container } = render(
        <FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('returns null when amount filter max is zero', () => {
      const filter = createAmountFilter({ maxValue: 0 })
      const { container } = render(
        <FilteredSpendingInfo unit="RON" amountFilter={filter} />
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders when excluded items exist', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      expect(screen.getByText('Filtered')).toBeInTheDocument()
    })

    it('renders when amount filter has max value', () => {
      const filter = createAmountFilter()
      render(<FilteredSpendingInfo unit="RON" amountFilter={filter} />)

      expect(screen.getByText('Filtered')).toBeInTheDocument()
    })
  })

  describe('desktop layout (dialog)', () => {
    it('renders the default trigger button', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      expect(screen.getByText('Filtered')).toBeInTheDocument()
    })

    it('opens the dialog on click', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders the icon trigger variant', () => {
      const summary = createExcludedSummary()
      render(
        <FilteredSpendingInfo
          unit="RON"
          excludedItemsSummary={summary}
          triggerVariant="icon"
        />
      )

      expect(
        screen.getByRole('button', { name: 'Spending Calculation' })
      ).toBeInTheDocument()
      expect(screen.queryByText('Filtered')).not.toBeInTheDocument()
    })

    it('opens the dialog from the icon trigger', () => {
      const summary = createExcludedSummary()
      render(
        <FilteredSpendingInfo
          unit="RON"
          excludedItemsSummary={summary}
          triggerVariant="icon"
        />
      )

      fireEvent.click(
        screen.getByRole('button', { name: 'Spending Calculation' })
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('mobile layout (dialog)', () => {
    beforeEach(() => {
      mockIsMobile = true
    })

    it('renders dialog trigger button on mobile', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      const button = screen.getByRole('button', { name: /Filtered/i })
      expect(button).toBeInTheDocument()
    })

    it('opens dialog on mobile button click', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByRole('button', { name: /Filtered/i }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('opens dialog from the icon trigger on mobile', () => {
      const summary = createExcludedSummary()
      render(
        <FilteredSpendingInfo
          unit="RON"
          excludedItemsSummary={summary}
          triggerVariant="icon"
        />
      )

      fireEvent.click(
        screen.getByRole('button', { name: 'Spending Calculation' })
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('excluded items display', () => {
    it('shows spending calculation header', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getAllByText('Spending Calculation').length).toBeGreaterThan(0)
    })

    it('shows total spending value', () => {
      const summary = createExcludedSummary({ totalBeforeExclusion: 10000 })
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('Total Spending')).toBeInTheDocument()
      expect(screen.getByText('10,000 (compact)')).toBeInTheDocument()
    })

    it('shows excluded items total', () => {
      const summary = createExcludedSummary({ totalExcluded: 2000 })
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('Excluded Items')).toBeInTheDocument()
      expect(screen.getByText('2,000 (compact)')).toBeInTheDocument()
    })

    it('shows effective spending result', () => {
      const summary = createExcludedSummary({ totalAfterExclusion: 8000 })
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('Effective Spending')).toBeInTheDocument()
      expect(screen.getByText('8,000 (compact)')).toBeInTheDocument()
    })

    it('shows excluded categories section', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('Excluded categories')).toBeInTheDocument()
    })

    it('lists individual excluded items', () => {
      const summary = createExcludedSummary({
        items: [
          { code: 'ec:51', label: 'Transfers', amount: 1500 },
          { code: 'ec:55.01', label: 'Internal', amount: 500 },
        ],
      })
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('Transfers')).toBeInTheDocument()
      expect(screen.getByText('ec:51')).toBeInTheDocument()
      expect(screen.getByText('Internal')).toBeInTheDocument()
      expect(screen.getByText('ec:55.01')).toBeInTheDocument()
    })

    it('shows info note about transfers', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(
        screen.getByText(/Transfer items are excluded/)
      ).toBeInTheDocument()
    })
  })

  describe('amount filter', () => {
    it('shows amount filter section when provided', () => {
      const filter = createAmountFilter()
      render(<FilteredSpendingInfo unit="RON" amountFilter={filter} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('Amount filter (this layer)')).toBeInTheDocument()
    })

    it('shows slider when amount filter provided', () => {
      const filter = createAmountFilter()
      render(<FilteredSpendingInfo unit="RON" amountFilter={filter} />)

      fireEvent.click(screen.getByText('Filtered'))

      // Range slider has two handles (min and max)
      const sliders = screen.getAllByRole('slider')
      expect(sliders.length).toBe(2)
    })

    it('shows min and max values', () => {
      const filter = createAmountFilter({ minValue: 100, maxValue: 5000 })
      render(<FilteredSpendingInfo unit="RON" amountFilter={filter} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('100 (compact)')).toBeInTheDocument()
      expect(screen.getByText('5,000 (compact)')).toBeInTheDocument()
    })

    it('shows reset button when range is modified', () => {
      const filter = createAmountFilter({
        minValue: 0,
        maxValue: 10000,
        range: [1000, 8000], // Modified range
      })
      render(<FilteredSpendingInfo unit="RON" amountFilter={filter} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('Reset amount filter')).toBeInTheDocument()
    })

    it('does not show reset button when range is at full extent', () => {
      const filter = createAmountFilter({
        minValue: 0,
        maxValue: 10000,
        range: [0, 10000],
      })
      render(<FilteredSpendingInfo unit="RON" amountFilter={filter} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.queryByText('Reset amount filter')).not.toBeInTheDocument()
    })

    it('calls onChange when reset button is clicked', () => {
      const onChange = vi.fn()
      const filter = createAmountFilter({
        minValue: 0,
        maxValue: 10000,
        range: [1000, 8000],
        onChange,
      })
      render(<FilteredSpendingInfo unit="RON" amountFilter={filter} />)

      fireEvent.click(screen.getByText('Filtered'))
      fireEvent.click(screen.getByText('Reset amount filter'))

      expect(onChange).toHaveBeenCalledWith([0, 10000])
    })
  })

  describe('visual structure', () => {
    it('shows minus sign for deduction', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('−')).toBeInTheDocument()
    })

    it('shows equals sign before result', () => {
      const summary = createExcludedSummary()
      render(<FilteredSpendingInfo unit="RON" excludedItemsSummary={summary} />)

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getByText('=')).toBeInTheDocument()
    })
  })

  describe('combined display', () => {
    it('shows both excluded items and amount filter when both provided', () => {
      const summary = createExcludedSummary()
      const filter = createAmountFilter()
      render(
        <FilteredSpendingInfo
          unit="RON"
          excludedItemsSummary={summary}
          amountFilter={filter}
        />
      )

      fireEvent.click(screen.getByText('Filtered'))

      expect(screen.getAllByText('Spending Calculation').length).toBeGreaterThan(0)
      expect(screen.getByText('Amount filter (this layer)')).toBeInTheDocument()
    })
  })
})
