import type { ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type {
  MemberVoteChoice,
  ParliamentMemberVoteRecord,
  ParliamentVoteDetail,
} from '@/schemas/parliament'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    className,
  }: {
    children: ReactNode
    className?: string
  }) => (
    <a href="/parlament" className={className}>
      {children}
    </a>
  ),
}))

const { VoteIndividualVotesSection } =
  await import('./vote-individual-votes-section')

/** `count` ballots for one group, all cast the same way. */
function ballots(
  groupId: string,
  choice: MemberVoteChoice,
  count: number,
): ParliamentMemberVoteRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    ballotKey: `${groupId}-${choice}-${String(index)}`,
    memberId: `${groupId}-m${String(index)}`,
    memberName: `${groupId} Membru ${String(index)}`,
    groupId,
    groupName: groupId,
    choice,
    positionStatus: 'confirmed',
    observationCount: 1,
    observedChoices: [choice],
  }))
}

// AUR 1 · PSD 87 · PNL 45 — alphabetically AUR leads, by size PSD does.
const detail: ParliamentVoteDetail = {
  voteId: 'cdep:37100',
  chamber: 'camera',
  billLinks: [],
  title: 'Proiect de Lege pentru completarea art.279',
  heldAt: '2026-06-10',
  voteType: 'deschis',
  outcome: 'adoptat',
  outcomeLabel: 'Proiectul a fost adoptat',
  tally: { pentru: 133, impotriva: 2, abtinere: 3, nuAVotat: 0 },
  groupBreakdown: [
    {
      groupId: 'AUR',
      groupName: 'AUR',
      pentru: 1,
      impotriva: 2,
      conflicting: 0,
      unknown: 0,
    },
    {
      groupId: 'PSD',
      groupName: 'PSD',
      pentru: 87,
      impotriva: 0,
      conflicting: 0,
      unknown: 0,
    },
    {
      groupId: 'PNL',
      groupName: 'PNL',
      pentru: 45,
      impotriva: 0,
      conflicting: 0,
      unknown: 0,
    },
  ],
  memberVotes: [
    ...ballots('AUR', 'pentru', 1),
    ...ballots('PSD', 'pentru', 87),
    ...ballots('PNL', 'pentru', 45),
    ...ballots('AUR', 'impotriva', 2),
    ...ballots('AUR', 'abtinere', 3),
  ],
}

function renderSection() {
  render(
    <VoteIndividualVotesSection
      detail={detail}
      groupColors={{ AUR: '#000000', PSD: '#e30613', PNL: '#ffcc00' }}
      memberJudete={{}}
    />,
  )
}

function renderConflictSection() {
  const conflictDetail: ParliamentVoteDetail = {
    ...detail,
    groupBreakdown: [
      ...detail.groupBreakdown,
      {
        groupId: 'USR',
        groupName: 'USR',
        pentru: 0,
        impotriva: 0,
        conflicting: 1,
        unknown: 1,
      },
    ],
    memberVotes: [
      ...detail.memberVotes,
      {
        ballotKey: 'usr-conflict',
        memberId: 'usr-1',
        memberName: 'Membru Conflict',
        groupId: 'USR',
        groupName: 'USR',
        positionStatus: 'conflicting_choice',
        observationCount: 2,
        observedChoices: ['pentru', 'impotriva'],
      },
      {
        ballotKey: 'usr-unknown',
        memberId: 'usr-2',
        memberName: 'Membru Necunoscut',
        groupId: 'USR',
        groupName: 'USR',
        positionStatus: 'unknown_marker',
        observationCount: 1,
        observedChoices: [],
      },
    ],
  }
  render(
    <VoteIndividualVotesSection
      detail={conflictDetail}
      groupColors={{
        AUR: '#000000',
        PSD: '#e30613',
        PNL: '#ffcc00',
        USR: '#00a1de',
      }}
      memberJudete={{}}
    />,
  )
}

describe('VoteIndividualVotesSection', () => {
  it('orders groups by size, largest first', () => {
    renderSection()
    const groupHeadings = screen
      .getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .filter((text) => /^(AUR|PSD|PNL) \(/.test(text))
    expect(groupHeadings).toEqual(['PSD (87)', 'PNL (45)', 'AUR (1)'])
  })

  it('starts with every group COLLAPSED', () => {
    // One open group pushed the rest of the breakdown below the fold, costing
    // the reader the shape of the vote for one group's roster.
    renderSection()
    for (const name of ['PSD (87)', 'PNL (45)', 'AUR (1)']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    }
    expect(screen.queryByText('PSD Membru 0')).not.toBeInTheDocument()
  })

  it('carries the count on every tab, including the empty one', () => {
    renderSection()
    expect(
      screen.getByRole('tab', { name: 'Voturi pentru (133)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'Voturi împotrivă (2)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'Abțineri (3)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'Fără vot (0)' }),
    ).toBeInTheDocument()
  })

  it('ends on a "Toate" tab counting the whole roll', () => {
    renderSection()
    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent ?? '')
    expect(tabs[tabs.length - 1]).toBe('Toate (138)')
  })

  it('regroups the whole delegation under "Toate"', async () => {
    // AUR is 1 + 2 + 3 across the choice tabs; only here is it one group of 6,
    // which is the point of the tab.
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('tab', { name: 'Toate (138)' }))
    expect(screen.getByRole('button', { name: 'AUR (6)' })).toBeInTheDocument()
  })

  it("writes each member's choice on the card when the tab mixes them", async () => {
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('tab', { name: 'Toate (138)' }))
    await user.click(screen.getByRole('button', { name: 'AUR (6)' }))

    const region = screen.getByRole('region', { name: 'AUR (6)' })
    expect(within(region).getAllByText('Pentru')).toHaveLength(1)
    expect(within(region).getAllByText('Împotrivă')).toHaveLength(2)
    expect(within(region).getAllByText('Abținere')).toHaveLength(3)
  })

  it('writes the choice in the MEMBER view too', async () => {
    // The two view modes render from different branches; the flat member list
    // mixes all four choices just as the grouped one does, so a card there
    // without its choice is the same silent card.
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('tab', { name: 'Toate (138)' }))
    await user.click(screen.getByRole('button', { name: /Listă pe membru/ }))

    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getAllByText('Împotrivă')).toHaveLength(2)
    expect(within(panel).getAllByText('Abținere')).toHaveLength(3)
  })

  it('does NOT repeat the choice when the tab already states it', async () => {
    // "Voturi pentru" would otherwise print "Pentru" on all 133 cards.
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('button', { name: 'AUR (1)' }))
    const region = screen.getByRole('region', { name: 'AUR (1)' })
    expect(within(region).queryByText('Pentru')).not.toBeInTheDocument()
  })

  it('keeps conflicting and unknown positions out of the no-vote bucket', async () => {
    const user = userEvent.setup()
    renderConflictSection()

    expect(
      screen.getByRole('tab', { name: 'Conflicte în sursă (1)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'Poziții neclare (1)' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: 'Fără vot (0)' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('tab', { name: 'Conflicte în sursă (1)' }),
    )
    await user.click(screen.getByRole('button', { name: 'USR (1)' }))
    expect(screen.getByText('Membru Conflict')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Toate (140)' }))
    await user.click(screen.getByRole('button', { name: 'USR (2)' }))
    expect(screen.getByText('Conflict în sursă')).toBeInTheDocument()
    expect(screen.getByText('Poziție neclară')).toBeInTheDocument()
  })
})
