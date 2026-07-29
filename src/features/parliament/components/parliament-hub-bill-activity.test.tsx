import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import type { ParliamentBillActivity } from '@/schemas/parliament'

// The panel renders TanStack <Link>s; stub the router to a plain anchor so it
// renders without a RouterProvider (mirrors the vote-activity panel's test).
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

const useParliamentBillActivity = vi.fn()
vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentBillActivity: (year: number) => useParliamentBillActivity(year),
}))

import { ParliamentHubBillActivity } from './parliament-hub-bill-activity'

/** "Today" for every case here, so the rolling window is deterministic. */
const TODAY = new Date('2026-07-29T09:00:00Z')

const activity = (
  year: number,
  days: ParliamentBillActivity['days'],
): ParliamentBillActivity => ({ year, days, availableYears: [2025, 2026] })

const settled = (data: ParliamentBillActivity) => ({
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
  useParliamentBillActivity.mockReset()
})

describe('ParliamentHubBillActivity', () => {
  it('draws a counted day as a labelled, NON-navigable square', () => {
    // The bills list has no per-day filter, so a linked square would land on an
    // unfiltered list — the square states the count and stops there.
    useParliamentBillActivity.mockImplementation((year: number) =>
      settled(
        year === 2026
          ? activity(2026, [{ date: '2026-03-20', total: 17 }])
          : activity(2025, []),
      ),
    )

    render(<ParliamentHubBillActivity />)

    // Matched on the date only: the harness aliases the Lingui macros to stubs
    // that pick the plural form but leave `#` unsubstituted (src/test/mocks).
    const day = screen.getByRole('img', { name: /20 martie 2026 — .*proiecte/ })
    expect(day.tagName).toBe('DIV')
    expect(
      screen.queryByRole('link', { name: /20 martie 2026/ }),
    ).not.toBeInTheDocument()
  })

  it('always offers the way into the full bills list', () => {
    useParliamentBillActivity.mockImplementation(() =>
      settled(activity(2026, [])),
    )

    render(<ParliamentHubBillActivity />)

    expect(
      screen.getByRole('link', { name: /Vezi toate proiectele/ }),
    ).toHaveAttribute('href', '/parlament?tab=proiecte')
  })

  it('states the failure instead of drawing an empty year', () => {
    useParliamentBillActivity.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Cannot query field "parliamentBillActivity"'),
    }))

    render(<ParliamentHubBillActivity />)

    expect(screen.getByRole('status')).toHaveTextContent(
      /nu a putut fi încărcată/i,
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      /Cannot query field "parliamentBillActivity"/,
    )
    // "Not counted" must never be shown as "nothing happened".
    expect(screen.queryByText(/Niciun proiect/)).not.toBeInTheDocument()
    // …and the way out of the card still works.
    expect(
      screen.getByRole('link', { name: /Vezi toate proiectele/ }),
    ).toBeInTheDocument()
  })

  it('draws NOTHING until both calendar years of the window have answered', () => {
    useParliamentBillActivity.mockImplementation((year: number) =>
      year === 2026
        ? settled(activity(2026, [{ date: '2026-03-20', total: 17 }]))
        : { data: undefined, isLoading: true, isError: false, error: null },
    )

    render(<ParliamentHubBillActivity />)

    expect(
      screen.queryByRole('img', { name: /20 martie 2026/ }),
    ).not.toBeInTheDocument()
  })

  it('drops days the server returns from outside the rolling window', () => {
    // The aggregate is fetched a whole calendar year at a time, so 2025 arrives
    // with January in it — five months before a window that starts in August.
    useParliamentBillActivity.mockImplementation((year: number) =>
      settled(
        year === 2025
          ? activity(2025, [
              { date: '2025-01-15', total: 12 },
              { date: '2025-09-10', total: 8 },
            ])
          : activity(2026, []),
      ),
    )

    render(<ParliamentHubBillActivity />)

    expect(
      screen.getByRole('img', { name: /10 septembrie 2025/ }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: /15 ianuarie 2025/ }),
    ).not.toBeInTheDocument()
  })
})
