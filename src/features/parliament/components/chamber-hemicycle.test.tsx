import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParliamentChamberComposition } from '@/schemas/parliament'
import { ChamberHemicycle } from './chamber-hemicycle'

const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

const composition: ParliamentChamberComposition = {
  chamber: 'camera',
  totalSeats: 3,
  majoritySeats: 2,
  activeSeatCount: 1,
  hasActiveFilters: true,
  groups: [
    {
      groupId: 'pnl-camera',
      name: 'Partidul Național Liberal',
      shortName: 'PNL',
      chamber: 'camera',
      memberCount: 3,
    },
  ],
  seats: [
    {
      seatIndex: 0,
      memberId: 'dep-active',
      memberName: 'Ana Activă',
      groupId: 'pnl-camera',
      groupName: 'PNL',
      color: '#2563eb',
      x: 10,
      y: 10,
      isActive: true,
    },
    {
      seatIndex: 1,
      memberId: 'dep-inactive',
      memberName: 'Ioana Inactivă',
      groupId: 'pnl-camera',
      groupName: 'PNL',
      color: '#2563eb',
      x: 20,
      y: 10,
      isActive: false,
    },
    // A filler seat: the group holds it, but no roster member resolves to it.
    {
      seatIndex: 2,
      memberName: '',
      groupId: 'pnl-camera',
      groupName: 'PNL',
      color: '#2563eb',
      x: 30,
      y: 10,
      isActive: false,
    },
  ],
  viewBox: '0 0 40 20',
  seatRadius: 1,
}

const seatCircles = (container: HTMLElement): SVGCircleElement[] =>
  Array.from(container.querySelectorAll('circle'))

describe('ChamberHemicycle', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it('navigates from a seat that resolves to a real member', () => {
    const { container } = render(<ChamberHemicycle composition={composition} />)

    fireEvent.click(seatCircles(container)[1]!)

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/parlament/membri/$memberId',
      params: { memberId: 'dep-inactive' },
    })
  })

  it('keeps a dimmed-but-real seat clickable (a filter is not a disabled state)', () => {
    const { container } = render(<ChamberHemicycle composition={composition} />)
    const dimmed = seatCircles(container)[1]!

    expect(dimmed).not.toHaveAttribute('aria-disabled')
    expect(dimmed.getAttribute('class')).toContain('cursor-pointer')
  })

  it('does NOT make a filler seat navigable', () => {
    const { container } = render(<ChamberHemicycle composition={composition} />)
    const filler = seatCircles(container)[2]!

    fireEvent.click(filler)

    // A placeholder seat has no member page — clicking it must do nothing.
    expect(navigateMock).not.toHaveBeenCalled()
    expect(filler.getAttribute('class')).toContain('cursor-default')
    expect(filler.querySelector('title')?.textContent).toContain(
      'Loc neatribuit unui profil',
    )
  })

  it('keeps hundreds of seats OUT of the keyboard tab order', () => {
    const { container } = render(<ChamberHemicycle composition={composition} />)

    // The chart is one labelled image; the party legend below is the keyboard
    // path to the same data. Focusable seats would mean 330 tab stops.
    for (const circle of seatCircles(container)) {
      expect(circle).not.toHaveAttribute('tabindex')
      expect(circle).not.toHaveAttribute('role')
    }
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('shows highlighted seat share as a percentage under the footer separator', () => {
    render(<ChamberHemicycle composition={composition} />)

    expect(screen.getByText('33% din locuri')).toBeInTheDocument()
  })
})
