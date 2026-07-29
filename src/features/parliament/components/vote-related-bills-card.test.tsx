import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    to,
  }: {
    children: ReactNode
    params?: Record<string, string>
    to?: string
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to ?? '',
      )}
    >
      {children}
    </a>
  ),
}))

const { VoteRelatedBillsCard } = await import('./vote-related-bills-card')

const link = (over: Record<string, unknown> = {}) => ({
  billId: 'senat:334-2026',
  billNumber: 'L334/2026',
  billTitle: 'Propunere legislativă pentru modificarea Legii 189/2021',
  role: 'final_adoption',
  ...over,
})

describe('VoteRelatedBillsCard — naming the bill instead of pointing at it', () => {
  it('leads with the chamber’s own reference and keeps the title under it', () => {
    // What stood here before was the static string "Vezi proiectul de lege" —
    // the reader had to click to learn which bill the division belonged to.
    render(<VoteRelatedBillsCard links={[link()]} outcome="adoptat" />)
    expect(screen.getByRole('link', { name: 'L334/2026' })).toBeInTheDocument()
    expect(
      screen.getByText('Propunere legislativă pentru modificarea Legii 189/2021'),
    ).toBeInTheDocument()
  })

  it('falls back to the title, and only then to the generic label', () => {
    render(<VoteRelatedBillsCard links={[link({ billNumber: undefined })]} outcome="adoptat" />)
    expect(
      screen.getByRole('link', {
        name: 'Propunere legislativă pentru modificarea Legii 189/2021',
      }),
    ).toBeInTheDocument()

    render(
      <VoteRelatedBillsCard
        links={[link({ billNumber: undefined, billTitle: undefined })]}
        outcome="adoptat"
      />,
    )
    expect(screen.getByRole('link', { name: 'Vezi proiectul de lege' })).toBeInTheDocument()
  })

  it('shows BOTH bills when a division was linked to two', () => {
    // 1,502 divisions link to two bills; the vote's scalar billKey shows one.
    render(
      <VoteRelatedBillsCard
        links={[link(), link({ billId: 'cdep:518-2026', billNumber: 'PL-x 518/2026' })]}
        outcome="adoptat"
      />,
    )
    expect(screen.getByText('Vot asociat mai multor proiecte de lege')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'L334/2026' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'PL-x 518/2026' })).toBeInTheDocument()
  })

  it('renders nothing when the server resolved no edge', () => {
    const { container } = render(<VoteRelatedBillsCard links={[]} outcome="adoptat" />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('VoteRelatedBillsCard — the verdict is the motion AND the result', () => {
  it('reads a DEFEATED adoption motion as a rejection', () => {
    // senat:DE89A4FC on L334/2026: 7 pentru, 49 contra, 44 abțineri. The role is
    // final_adoption because the MOTION was to adopt; the outcome is what says
    // it failed. Role alone put "Adoptat" over that tally.
    render(<VoteRelatedBillsCard links={[link()]} outcome="respins" />)
    expect(screen.getByText('Vot final · Respins')).toBeInTheDocument()
  })

  it('claims no verdict for a motion that carried on the counts', () => {
    // Clearing a simple majority is not clearing the absolute one an organic law
    // needs. cdep:33731 carried 164–60 and officially FAILED.
    render(
      <VoteRelatedBillsCard links={[link({ role: 'final_rejection' })]} outcome="adoptat" />,
    )
    expect(screen.getByText('Vot final')).toBeInTheDocument()
    expect(screen.queryByText(/Adoptat|Respins/)).not.toBeInTheDocument()
  })

  it('names the chamber NOWHERE — the breadcrumb and hero already do', () => {
    // A Romanian bill is voted finally in EACH chamber, so a placeholder chamber
    // here would be worse than none at all.
    render(<VoteRelatedBillsCard links={[link()]} outcome="adoptat" />)
    expect(screen.queryByText('Senat')).not.toBeInTheDocument()
    expect(screen.queryByText('Camera Deputaților')).not.toBeInTheDocument()
  })
})
