import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ParliamentVoteActivity,
  ParliamentVoteSummary,
  ParliamentVotesSearch,
} from '@/schemas/parliament'

const navigateMock = vi.fn()
// The list renders TanStack <Link>s (day squares) and navigates on filter
// changes; stub both so it runs without a RouterProvider. `search` is kept on
// the anchor as JSON — what a day square CARRIES is the thing under test.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    search,
    params,
    ...rest
  }: {
    children?: React.ReactNode
    search?: Record<string, unknown>
    params?: Record<string, string>
  }) => (
    // `href` is what gives the anchor its link ROLE — without it the day
    // squares are unreachable by `getByRole('link')`.
    <a
      href="/parlament"
      data-search={JSON.stringify(search)}
      data-params={JSON.stringify(params)}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}))

const votesBrowseMock = vi.fn()
const voteActivityMock = vi.fn()
vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentVotesBrowse: (search: unknown) => votesBrowseMock(search),
  useParliamentVoteActivity: (year: number) => voteActivityMock(year),
  // Read by the filter sheet only; it is closed in every case here.
  useParliamentGroupCohesion: () => ({ data: [] }),
  useParliamentVoteKindCounts: () => ({ data: undefined }),
}))

import { VotesListLayout } from './votes-list-layout'

/** "Today" for every case, so the heatmap's rolling window is deterministic. */
const TODAY = new Date('2026-07-29T09:00:00Z')

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

const activity: ParliamentVoteActivity = {
  year: 2026,
  days: [{ date: '2026-03-20', total: 42, camera: 30, senat: 10, comun: 2 }],
  availableYears: [2025, 2026],
  // The activity read now carries its source-coverage rows; the fixture has
  // none, which is what an unannotated year looks like.
  coverage: [],
}

function renderList(search: ParliamentVotesSearch = {}) {
  return render(<VotesListLayout search={search} />)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
  votesBrowseMock.mockReturnValue({
    data: {
      pages: [
        {
          votes: [vote(), vote({ voteId: 'senat:2', chamber: 'senat' })],
          total: 2,
          totalEstimated: false,
        },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })
  voteActivityMock.mockImplementation((year: number) => ({
    data: year === 2026 ? activity : { ...activity, year: 2025, days: [] },
    isLoading: false,
    isError: false,
    error: null,
  }))
})

afterEach(() => {
  vi.useRealTimers()
  navigateMock.mockReset()
  votesBrowseMock.mockReset()
  voteActivityMock.mockReset()
})

describe('VotesListLayout — one list, chamber as a filter', () => {
  it('keeps ONE heading whatever the chamber is', () => {
    // A chamber narrows this list; it does not open a different page. Re-titling
    // per chamber made the same surface look like four.
    renderList({ chamber: 'senat' })
    expect(
      screen.getByRole('heading', { name: 'Voturile din Parlament' }),
    ).toBeInTheDocument()
  })

  it('names the chamber in the active-filter summary', () => {
    renderList({ chamber: 'comun' })
    expect(
      within(screen.getByRole('status')).getByText(/Camerele reunite/),
    ).toBeInTheDocument()
  })

  it('badges each row with its chamber when the list spans all of them', () => {
    renderList()
    expect(screen.getByText('Senat')).toBeInTheDocument()
  })

  it('drops the row badge once a chamber is filtering', () => {
    // The summary above already says it, so the badge would repeat it on every
    // single row.
    renderList({ chamber: 'senat' })
    expect(screen.queryByText('Camera Deputaților')).not.toBeInTheDocument()
  })

  it('clears the chamber along with the other filters', () => {
    renderList({ tab: 'voturi', chamber: 'senat', outcome: 'adoptat' })
    fireEvent.click(screen.getByRole('button', { name: /Renunță la toate/ }))
    const [call] = navigateMock.mock.calls as [[{ search: ParliamentVotesSearch }]]
    expect(call[0].search.chamber).toBeUndefined()
    expect(call[0].search.outcome).toBeUndefined()
  })
})

describe('VotesListLayout — the activity heatmap under the list', () => {
  it('carries the live filters onto the day it opens', () => {
    // The reader is filtering; a day square that reset their question would
    // answer a different one than the list they are looking at.
    renderList({ tab: 'voturi', chamber: 'senat', q: 'buget', outcome: 'adoptat' })
    const day = screen.getByRole('link', { name: /20 martie 2026/ })
    expect(JSON.parse(day.dataset.search ?? '{}')).toMatchObject({
      tab: 'voturi',
      chamber: 'senat',
      q: 'buget',
      outcome: 'adoptat',
      from: '2026-03-20',
      to: '2026-03-20',
    })
  })

  it('offers a way back out of a chosen day, keeping the rest', () => {
    renderList({
      tab: 'voturi',
      chamber: 'senat',
      from: '2026-03-20',
      to: '2026-03-20',
    })
    fireEvent.click(screen.getByRole('button', { name: /Renunță la ziua aleasă/ }))
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.objectContaining({
          chamber: 'senat',
          from: undefined,
          to: undefined,
        }),
      }),
    )
  })
})
