import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ParliamentVoteSummary } from '@/schemas/parliament'
import { VoteListRowCard } from './vote-list-row-card'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    ...rest
  }: {
    children: React.ReactNode
    params?: Record<string, string>
  }) => (
    <a data-params={JSON.stringify(params)} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}))

function vote(overrides: Partial<ParliamentVoteSummary> = {}): ParliamentVoteSummary {
  return {
    voteId: 'cdep:1',
    chamber: 'camera',
    title: 'Proiect de Lege pentru completarea art.279',
    heldAt: '2026-06-10T00:00:00+03:00',
    outcome: 'adoptat',
    tally: { pentru: 205, impotriva: 2 },
    ...overrides,
  } as ParliamentVoteSummary
}

describe('VoteListRowCard', () => {
  it('prints the outcome as a WORD, not only as an accent colour', () => {
    // On the old grid card the result was carried by border colour alone, which
    // is invisible to a reader who cannot separate the green from the crimson.
    render(<VoteListRowCard vote={vote({ outcome: 'respins' })} />)
    // The word describes the TALLY, not the bill's fate: the underlying value is
    // (pentru > impotriva), so "Respins" would be wrong on a chamber that voted
    // to reject — 2,995 of 3,009 final rejections used to read "Adoptat".
    expect(screen.getByText('Majoritate împotrivă')).toBeInTheDocument()
  })

  it('shows the counts the source recorded', () => {
    render(<VoteListRowCard vote={vote()} />)
    expect(screen.getByText('Pentru')).toBeInTheDocument()
    expect(screen.getByText('205')).toBeInTheDocument()
    expect(screen.getByText('Împotrivă')).toBeInTheDocument()
  })

  it('omits an absent tally field rather than printing it as zero', () => {
    // `abtinere` / `nuAVotat` are optional on the summary shape; a missing count
    // is unknown, not zero.
    render(<VoteListRowCard vote={vote()} />)
    expect(screen.queryByText('Abțineri')).not.toBeInTheDocument()
    expect(screen.queryByText('Nu au votat')).not.toBeInTheDocument()
  })

  it('shows abstentions and absences when the source did record them', () => {
    render(
      <VoteListRowCard
        vote={vote({ tally: { pentru: 205, impotriva: 2, abtinere: 71, nuAVotat: 1 } })}
      />,
    )
    expect(screen.getByText('Abțineri')).toBeInTheDocument()
    expect(screen.getByText('71')).toBeInTheDocument()
    expect(screen.getByText('Nu au votat')).toBeInTheDocument()
  })

  it('names the outcome in the accessible label alongside the title', () => {
    render(<VoteListRowCard vote={vote()} />)
    expect(
      screen.getByLabelText(
        /Proiect de Lege pentru completarea art.279 — Majoritate pentru/,
      ),
    ).toBeInTheDocument()
  })
})

describe('VoteListRowCard — mixed-list chamber badge', () => {
  it('badges the assembly when showChamber is set', () => {
    render(<VoteListRowCard vote={vote({ chamber: 'senat' })} showChamber />)
    expect(screen.getByText('Senat')).toBeInTheDocument()
  })

  it('labels a joint sitting as Camerele reunite, never as the Camera', () => {
    render(<VoteListRowCard vote={vote({ chamber: 'comun' })} showChamber />)
    expect(screen.getByText('Camerele reunite')).toBeInTheDocument()
    expect(screen.queryByText('Camera Deputaților')).not.toBeInTheDocument()
  })

  it('omits the badge on single-chamber lists, where the header states it', () => {
    render(<VoteListRowCard vote={vote({ chamber: 'senat' })} />)
    expect(screen.queryByText('Senat')).not.toBeInTheDocument()
  })

  it('links a comun vote under the camera detail route, which is all the route accepts', () => {
    render(<VoteListRowCard vote={vote({ chamber: 'comun' })} showChamber />)
    const link = screen.getByLabelText(/Proiect de Lege/)
    expect(JSON.parse(link.getAttribute('data-params') ?? '{}')).toEqual({
      chamber: 'camera',
      voteId: 'cdep:1',
    })
  })
})
