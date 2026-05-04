import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PnrrCurrencyContext } from '../../lib/pnrr-currency-context'
import { PnrrFundingBar } from './PnrrFundingBar'
import type { PnrrAggregates } from '@/schemas/pnrr'

function makeAggregates(
  overrides: Partial<PnrrAggregates> = {},
): PnrrAggregates {
  return {
    rawTotalValue: 300,
    deduplicatedTotalValue: 300,
    projectCount: 2,
    projectRecordCount: 2,
    rawProjectCount: 2,
    deduplicatedProjectCount: 2,
    completedCount: 0,
    completedValue: 0,
    inProgressCount: 2,
    notStartedCount: 0,
    missingFinProgressCount: 0,
    missingFinProgressPercent: 0,
    loanTotal: 200,
    loanPercent: 66.67,
    grantTotal: 100,
    mixedTotal: 0,
    componentStats: {},
    countyStats: {},
    anomalyCounts: {
      'financial-overrun': { count: 0, value: 0 },
      'stalled-completion': { count: 0, value: 0 },
      'payment-ahead-delivery': { count: 0, value: 0 },
      'large-low-progress': { count: 0, value: 0 },
    },
    dataQualitySignalCounts: {
      'duplicate-conflict': { count: 0, value: 0 },
      'large-missing-financial-progress': { count: 0, value: 0 },
      'completed-missing-financial-progress': { count: 0, value: 0 },
    },
    topBeneficiaries: [],
    ...overrides,
  }
}

describe('PnrrFundingBar', () => {
  it('hides the mixed funding category when it has no value', () => {
    render(
      <PnrrCurrencyContext.Provider value="EUR">
        <PnrrFundingBar aggregates={makeAggregates()} />
      </PnrrCurrencyContext.Provider>,
    )

    expect(screen.getByText('Grant / Loan')).toBeInTheDocument()
    expect(screen.queryByText('Grant / Loan / Mixt')).not.toBeInTheDocument()
    expect(screen.getAllByText('Grant')).toHaveLength(2)
    expect(screen.getAllByText('Loan')).toHaveLength(2)
    expect(screen.queryByText('Grant + loan')).not.toBeInTheDocument()
  })

  it('shows the mixed funding category when present', () => {
    render(
      <PnrrCurrencyContext.Provider value="EUR">
        <PnrrFundingBar
          aggregates={makeAggregates({ rawTotalValue: 350, mixedTotal: 50 })}
        />
      </PnrrCurrencyContext.Provider>,
    )

    expect(screen.getByText('Grant / Loan / Mixt')).toBeInTheDocument()
    expect(screen.getAllByText('Grant + loan')).toHaveLength(2)
  })
})
