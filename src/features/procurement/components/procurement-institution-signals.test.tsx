import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'

import { ProcurementInstitutionSignals } from './procurement-institution-signals'

import type {
  ProcurementAnswerMeta,
  ProcurementInstitutionSignals as Signals,
} from '@/schemas/procurement'

const meta: ProcurementAnswerMeta = {
  answerability: 'served',
  reason: null,
  policyKey: 'procurement.value_awarded',
  grain: 'contract',
  valueBasis: 'awarded',
  dateBasis: 'canonical_date',
  population: 'canonical records',
  buildId: '9',
  counts: { rows: '26', withValue: '0' },
  undatedInScope: null,
  provisional: false,
  caveats: [],
  canonicalScope: 'authorityCui=36727850&grain=contract&from=2025-01&to=2025-12',
}

const signals = (over: Partial<Signals> = {}): Signals => ({
  concentration: {
    supplierCount: 10,
    top1Share: null,
    top5Share: null,
    hhi: null,
    totalRon: null,
    withheldConsortiumRon: '22262996083.00',
    meta,
  },
  procedureMix: [],
  amendment: null,
  frameworkExposure: null,
  ...over,
})

const renderSignals = (over: Partial<Signals> = {}, awarded = '22262996083.00') =>
  render(
    <TooltipProvider>
      <ProcurementInstitutionSignals
        signals={signals(over)}
        contractAwardedRon={awarded}
      />
    </TooltipProvider>,
  )

describe('ProcurementInstitutionSignals — concentration tile', () => {
  it('keeps the dash and explains the withheld consortium mass', () => {
    renderSignals()

    expect(
      screen.getByText('valoare nerepartizată pe furnizori'),
    ).toBeInTheDocument()
    // No fabricated percentage stands in for the missing metric.
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('never labels consortium money as an unidentified supplier', () => {
    const { container } = renderSignals()
    expect(container.textContent).not.toMatch(/neidentificat/)
  })

  it('shows the ranked supplier count when a share exists', () => {
    renderSignals({
      concentration: {
        supplierCount: 12,
        top1Share: '0.4000',
        top5Share: '0.8000',
        hhi: '0.2000',
        totalRon: '1000000000.00',
        withheldConsortiumRon: '0.00',
        meta,
      },
    })

    expect(screen.getByText('primii 5 din 12 furnizori')).toBeInTheDocument()
  })
})
