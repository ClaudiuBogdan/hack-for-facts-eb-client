import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { GroupedChapter } from '@/schemas/financial'
import type { AnalyticsFilterType } from '@/schemas/charts'
import { EntityAnalyticsLineItems } from './EntityAnalyticsLineItems'

const {
  groupedItemsDisplaySpy,
  mockUseFinancialData,
  mockNavigate,
} = vi.hoisted(() => ({
  groupedItemsDisplaySpy: vi.fn(),
  mockUseFinancialData: vi.fn(),
  mockNavigate: vi.fn(),
}))

vi.mock('@/hooks/useFinancialData', () => ({
  useFinancialData: (...args: unknown[]) => mockUseFinancialData(...args),
}))

vi.mock('../entities/FinancialDataCard', () => ({
  GroupedItemsDisplay: (props: any) => {
    groupedItemsDisplaySpy(props)
    return <div data-testid="grouped-items-display">{props.title}</div>
  },
}))

vi.mock('../entities/SearchToggleInput', () => ({
  SearchToggleInput: () => <div data-testid="search-toggle-input" />,
}))

vi.mock('./EntityAnalyticsLineItemsSkeleton', () => ({
  EntityAnalyticsLineItemsSkeleton: () => <div data-testid="line-items-skeleton" />,
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const functionalGroups: GroupedChapter[] = [
  {
    prefix: '65',
    description: 'Education',
    totalAmount: 100,
    functionals: [],
  },
]

const economicGroups: GroupedChapter[] = [
  {
    prefix: '20',
    description: 'Goods and services',
    totalAmount: 100,
    functionals: [],
    subchapters: [
      {
        code: '20.01',
        name: 'Goods',
        totalAmount: 100,
        functionals: [],
      },
    ],
  },
]

const baseFilter = {
  account_category: 'ch',
  normalization: 'total',
  currency: 'RON',
} as AnalyticsFilterType

const baseData = {
  nodes: [
    {
      fn_c: '65',
      fn_n: 'Education',
      ec_c: '20',
      ec_n: 'Goods and services',
      amount: 100,
      count: 1,
    },
  ],
  pageInfo: {
    totalCount: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
}

describe('EntityAnalyticsLineItems', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseFinancialData.mockReturnValue({
      expenseSearchTerm: '',
      onExpenseSearchChange: vi.fn(),
      expenseSearchActive: false,
      onExpenseSearchToggle: vi.fn(),
      filteredExpenseGroups: functionalGroups,
      expenseBase: 100,
      incomeSearchTerm: '',
      onIncomeSearchChange: vi.fn(),
      incomeSearchActive: false,
      onIncomeSearchToggle: vi.fn(),
      filteredIncomeGroups: functionalGroups,
      incomeBase: 100,
      filteredEconomicGroups: economicGroups,
    })
  })

  it('uses functional groups and disables economic computation when groupBy is fn', () => {
    render(
      <EntityAnalyticsLineItems
        filter={baseFilter}
        title="Expenses"
        groupBy="fn"
        data={baseData}
      />
    )

    expect(screen.getByTestId('grouped-items-display')).toBeInTheDocument()
    const lastUseFinancialDataCall = mockUseFinancialData.mock.calls[mockUseFinancialData.mock.calls.length - 1]
    const optionsArg = lastUseFinancialDataCall?.[5]
    expect(optionsArg).toEqual({ computeEconomic: false })

    const lastGroupedItemsDisplayCall = groupedItemsDisplaySpy.mock.calls[groupedItemsDisplaySpy.mock.calls.length - 1]
    const groupedItemsProps = lastGroupedItemsDisplayCall?.[0]
    expect(groupedItemsProps.groups).toBe(functionalGroups)
    expect(groupedItemsProps.subchapterCodePrefix).toBe('fn')
  })

  it('uses economic groups and enables economic computation when groupBy is ec', () => {
    render(
      <EntityAnalyticsLineItems
        filter={baseFilter}
        title="Expenses"
        groupBy="ec"
        data={baseData}
      />
    )

    expect(screen.getByTestId('grouped-items-display')).toBeInTheDocument()
    const lastUseFinancialDataCall = mockUseFinancialData.mock.calls[mockUseFinancialData.mock.calls.length - 1]
    const optionsArg = lastUseFinancialDataCall?.[5]
    expect(optionsArg).toEqual({ computeEconomic: true })

    const lastGroupedItemsDisplayCall = groupedItemsDisplaySpy.mock.calls[groupedItemsDisplaySpy.mock.calls.length - 1]
    const groupedItemsProps = lastGroupedItemsDisplayCall?.[0]
    expect(groupedItemsProps.groups).toBe(economicGroups)
    expect(groupedItemsProps.subchapterCodePrefix).toBe('ec')
  })
})
