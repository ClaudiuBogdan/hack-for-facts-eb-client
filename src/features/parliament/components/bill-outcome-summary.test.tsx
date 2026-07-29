import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  ParliamentBillDetailSchema,
  type ParliamentBillDetail,
} from '@/schemas/parliament'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    children: ReactNode
    to?: string
    params?: Record<string, string>
    className?: string
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to ?? '',
      )}
      className={className}
    >
      {children}
    </a>
  ),
}))

const { BillOutcomeSummary } = await import('./bill-outcome-summary')

/**
 * PL-x 518/2026 (billKey 23135), the bill that exposed the defect: the Senate
 * was `prima Cameră sesizată` and rejected it on 24 June 2026, after which the
 * Chamber of Deputies — the decisional chamber — took it to committees. The page
 * showed an unqualified "Vot final" above a hero reading "la comisii".
 */
function buildBill(overrides: Partial<ParliamentBillDetail> = {}) {
  return ParliamentBillDetailSchema.parse({
    billId: '23135',
    number: 'PL-x 518/2026',
    title: 'Propunere legislativă pentru modificarea Legii nr. 77/2016',
    billType: 'parlamentar',
    originatingChamber: 'camera',
    currentLocation: 'camera',
    currentStageLabel: 'la comisii',
    lastUpdatedAt: '2026-06-29T00:00:00+03:00',
    legislatureId: '2026',
    longTitle: 'Propunere legislativă pentru modificarea Legii nr. 77/2016',
    initiator: { type: 'parlamentar', memberName: 'Popescu Ion' },
    documents: [],
    timeline: [],
    relatedVotes: [],
    ...overrides,
  })
}

const senateFinalRejection = {
  voteId: 'senat:506222AD-7C60-4343-9E5D-4BAA28B6C6DD',
  chamber: 'senat' as const,
  title: 'Raport de respingere',
  heldAt: '2026-06-24T00:00:00+03:00',
  linkRole: 'final_rejection',
}

function step(position: number, date: string, description: string) {
  return {
    stepId: `s${position}`,
    position,
    description,
    date,
    isMilestone: false,
    docUrls: [],
    links: [],
  }
}

describe('BillOutcomeSummary — a final vote belongs to ONE chamber', () => {
  it('names the chamber that held the vote', () => {
    // Unqualified, "Vot final" reads as "the procedure is over". Romanian bills
    // are voted finally in EACH chamber, so the chamber is half the fact.
    render(<BillOutcomeSummary bill={buildBill({ relatedVotes: [senateFinalRejection] })} />)
    expect(screen.getByText('Vot final în Senat')).toBeInTheDocument()
    expect(screen.queryByText('Vot final')).not.toBeInTheDocument()
  })

  it('states the verdict from the link ROLE, not from the tally', () => {
    // `final_rejection` → "Respins". The division's own outcome for this vote is
    // "adoptat" (the rejection REPORT passed 64–30), so anything reading the
    // tally would print the opposite of what happened to the bill.
    render(<BillOutcomeSummary bill={buildBill({ relatedVotes: [senateFinalRejection] })} />)
    expect(screen.getByText('Respins · 24 iunie 2026')).toBeInTheDocument()
  })

  it('says "Adoptat" for a final adoption', () => {
    render(
      <BillOutcomeSummary
        bill={buildBill({
          relatedVotes: [
            { ...senateFinalRejection, chamber: 'camera', linkRole: 'final_adoption' },
          ],
        })}
      />,
    )
    expect(screen.getByText('Vot final în Camera Deputaților')).toBeInTheDocument()
    expect(screen.getByText('Adoptat · 24 iunie 2026')).toBeInTheDocument()
  })
})

describe('BillOutcomeSummary — a final vote is not always the last event', () => {
  it('flags that the procedure continued when a later step exists', () => {
    render(
      <BillOutcomeSummary
        bill={buildBill({
          relatedVotes: [senateFinalRejection],
          timeline: [
            step(0, '2026-06-24', 'respins de Senat'),
            step(1, '2026-06-29', 'trimis pentru raport la: Comisia juridică'),
          ],
        })}
      />,
    )
    expect(
      screen.getByText(/Procedura a continuat după acest vot/),
    ).toBeInTheDocument()
  })

  it('stays silent when the final vote IS the last dated event', () => {
    render(
      <BillOutcomeSummary
        bill={buildBill({
          relatedVotes: [senateFinalRejection],
          timeline: [step(0, '2026-06-24', 'respins de Senat')],
        })}
      />,
    )
    expect(
      screen.queryByText(/Procedura a continuat după acest vot/),
    ).not.toBeInTheDocument()
  })
})

describe('BillOutcomeSummary — votes the source never called final', () => {
  it('keeps the unproven label and prints the date alone', () => {
    // No role: neither the chamber's decision nor a verdict was established, so
    // the chip must not invent one.
    render(
      <BillOutcomeSummary
        bill={buildBill({
          relatedVotes: [{ ...senateFinalRejection, linkRole: undefined }],
          timeline: [step(0, '2026-06-29', 'trimis pentru raport')],
        })}
      />,
    )
    expect(screen.getByText('Cel mai recent vot asociat')).toBeInTheDocument()
    expect(screen.getByText('24 iunie 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Respins/)).not.toBeInTheDocument()
    // The continuation note is a statement ABOUT a final vote; without one there
    // is nothing for a later step to have continued past.
    expect(
      screen.queryByText(/Procedura a continuat după acest vot/),
    ).not.toBeInTheDocument()
  })

  it('renders nothing at all for a bill with no votes and no law', () => {
    const { container } = render(<BillOutcomeSummary bill={buildBill()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
