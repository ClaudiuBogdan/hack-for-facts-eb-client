import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { ParliamentVoteActivity } from '@/schemas/parliament'

// The panel renders TanStack <Link>s; stub the router to a plain anchor so it
// renders without a RouterProvider (mirrors bill-stages-tab.test).
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...rest
  }: {
    children?: React.ReactNode
    to: string
    search?: Record<string, string | undefined>
  }) => {
    const query = new URLSearchParams(
      Object.entries(search ?? {}).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    ).toString()
    return (
      <a href={query ? `${to}?${query}` : to} {...(rest as Record<string, unknown>)}>
        {children}
      </a>
    )
  },
}))

const useParliamentVoteActivity = vi.fn()
vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentVoteActivity: (year: number) => useParliamentVoteActivity(year),
}))

import { ParliamentHubVoteActivity } from './parliament-hub-vote-activity'

/** "Today" for every case here, so the rolling window is deterministic. */
const TODAY = new Date('2026-07-29T09:00:00Z')

const activity = (
  year: number,
  days: ParliamentVoteActivity['days'],
): ParliamentVoteActivity => ({ year, days, availableYears: [2025, 2026] })

const settled = (data: ParliamentVoteActivity) => ({
  data,
  isLoading: false,
  isError: false,
  error: null,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
  useParliamentVoteActivity.mockReset()
})

describe('ParliamentHubVoteActivity', () => {
  it('renders a day square linking to that day on the votes page', () => {
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled(
        year === 2026
          ? activity(2026, [
              { date: '2026-03-20', total: 42, camera: 30, senat: 10, comun: 2 },
            ])
          : activity(2025, []),
      ),
    )

    render(<ParliamentHubVoteActivity />)

    // Matched on the date only: the count is pluralised by the active locale,
    // and the test harness aliases the Lingui macros to stubs that pick the
    // right plural form but leave `#` unsubstituted (see src/test/mocks).
    const day = screen.getByRole('link', { name: /20 martie 2026 — .*voturi/ })
    // `chamber=all` is part of the contract: a square counts camera + senat +
    // comun, so only the mixed list holds the set of votes it claims.
    expect(day).toHaveAttribute(
      'href',
      '/parlament?tab=voturi&chamber=all&from=2026-03-20&to=2026-03-20',
    )
  })

  it('always offers the way into the full votes list', () => {
    useParliamentVoteActivity.mockImplementation(() => settled(activity(2026, [])))

    render(<ParliamentHubVoteActivity />)

    expect(
      screen.getByRole('link', { name: /Vezi toate voturile/ }),
    ).toHaveAttribute('href', '/parlament?tab=voturi&chamber=all')
  })

  it('states the failure instead of drawing an empty year', () => {
    useParliamentVoteActivity.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Cannot query field "parliamentVoteActivity"'),
    }))

    render(<ParliamentHubVoteActivity />)

    expect(screen.getByRole('status')).toHaveTextContent(
      /nu a putut fi încărcată/i,
    )
    // The reader must not be told "no votes" when the truth is "not counted".
    expect(screen.queryByText(/Niciun vot în plen/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /martie/ })).not.toBeInTheDocument()
  })

  it('draws NOTHING until both calendar years of the window have answered', () => {
    // A 12-month window ending 2026-07-29 spans 2025 and 2026. Rendering the
    // half that arrived would print 2025 as a row of empty days — a silent
    // claim that the chambers never voted.
    useParliamentVoteActivity.mockImplementation((year: number) =>
      year === 2026
        ? settled(
            activity(2026, [
              { date: '2026-03-20', total: 42, camera: 30, senat: 10, comun: 2 },
            ]),
          )
        : { data: undefined, isLoading: true, isError: false, error: null },
    )

    render(<ParliamentHubVoteActivity />)

    expect(
      screen.queryByRole('link', { name: /20 martie 2026/ }),
    ).not.toBeInTheDocument()
  })

  it('drops days the server returns from outside the rolling window', () => {
    // The aggregate is fetched a whole calendar year at a time, so 2025 arrives
    // with January in it — five months before a window that starts in August.
    useParliamentVoteActivity.mockImplementation((year: number) =>
      settled(
        year === 2025
          ? activity(2025, [
              { date: '2025-01-15', total: 12, camera: 12, senat: 0, comun: 0 },
              { date: '2025-09-10', total: 8, camera: 0, senat: 8, comun: 0 },
            ])
          : activity(2026, []),
      ),
    )

    render(<ParliamentHubVoteActivity />)

    expect(
      screen.getByRole('link', { name: /10 septembrie 2025/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /15 ianuarie 2025/ }),
    ).not.toBeInTheDocument()
  })
})
