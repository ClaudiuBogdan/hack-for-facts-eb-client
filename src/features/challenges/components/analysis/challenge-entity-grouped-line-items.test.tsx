import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionLineItem } from '@/lib/api/entities'
import { ChallengeEntityGroupedLineItems } from './challenge-entity-grouped-line-items'

const useFinancialDataMock = vi.fn()
const groupedItemsDisplayMock = vi.fn()
const searchToggleInputMock = vi.fn()

vi.mock('@/hooks/useFinancialData', () => ({
  useFinancialData: (...args: unknown[]) => useFinancialDataMock(...args),
}))

vi.mock('@/components/entities/SearchToggleInput', () => ({
  SearchToggleInput: (props: any) => {
    searchToggleInputMock(props)
    return (
      <button
        type="button"
        data-testid="search-toggle-input"
        onClick={() => props.onToggle?.(!props.active)}
      >
        {`search:${props.initialSearchTerm}:${String(props.active)}:${props.focusKey ?? ''}`}
      </button>
    )
  },
}))

vi.mock('@/components/entities/FinancialDataCard', () => ({
  GroupedItemsDisplay: (props: any) => {
    groupedItemsDisplayMock(props)
    return (
      <div data-testid="grouped-items-display">
        {`${props.subchapterCodePrefix}:${props.baseTotal}:${props.groups.length}`}
      </div>
    )
  },
}))

const expenseLineItems: ExecutionLineItem[] = [
  {
    line_item_id: 'expense-line',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '65.02',
      functional_name: 'Învățământ',
    },
    economicClassification: {
      economic_code: '20.01',
      economic_name: 'Bunuri și servicii',
    },
    ytd_amount: 120,
    quarterly_amount: 120,
    monthly_amount: 120,
    amount: 120,
  },
]

const incomeLineItems: ExecutionLineItem[] = [
  {
    line_item_id: 'income-line',
    account_category: 'vn',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '00.01',
      functional_name: 'Venituri',
    },
    economicClassification: {
      economic_code: '04.02',
      economic_name: 'Impozite',
    },
    ytd_amount: 240,
    quarterly_amount: 240,
    monthly_amount: 240,
    amount: 240,
  },
]

const financialDataResult = {
  filteredExpenseGroups: [
    {
      prefix: '65',
      description: 'Învățământ',
      totalAmount: 120,
      functionals: [],
    },
  ],
  expenseBase: 120,
  filteredIncomeGroups: [
    {
      prefix: '00',
      description: 'Venituri',
      totalAmount: 240,
      functionals: [],
      subchapters: [],
    },
  ],
  incomeBase: 240,
  filteredEconomicGroups: [
    {
      prefix: '20',
      description: 'Bunuri și servicii',
      totalAmount: 120,
      functionals: [],
      subchapters: [],
    },
  ],
}

const defaultProps = {
  accountTitle: 'Cheltuieli',
  lineItems: expenseLineItems,
  accountCategory: 'ch' as const,
  groupBy: 'fn' as const,
  currentYear: 2025,
  normalizationOptions: {
    normalization: 'total' as const,
    currency: 'RON' as const,
  },
}

describe('ChallengeEntityGroupedLineItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useFinancialDataMock.mockReturnValue({
      expenseSearchTerm: '',
      onExpenseSearchChange: vi.fn(),
      expenseSearchActive: false,
      onExpenseSearchToggle: vi.fn(),
      filteredExpenseGroups: financialDataResult.filteredExpenseGroups,
      expenseBase: financialDataResult.expenseBase,
      incomeSearchTerm: '',
      onIncomeSearchChange: vi.fn(),
      incomeSearchActive: false,
      onIncomeSearchToggle: vi.fn(),
      filteredIncomeGroups: financialDataResult.filteredIncomeGroups,
      incomeBase: financialDataResult.incomeBase,
      filteredEconomicGroups: financialDataResult.filteredEconomicGroups,
    })
  })

  it('renders the grouped heading, the expense title, and the search element', () => {
    render(<ChallengeEntityGroupedLineItems {...defaultProps} />)

    const heading = screen.getByRole('heading', { name: 'Cheltuieli' })
    const header = screen.getByTestId('challenge-grouped-line-items-header')
    const searchToggle = screen.getByTestId('search-toggle-input')

    expect(heading).toBeInTheDocument()
    expect(heading).toHaveClass('text-xl', 'font-black', 'tracking-tight')
    expect(header).toContainElement(heading)
    expect(header).toContainElement(searchToggle)
    expect(screen.queryByText('Cum s-au cheltuit banii')).not.toBeInTheDocument()
    expect(searchToggle).toHaveTextContent(
      'search::false:mod+j',
    )
    expect(
      screen.queryByRole('button', { name: 'Arată venituri' }),
    ).not.toBeInTheDocument()

    expect(useFinancialDataMock).toHaveBeenCalledTimes(1)
    expect(useFinancialDataMock.mock.calls[0]?.[1]).toBeNull()
    expect(useFinancialDataMock.mock.calls[0]?.[2]).toBe(120)
    expect(useFinancialDataMock.mock.calls[0]?.[5]).toEqual({
      computeEconomic: false,
      searchDebounceMs: 0,
    })
    expect(groupedItemsDisplayMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: financialDataResult.filteredExpenseGroups,
        title: 'Cheltuieli',
        baseTotal: financialDataResult.expenseBase,
        currentYear: 2025,
        normalization: 'total',
        currency: 'RON',
        searchTerm: '',
        showTotalValueHeader: false,
        subchapterCodePrefix: 'fn',
      }),
    )
    expect(searchToggleInputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        active: false,
        initialSearchTerm: '',
        focusKey: 'mod+j',
        debounceMs: 0,
      }),
    )
  })

  it('uses economic groups when the subsection is in economic mode', () => {
    render(
      <ChallengeEntityGroupedLineItems
        {...defaultProps}
        groupBy="ec"
      />,
    )

    expect(useFinancialDataMock.mock.calls[0]?.[5]).toEqual({
      computeEconomic: true,
      searchDebounceMs: 0,
    })
    expect(groupedItemsDisplayMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: financialDataResult.filteredEconomicGroups,
        title: 'Cheltuieli',
        baseTotal: financialDataResult.expenseBase,
        searchTerm: '',
        showTotalValueHeader: false,
        subchapterCodePrefix: 'ec',
      }),
    )
    expect(screen.getByTestId('grouped-items-display')).toHaveTextContent(
      'ec:120:1',
    )
    expect(screen.getByTestId('search-toggle-input')).toHaveTextContent(
      'search::false:mod+j',
    )
  })

  it('hides the primary toggle and uses income groups in revenue mode', () => {
    render(
      <ChallengeEntityGroupedLineItems
        {...defaultProps}
        accountTitle="Venituri"
        lineItems={incomeLineItems}
        accountCategory="vn"
      />,
    )

    expect(useFinancialDataMock.mock.calls[0]?.[1]).toBe(240)
    expect(useFinancialDataMock.mock.calls[0]?.[2]).toBeNull()
    expect(screen.getByText('Venituri')).toBeInTheDocument()
    expect(groupedItemsDisplayMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: financialDataResult.filteredIncomeGroups,
        title: 'Venituri',
        baseTotal: financialDataResult.incomeBase,
        searchTerm: '',
        showTotalValueHeader: false,
        subchapterCodePrefix: 'fn',
      }),
    )
    expect(screen.getByTestId('search-toggle-input')).toHaveTextContent(
      'search::false:mod+l',
    )
  })

  it('seeds and clears the expense search from the preset term', async () => {
    const { rerender } = render(
      <ChallengeEntityGroupedLineItems
        {...defaultProps}
        presetSearchTerm="fn:51.01.03"
      />,
    )

    expect(getLatestGroupedItemsDisplayProps()).toEqual(
      expect.objectContaining({
        searchTerm: 'fn:51.01.03',
        showTotalValueHeader: true,
      }),
    )
    expect(screen.getByTestId('search-toggle-input')).toHaveTextContent(
      'search:fn:51.01.03:true:mod+j',
    )

    rerender(<ChallengeEntityGroupedLineItems {...defaultProps} />)

    await waitFor(() => {
      expect(getLatestGroupedItemsDisplayProps()).toEqual(
        expect.objectContaining({
          searchTerm: '',
          showTotalValueHeader: false,
        }),
      )
    })

    expect(screen.getByTestId('search-toggle-input')).toHaveTextContent(
      'search::false:mod+j',
    )
  })

  it('wires the search toggle to the local search state', () => {
    render(<ChallengeEntityGroupedLineItems {...defaultProps} />)

    fireEvent.click(screen.getByTestId('search-toggle-input'))

    expect(screen.getByTestId('search-toggle-input')).toHaveTextContent(
      'search::true:mod+j',
    )
  })
})

function getLatestGroupedItemsDisplayProps(): Record<string, unknown> {
  const latestCallIndex = groupedItemsDisplayMock.mock.calls.length - 1
  const latestCall = groupedItemsDisplayMock.mock.calls[latestCallIndex]?.[0]

  if (!latestCall) {
    throw new Error('Missing grouped items display props.')
  }

  return latestCall
}
