import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeEntityYearMenu } from './challenge-entity-year-menu'

const years = [2025, 2024, 2023, 2022]

describe('ChallengeEntityYearMenu', () => {
  it('renders the title and all year options', () => {
    render(
      <ChallengeEntityYearMenu
        title="Alege Anul"
        years={years}
        selectedYear={2025}
        onYearChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('challenge-entity-year-menu')).toBeInTheDocument()
    expect(screen.getByText('Alege Anul')).toBeInTheDocument()

    for (const year of years) {
      expect(screen.getByRole('button', { name: String(year) })).toBeInTheDocument()
    }
  })

  it('marks the selected year with aria-pressed=true', () => {
    render(
      <ChallengeEntityYearMenu
        title="Alege Anul"
        years={years}
        selectedYear={2024}
        onYearChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: '2024' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: '2025' }),
    ).toHaveAttribute('aria-pressed', 'false')
    expect(
      screen.getByRole('button', { name: '2023' }),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onYearChange with the selected year', () => {
    const onYearChange = vi.fn()

    render(
      <ChallengeEntityYearMenu
        title="Alege Anul"
        years={years}
        selectedYear={2025}
        onYearChange={onYearChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '2023' }))

    expect(onYearChange).toHaveBeenCalledWith(2023)
  })

  it('renders all buttons as type=button', () => {
    render(
      <ChallengeEntityYearMenu
        title="Choose Year"
        years={years}
        selectedYear={2025}
        onYearChange={vi.fn()}
      />,
    )

    const buttons = screen.getAllByRole('button')
    for (const button of buttons) {
      expect(button).toHaveAttribute('type', 'button')
    }
  })
})
