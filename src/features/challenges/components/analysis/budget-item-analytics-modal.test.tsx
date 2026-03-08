import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeSingleTimePeriod } from '@/schemas/reporting'
import { BudgetItemAnalyticsModal } from './budget-item-analytics-modal'
import type { BudgetItemAnalyticsProps } from './budget-item-analytics-context'
import { getDefaultBudgetItemAnalyticsViewState } from './budget-item-analytics-search-state'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
  }: {
    open?: boolean
    children: React.ReactNode
  }) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

const useBudgetItemAnalyticsTitleMock = vi.fn()

vi.mock('./use-budget-item-analytics-title', () => ({
  useBudgetItemAnalyticsTitle: (...args: unknown[]) =>
    useBudgetItemAnalyticsTitleMock(...args),
}))

vi.mock('./budget-item-analytics', () => ({
  BudgetItemAnalytics: (props: { context: { subjectLabel: string } }) => (
    <div data-testid="budget-item-analytics-content">{props.context.subjectLabel}</div>
  ),
}))

const defaultAnalyticsProps: BudgetItemAnalyticsProps = {
  context: {
    entityCui: '12345678',
    selectedYear: 2025,
    subjectLabel: 'Salaries',
    language: 'en',
    functionalCode: '65',
    economicCode: '10.01',
    accountCategory: 'ch',
    currentReportPeriod: makeSingleTimePeriod('YEAR', '2025'),
    reportType: 'DETAILED',
    normalization: 'total',
    currency: 'RON',
    inflationAdjusted: false,
  },
  analyticsView: getDefaultBudgetItemAnalyticsViewState(),
}

describe('BudgetItemAnalyticsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBudgetItemAnalyticsTitleMock.mockReturnValue({
      resolvedTitle:
        'Town Hall of Example · Education · Salary expenses in cash',
    })
  })

  it('does not render analytics content when analyticsProps is null', () => {
    render(
      <BudgetItemAnalyticsModal
        open={true}
        onOpenChange={vi.fn()}
        analyticsProps={null}
      />,
    )

    expect(screen.queryByTestId('dialog-root')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('budget-item-analytics-content'),
    ).not.toBeInTheDocument()
  })

  it('renders the analytics component inside the dialog when open', () => {
    render(
      <BudgetItemAnalyticsModal
        open={true}
        onOpenChange={vi.fn()}
        analyticsProps={defaultAnalyticsProps}
      />,
    )

    expect(screen.getByTestId('dialog-root')).toBeInTheDocument()
    expect(screen.getByTestId('dialog-content')).toBeInTheDocument()
    expect(screen.getByTestId('budget-item-analytics-content')).toHaveTextContent(
      'Salaries',
    )
    expect(
      screen.getByText(
        'Analytics: Town Hall of Example · Education · Salary expenses in cash',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Analytics for Town Hall of Example · Education · Salary expenses in cash.',
      ),
    ).toBeInTheDocument()
  })

  it('keeps the wrapper closed when open is false', () => {
    render(
      <BudgetItemAnalyticsModal
        open={false}
        onOpenChange={vi.fn()}
        analyticsProps={defaultAnalyticsProps}
      />,
    )

    expect(screen.queryByTestId('dialog-root')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('budget-item-analytics-content'),
    ).not.toBeInTheDocument()
  })
})
