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
  totalSeats: 2,
  majoritySeats: 2,
  activeSeatCount: 1,
  hasActiveFilters: true,
  groups: [
    {
      groupId: 'pnl-camera',
      name: 'Partidul Național Liberal',
      shortName: 'PNL',
      chamber: 'camera',
      memberCount: 2,
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
  ],
  viewBox: '0 0 30 20',
  seatRadius: 1,
}

describe('ChamberHemicycle', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it('keeps dimmed seats as usable links instead of aria-disabled controls', () => {
    render(<ChamberHemicycle composition={composition} />)

    const inactiveSeat = screen.getByRole('link', {
      name: /Ioana Inactivă, PNL/,
    })

    expect(inactiveSeat).not.toHaveAttribute('aria-disabled')

    fireEvent.click(inactiveSeat)

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/parlament/membri/$memberId',
      params: { memberId: 'dep-inactive' },
    })
  })

  it('shows highlighted seat share as a percentage under the footer separator', () => {
    render(<ChamberHemicycle composition={composition} />)

    expect(screen.getByText('50% din locuri')).toBeInTheDocument()
  })
})
