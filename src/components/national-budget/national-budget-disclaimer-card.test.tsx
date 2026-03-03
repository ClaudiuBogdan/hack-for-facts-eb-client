import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'

import { NationalBudgetDisclaimerCard } from './national-budget-disclaimer-card'

vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('NationalBudgetDisclaimerCard', () => {
  it('renders disclaimer content and source link', () => {
    render(<NationalBudgetDisclaimerCard />)

    expect(screen.getByText('Data is informational, not official consolidated publication.')).toBeInTheDocument()
    expect(screen.getByText('Discrepancies may exist.')).toBeInTheDocument()
    expect(screen.getByText('Source data uses only budget execution datasets (execuții bugetare).')).toBeInTheDocument()
    expect(screen.getByText('Data is not consolidated and does not include the full national budget coverage (for example Eximbank and other BGC components).')).toBeInTheDocument()
    expect(screen.getByText('Total buget is a merged informational treemap of available sections, not an official consolidated total.')).toBeInTheDocument()

    const sourceLink = screen.getByRole('link', { name: 'Ministerul Finanțelor' })
    expect(sourceLink).toHaveAttribute('href', 'https://mfinante.gov.ro/transparenta-bugetara')

    const executionReferenceLink = screen.getByRole('link', { name: /Informații execuție bugetară|Budget execution information/i })
    expect(executionReferenceLink).toHaveAttribute('href', 'https://mfinante.gov.ro/domenii/bugetul-de-stat/informatii-executie-bugetara')
  })

  it('renders read more link when href is provided', () => {
    render(<NationalBudgetDisclaimerCard readMoreHref="#budget-explanations" />)

    const readMore = screen.getByRole('link', { name: 'Read more' })
    expect(readMore).toHaveAttribute('href', '#budget-explanations')
  })

  it('renders close button and triggers close handler', () => {
    const onClose = vi.fn()
    render(<NationalBudgetDisclaimerCard onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss disclaimer' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
