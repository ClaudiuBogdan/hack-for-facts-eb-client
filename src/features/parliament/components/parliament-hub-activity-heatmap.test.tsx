import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

const router = vi.hoisted(() => ({
  buildLocation: vi.fn(({ to, search }: { to: string; search?: Record<string, string> }) => {
    const query = new URLSearchParams(search ?? {}).toString()
    return { publicHref: query ? `${to}?${query}` : to }
  }),
  history: { createHref: (href: string) => href },
  navigate: vi.fn(),
}))
vi.mock('@tanstack/react-router', () => ({ useRouter: () => router }))

import {
  ParliamentHubActivityHeatmap,
  type ActivityHeatmapDay,
} from './parliament-hub-activity-heatmap'
import { appendDayToHref } from '../lib/activity-heatmap-href'
import { rollingWindow } from '../lib/vote-activity-grid'

const WINDOW = rollingWindow({ months: 12, today: new Date('2026-07-29T09:00:00Z') })

const counted = (label: string): ActivityHeatmapDay => ({
  total: 3,
  label,
  tooltip: <span>{`tooltip for ${label}`}</span>,
})

function renderHeatmap(props: Partial<Parameters<typeof ParliamentHubActivityHeatmap>[0]> = {}) {
  return render(
    <ParliamentHubActivityHeatmap
      ariaLabel="Activitate"
      window={WINDOW}
      days={new Map([['2026-03-20', counted('20 martie 2026 — 3 voturi')]])}
      status="ready"
      errorLead="eroare"
      emptyLabel="nimic"
      bucketOf={() => 2}
      daySearch={{ tab: 'voturi', chamber: 'all' }}
      cta={null}
      {...props}
    />,
  )
}

beforeEach(() => {
  router.buildLocation.mockClear()
  router.navigate.mockReset()
})

describe('appendDayToHref', () => {
  it('adds the day as from/to after the surface’s own search', () => {
    expect(appendDayToHref('/parlament?tab=voturi', '2026-03-20')).toBe(
      '/parlament?tab=voturi&from=2026-03-20&to=2026-03-20',
    )
    expect(appendDayToHref('/parlament', '2026-03-20')).toBe(
      '/parlament?from=2026-03-20&to=2026-03-20',
    )
  })
})

describe('ParliamentHubActivityHeatmap', () => {
  it('serialises the surface’s address once, not once per square', () => {
    renderHeatmap({
      daySearch: { tab: 'voturi', chamber: 'senat', from: '2026-01-01', to: '2026-01-01' },
      days: new Map([
        ['2026-03-20', counted('20 martie')],
        ['2026-03-21', counted('21 martie')],
      ]),
    })

    expect(router.buildLocation).toHaveBeenCalledTimes(1)
    // A chosen day is replaced, not doubled.
    expect(router.buildLocation).toHaveBeenCalledWith({
      to: '/parlament',
      search: { tab: 'voturi', chamber: 'senat' },
    })
    expect(screen.getByRole('link', { name: '21 martie' })).toHaveAttribute(
      'href',
      '/parlament?tab=voturi&chamber=senat&from=2026-03-21&to=2026-03-21',
    )
  })

  it('opens one tooltip on the focused square and describes it', () => {
    renderHeatmap()
    const day = screen.getByRole('link', { name: '20 martie 2026 — 3 voturi' })

    act(() => day.focus())

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('tooltip for 20 martie 2026 — 3 voturi')
    expect(day).toHaveAttribute('aria-describedby', tooltip.id)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(day).not.toHaveAttribute('aria-describedby')
  })

  it('opens the hovered square’s tooltip after a short delay, not on touch', () => {
    vi.useFakeTimers()
    try {
      renderHeatmap()
      const day = screen.getByRole('link', { name: '20 martie 2026 — 3 voturi' })

      fireEvent.pointerOver(day, { pointerType: 'touch' })
      act(() => vi.advanceTimersByTime(500))
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

      fireEvent.pointerOver(day, { pointerType: 'mouse' })
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      act(() => vi.advanceTimersByTime(150))
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('navigates in the app on a plain click and leaves a modified click to the browser', () => {
    const onSelectDay = vi.fn()
    renderHeatmap({ onSelectDay })
    const day = screen.getByRole('link', { name: '20 martie 2026 — 3 voturi' })

    fireEvent.click(day, { ctrlKey: true })
    expect(router.navigate).not.toHaveBeenCalled()

    fireEvent.click(day)
    expect(onSelectDay).toHaveBeenCalledTimes(1)
    expect(router.navigate).toHaveBeenCalledWith({
      to: '/parlament',
      search: { tab: 'voturi', chamber: 'all', from: '2026-03-20', to: '2026-03-20' },
    })
  })

  it('draws static squares, still named, when the surface offers no list for a day', () => {
    renderHeatmap({ daySearch: undefined })

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: '20 martie 2026 — 3 voturi' })).toBeInTheDocument()
  })

  it('names an uncaptured day apart from a quiet one', () => {
    renderHeatmap({
      days: new Map(),
      isCovered: (iso) => iso !== '2026-03-19',
      uncapturedLabel: (iso) => `${iso} necolectat`,
      coveredEmptyLabel: (iso) => `${iso} liniștit`,
    })

    expect(screen.getByRole('img', { name: '2026-03-19 necolectat' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '2026-03-20 liniștit' })).toBeInTheDocument()
  })
})
