import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { BudgetChallengeTermsPage } from './bugete-locale-2026.termeni-si-conditii.lazy'

describe('BudgetChallengeTermsPage', () => {
  it('renders the challenge-specific legal text and contact details', () => {
    render(<BudgetChallengeTermsPage />)

    expect(
      screen.getByRole('heading', { name: /Termeni și condiții/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /1\. Organizatorul/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /12\. Legea aplicabilă/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /weare@funky\.ong/i })).toHaveAttribute(
      'href',
      'mailto:weare@funky.ong',
    )
  })
})
