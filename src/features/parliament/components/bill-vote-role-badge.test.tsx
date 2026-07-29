import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ParliamentVoteSummary } from '@/schemas/parliament'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    className,
    'aria-label': ariaLabel,
  }: {
    children: ReactNode
    to?: string
    params?: Record<string, string>
    className?: string
    'aria-label'?: string
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to ?? '',
      )}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  ),
}))

const { BillVoteRoleBadge, getVoteTallySubjectNote, roleContradictsSubject } = await import(
  './bill-vote-role-badge'
)
const { VoteChamberVoteCard } = await import('./vote-chamber-vote-card')

/**
 * PL-x 16828's two related divisions. Both carry the BILL's title, both have a
 * majority "pentru", and until the badge existed both rendered as identical
 * green cards — one a 2019 procedural vote in the Chamber, the other the
 * Senate's 2026 rejection, carried 101–1.
 */
const senateFinalRejection: ParliamentVoteSummary = {
  voteId: 'senat:E572A427-DE42-4BC3-8A17-D892E99F7A65',
  chamber: 'senat',
  title: 'Propunere legislativă pentru modificarea Legii nr.8/2016',
  heldAt: '2026-06-29T00:00:00+03:00',
  voteType: 'deschis',
  outcome: 'adoptat',
  outcomeLabel: 'Majoritate pentru',
  tally: { pentru: 101, impotriva: 1 },
}

const cameraProcedural: ParliamentVoteSummary = {
  ...senateFinalRejection,
  voteId: 'cdep:22631',
  chamber: 'camera',
  heldAt: '2019-09-04T00:00:00+03:00',
  tally: { pentru: 236, impotriva: 2 },
}

describe('BillVoteRoleBadge', () => {
  it('names the motion but claims NO verdict when it carried on the counts', () => {
    // Neither direction is provable from `pentru > impotriva`: an organic law
    // needs an absolute majority the tally does not encode, and cdep:33731 is a
    // 164–60 "adoption" the official page records as failing.
    const { unmount } = render(
      <BillVoteRoleBadge chamber="senat" linkRole="final_rejection" outcome="adoptat" />,
    )
    expect(screen.getByText('Vot final')).toBeInTheDocument()
    expect(screen.getByText('Senat')).toBeInTheDocument()
    expect(screen.queryByText(/Adoptat|Respins/)).not.toBeInTheDocument()
    unmount()

    render(<BillVoteRoleBadge chamber="camera" linkRole="final_adoption" outcome="adoptat" />)
    expect(screen.getByText('Vot final')).toBeInTheDocument()
    expect(screen.getByText('Camera Deputaților')).toBeInTheDocument()
    expect(screen.queryByText(/Adoptat|Respins/)).not.toBeInTheDocument()
  })

  it('badges a DEFEATED adoption motion as a rejection', () => {
    // L334/2026: the Senate voted 7–49–44 against adopting the bill. Reading the
    // role alone put "Adoptat" over that tally on 441 links.
    render(
      <BillVoteRoleBadge
        chamber="senat"
        linkRole="final_adoption"
        outcome="respins"
      />,
    )
    expect(screen.getByText('Vot final · Respins')).toBeInTheDocument()
  })

  it('spells out a DEFEATED rejection motion instead of guessing', () => {
    // cdep:28593, 140–155: the chamber declined to throw the bill out. Neither
    // verdict is true, and the tally beside it reads as a rejection unless the
    // chip says otherwise. The subject is what corroborates the role.
    render(
      <BillVoteRoleBadge
        chamber="camera"
        linkRole="final_rejection"
        outcome="respins"
        voteSubject="Vot final respingere"
      />,
    )
    expect(
      screen.getByText('Vot final · Respingerea nu a trecut'),
    ).toBeInTheDocument()
  })

  it('abstains when nothing corroborates the defeated rejection', () => {
    // cdep:27636 — role says rejection, the official page says "Vot final
    // Adoptare", and the subject is null. The chip keeps the motion name only.
    render(
      <BillVoteRoleBadge chamber="camera" linkRole="final_rejection" outcome="respins" />,
    )
    expect(screen.getByText('Vot final')).toBeInTheDocument()
    expect(screen.queryByText(/Respingerea nu a trecut/)).not.toBeInTheDocument()
  })

  it('claims no verdict when no result was established', () => {
    render(
      <BillVoteRoleBadge
        chamber="senat"
        linkRole="final_adoption"
        outcome="egalitate"
      />,
    )
    expect(screen.getByText('Vot final')).toBeInTheDocument()
    expect(screen.queryByText(/Adoptat|Respins/)).not.toBeInTheDocument()
  })

  it('names the non-final kinds without claiming a verdict', () => {
    const { unmount } = render(
      <BillVoteRoleBadge
        chamber="camera"
        linkRole="procedural"
        outcome="adoptat"
      />,
    )
    expect(screen.getByText('Vot procedural')).toBeInTheDocument()
    unmount()

    render(
      <BillVoteRoleBadge
        chamber="senat"
        linkRole="amendment"
        outcome="adoptat"
      />,
    )
    expect(screen.getByText('Amendament')).toBeInTheDocument()
  })

  it('falls back to the chamber alone for a role it does not know', () => {
    // Open vocabulary: a role the server adds later must cost a chip, never a
    // wrong label. The chamber is always true, so it always renders.
    render(
      <BillVoteRoleBadge
        chamber="senat"
        linkRole="some_future_role"
        outcome="adoptat"
      />,
    )
    expect(screen.getByText('Senat')).toBeInTheDocument()
    expect(screen.queryByText(/Vot final/)).not.toBeInTheDocument()

    render(<BillVoteRoleBadge chamber="camera" outcome="adoptat" />)
    expect(screen.getByText('Camera Deputaților')).toBeInTheDocument()
  })
})

describe('getVoteTallySubjectNote', () => {
  it('says what a „Pentru" bought when the majority rejected the bill', () => {
    // 101–1 "pentru", bill rejected: the motion was the committees' NEGATIVE
    // report (senat.ro, filed 23 June 2026), so a "pentru" threw the bill out.
    expect(getVoteTallySubjectNote('final_rejection', 'adoptat')).toBe(
      '„Pentru” = pentru respingerea proiectului',
    )
  })

  it('stays quiet when the numbers already tell the story', () => {
    // Rejected AND the tally lost → the vote was on the bill and it fell.
    expect(getVoteTallySubjectNote('final_rejection', 'respins')).toBeUndefined()
    // Adopted and carried → nothing to reconcile.
    expect(getVoteTallySubjectNote('final_adoption', 'adoptat')).toBeUndefined()
    // Not a final vote → it decided nothing about the bill either way.
    expect(getVoteTallySubjectNote('procedural', 'adoptat')).toBeUndefined()
    expect(getVoteTallySubjectNote(undefined, 'adoptat')).toBeUndefined()
  })
})

describe('a role that contradicts the division itself', () => {
  // cdep:18768 carried 184–0 with subject 'Vot final adoptare', while its link
  // role said final_rejection — derived from a dossier row about the SENATE.
  // The derivation is being fixed upstream; this surface must not depend on
  // that landing first.
  it('asserts NEITHER verdict when role and subject disagree', () => {
    render(
      <BillVoteRoleBadge
        chamber="camera"
        linkRole="final_rejection"
        outcome="adoptat"
        voteSubject="Vot final adoptare"
      />,
    )
    expect(screen.getByText('Camera Deputaților')).toBeInTheDocument()
    expect(screen.queryByText(/Respins/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Adoptat/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Vot final/)).not.toBeInTheDocument()
  })

  it('suppresses the ballot-direction note on a contradicted role too', () => {
    expect(
      getVoteTallySubjectNote('final_rejection', 'adoptat', 'Vot final adoptare'),
    ).toBeUndefined()
    // …but keeps it when the subject agrees, or says nothing at all.
    expect(
      getVoteTallySubjectNote('final_rejection', 'adoptat', 'Raport de respingere'),
    ).toBe('„Pentru” = pentru respingerea proiectului')
    expect(getVoteTallySubjectNote('final_rejection', 'adoptat')).toBe(
      '„Pentru” = pentru respingerea proiectului',
    )
  })

  it('does not treat a non-final subject as a contradiction', () => {
    // An amendment or an article says nothing about the bill's fate, so it
    // cannot contradict a final role.
    expect(roleContradictsSubject('final_rejection', 'Amr.2')).toBe(false)
    expect(roleContradictsSubject('final_rejection', 'Text initial')).toBe(false)
    expect(roleContradictsSubject('procedural', 'Vot final adoptare')).toBe(false)
    expect(roleContradictsSubject(undefined, 'Vot final adoptare')).toBe(false)
  })

  it('catches the contradiction in both directions', () => {
    expect(roleContradictsSubject('final_rejection', 'Vot final adoptare')).toBe(true)
    expect(roleContradictsSubject('final_adoption', 'Raport de respingere')).toBe(true)
    // Diacritic- and case-insensitive, like the source's own spelling.
    expect(roleContradictsSubject('final_rejection', 'VOT FINAL ADOPTARE')).toBe(true)
  })
})

describe('VoteChamberVoteCard — bill context', () => {
  it('tells two same-titled divisions apart on a bill page', () => {
    render(
      <div>
        <VoteChamberVoteCard
          vote={cameraProcedural}
          billContext={{ linkRole: 'procedural' }}
        />
        <VoteChamberVoteCard
          vote={senateFinalRejection}
          billContext={{ linkRole: 'final_rejection' }}
        />
      </div>,
    )
    // The MOTION is what tells them apart — a procedural division from a final
    // one — which is exactly the distinction the bill title erases. The Senate
    // card claims no verdict: its rejection report carried on the counts, and
    // that is not proof it carried in law.
    expect(screen.getByText('Vot procedural')).toBeInTheDocument()
    expect(screen.getByText('Camera Deputaților')).toBeInTheDocument()
    expect(screen.getByText('Vot final')).toBeInTheDocument()
    expect(screen.getByText('Senat')).toBeInTheDocument()
    // Both titles still render — the badge adds context, it replaces nothing.
    expect(
      screen.getAllByRole('heading', {
        name: 'Propunere legislativă pentru modificarea Legii nr.8/2016',
      }),
    ).toHaveLength(2)
  })

  it('keeps the accent on the DIVISION result, and explains it in words', () => {
    // The bar is the tally's colour on every surface — 101 to 1 carried, so it
    // is green. What that majority did to the bill is said, not coloured.
    const { container } = render(
      <VoteChamberVoteCard
        vote={senateFinalRejection}
        billContext={{ linkRole: 'final_rejection' }}
      />,
    )
    expect(
      container.querySelector('span[style*="rgb(0, 100, 53)"]'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('„Pentru” = pentru respingerea proiectului'),
    ).toBeInTheDocument()
  })

  it('omits the note on a vote whose numbers need no reconciling', () => {
    render(
      <VoteChamberVoteCard
        vote={cameraProcedural}
        billContext={{ linkRole: 'procedural' }}
      />,
    )
    expect(screen.queryByText(/Pentru” =/)).not.toBeInTheDocument()
  })

  it('leads with the SUBJECT on a bill page, dropping the repeated bill title', () => {
    // The reader is already on the bill; its title on every card says nothing.
    render(
      <VoteChamberVoteCard
        vote={{ ...senateFinalRejection, voteSubject: 'Raport de respingere (a legii)' }}
        billContext={{ linkRole: 'final_rejection' }}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Raport de respingere (a legii)' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Propunere legislativă pentru modificarea Legii nr.8/2016'),
    ).not.toBeInTheDocument()
  })

  it('leads with the BILL TITLE on the hub, subject underneath', () => {
    // Off the bill page the bill is the thing being identified, so it leads and
    // the subject explains.
    render(
      <VoteChamberVoteCard
        vote={{ ...senateFinalRejection, voteSubject: 'Raport de respingere (a legii)' }}
      />,
    )
    expect(
      screen.getByRole('heading', {
        name: 'Propunere legislativă pentru modificarea Legii nr.8/2016',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Raport de respingere (a legii)')).toBeInTheDocument()
  })

  it('falls back to the bill title when the source printed no label', () => {
    // 9,223 of 20,745 divisions. A heading is required; inventing one is not an
    // option, so the always-true fact stands in.
    render(
      <VoteChamberVoteCard
        vote={senateFinalRejection}
        billContext={{ linkRole: 'final_rejection' }}
      />,
    )
    expect(
      screen.getByRole('heading', {
        name: 'Propunere legislativă pentru modificarea Legii nr.8/2016',
      }),
    ).toBeInTheDocument()
  })

  it('gives two divisions on one bill DIFFERENT accessible names', () => {
    // The screen-reader half of the same defect: announcing the title alone
    // made both cards identical to a non-sighted reader.
    render(
      <div>
        <VoteChamberVoteCard
          vote={{ ...cameraProcedural, voteSubject: 'Retragerea de pe ordinea de zi a votului final' }}
          billContext={{ linkRole: 'procedural' }}
        />
        <VoteChamberVoteCard
          vote={{ ...senateFinalRejection, voteSubject: 'Raport de respingere (a legii)' }}
          billContext={{ linkRole: 'final_rejection' }}
        />
      </div>,
    )
    const names = screen.getAllByRole('link').map((l) => l.getAttribute('aria-label'))
    expect(new Set(names).size).toBe(2)
    expect(names[0]).toContain('Retragerea de pe ordinea de zi a votului final')
    expect(names[1]).toContain('Raport de respingere (a legii)')
  })

  it('leaves the votes hub untouched — no bill context, no badge', () => {
    // There the panel already states the chamber, and a vote listed on its own
    // has no bill-relative role to report.
    const { container } = render(
      <VoteChamberVoteCard vote={senateFinalRejection} />,
    )
    expect(screen.queryByText('Senat')).not.toBeInTheDocument()
    expect(screen.queryByText(/Vot final/)).not.toBeInTheDocument()
    expect(
      container.querySelector('span[style*="rgb(0, 100, 53)"]'),
    ).toBeInTheDocument()
  })
})

describe('VoteChamberVoteCard — telling identical divisions apart', () => {
  it('gives same-title same-subject divisions DIFFERENT accessible names', () => {
    // Review measured 240 groups of same-title, same-subject, same-outcome
    // links covering 534 votes — worst case nine on one bill on one day. Title
    // plus subject is not enough; chamber and the division meta are.
    render(
      <div>
        <VoteChamberVoteCard
          vote={{ ...cameraProcedural, divisionNumber: 4 }}
          billContext={{ linkRole: 'procedural' }}
        />
        <VoteChamberVoteCard
          vote={{ ...cameraProcedural, voteId: 'cdep:22632', divisionNumber: 5 }}
          billContext={{ linkRole: 'procedural' }}
        />
      </div>,
    )
    const names = screen.getAllByRole('link').map((l) => l.getAttribute('aria-label'))
    expect(new Set(names).size).toBe(2)
    expect(names[0]).toContain('Camera Deputaților')
    expect(names[0]).toContain('Divizare 4')
    expect(names[1]).toContain('Divizare 5')
  })

  it('says so when the source recorded no subject, instead of looking like one', () => {
    render(
      <VoteChamberVoteCard
        vote={cameraProcedural}
        billContext={{ linkRole: 'procedural' }}
      />,
    )
    expect(
      screen.getByText('Subiectul votului nu a fost consemnat de sursă'),
    ).toBeInTheDocument()
  })

  it('stays quiet about the subject when there IS one', () => {
    render(
      <VoteChamberVoteCard
        vote={{ ...cameraProcedural, voteSubject: 'Amr.2' }}
        billContext={{ linkRole: 'procedural' }}
      />,
    )
    expect(
      screen.queryByText('Subiectul votului nu a fost consemnat de sursă'),
    ).not.toBeInTheDocument()
  })
})
