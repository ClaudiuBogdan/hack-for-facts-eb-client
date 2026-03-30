import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeEntityViewMenu } from './challenge-entity-view-menu'
import type { ChallengeEntityViewOption } from './challenge-entity-view-menu'

const views: ChallengeEntityViewOption[] = [
  { id: 'main-info', label: 'Executii Bugetare' },
  { id: 'contracts', label: 'Contracte' },
  { id: 'commitments', label: 'Angajamente' },
  { id: 'ins', label: 'INS' },
]

describe('ChallengeEntityViewMenu', () => {
  it('renders the title and all view options', () => {
    render(
      <ChallengeEntityViewMenu
        title="Alege Vizualizarea"
        views={views}
        activeView="main-info"
        onViewChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('challenge-entity-view-menu')).toBeInTheDocument()
    expect(screen.getByText('Alege Vizualizarea')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Executii Bugetare' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Contracte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Angajamente' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'INS' })).toBeInTheDocument()
  })

  it('marks the active view with aria-pressed=true', () => {
    render(
      <ChallengeEntityViewMenu
        title="Alege Vizualizarea"
        views={views}
        activeView="contracts"
        onViewChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Contracte' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Executii Bugetare' }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getByRole('button', { name: 'Angajamente' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onViewChange with the selected view id', () => {
    const onViewChange = vi.fn()

    render(
      <ChallengeEntityViewMenu
        title="Alege Vizualizarea"
        views={views}
        activeView="main-info"
        onViewChange={onViewChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Angajamente' }))

    expect(onViewChange).toHaveBeenCalledWith('commitments')
  })

  it('renders all buttons as type=button', () => {
    render(
      <ChallengeEntityViewMenu
        title="Choose View"
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
