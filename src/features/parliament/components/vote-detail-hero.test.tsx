import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ParliamentVoteDetail } from '@/schemas/parliament'
import { VoteDetailHero } from './vote-detail-hero'

function detail(over: Partial<ParliamentVoteDetail> = {}): ParliamentVoteDetail {
  return {
    voteId: 'senat:DE89A4FC-E2E8-467B-B730-3DA7A0EEA476',
    chamber: 'senat',
    title:
      'Propunere legislativă pentru modificarea Legii 189/2021 privind sărbătorirea zilei de 10 mai',
    heldAt: '2026-06-29T00:00:00+03:00',
    voteType: 'deschis',
    outcome: 'respins',
    outcomeLabel: 'Majoritate împotrivă',
    tally: { pentru: 7, impotriva: 49, abtinere: 44 },
    divisionNumber: 9,
    billLinks: [],
    groupBreakdown: [],
    memberVotes: [],
    ...over,
  } as ParliamentVoteDetail
}

describe('VoteDetailHero — which division is this?', () => {
  it('prints the chamber’s own subject beneath the title', () => {
    // For a bill-linked division the title is the BILL's, identical on every
    // division of that bill. Without the subject the page cannot say which vote
    // the reader is looking at.
    render(<VoteDetailHero detail={detail({ voteSubject: 'Vot final' })} />)
    expect(screen.getByText('Vot final')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Propunere legislativă pentru modificarea Legii 189/2021',
    )
  })

  it('places the division by KIND when no subject was printed', () => {
    render(<VoteDetailHero detail={detail({ title: 'Art. 178', kind: 'amendment' })} />)
    expect(screen.getByText('Amendament')).toBeInTheDocument()
  })

  it('prints neither when the server sent neither', () => {
    render(<VoteDetailHero detail={detail()} />)
    for (const label of ['Amendament', 'Proiect de lege', 'Neclasificat']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it('still shows the counts and the division meta', () => {
    render(<VoteDetailHero detail={detail({ voteSubject: 'Vot final' })} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('49')).toBeInTheDocument()
    expect(screen.getByText(/Divizare 9/)).toBeInTheDocument()
  })
})
