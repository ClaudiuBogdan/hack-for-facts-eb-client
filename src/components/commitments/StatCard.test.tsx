import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatCard } from './StatCard'

/**
 * The KPI tiles on the entity commitments tab are fed by
 * `extractSummaryValues(summaryData?.nodes ?? [])`, which returns zeros for an
 * empty list. Before `isError` existed, a failed request therefore rendered
 * "Total Allocated Budget: 0 RON" for a real public institution —
 * indistinguishable from a finding that it committed no money. These tests pin
 * the distinction (`DESIGN.md` §Data Trust & Provenance).
 */
describe('StatCard', () => {
  it('renders a real zero as a real zero', () => {
    render(
      <StatCard
        title="Total Allocated Budget"
        value={0}
        variant="budget"
        currency="RON"
      />,
    )

    expect(screen.getByText(/0/)).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument()
  })

  it('renders an em dash, never a zero, when the figure could not be fetched', () => {
    render(
      <StatCard
        title="Total Allocated Budget"
        value={0}
        subtitle="Final Budget Credits"
        variant="budget"
        currency="RON"
        isError
      />,
    )

    expect(screen.getByText('—')).toBeInTheDocument()
    // The claim "0 RON" must not survive anywhere in the tile.
    expect(screen.queryByText(/\b0\b/)).not.toBeInTheDocument()
    expect(screen.queryByText(/RON/)).not.toBeInTheDocument()
  })

  it('replaces the subtitle with an explanation rather than a stale caption', () => {
    render(
      <StatCard
        title="Payments Made"
        value={0}
        subtitle="Final Budget Credits"
        variant="paid"
        isError
      />,
    )

    expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument()
    expect(screen.queryByText('Final Budget Credits')).not.toBeInTheDocument()
  })

  it('shows the skeleton while loading, with no value and no error text', () => {
    render(
      <StatCard title="Legal Commitments" value={0} variant="committed" isLoading />,
    )

    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument()
  })

  it('keeps rendering a good value when a background refetch fails', () => {
    // The page only sets `isError` when the query also has no data, so a
    // failed refetch over good data keeps showing the number.
    render(
      <StatCard
        title="Legal Commitments"
        value={1_500_000}
        variant="committed"
        currency="RON"
      />,
    )

    expect(screen.queryByText('—')).not.toBeInTheDocument()
    expect(screen.getByRole('heading')).toHaveTextContent(/\d/)
  })
})
