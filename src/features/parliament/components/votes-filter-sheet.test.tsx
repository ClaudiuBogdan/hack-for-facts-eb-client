import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParliamentVotesSearch } from '@/schemas/parliament'
import { VotesFilterSheet, VotesFilterTriggerButton } from './votes-filter-sheet'

const cohesionMock = vi.fn()
const kindCountsMock = vi.fn()
vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentGroupCohesion: () => cohesionMock(),
  useParliamentVoteKindCounts: () => kindCountsMock(),
}))

/** The scope is read off `search.chamber`; an absent one is "toate camerele". */
function renderSheet(search: ParliamentVotesSearch = { chamber: 'camera' }) {
  const onSearchChange = vi.fn()
  render(
    <VotesFilterSheet
      search={search}
      open
      onOpenChange={vi.fn()}
      onSearchChange={onSearchChange}
    />,
  )
  return { onSearchChange }
}

beforeEach(() => {
  cohesionMock.mockReturnValue({
    data: [{ groupName: 'PSD' }, { groupName: 'AUR' }, { groupName: 'neafiliat' }],
  })
  kindCountsMock.mockReturnValue({
    data: {
      legislative: 4408,
      amendment: 1704,
      procedural: 1149,
      chamber_decision: 623,
      attendance: 161,
      unclassified: 2361,
    },
  })
})

describe('VotesFilterTriggerButton', () => {
  it('shows no badge when nothing is filtering', () => {
    render(<VotesFilterTriggerButton activeCount={0} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName('Filtrează voturile')
  })

  it('names the active count in the accessible label, not only in the badge', () => {
    render(<VotesFilterTriggerButton activeCount={2} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAccessibleName(
      'Filtrează voturile, 2 filtre active',
    )
  })
})

describe('VotesFilterSheet — group options', () => {
  it('offers the BALLOT vocabulary, not the nomenclator spelling', () => {
    // The filter matches `vote_records.group_name` exactly. The directory's
    // "Neafiliaţi" would be an option that always returns nothing.
    renderSheet()
    const options = [
      ...screen.getByLabelText('Grup').querySelectorAll('option'),
    ].map((option) => option.textContent)
    expect(options).toContain('neafiliat')
    expect(options).not.toContain('Neafiliaţi')
  })

  it('sorts the groups with Romanian collation', () => {
    renderSheet()
    const options = [
      ...screen.getByLabelText('Grup').querySelectorAll('option'),
    ]
      .map((option) => option.textContent)
      .slice(1)
    expect(options).toEqual(['AUR', 'neafiliat', 'PSD'])
  })
})

describe('VotesFilterSheet — group and its optional stance', () => {
  it('sends both when both are chosen', async () => {
    const user = userEvent.setup()
    const { onSearchChange } = renderSheet()
    await user.selectOptions(screen.getByLabelText('Grup'), 'PSD')
    await user.selectOptions(screen.getByLabelText(/A votat/), 'pentru')
    await user.click(screen.getByRole('button', { name: 'Aplică filtrele' }))
    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ grupVot: 'PSD', alegere: 'pentru' }),
    )
  })

  it('sends the group ALONE when no stance is chosen', async () => {
    // A group on its own is a real question — "every vote this group took part
    // in" — so it must reach the server rather than being dropped.
    const user = userEvent.setup()
    const { onSearchChange } = renderSheet()
    await user.selectOptions(screen.getByLabelText('Grup'), 'PSD')
    await user.click(screen.getByRole('button', { name: 'Aplică filtrele' }))
    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ grupVot: 'PSD', alegere: undefined }),
    )
  })

  it('does not warn when only the group is chosen', async () => {
    const user = userEvent.setup()
    renderSheet()
    await user.selectOptions(screen.getByLabelText('Grup'), 'PSD')
    expect(screen.queryByText(/Alegeți un grup/)).not.toBeInTheDocument()
  })

  it('warns when a stance is chosen with no group', async () => {
    // That combination describes no subset of votes, and the server rejects it.
    const user = userEvent.setup()
    renderSheet()
    await user.selectOptions(screen.getByLabelText(/A votat/), 'pentru')
    expect(screen.getByText(/Alegeți un grup/)).toBeInTheDocument()
  })
})

describe('VotesFilterSheet — kinds', () => {
  it('shows each bucket with its count', () => {
    renderSheet()
    expect(
      screen.getByRole('checkbox', { name: /Proiecte de lege 4\.408/ }),
    ).toBeInTheDocument()
  })

  it('disables a bucket this chamber never uses instead of hiding it', () => {
    // The Senate genuinely has no amendment or attendance votes; an option that
    // silently vanished would read as a bug.
    kindCountsMock.mockReturnValue({
      data: {
        legislative: 6267,
        amendment: 0,
        procedural: 9,
        chamber_decision: 28,
        attendance: 0,
        unclassified: 385,
      },
    })
    renderSheet()
    expect(
      screen.getByRole('checkbox', { name: /Amendamente și articole 0/ }),
    ).toBeDisabled()
  })
})

describe('VotesFilterSheet — outcome', () => {
  it('offers only the two outcomes the source records', () => {
    // "amânat" is a UI-only state; the filter builder drops it, so offering it
    // would BROADEN the query back to every vote.
    renderSheet()
    const options = [
      ...screen.getByLabelText('Rezultat').querySelectorAll('option'),
    ].map((option) => option.value)
    expect(options).toEqual(['all', 'adoptat', 'respins'])
  })
})

describe('VotesFilterSheet — chamber facet', () => {
  it('offers the two chambers, the joint sittings, and all-at-once', () => {
    renderSheet()
    const options = [
      ...screen.getByLabelText('Camera').querySelectorAll('option'),
    ].map((option) => option.value)
    expect(options).toEqual(['all', 'camera', 'senat', 'comun'])
  })

  it('drops the param entirely for „Toate camerele”', async () => {
    // The widest reading is the list's default, so it leaves no token behind in
    // a URL the reader may share.
    const user = userEvent.setup()
    const { onSearchChange } = renderSheet({ tab: 'voturi', chamber: 'senat' })
    await user.selectOptions(screen.getByLabelText('Camera'), 'all')
    await user.click(screen.getByRole('button', { name: 'Aplică filtrele' }))
    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ chamber: undefined }),
    )
  })

  it('opens on „Toate camerele” when the URL carries no chamber', () => {
    renderSheet({ tab: 'voturi' })
    expect(screen.getByLabelText('Camera')).toHaveValue('all')
  })

  it('applies the chosen scope with the other facets', async () => {
    const user = userEvent.setup()
    const { onSearchChange } = renderSheet({ tab: 'voturi', chamber: 'camera' })
    await user.selectOptions(screen.getByLabelText('Camera'), 'senat')
    await user.click(screen.getByRole('button', { name: 'Aplică filtrele' }))
    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ chamber: 'senat' }),
    )
  })
})

describe('VotesFilterSheet — cross-chamber group filtering needs a period', () => {
  // The server refuses `groupVote` with neither a chamber nor a date bound
  // (vote_records has no index on group_name), so the all-chambers scope must
  // carry a period. The sheet pre-fills one VISIBLY instead of failing later.
  it('pre-fills the period when a group is chosen under Toate camerele', async () => {
    const user = userEvent.setup()
    renderSheet({ tab: 'voturi', chamber: 'all' })
    expect(screen.getByLabelText('De la')).toHaveValue('')
    await user.selectOptions(screen.getByLabelText('Grup'), 'PSD')
    expect(screen.getByLabelText('De la')).not.toHaveValue('')
    expect(screen.getByLabelText('Până la')).not.toHaveValue('')
  })

  it('refuses to apply when the reader clears the period back out', async () => {
    const user = userEvent.setup()
    const { onSearchChange } = renderSheet({ tab: 'voturi', chamber: 'all' })
    await user.selectOptions(screen.getByLabelText('Grup'), 'PSD')
    await user.clear(screen.getByLabelText('De la'))
    await user.clear(screen.getByLabelText('Până la'))
    expect(
      screen.getByText(/poziția unui grup se caută\s+într-o perioadă/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aplică filtrele' }))
    expect(onSearchChange).not.toHaveBeenCalled()
  })

  it('leaves a period the reader already chose alone', async () => {
    const user = userEvent.setup()
    renderSheet({
      tab: 'voturi',
      chamber: 'all',
      from: '2026-01-01',
      to: '2026-02-01',
    })
    await user.selectOptions(screen.getByLabelText('Grup'), 'PSD')
    expect(screen.getByLabelText('De la')).toHaveValue('2026-01-01')
    expect(screen.getByLabelText('Până la')).toHaveValue('2026-02-01')
  })

  it('does not touch the period on a single-chamber scope', async () => {
    // A chamber IS a bound; forcing a period there would narrow the reader's
    // question without being asked to.
    const user = userEvent.setup()
    renderSheet({ tab: 'voturi', chamber: 'camera' })
    await user.selectOptions(screen.getByLabelText('Grup'), 'PSD')
    expect(screen.getByLabelText('De la')).toHaveValue('')
  })
})

describe('VotesFilterSheet — reset', () => {
  it('clears the facets but KEEPS the free-text term', async () => {
    // The search bar lives outside this panel, so "Resetează" here must not
    // silently discard what the reader typed there.
    const user = userEvent.setup()
    const { onSearchChange } = renderSheet({
      tab: 'voturi',
      chamber: 'camera',
      q: 'buget',
      outcome: 'adoptat',
      grupVot: 'PSD',
      alegere: 'pentru',
    })
    await user.click(screen.getByRole('button', { name: 'Resetează' }))
    // The chamber goes too — it is a facet in this panel now, so resetting
    // widens the list back to the whole parliament like every other one.
    expect(onSearchChange).toHaveBeenCalledWith({
      tab: 'voturi',
      q: 'buget',
      page: 1,
      pageSize: undefined,
    })
  })
})
