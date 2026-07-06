import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AiSummaryCard } from './ai-summary-card'

const DISCLAIMER =
  'Acest rezumat a fost generat automat de un model AI și poate conține erori.'

describe('AiSummaryCard', () => {
  it('renders the disclaimer verbatim + a provenance line with model and date', () => {
    render(
      <AiSummaryCard
        disclaimer={DISCLAIMER}
        model="glm-5.2"
        summary="Proiectul aprobă bugetul de stat pe 2026."
        loadedAt="2026-05-22T09:00:00+03:00"
        topic="Buget"
        domains={['Finanțe publice']}
        keywords={['buget']}
      />,
    )
    // Disclaimer must appear exactly as provided (never reworded).
    expect(screen.getByText(DISCLAIMER)).toBeInTheDocument()
    expect(screen.getByText('Rezumat generat de AI')).toBeInTheDocument()
    expect(
      screen.getByText('Proiectul aprobă bugetul de stat pe 2026.'),
    ).toBeInTheDocument()
    // Provenance: model + formatted loadedAt date.
    expect(screen.getByText(/model glm-5\.2/)).toBeInTheDocument()
    expect(screen.getByText(/22 mai 2026/)).toBeInTheDocument()
    // Chips.
    expect(screen.getByText('Finanțe publice')).toBeInTheDocument()
    expect(screen.getByText('buget')).toBeInTheDocument()
  })

  it('omits the date from the provenance line when loadedAt is absent', () => {
    render(<AiSummaryCard disclaimer={DISCLAIMER} model="glm-5.2" />)
    const provenance = screen.getByText(/model glm-5\.2/)
    expect(provenance.textContent).toBe('model glm-5.2')
  })
})
