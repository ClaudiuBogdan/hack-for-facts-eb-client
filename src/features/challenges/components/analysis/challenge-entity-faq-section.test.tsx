import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parseChallengeEntityFaqContent } from './challenge-entity-faq-content'
import { ChallengeEntityFaqSection } from './challenge-entity-faq-section'

describe('ChallengeEntityFaqSection', () => {
  it('renders the romanian faq content', () => {
    render(<ChallengeEntityFaqSection locale="ro" inflationAdjusted={false} />)

    expect(screen.getByText('Întrebări frecvente')).toBeInTheDocument()
    expect(
      screen.getByText(/sursa datelor și cum ar trebui citite cifrele/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'De unde vin datele din această pagină?',
      }),
    ).toBeInTheDocument()
  })

  it('renders the english faq content', () => {
    render(<ChallengeEntityFaqSection locale="en" inflationAdjusted={false} />)

    expect(screen.getByText('Frequently asked questions')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Where does the data on this page come from?',
      }),
    ).toBeInTheDocument()
  })

  it('starts collapsed and expands an answer on click', () => {
    render(<ChallengeEntityFaqSection locale="en" inflationAdjusted={false} />)

    expect(
      screen.queryByText(/budget execution reports published through/i),
    ).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Where does the data on this page come from?',
      }),
    )

    expect(
      screen.getByText(/budget execution reports published through/i),
    ).toBeInTheDocument()
  })

  it('renders multiple answer paragraphs when expanded', () => {
    render(<ChallengeEntityFaqSection locale="ro" inflationAdjusted={false} />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Care este diferența dintre execuția agregată și execuția detaliată?',
      }),
    )

    expect(
      screen.getByText(/arată separat ce a raportat fiecare instituție/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/adună la un loc primăria și instituțiile subordonate/i),
    ).toBeInTheDocument()
  })

  it('hides the inflation faq item when inflation adjustment is disabled', () => {
    render(<ChallengeEntityFaqSection locale="ro" inflationAdjusted={false} />)

    expect(
      screen.queryByRole('button', {
        name: 'Ce înseamnă valorile ajustate cu inflația?',
      }),
    ).not.toBeInTheDocument()
  })

  it('shows the inflation faq item when inflation adjustment is enabled', () => {
    render(<ChallengeEntityFaqSection locale="ro" inflationAdjusted />)

    expect(
      screen.getByRole('button', {
        name: 'Ce înseamnă valorile ajustate cu inflația?',
      }),
    ).toBeInTheDocument()
  })

  it('falls back safely when faq content is malformed', () => {
    const fallbackContent = parseChallengeEntityFaqContent(
      { ro: { title: 'Broken' } },
      'en',
      { inflationAdjusted: false },
    )

    expect(fallbackContent.title).toBe('Frequently asked questions')
    expect(fallbackContent.items).toEqual([])
  })
})
