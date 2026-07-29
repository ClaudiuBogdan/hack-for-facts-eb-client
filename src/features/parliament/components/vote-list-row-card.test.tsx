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
      screen.getByLabelText(/Proiect de Lege pentru completarea art.279/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Majoritate pentru/)).toBeInTheDocument()
  })

  it('tells two divisions of the SAME bill apart in the accessible label', () => {
    // Every division of a bill carries the BILL's title, so title + outcome
    // announced identically across all of them. The subject and the division
    // meta are what separate them.
    render(
      <div>
        <VoteListRowCard
          vote={vote({ voteId: 'senat:a', voteSubject: 'Vot final', divisionNumber: 9 })}
        />
        <VoteListRowCard
          vote={vote({
            voteId: 'senat:b',
            voteSubject: 'Raport de respingere',
            divisionNumber: 12,
          })}
        />
      </div>,
    )
    expect(screen.getByLabelText(/Vot final — Divizare 9/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Raport de respingere — Divizare 12/)).toBeInTheDocument()
  })
})

describe('VoteListRowCard — what the chamber was voting ON', () => {
  it('prints the subject the chamber itself recorded', () => {
    render(<VoteListRowCard vote={vote({ voteSubject: 'Raport de respingere' })} />)
    expect(screen.getByText('Raport de respingere')).toBeInTheDocument()
    // The title still LEADS here: the hub is where a vote is identified.
    expect(
      screen.getByRole('heading', { name: 'Proiect de Lege pentru completarea art.279' }),
    ).toBeInTheDocument()
  })

  it('places a vote by KIND where the source printed no subject', () => {
    // 8,408 divisions have no bill link, and outside the legislative bucket the
    // chamber printed no subject on 92-97% of rows. There the title IS the
    // motion ("Art. 178") and the kind is what places it.
    render(<VoteListRowCard vote={vote({ title: 'Art. 178', kind: 'amendment' })} />)
    expect(screen.getByText('Amendament')).toBeInTheDocument()
  })

  it('labels the residue honestly rather than leaving a gap', () => {
    // 3,151 divisions land in `unclassified`, most carrying a synthesized date
    // title. A blank reads as a rendering bug; "Neclasificat" is the fact.
    render(<VoteListRowCard vote={vote({ title: 'Vot din 27 mai 2020', kind: 'unclassified' })} />)
    expect(screen.getByText('Neclasificat')).toBeInTheDocument()
  })

  it('renders no chip at all when the server sent no kind', () => {
    render(<VoteListRowCard vote={vote()} />)
    for (const label of ['Proiect de lege', 'Amendament', 'Neclasificat']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
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
