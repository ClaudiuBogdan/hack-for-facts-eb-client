import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import type { LegalActSummaryData } from '@/schemas/legal'
import { legalActDetailRichFixture } from '../mocks/fixtures/legal-act-detail'
import { ActRelevanceBand } from './act-relevance-band'

const summary = legalActDetailRichFixture.summary as LegalActSummaryData

describe('ActRelevanceBand', () => {
  it('starts closed, with the audiences readable in its head', () => {
    render(<ActRelevanceBand summary={summary} />)
    const head = screen.getByRole('button', { name: /Pe cine privește/ })
    expect(head).toHaveAttribute('aria-expanded', 'false')
    expect(head).toHaveTextContent('cetățeni · firme')
    expect(screen.queryByRole('heading', { level: 4 })).not.toBeInTheDocument()
  })

  it('sets each taxonomy as a line of plain text under its own h4, never a chip', () => {
    render(<ActRelevanceBand summary={summary} />)
    fireEvent.click(screen.getByRole('button', { name: /Pe cine privește/ }))

    const audiences = screen.getByRole('heading', { level: 4, name: 'Te privește dacă ești' })
    const domains = screen.getByRole('heading', { level: 4, name: 'Domenii' })
    // The label at the left, the values at the right, one value per item.
    const audienceLine = audiences.parentElement as HTMLElement
    expect(audienceLine).toHaveClass('grid')
    expect(within(audienceLine).getAllByRole('listitem')).toHaveLength(summary.affectedAudiences.length)
    expect(within(domains.parentElement as HTMLElement).getAllByRole('listitem')).toHaveLength(summary.domains.length)

    const region = screen.getByRole('region', { name: /Pe cine privește/ })
    expect(region.innerHTML).not.toMatch(/pnrr|rounded|uppercase|style="/)

    expect(screen.getByText('Actul prevede sancțiuni.')).toBeInTheDocument()
    expect(screen.getByText('Cuvinte-cheie')).toBeInTheDocument()
    // The footnote still says the categories are a model's, not a legal classification.
    expect(screen.getByText(/atribuite automat/)).toBeInTheDocument()
  })

  it('opens the fiscal impact with a control that is not a link', () => {
    render(<ActRelevanceBand summary={summary} />)
    fireEvent.click(screen.getByRole('button', { name: /Pe cine privește/ }))

    const more = screen.getByRole('button', { name: 'Vezi impactul fiscal' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).not.toHaveClass('text-primary')
    fireEvent.click(more)
    expect(screen.getByRole('button', { name: 'Ascunde impactul fiscal' })).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('act-fiscal-impact')).toHaveTextContent(/codificarea integrală/)
  })
})
