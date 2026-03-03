/**
 * BudgetExplorerHeader Component Tests
 *
 * This file tests the BudgetExplorerHeader component which displays
 * filter controls for the budget explorer including income/expense toggle,
 * normalization mode, and period selection.
 *
 * Pattern: Interactive Header Component Testing
 * - Test toggle group interactions
 * - Test filter changes
 * - Test popover/responsive behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@/test/test-utils'
import { BudgetExplorerHeader } from './BudgetExplorerHeader'
import type { BudgetExplorerState } from '@/routes/budget-explorer.lazy'

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

// Mock EntityReportLabel
vi.mock('@/components/entities/EntityReportLabel', () => ({
  EntityReportLabel: ({ period }: { period: { year?: number } }) => (
    <span data-testid="entity-report-label">
      {period?.year ? `Year ${period.year}` : 'Select period'}
    </span>
  ),
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
    </select>
  ),
}))

// Mock PeriodFilter
vi.mock('@/components/filters/period-filter/PeriodFilter', () => ({
  PeriodFilter: ({
    onChange,
  }: {
    value: unknown
    onChange: (period: { type: string; selection: { dates: string[] } }) => void
  }) => (
    <div data-testid="period-filter">
      <button
        data-testid="period-filter-2023"
        onClick={() => onChange({ type: 'YEAR', selection: { dates: ['2023'] } })}
      >
        Select 2023
      </button>
    </div>
  ),
}))

// Mock ResponsivePopover
vi.mock('@/components/ui/ResponsivePopover', () => ({
  ResponsivePopover: ({
    trigger,
    content,
    open,
    onOpenChange,
  }: {
    trigger: React.ReactNode
    content: React.ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
  }) => (
    <div data-testid="responsive-popover">
      <div onClick={() => onOpenChange(!open)}>{trigger}</div>
      {open && <div data-testid="popover-content">{content}</div>}
    </div>
  ),
}))

// ============================================================================
// TEST DATA
// ============================================================================

const createState = (
  overrides: Partial<BudgetExplorerState> = {}
): BudgetExplorerState =>
  ({
    filter: {
      account_category: 'ch',
      normalization: 'total',
      report_period: { type: 'YEAR', selection: { dates: ['2023'] } },
      currency: 'RON',
    },
    primary: 'fn',
    depth: 'chapter',
    ...overrides,
  }) as BudgetExplorerState

// ============================================================================
// TESTS
// ============================================================================

describe('BudgetExplorerHeader', () => {
  const defaultOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders header container', () => {
      const { container } = render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(container.firstChild).toHaveClass('md:sticky')
    })

    it('renders income vs expenses label', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(screen.getByText('Income vs Expenses')).toBeInTheDocument()
    })

    it('renders normalization label', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(screen.getByText('Normalization')).toBeInTheDocument()
    })

    it('renders grouping label', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(screen.getByText('Grouping')).toBeInTheDocument()
    })

    it('renders period label', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(screen.getByText('Period')).toBeInTheDocument()
    })
  })

  describe('toggle group', () => {
    it('renders income toggle option', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(screen.getByText('Income')).toBeInTheDocument()
    })

    it('renders expenses toggle option', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(screen.getByText('Expenses')).toBeInTheDocument()
    })

    it('calls onChange when switching to income', () => {
      const onChange = vi.fn()
      render(<BudgetExplorerHeader state={createState()} onChange={onChange} />)

      fireEvent.click(screen.getByText('Income'))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            account_category: 'vn',
          }),
          primary: 'fn',
        })
      )
    })

    it('calls onChange when switching to expenses', () => {
      const onChange = vi.fn()
      const state = createState({
        filter: {
          account_category: 'vn',
          normalization: 'total',
          report_period: { type: 'YEAR', selection: { dates: ['2023'] } },
          currency: 'RON',
        } as BudgetExplorerState['filter'],
      })
      render(<BudgetExplorerHeader state={state} onChange={onChange} />)

      fireEvent.click(screen.getByText('Expenses'))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            account_category: 'ch',
          }),
        })
      )
    })

    it('sets primary to fn when switching to income', () => {
      const onChange = vi.fn()
      const state = createState({ primary: 'ec' })
      render(<BudgetExplorerHeader state={state} onChange={onChange} />)

      fireEvent.click(screen.getByText('Income'))

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          primary: 'fn',
        })
      )
    })

    it('updates grouping when switching to economic', () => {
      const onChange = vi.fn()
      render(<BudgetExplorerHeader state={createState()} onChange={onChange} />)

      fireEvent.click(screen.getByText('Economic'))

      expect(onChange).toHaveBeenCalledWith({ primary: 'ec' })
    })

    it('disables economic grouping for income', () => {
      const state = createState({
        filter: {
          account_category: 'vn',
          normalization: 'total',
          report_period: { type: 'YEAR', selection: { dates: ['2023'] } },
          currency: 'RON',
        } as BudgetExplorerState['filter'],
      })

      render(<BudgetExplorerHeader state={state} onChange={defaultOnChange} />)

      expect(screen.getByRole('radio', { name: 'Economic' })).toBeDisabled()
    })
  })

  describe('normalization select', () => {
    it('renders normalization select', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(screen.getByTestId('normalization-select')).toBeInTheDocument()
    })

    it('shows current normalization value', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(screen.getByTestId('normalization-select')).toHaveValue('total')
    })

    it('calls onChange when normalization changes', () => {
      const onChange = vi.fn()
      render(<BudgetExplorerHeader state={createState()} onChange={onChange} />)

      fireEvent.change(screen.getByTestId('normalization-select'), {
        target: { value: 'per_capita' },
      })

      expect(onChange).toHaveBeenCalledWith({
        filter: expect.objectContaining({
          normalization: 'per_capita',
        }),
      })
    })
  })

  describe('period filter', () => {
    it('renders period button with aria-label', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(
        screen.getByRole('button', { name: 'Reporting period' })
      ).toBeInTheDocument()
    })

    it('shows entity report label in trigger', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      expect(screen.getByTestId('entity-report-label')).toBeInTheDocument()
    })

    it('opens popover when button is clicked', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Reporting period' }))

      expect(screen.getByTestId('popover-content')).toBeInTheDocument()
    })

    it('shows period filter in popover content', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      fireEvent.click(screen.getByRole('button', { name: 'Reporting period' }))

      expect(screen.getByTestId('period-filter')).toBeInTheDocument()
    })

    it('calls onChange when period is selected', () => {
      const onChange = vi.fn()
      render(<BudgetExplorerHeader state={createState()} onChange={onChange} />)

      fireEvent.click(screen.getByRole('button', { name: 'Reporting period' }))
      fireEvent.click(screen.getByTestId('period-filter-2023'))

      expect(onChange).toHaveBeenCalledWith({
        filter: expect.objectContaining({
          report_period: { type: 'YEAR', selection: { dates: ['2023'] } },
        }),
      })
    })
  })

  describe('responsive layout', () => {
    it('renders grid layout', () => {
      const { container } = render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      const grid = container.querySelector('.grid')
      expect(grid).toHaveClass('grid-cols-1')
      expect(grid).toHaveClass('md:grid-cols-2')
      expect(grid).toHaveClass('xl:grid-cols-4')
    })
  })

  describe('state display', () => {
    it('shows expenses as selected when account_category is ch', () => {
      render(
        <BudgetExplorerHeader state={createState()} onChange={defaultOnChange} />
      )

      // The toggle group should show ch (expenses) as selected
      const expensesButton = screen.getByText('Expenses').closest('button')
      expect(expensesButton).toHaveAttribute('data-state', 'on')
    })

    it('shows income as selected when account_category is vn', () => {
      const state = createState({
        filter: {
          account_category: 'vn',
          normalization: 'total',
          report_period: { type: 'YEAR', selection: { dates: ['2023'] } },
          currency: 'RON',
        } as BudgetExplorerState['filter'],
      })
      render(<BudgetExplorerHeader state={state} onChange={defaultOnChange} />)

      // The toggle group should show vn (income) as selected
      const incomeButton = screen.getByText('Income').closest('button')
      expect(incomeButton).toHaveAttribute('data-state', 'on')
    })

    it('shows per_capita normalization when selected', () => {
      const state = createState({
        filter: {
          account_category: 'ch',
          normalization: 'per_capita',
          report_period: { type: 'YEAR', selection: { dates: ['2023'] } },
          currency: 'RON',
        } as BudgetExplorerState['filter'],
      })
      render(<BudgetExplorerHeader state={state} onChange={defaultOnChange} />)

      expect(screen.getByTestId('normalization-select')).toHaveValue(
        'per_capita'
      )
    })
  })
})
