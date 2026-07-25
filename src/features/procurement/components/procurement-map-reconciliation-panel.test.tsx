import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProcurementMapReconciliationPanel } from './procurement-map-reconciliation-panel'

import type { RawProcurementBreakdownBucket } from '../api/graphql/procurement-queries'

const bucket = (
  over: Partial<RawProcurementBreakdownBucket>,
): RawProcurementBreakdownBucket => ({
  key: 'NV',
  kind: 'top',
  recordCount: '10',
  withValueCount: '10',
  valueAwardedSum: null,
  valueSum: null,
  shareOfScope: null,
  ...over,
})

describe('ProcurementMapReconciliationPanel', () => {
  it('reconciles named + unknown + withheld into the total (supplier money)', () => {
    render(
      <ProcurementMapReconciliationPanel
        buckets={[
          bucket({ key: 'NV', valueSum: '30000000000' }),
          bucket({ key: null, kind: 'unknown', valueSum: '19000000000' }),
        ]}
        withheldRon="54000000000"
        mapParty="supplier"
        measure="value_awarded"
      />,
    )
    // 30 + 19 + 54 = 103 mld — the buyer/supplier maps close in front of
    // the reader instead of silently disagreeing by half the money.
    expect(screen.getByText(/Consortium awards/)).toBeInTheDocument()
    expect(screen.getByText('RON 103B')).toBeInTheDocument()
    expect(
      screen.getByText(/never assigned to any supplier/),
    ).toBeInTheDocument()
  })

  it('buyer party shows the head-office note and NO withheld line', () => {
    render(
      <ProcurementMapReconciliationPanel
        buckets={[
          bucket({ key: 'B', valueSum: '47000000000' }),
          bucket({ key: null, kind: 'unknown', valueSum: '3000000000' }),
        ]}
        withheldRon={null}
        mapParty="buyer"
        measure="value_awarded"
      />,
    )
    expect(screen.queryByText(/Consortium awards/)).not.toBeInTheDocument()
    expect(screen.getByText(/registered head offices/)).toBeInTheDocument()
    expect(screen.getByText('RON 50B')).toBeInTheDocument()
  })

  it('counts mode never renders money — withheld is a money concept', () => {
    render(
      <ProcurementMapReconciliationPanel
        buckets={[
          bucket({ key: 'NV', recordCount: '70' }),
          bucket({ key: null, kind: 'unknown', recordCount: '30' }),
        ]}
        withheldRon="54000000000"
        mapParty="supplier"
        measure="record_count"
      />,
    )
    expect(screen.queryByText(/Consortium awards/)).not.toBeInTheDocument()
    expect(screen.queryByText(/RON/)).not.toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders nothing when the block is empty', () => {
    const { container } = render(
      <ProcurementMapReconciliationPanel
        buckets={[]}
        withheldRon={null}
        mapParty="buyer"
        measure="value_awarded"
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('all-null bucket money renders an UNOBSERVED total, never RON 0 (codex finding 1)', () => {
    render(
      <ProcurementMapReconciliationPanel
        buckets={[
          bucket({ key: 'NV', recordCount: '10' }),
          bucket({ key: null, kind: 'unknown', recordCount: '5' }),
        ]}
        withheldRon={null}
        mapParty="buyer"
        measure="value_awarded"
      />,
    )
    // Every money cell — including the total — is '—'; nothing says 0.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
    expect(screen.queryByText(/RON/)).not.toBeInTheDocument()
  })

  it('a BUYER paint under a supplier filter still discloses the withheld mass (codex finding 2)', () => {
    render(
      <ProcurementMapReconciliationPanel
        buckets={[bucket({ key: 'CJ', valueSum: '10000000000' })]}
        withheldRon="4000000000"
        mapParty="buyer"
        measure="value_awarded"
      />,
    )
    // The FIELD signals supplier-money semantics — the buyer party must not
    // hide it, or the total is short by the consortium mass.
    expect(screen.getByText(/Consortium awards/)).toBeInTheDocument()
    expect(screen.getByText('RON 14B')).toBeInTheDocument()
    expect(screen.getByText(/registered head offices/)).toBeInTheDocument()
  })

  it("the painted line mirrors the map's predicate — keyed foreign kinds fold into other (codex finding 5)", () => {
    render(
      <ProcurementMapReconciliationPanel
        buckets={[
          bucket({ key: 'NV', kind: 'top', valueSum: '7000000000' }),
          // A future keyed kind the map would NOT paint: counted, not "painted".
          bucket({ key: 'XX', kind: 'future_kind', valueSum: '2000000000' }),
        ]}
        withheldRon={null}
        mapParty="buyer"
        measure="value_awarded"
      />,
    )
    expect(screen.getByText('RON 7B')).toBeInTheDocument() // painted
    expect(screen.getByText('RON 2B')).toBeInTheDocument() // other line
    expect(screen.getByText('RON 9B')).toBeInTheDocument() // total stays complete
  })
})
