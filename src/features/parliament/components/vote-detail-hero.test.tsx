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

  it('rides at the top of the page while the division scrolls — on DESKTOP', () => {
    // The title and the two tallies have to stay readable next to whichever
    // group the reader has scrolled down to.
    const { container } = render(
      <VoteDetailHero detail={detail({ voteSubject: 'Vot final' })} />,
    )
    const hero = container.querySelector('section')
    // `top-0`: no fixed global header in this shell, so the viewport's top edge
    // is the anchor. `z-30`: over the vote table's own sticky head (`z-10`) and
    // pinned group rows (`z-[5]`), under the sidebar and FABs (`z-40`).
    expect(hero).toHaveClass('lg:sticky', 'lg:top-0', 'lg:z-30')
    // Its own opaque fill, so the page does not read through it.
    expect(hero).toHaveStyle({ backgroundColor: '#9C051A' })
  })

  it('stays ordinary in-flow content below the desktop breakpoint', () => {
    // Under `lg` the title wraps to three or four lines and the tallies sit
    // underneath it — pinned, that band would hold a third of a phone screen
    // against the reader for the whole page. EVERY part of the behaviour is
    // behind the prefix, not just the positioning.
    const { container } = render(
      <VoteDetailHero detail={detail({ voteSubject: 'Vot final' })} />,
    )
    const hero = container.querySelector('section')
    expect(hero).not.toHaveClass('sticky')
    expect(hero).not.toHaveClass('top-0')
    expect(hero).not.toHaveClass('z-30')
    expect(hero).not.toHaveClass('fixed')
  })
})
