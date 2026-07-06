import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ParliamentMemberVoteActivity } from '@/schemas/parliament'
import { MemberVoteActivityHeatmap } from './member-vote-activity-heatmap'

const activity: ParliamentMemberVoteActivity = {
  year: 2026,
  availableYears: [2025, 2026],
  days: [
    { date: '2026-03-20', total: 280, pentru: 0, impotriva: 280, abtinere: 0, nuAVotat: 0 },
    { date: '2026-02-02', total: 5, pentru: 3, impotriva: 1, abtinere: 1, nuAVotat: 0 },
  ],
}

function renderHeatmap(overrides: Partial<Parameters<typeof MemberVoteActivityHeatmap>[0]> = {}) {
  const onSelectDay = vi.fn()
  const onSelectYear = vi.fn()
  render(
    <MemberVoteActivityHeatmap
      activity={activity}
      onSelectDay={onSelectDay}
      onSelectYear={onSelectYear}
      year={2026}
      isLoading={false}
      {...overrides}
    />,
  )
  return { onSelectDay, onSelectYear }
}

describe('MemberVoteActivityHeatmap', () => {
  it('renders a button for each active day with an aria-label', () => {
    renderHeatmap()
    expect(
      screen.getByRole('button', { name: /20 martie 2026 — 280 voturi/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /2 februarie 2026 — 5 voturi/ }),
    ).toBeInTheDocument()
  })

  it('fires onSelectDay with the ISO date when a day is clicked', () => {
    const { onSelectDay } = renderHeatmap()
    fireEvent.click(screen.getByRole('button', { name: /20 martie 2026/ }))
    expect(onSelectDay).toHaveBeenCalledWith('2026-03-20')
  })

  it('marks the selected day with a ring', () => {
    renderHeatmap({ selectedDay: '2026-03-20' })
    const selected = screen.getByRole('button', { name: /20 martie 2026/ })
    expect(selected.className).toMatch(/ring-2/)
  })

  it('renders a pressed year button and fires onSelectYear', () => {
    const { onSelectYear } = renderHeatmap()
    // Year selector renders for both breakpoints; the active year is pressed.
    const active = screen.getAllByRole('button', { name: '2026' })
    expect(active[0]).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getAllByRole('button', { name: '2025' })[0]!)
    expect(onSelectYear).toHaveBeenCalledWith(2025)
  })

  it('shows the empty state for a year with no activity', () => {
    render(
      <MemberVoteActivityHeatmap
        activity={{ year: 2026, availableYears: [2026], days: [] }}
        onSelectDay={vi.fn()}
        onSelectYear={vi.fn()}
        year={2026}
        isLoading={false}
      />,
    )
    expect(screen.getByText('Nicio activitate de vot în 2026.')).toBeInTheDocument()
  })
})
