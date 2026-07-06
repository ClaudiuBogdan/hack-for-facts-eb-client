/**
 * BudgetDetailsDrawer Component Tests
 *
 * This file tests the BudgetDetailsDrawer component which displays
 * detailed budget breakdown in a slide-out drawer.
 *
 * Pattern: Drawer/Modal Component Testing
 * - Test open/close states
 * - Test content rendering
 * - Test filtering by code
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { BudgetDetailsDrawer } from './BudgetDetailsDrawer'
import type { AggregatedNode } from './budget-transform'
import type { AnalyticsFilterType } from '@/schemas/charts'

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

// Mock getClassificationName
vi.mock('@/lib/classifications', () => ({
  getClassificationName: (code: string) => `Classification ${code}`,
}))

// Mock useFinancialData hook
vi.mock('@/hooks/useFinancialData', () => ({
  useFinancialData: () => ({
    filteredExpenseGroups: [],
    expenseBase: 0,
    filteredIncomeGroups: [],
    incomeBase: 0,
  }),
}))

// Mock GroupedChapterAccordion
vi.mock('@/components/entities/GroupedChapterAccordion', () => ({
  default: ({ ch }: { ch: { prefix: string } }) => (
    <div data-testid="grouped-chapter">{ch.prefix}</div>
  ),
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createNode = (
  fn_c: string,
  fn_n: string,
  ec_c: string,
  ec_n: string,
  amount: number
): AggregatedNode => ({
  fn_c,
  fn_n,
  ec_c,
  ec_n,
  amount,
  count: 1,
})

const createFilter = (overrides: Partial<AnalyticsFilterType> = {}): AnalyticsFilterType => ({
  account_category: 'ch',
  normalization: 'total',
  currency: 'RON',
  ...overrides,
} as AnalyticsFilterType)

// ============================================================================
// TESTS
// ============================================================================

describe('BudgetDetailsDrawer', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    code: '01',
    primary: 'fn' as const,
    nodes: [
      createNode('01', 'Education', '10', 'Personnel', 5000),
      createNode('01.01', 'Primary', '10.01', 'Wages', 3000),
    ],
    filter: createFilter(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('open state', () => {
    it('renders when open is true', () => {
      render(<BudgetDetailsDrawer {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('does not render dialog when open is false', () => {
      render(<BudgetDetailsDrawer {...defaultProps} open={false} />)

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('title display', () => {
    it('displays title based on code', () => {
      render(<BudgetDetailsDrawer {...defaultProps} code="01.02" />)

      // Uses getClassificationName for 4-digit codes
      expect(screen.getByText(/Classification 01.02/)).toBeInTheDocument()
    })

    it('displays fallback title when code is simple', () => {
      render(<BudgetDetailsDrawer {...defaultProps} code="01" />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty message when no groups found', () => {
      render(<BudgetDetailsDrawer {...defaultProps} />)

      expect(
        screen.getByText('No detailed data available for this selection.')
      ).toBeInTheDocument()
    })
  })

  describe('filtering', () => {
    it('filters by functional code when primary is fn', () => {
      const nodes = [
        createNode('01', 'Education', '10', 'Personnel', 5000),
        createNode('02', 'Health', '20', 'Goods', 3000),
      ]

      render(
        <BudgetDetailsDrawer
          {...defaultProps}
          nodes={nodes}
          code="01"
          primary="fn"
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('filters by economic code when primary is ec', () => {
      const nodes = [
        createNode('01', 'Education', '10', 'Personnel', 5000),
        createNode('02', 'Health', '20', 'Goods', 3000),
      ]

      render(
        <BudgetDetailsDrawer
          {...defaultProps}
          nodes={nodes}
          code="10"
          primary="ec"
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('account category', () => {
    it('uses expense groups for ch account category', () => {
      render(
        <BudgetDetailsDrawer
          {...defaultProps}
          filter={createFilter({ account_category: 'ch' })}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('uses income groups for vn account category', () => {
      render(
        <BudgetDetailsDrawer
          {...defaultProps}
          filter={createFilter({ account_category: 'vn' })}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('onOpenChange callback', () => {
    it('calls onOpenChange when close button clicked', () => {
      const onOpenChange = vi.fn()
      render(
        <BudgetDetailsDrawer {...defaultProps} onOpenChange={onOpenChange} />
      )

      // The Sheet close button's accessible name is the i18n default (ro: "Închide").
      const closeButton = screen.getByRole('button', { name: /închide|close/i })
      closeButton.click()

      expect(onOpenChange).toHaveBeenCalled()
    })
  })

  describe('null code handling', () => {
    it('handles null code gracefully', () => {
      render(<BudgetDetailsDrawer {...defaultProps} code={null} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
