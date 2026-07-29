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
  // The rejection REPORT carried, 64–30 — which is what threw the bill out.
  outcome: 'adoptat' as const,
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

  it('prints the date alone when the motion merely carried on the counts', () => {
    // The rejection REPORT passed 64–30, which is not proof it cleared the
    // absolute majority the law requires. The chamber and the date are true; a
    // verdict word would not be.
    render(<BillOutcomeSummary bill={buildBill({ relatedVotes: [senateFinalRejection] })} />)
    expect(screen.getByText('Vot final în Senat')).toBeInTheDocument()
    expect(screen.getByText('24 iunie 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Respins ·|Adoptat ·/)).not.toBeInTheDocument()
  })

  it('says "Respins" for a final adoption that was voted DOWN', () => {
    // The one direction the counts DO prove: below a simple majority, the
    // adoption certainly failed, so the bill was rejected.
    render(
      <BillOutcomeSummary
        bill={buildBill({
          relatedVotes: [
            {
              ...senateFinalRejection,
              chamber: 'camera',
              linkRole: 'final_adoption',
              outcome: 'respins' as const,
            },
          ],
        })}
      />,
    )
    expect(screen.getByText('Vot final în Camera Deputaților')).toBeInTheDocument()
    expect(screen.getByText('Respins · 24 iunie 2026')).toBeInTheDocument()
  })

  it('says "Respins" for a final adoption that was voted DOWN', () => {
    // L334/2026 in the Senate: 7–49–44 against adopting the bill. The role says
    // adoption because the MOTION was to adopt; only the outcome says it failed.
    render(
      <BillOutcomeSummary
        bill={buildBill({
          relatedVotes: [
            {
              ...senateFinalRejection,
              linkRole: 'final_adoption',
              outcome: 'respins' as const,
            },
          ],
        })}
      />,
    )
    expect(screen.getByText('Respins · 24 iunie 2026')).toBeInTheDocument()
  })

  it('spells out a rejection motion that was itself defeated', () => {
    render(
      <BillOutcomeSummary
        bill={buildBill({
          relatedVotes: [
            {
              ...senateFinalRejection,
              outcome: 'respins' as const,
              // The second witness: without it the role stands alone and the
              // summary abstains (cdep:27636 is why).
              voteSubject: 'Raport de respingere',
            },
          ],
        })}
      />,
    )
    expect(
      screen.getByText('Respingerea nu a trecut · 24 iunie 2026'),
    ).toBeInTheDocument()
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
