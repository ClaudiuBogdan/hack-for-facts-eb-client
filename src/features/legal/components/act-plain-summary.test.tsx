import { describe, expect, it } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { LegalActSummaryData } from '@/schemas/legal'
import { hasSummaryContent } from '../lib/act-facts'
import { ActPlainSummary } from './act-plain-summary'

const summaryOf = (
  overrides: Partial<LegalActSummaryData>,
): LegalActSummaryData => ({
  description: null,
  plainLanguageSummary: null,
  documentCategory: null,
  domains: [],
  affectedAudiences: [],
  keywords: [],
  keyDates: [],
  penaltiesMentioned: null,
  fiscalImpact: null,
  confidence: 0.98,
  ...overrides,
})

const renderCard = (
  overrides: Partial<LegalActSummaryData>,
  officialTextUrl: string | null = null,
) =>
  render(
    <ActPlainSummary
      summary={summaryOf(overrides)}
      officialTextUrl={officialTextUrl}
      qualifiers={<div data-testid="qualifier-row" />}
    />,
  )

const PLAIN = 'Această lege stabilește regulile pentru achiziții.'
const DESCRIPTION = 'Legea reglementează achizițiile publice.'

describe('ActPlainSummary content combinations', () => {
  it('renders both registers with the formal one first', () => {
    renderCard({ description: DESCRIPTION, plainLanguageSummary: PLAIN })
    const description = screen.getByText(DESCRIPTION)
    const plain = screen.getByText(PLAIN)
    expect(
      description.compareDocumentPosition(plain) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    // The plural disclosure covers both generated texts.
    expect(screen.getByText(/Descrierea și rezumatul sunt generate de AI/)).toBeInTheDocument()
  })

  it('renders description-only without clamp controls or separator', () => {
    const { container } = renderCard({ description: DESCRIPTION })
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    // No dangling hairline under the description when nothing follows it —
    // the only borders are the card's own footer-row separators.
    expect(container.querySelector('.border-b')).toBeNull()
    // The qualifiers still attach: the card exists, so warnings ride it.
    expect(screen.getByTestId('qualifier-row')).toBeInTheDocument()
  })

  it('renders plain-only with the eyebrow over the summary', () => {
    renderCard({ plainLanguageSummary: PLAIN })
    expect(screen.getByText(PLAIN)).toBeInTheDocument()
    expect(screen.getByText('Pe scurt')).toBeInTheDocument()
    expect(screen.getByText(/Rezumat generat de AI/)).toBeInTheDocument()
  })

  it('renders nothing when both texts are blank strings', () => {
    const { container } = renderCard({
      description: '   ',
      plainLanguageSummary: '',
    })
    expect(container.firstChild).toBeNull()
  })

  it('shows a description identical to the summary exactly once', () => {
    renderCard({ description: PLAIN, plainLanguageSummary: PLAIN })
    expect(screen.getAllByText(PLAIN)).toHaveLength(1)
    // One register on screen — the singular disclosure applies.
    expect(screen.getByText(/Rezumat generat de AI/)).toBeInTheDocument()
  })

  it('never shows the confidence figure', () => {
    renderCard({ description: DESCRIPTION, plainLanguageSummary: PLAIN })
    expect(screen.queryByText(/Încredere/)).not.toBeInTheDocument()
  })

  it('links the official text from the footer when a URL exists', () => {
    renderCard(
      { plainLanguageSummary: PLAIN },
      'https://legislatie.just.ro/Public/DetaliiDocument/178667',
    )
    expect(
      screen.getByRole('link', { name: /Textul oficial/ }).getAttribute('href'),
    ).toContain('legislatie.just.ro')
  })

  it('omits the official link without a URL', () => {
    renderCard({ plainLanguageSummary: PLAIN }, null)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('hasSummaryContent', () => {
  it('matches the card exactly, blank strings included', () => {
    expect(hasSummaryContent(summaryOf({}))).toBe(false)
    expect(hasSummaryContent(summaryOf({ description: ' ' }))).toBe(false)
    expect(hasSummaryContent(summaryOf({ description: DESCRIPTION }))).toBe(true)
    expect(hasSummaryContent(summaryOf({ plainLanguageSummary: PLAIN }))).toBe(true)
  })
})
