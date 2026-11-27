import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'
import { formatLegalDate } from '../lib/legal-format'
import { legalActDetailFixture } from '../mocks/fixtures/legal-act-detail'
import { ActPublicationBand } from './act-publication-band'

const publication = legalActDetailFixture.gazettePublications[0]

describe('ActPublicationBand', () => {
  it('starts open, from the first render, and closing it drops its body', () => {
    render(<ActPublicationBand act={legalActDetailFixture} />)
    const head = screen.getByRole('button', { name: /Unde a fost publicat/ })
    expect(head).toHaveAttribute('aria-expanded', 'true')
    expect(head).toHaveTextContent('1 publicare')
    expect(screen.getByRole('link', { name: /PDF oficial/ })).toBeInTheDocument()

    fireEvent.click(head)
    expect(head).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: /PDF oficial/ })).not.toBeInTheDocument()
  })

  it('sets a publication as a line: its date at the left, the issue and the official PDF at the right', () => {
    render(<ActPublicationBand act={legalActDetailFixture} />)
    const pdf = screen.getByRole('link', { name: /PDF oficial/ })
    // It leaves the site: a new tab, no opener, and the external-link mark.
    expect(pdf).toHaveAttribute('href', publication?.pdfUrl)
    expect(pdf).toHaveAttribute('target', '_blank')
    expect(pdf).toHaveAttribute('rel', 'noopener noreferrer')
    expect(pdf.querySelectorAll('svg')).toHaveLength(2)
    expect(pdf).toHaveClass('text-primary')

    const line = pdf.closest('li')
    expect(line).toHaveClass('grid')
    expect(line?.firstElementChild).toHaveTextContent(formatLegalDate('2020-01-07', 'en'))
    expect(line?.firstElementChild).toHaveClass('tabular-nums', 'text-muted-foreground')
  })

  it('keeps the date cell when the issue has no date, and says a probable match is probable', () => {
    render(
      <ActPublicationBand
        act={{
          ...legalActDetailFixture,
          gazettePublications: [
            { moIssueId: null, partCode: null, issueNumber: 12, issueYear: 2001, issueDate: null, pdfUrl: null, resolution: 'cluster', matchedVia: null },
          ],
        }}
      />,
    )
    const coordinates = screen.getByText('doar coordonate de publicare')
    const line = coordinates.closest('li')
    expect(line?.children).toHaveLength(2)
    expect(line?.firstElementChild).toBeEmptyDOMElement()
    expect(screen.getByText('potrivire probabilă cu acest număr')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders nothing without a publication', () => {
    const { container } = render(<ActPublicationBand act={{ ...legalActDetailFixture, gazettePublications: [] }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
