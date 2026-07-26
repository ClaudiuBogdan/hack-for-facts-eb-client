import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParliamentMemberSpeechActivity } from '@/schemas/parliament'
import { stubResizeObserver, stubScrollIntoView } from '@/test/helpers'
import { MemberSpeechActivityHeatmap } from './member-speech-activity-heatmap'

// The year control is a cmdk combobox, which observes its list on mount.
// Stubbed here rather than globally: recharts' ResponsiveContainer behaves
// differently when a non-firing ResizeObserver exists, and a global stub takes
// every chart test down with it. `beforeEach`, because of `unstubGlobals`.
beforeEach(() => {
  stubResizeObserver()
  stubScrollIntoView()
})

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

  it('offers the year as ONE combobox, not a button per year', async () => {
    // Replaces the old vertical list, which grew a button every year, pushed
    // the grid sideways on desktop and gave keyboard users one tab stop each.
    const { onSelectYear } = renderHeatmap()

    const trigger = screen.getByRole('combobox', { name: /Anul ședințelor/ })
    expect(trigger).toHaveTextContent('2026')
    expect(screen.queryByRole('button', { name: '2025' })).toBeNull()

    await userEvent.click(trigger)
    await userEvent.click(await screen.findByRole('option', { name: '2025' }))
    expect(onSelectYear).toHaveBeenCalledWith(2025)
  })

  it('renders no year control when the page owns it', () => {
    // Two controls driving the same URL param is a bug, not redundancy.
    renderHeatmap({ yearControl: 'none' })
    expect(
      screen.queryByRole('combobox', { name: /Anul ședințelor/ }),
    ).toBeNull()
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
