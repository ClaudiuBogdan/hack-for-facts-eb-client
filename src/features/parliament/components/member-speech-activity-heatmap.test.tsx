import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ParliamentMemberSpeechActivity } from '@/schemas/parliament'
import { MemberSpeechActivityHeatmap } from './member-speech-activity-heatmap'

const activity: ParliamentMemberSpeechActivity = {
  year: 2026,
  availableYears: [2025, 2026],
  days: [
    { date: '2026-03-20', total: 12, proprie: 4, comun: 8 },
    { date: '2026-02-02', total: 1, proprie: 1, comun: 0 },
  ],
}

function renderHeatmap(
  overrides: Partial<Parameters<typeof MemberSpeechActivityHeatmap>[0]> = {},
) {
  const onSelectDay = vi.fn()
  const onSelectYear = vi.fn()
  render(
    <MemberSpeechActivityHeatmap
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

describe('MemberSpeechActivityHeatmap', () => {
  it('renders a labelled button per active day (singular vs plural)', () => {
    renderHeatmap()
    expect(
      screen.getByRole('button', { name: /20 martie 2026 — 12 intervenții/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /2 februarie 2026 — 1 intervenție/ }),
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
    const active = screen.getAllByRole('button', { name: '2026' })
    expect(active[0]).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getAllByRole('button', { name: '2025' })[0]!)
    expect(onSelectYear).toHaveBeenCalledWith(2025)
  })

  it('shows the empty state for a year with no activity', () => {
    render(
      <MemberSpeechActivityHeatmap
        activity={{ year: 2026, availableYears: [2026], days: [] }}
        onSelectDay={vi.fn()}
        onSelectYear={vi.fn()}
        year={2026}
        isLoading={false}
      />,
    )
    expect(
      screen.getByText('Nicio intervenție în plen în 2026.'),
    ).toBeInTheDocument()
  })
})
