import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { EntityFinancialSummary } from './EntityFinancialSummary'
import { formatCurrency } from '@/lib/utils'

const normalizationOptions = {
  normalization: 'total' as const,
  currency: 'RON' as const,
  inflation_adjusted: false,
  show_period_growth: false,
}

describe('EntityFinancialSummary', () => {
  it('renders YoY trend badges for up, down, and flat values', () => {
    render(
      <EntityFinancialSummary
        totalIncome={120}
        totalExpenses={90}
        budgetBalance={30}
        periodLabel="2025 YTD"
        normalizationOptions={normalizationOptions}
        trends={{
          income: {
            previousValue: 100,
            currentValue: 120,
          },
          expenses: {
            previousValue: 100,
            currentValue: 90,
          },
          balance: {
            previousValue: 30,
            currentValue: 30,
          },
        }}
      />,
    )

    expect(screen.getByText('+20% YoY')).toBeInTheDocument()
    expect(screen.getByText('-10% YoY')).toBeInTheDocument()
    expect(screen.getByText('0% YoY')).toBeInTheDocument()
  })

  it('uses negative styling when expenses grow year over year', () => {
    render(
      <EntityFinancialSummary
        totalIncome={120}
        totalExpenses={130}
        budgetBalance={-10}
        periodLabel="2025 YTD"
        normalizationOptions={normalizationOptions}
        trends={{
          income: {
            previousValue: 100,
            currentValue: 120,
          },
          expenses: {
            previousValue: 100,
            currentValue: 130,
          },
        }}
      />,
    )

    expect(screen.getByText('+20% YoY').closest('.text-emerald-700')).toBeTruthy()
    expect(screen.getByText('+30% YoY').closest('.text-rose-700')).toBeTruthy()
  })

  it('hides invalid trend badges when previous values are missing or zero', () => {
    render(
      <EntityFinancialSummary
        totalIncome={120}
        totalExpenses={90}
        budgetBalance={30}
        periodLabel="2025 YTD"
        normalizationOptions={normalizationOptions}
        trends={{
          income: {
            previousValue: 0,
            currentValue: 120,
          },
          expenses: {
            previousValue: null,
            currentValue: 90,
          },
        }}
      />,
    )

    expect(screen.queryByText(/YoY/)).not.toBeInTheDocument()
  })

  it('renders the compact desktop variant with short titles, year only, and compact values', () => {
    const totalIncome = 2656460197.71
    const compactIncomeValue = formatCurrency(totalIncome, 'compact', 'RON')
    const standardIncomeValue = formatCurrency(totalIncome, 'standard', 'RON')

    render(
      <EntityFinancialSummary
        totalIncome={totalIncome}
        totalExpenses={2259241251.68}
        budgetBalance={397218946.03}
        periodLabel="2025 YTD"
        normalizationOptions={normalizationOptions}
        density="compact-desktop"
      />,
    )

    expect(screen.getByText('Income')).toBeInTheDocument()
    expect(screen.getByText('Expenses')).toBeInTheDocument()
    expect(screen.getByText('Income - Expenses')).toBeInTheDocument()
    expect(screen.getAllByText('2025')).toHaveLength(3)
    expect(screen.queryByText(/\(2025 YTD\)/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Total /)).not.toBeInTheDocument()
    expect(
      screen.getByText((content) =>
        content.replace(/\s+/g, ' ') === compactIncomeValue.replace(/\s+/g, ' '),
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText((content) =>
        content.replace(/\s+/g, ' ') === standardIncomeValue.replace(/\s+/g, ' '),
      ),
    ).not.toBeInTheDocument()
  })

  it('does not append capita when per-capita values are missing', () => {
    render(
      <EntityFinancialSummary
        totalIncome={null}
        totalExpenses={null}
        budgetBalance={null}
        periodLabel="2025 YTD"
        normalizationOptions={{
          ...normalizationOptions,
          normalization: 'per_capita',
        }}
      />,
    )

    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByText(/N\/A\/capita/)).not.toBeInTheDocument()
    expect(screen.queryByText(/\/capita/)).not.toBeInTheDocument()
  })
})
