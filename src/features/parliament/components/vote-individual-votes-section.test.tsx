import type { ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
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

/** The summary row of one group in the "Toate" table. */
function groupSummaryRow(name: string): HTMLElement {
  const row = screen.getByRole('button', { name }).closest('tr')
  if (!row) throw new Error(`No summary row for ${name}`)
  return row
}

/** The `tbody` the group's disclosure control owns, member rows and all. */
function groupMemberPanel(name: string): HTMLElement {
  const controls = screen
    .getByRole('button', { name })
    .getAttribute('aria-controls')
  const panel = controls ? document.getElementById(controls) : null
  if (!panel) throw new Error(`No member panel for ${name}`)
  return panel
}

/** `[identity, pentru, împotrivă, abținere, fără vot, total]` as text. */
function rowValues(row: HTMLElement): string[] {
  return within(row)
    .getAllByRole('cell')
    .slice(0, 6)
    .map((cell) => cell.textContent ?? '')
}

/** Which vote-kind column a member row ticks, or -1 when it ticks none. */
function tickedColumn(row: HTMLElement): number {
  return within(row)
    .getAllByRole('cell')
    .slice(1, 5)
    .findIndex((cell) => cell.textContent !== '')
}

async function openToate(user: UserEvent, label = 'Toate (138)') {
  await user.click(screen.getByRole('tab', { name: label }))
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

  it('carries a vote-kind column and a total on every group row', async () => {
    // The split IS the question this tab answers, so it belongs on the group's
    // own row rather than six clicks down.
    const user = userEvent.setup()
    renderSection()
    await openToate(user)

    expect(rowValues(groupSummaryRow('AUR (6)'))).toEqual([
      'AUR (6)',
      '1',
      '2',
      '3',
      '0',
      '6',
    ])
    expect(rowValues(groupSummaryRow('PSD (87)'))).toEqual([
      'PSD (87)',
      '87',
      '0',
      '0',
      '0',
      '87',
    ])

    for (const name of ['Pentru', 'Împotrivă', 'Abțineri', 'Fără vot', 'Total']) {
      expect(screen.getByRole('columnheader', { name })).toBeInTheDocument()
    }
  })

  it('expands a group into one row per member, then collapses again', async () => {
    const user = userEvent.setup()
    renderSection()
    await openToate(user)

    const control = screen.getByRole('button', { name: 'AUR (6)' })
    expect(control).toHaveAttribute('aria-expanded', 'false')
    expect(groupMemberPanel('AUR (6)')).toBeEmptyDOMElement()

    await user.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'true')

    const memberRows = within(groupMemberPanel('AUR (6)')).getAllByRole('row')
    expect(memberRows).toHaveLength(6)
    // 1 pentru · 2 împotrivă · 3 abțineri — each tick in ITS OWN column, so the
    // row says how the member voted without the reader counting across.
    expect(memberRows.map(tickedColumn)).toEqual([0, 1, 1, 2, 2, 2])
    expect(within(groupMemberPanel('AUR (6)')).getAllByText('Pentru')).toHaveLength(1)
    expect(
      within(groupMemberPanel('AUR (6)')).getAllByText('Împotrivă'),
    ).toHaveLength(2)
    expect(
      within(groupMemberPanel('AUR (6)')).getAllByText('Abținere'),
    ).toHaveLength(3)
    // The total is the group's; repeating "1" on 87 member rows is noise.
    expect(rowValues(memberRows[0]!)[5]).toBe('')

    await user.click(control)
    expect(control).toHaveAttribute('aria-expanded', 'false')
    expect(groupMemberPanel('AUR (6)')).toBeEmptyDOMElement()
  })

  it('keeps the column geometry fixed when a group expands', async () => {
    // Automatic sizing let the longest member name widen the identity column and
    // slide every count sideways, so the numbers moved out from under the eye of
    // a reader mid-comparison.
    const user = userEvent.setup()
    renderSection()
    await openToate(user)

    const table = screen.getByRole('table')
    expect(table).toHaveClass('table-fixed')
    expect(table.querySelectorAll('colgroup > col')).toHaveLength(7)

    const cellCount = (row: HTMLElement) =>
      within(row).getAllByRole('cell').length
    expect(cellCount(groupSummaryRow('AUR (6)'))).toBe(7)

    await user.click(screen.getByRole('button', { name: 'AUR (6)' }))
    expect(cellCount(groupSummaryRow('AUR (6)'))).toBe(7)
    for (const row of within(groupMemberPanel('AUR (6)')).getAllByRole('row')) {
      expect(cellCount(row)).toBe(7)
    }
  })

  it('sticks the head to a bounded scroll viewport', async () => {
    const user = userEvent.setup()
    renderSection()
    await openToate(user)

    for (const header of screen.getAllByRole('columnheader')) {
      expect(header).toHaveClass('sticky')
    }
    // The head can only stick to a box that scrolls; the table's own container
    // is that box, and it keeps the horizontal overflow too.
    const viewport = screen.getByRole('table').parentElement
    expect(viewport?.className).toMatch(/overflow-auto/)
    expect(viewport?.className).toMatch(/max-h-/)
  })

  it('pins every group summary at the same line under the head', async () => {
    // One shared offset is what makes a passed group hand the line over to the
    // next one instead of the two stacking.
    const user = userEvent.setup()
    renderSection()
    await openToate(user)

    // The offset the summaries pin to IS the head's pinned height — the two
    // numbers have to match or a group row rides up over the column labels.
    for (const header of screen.getAllByRole('columnheader')) {
      expect(header).toHaveClass('h-9', 'top-0', 'z-10')
    }

    for (const name of ['PSD (87)', 'PNL (45)', 'AUR (6)']) {
      const cells = within(groupSummaryRow(name)).getAllByRole('cell')
      expect(cells).toHaveLength(7)
      for (const cell of cells) {
        // Cells, not the `<tr>`: sticky rows are the shakier of the two, and
        // the fixed colgroup sizes cells anyway.
        expect(cell).toHaveClass('sticky', 'top-9')
        // Under the column head, over the member rows.
        expect(cell).toHaveClass('z-[5]')
      }
    }
  })

  it('scrolls member rows under the pinned summary', async () => {
    const user = userEvent.setup()
    renderSection()
    await openToate(user)
    await user.click(screen.getByRole('button', { name: 'AUR (6)' }))

    for (const row of within(groupMemberPanel('AUR (6)')).getAllByRole('row')) {
      for (const cell of within(row).getAllByRole('cell')) {
        expect(cell).not.toHaveClass('sticky')
      }
    }
  })

  it('expands from a click anywhere on the summary row, once', async () => {
    // The row and the control share one toggle; a click that lands on the
    // control must not fire it twice and leave the group shut.
    const user = userEvent.setup()
    renderSection()
    await openToate(user)

    const identityCell = within(groupSummaryRow('AUR (6)')).getAllByRole(
      'cell',
    )[0]
    await user.click(identityCell!)
    expect(screen.getByRole('button', { name: 'AUR (6)' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'AUR (6)' }))
    expect(screen.getByRole('button', { name: 'AUR (6)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('keeps the biggest group first in the table', async () => {
    const user = userEvent.setup()
    renderSection()
    await openToate(user)

    const names = screen
      .getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .filter((text) => /^(AUR|PSD|PNL) \(/.test(text))
    expect(names).toEqual(['PSD (87)', 'PNL (45)', 'AUR (6)'])
  })

  it('narrows the table to the filtered group', async () => {
    const user = userEvent.setup()
    renderSection()
    await openToate(user)

    await user.click(
      screen.getByRole('combobox', { name: 'Filtru grup parlamentar' }),
    )
    await user.click(screen.getByRole('option', { name: 'PSD' }))

    expect(screen.getByRole('button', { name: 'PSD (87)' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'AUR (6)' }),
    ).not.toBeInTheDocument()
  })

  it('never counts an unattributed position toward the total', async () => {
    // USR's two ballots are a source conflict and an unmarked position: they are
    // listed, but the source recorded no choice for either, so the total says 0
    // and the row says why.
    const user = userEvent.setup()
    renderConflictSection()
    await openToate(user, 'Toate (140)')

    const row = groupSummaryRow('USR (2)')
    expect(rowValues(row).slice(1)).toEqual(['0', '0', '0', '0', '0'])
    expect(row).toHaveTextContent('2 fără alegere înregistrată')

    await user.click(screen.getByRole('button', { name: 'USR (2)' }))
    const panel = groupMemberPanel('USR (2)')
    expect(within(panel).getAllByRole('row').map(tickedColumn)).toEqual([-1, -1])
    expect(within(panel).getByText('Conflict în sursă')).toBeInTheDocument()
    expect(within(panel).getByText('Poziție neclară')).toBeInTheDocument()
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

  it('opens on the tab it is GIVEN, with no click', () => {
    // The URL-backed path: the route hands the tab down, so the first paint is
    // already the right one — no effect, no correction step, no flicker.
    render(
      <VoteIndividualVotesSection
        detail={detail}
        groupColors={{ AUR: '#000000', PSD: '#e30613', PNL: '#ffcc00' }}
        memberJudete={{}}
        activeTab="toate"
        onActiveTabChange={() => undefined}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Toate (138)' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('reports a tab click to its owner instead of moving itself', async () => {
    const user = userEvent.setup()
    const onActiveTabChange = vi.fn()
    render(
      <VoteIndividualVotesSection
        detail={detail}
        groupColors={{ AUR: '#000000', PSD: '#e30613', PNL: '#ffcc00' }}
        memberJudete={{}}
        activeTab="pentru"
        onActiveTabChange={onActiveTabChange}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Toate (138)' }))
    expect(onActiveTabChange).toHaveBeenCalledWith('toate')
    // Controlled: it does NOT move on its own, or the URL and the screen could
    // disagree after a back button.
    expect(screen.getByRole('tab', { name: 'Voturi pentru (133)' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('falls back to Pentru when given a tab this division hides', () => {
    // A URL naming `conflicting_choice` for a division with no conflicts. The
    // section resolves it on render and leaves the URL alone — nothing to
    // navigate, so no loop.
    render(
      <VoteIndividualVotesSection
        detail={detail}
        groupColors={{ AUR: '#000000', PSD: '#e30613', PNL: '#ffcc00' }}
        memberJudete={{}}
        activeTab="conflicting_choice"
        onActiveTabChange={() => undefined}
      />,
    )
    expect(
      screen.getByRole('tab', { name: 'Voturi pentru (133)' }),
    ).toHaveAttribute('aria-selected', 'true')
  })

  it('keeps its own tab when nobody owns it', async () => {
    // The embedded/uncontrolled path has to keep working unchanged.
    const user = userEvent.setup()
    renderSection()
    await user.click(screen.getByRole('tab', { name: 'Toate (138)' }))
    expect(screen.getByRole('tab', { name: 'Toate (138)' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('hides the conflict and unclear tabs when the division has none', () => {
    renderSection()
    expect(
      screen.queryByRole('tab', { name: /Conflicte în sursă/ }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('tab', { name: /Poziții neclare/ }),
    ).not.toBeInTheDocument()
    // The ordinary choice tabs stay, zero or not.
    expect(screen.getByRole('tab', { name: 'Fără vot (0)' })).toBeInTheDocument()
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
