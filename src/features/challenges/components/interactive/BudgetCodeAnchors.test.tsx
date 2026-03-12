import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'
import { BudgetCodeAnchors } from './BudgetCodeAnchors'

const groupedItemsDisplaySpy = vi.fn((props: any) => (
  <div
    data-testid="grouped-items-display"
    data-title={props.title}
    data-subchapter-prefix={props.subchapterCodePrefix ?? 'fn'}
  />
))

const useChallengeLessonEntityBundleMock = vi.fn()
const useChallengeLessonNationalAggregatedLineItemsMock = vi.fn()
const useFinancialDataMock = vi.fn()

vi.mock('@/components/entities/FinancialDataCard', () => ({
  GroupedItemsDisplay: (props: any) => groupedItemsDisplaySpy(props),
}))

vi.mock('@/features/challenges/hooks/use-challenge-lesson-entity-data', () => ({
  CHALLENGE_LESSON_DEFAULT_CURRENCY: 'RON',
  CHALLENGE_LESSON_DEFAULT_NATIONAL_EXPENSE_EXCLUSIONS: ['51.01', '51.02'],
  CHALLENGE_LESSON_YEAR: 2025,
  useChallengeLessonEntityBundle: (...args: unknown[]) => useChallengeLessonEntityBundleMock(...args),
  useChallengeLessonNationalAggregatedLineItems: (...args: unknown[]) =>
    useChallengeLessonNationalAggregatedLineItemsMock(...args),
}))

vi.mock('@/hooks/useFinancialData', () => ({
  useFinancialData: (...args: unknown[]) => useFinancialDataMock(...args),
}))

describe('BudgetCodeAnchors', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useChallengeLessonEntityBundleMock.mockReturnValue({
      aggregatedLineItemsQuery: {
        data: { nodes: [] },
        isLoading: false,
      },
      aggregatedTotalSummaryQuery: {
        data: { name: 'Primăria Oraș Test', totalIncome: 100, totalExpenses: 200 },
        isLoading: false,
      },
    })

    useChallengeLessonNationalAggregatedLineItemsMock.mockReturnValue({
      data: { nodes: [] },
      isLoading: false,
      isError: false,
    })

    useFinancialDataMock.mockReturnValue({
      filteredIncomeGroups: [
        { prefix: '04', description: 'Cote și sume defalcate din impozitul pe venit', totalAmount: 50, functionals: [] },
      ],
      filteredExpenseGroups: [
        { prefix: '66', description: 'Sănătate', totalAmount: 100, functionals: [] },
      ],
      filteredEconomicGroups: [
        { prefix: '10', description: 'Cheltuieli de personal', totalAmount: 80, functionals: [] },
      ],
      incomeBase: 100,
      expenseBase: 200,
    })
  })

  it('renders nothing when no section/part are specified', () => {
    const { container } = render(
      <BudgetCodeAnchors
        group="income-functional"
        entityCui="12345678"
        locale="ro"
      />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('renders the national income distribution table for section 0 part national', () => {
    render(
      <BudgetCodeAnchors
        group="income-functional"
        entityCui="12345678"
        locale="ro"
        section={0}
        part="national"
      />,
    )

    expect(screen.getByText('25,10%')).toBeInTheDocument()
  })

  it('renders the live grouped income for section 0 part grouped with entity name and year', () => {
    render(
      <BudgetCodeAnchors
        group="income-functional"
        entityCui="12345678"
        locale="ro"
        section={0}
        part="grouped"
      />,
    )

    expect(screen.getAllByTestId('grouped-items-display')).toHaveLength(1)
    expect(screen.getByText('Primăria Oraș Test (2025)')).toBeInTheDocument()
  })

  it('renders the national functional expense table for section 1 part national', () => {
    render(
      <BudgetCodeAnchors
        group="income-functional"
        entityCui="12345678"
        locale="ro"
        section={1}
        part="national"
      />,
    )

    expect(screen.getByText('20,66%')).toBeInTheDocument()
  })

  it('renders the live grouped spending for section 1 part grouped', () => {
    render(
      <BudgetCodeAnchors
        group="income-functional"
        entityCui="12345678"
        locale="ro"
        section={1}
        part="grouped"
      />,
    )

    expect(screen.getAllByTestId('grouped-items-display')).toHaveLength(1)
  })

  it('shows only the top five national rows by default and expands the full list on demand', () => {
    render(
      <BudgetCodeAnchors
        group="expense-functional"
        entityCui="12345678"
        locale="ro"
        section={0}
        part="national"
      />,
    )

    expect(screen.queryByText('51')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vezi Mai Mult' }))
    expect(screen.getByText('51')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arată Mai Puțin' })).toBeInTheDocument()
  })

  it('renders the live national economic table and forwards economic grouped items with ec prefix', () => {
    useChallengeLessonNationalAggregatedLineItemsMock.mockReturnValue({
      data: {
        nodes: [
          {
            fn_c: '65',
            fn_n: 'Învățământ',
            ec_c: '10.01',
            ec_n: 'Cheltuieli salariale în bani',
            amount: 50,
            count: 1,
          },
          {
            fn_c: '66',
            fn_n: 'Sănătate',
            ec_c: '20.01',
            ec_n: 'Bunuri și servicii',
            amount: 100,
            count: 1,
          },
        ],
      },
      isLoading: false,
      isError: false,
    })

    render(
      <BudgetCodeAnchors
        group="expense-economic"
        entityCui="12345678"
        locale="ro"
        section={0}
        part="national"
      />,
    )

    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })

  it('renders the ec-prefixed grouped items for expense-economic part grouped', () => {
    render(
      <BudgetCodeAnchors
        group="expense-economic"
        entityCui="12345678"
        locale="ro"
        section={0}
        part="grouped"
      />,
    )

    expect(screen.getAllByTestId('grouped-items-display')).toHaveLength(1)
    expect(groupedItemsDisplaySpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        subchapterCodePrefix: 'ec',
      }),
    )
  })

  it('shows unavailable message when live grouped items are empty', () => {
    useFinancialDataMock.mockReturnValue({
      filteredIncomeGroups: [],
      filteredExpenseGroups: [],
      filteredEconomicGroups: [],
      incomeBase: 0,
      expenseBase: 0,
    })

    render(
      <BudgetCodeAnchors
        group="expense-functional"
        entityCui="12345678"
        locale="ro"
        section={0}
        part="grouped"
      />,
    )

    expect(screen.getByText('Gruparea live nu este disponibilă încă.')).toBeInTheDocument()
  })
})
