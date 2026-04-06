import { render, screen } from '@/test/test-utils'
import { describe, expect, it } from 'vitest'
import { BudgetChallengeTermsPage } from './provocare_.termeni-si-conditii.lazy'

describe('BudgetChallengeTermsPage', () => {
  it('renders the challenge-specific legal text and contact details', () => {
    render(<BudgetChallengeTermsPage />)

    expect(
      screen.getByRole('heading', { name: /Termeni și condiții/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /1\. Informații generale/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /12\. Legea aplicabilă/i })).toBeInTheDocument()
    const emailLinks = screen.getAllByRole('link', { name: /weare@funky\.ong/i })
    expect(emailLinks.length).toBeGreaterThanOrEqual(1)
    expect(emailLinks[0]).toHaveAttribute('href', 'mailto:weare@funky.ong')
  })
})
