import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeEntityViewNavigator } from './challenge-entity-view-navigator'
import type { ChallengeEntityViewOption } from './challenge-entity-view-menu'

const views: ChallengeEntityViewOption[] = [
  { id: 'main-info', label: 'Executii Bugetare' },
  { id: 'contracts', label: 'Contracte' },
  { id: 'commitments', label: 'Angajamente' },
  { id: 'ins', label: 'INS' },
]

describe('ChallengeEntityViewNavigator', () => {
  it('renders the title and the non-active views', () => {
    render(
      <ChallengeEntityViewNavigator
        views={views}
        activeView="main-info"
        onViewChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('challenge-entity-view-navigator')).toBeInTheDocument()
    expect(screen.getByText('Vezi mai mult')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Contracte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Angajamente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'INS' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Executii Bugetare' }),
    ).not.toBeInTheDocument()
  })

  it('renders the English title when locale is en', () => {
    render(
      <ChallengeEntityViewNavigator
        views={views}
        activeView="main-info"
        onViewChange={vi.fn()}
        locale="en"
      />,
    )

    expect(screen.getByText('See more')).toBeInTheDocument()
  })

  it('excludes the current active view from the list', () => {
    render(
      <ChallengeEntityViewNavigator
        views={views}
        activeView="contracts"
        onViewChange={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: 'Contracte' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Executii Bugetare' })).toBeInTheDocument()
  })

  it('calls onViewChange with the clicked view id', () => {
    const onViewChange = vi.fn()

    render(
      <ChallengeEntityViewNavigator
        views={views}
        activeView="main-info"
        onViewChange={onViewChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Contracte' }))

    expect(onViewChange).toHaveBeenCalledWith('contracts')
  })

  it('renders all navigation buttons as type=button', () => {
    render(
      <ChallengeEntityViewNavigator
        views={views}
        activeView="main-info"
        onViewChange={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole('button')
    for (const button of buttons) {
      expect(button).toHaveAttribute('type', 'button')
    }
  })
})
