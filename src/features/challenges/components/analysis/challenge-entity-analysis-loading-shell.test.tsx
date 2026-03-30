import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChallengeEntityAnalysisLoadingShell } from './challenge-entity-analysis-loading-shell'

describe('ChallengeEntityAnalysisLoadingShell', () => {
  it('renders the loading status region', () => {
    render(<ChallengeEntityAnalysisLoadingShell />)

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the status container', () => {
    render(<ChallengeEntityAnalysisLoadingShell />)

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/Loading/i),
    )
  })
})
