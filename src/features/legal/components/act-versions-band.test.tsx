import { render, screen, fireEvent, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { formatLegalDate } from '../lib/legal-format'
import {
  legalActDetailRichFixture,
  legalActDetailV2Fixture,
  legalActDetailV2LatestNotAvailableFixture,
} from '../mocks/fixtures/legal-act-detail'
import { ActVersionsBand } from './act-versions-band'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    search,
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
    readonly search?: Record<string, string>
  }) => (
    <a
      href={`${params?.actId ? to.replace('$actId', params.actId) : to}${
        search?.doc !== undefined ? `?doc=${search.doc}` : ''
      }`}
    >
      {children}
    </a>
  ),
}))

// The row starts open (owner, 26 November 2026, the act page's redesign): a
// click would close it, so the helper only checks that it is open.
const open = () => {
  expect(screen.getByRole('button', { name: /Versiunile textului/ })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
}

describe('ActVersionsBand', () => {
  it('links into the reader only for served renders', () => {
    render(<ActVersionsBand act={legalActDetailRichFixture} />)
    open()

    // The corp expression is served → a link to the text ON the act page
    // (one-page model, 2026-08-10), canonical → no ?doc.
    const readLinks = screen.getAllByRole('link', { name: /Citește această versiune/ })
    expect(readLinks).toHaveLength(1)
    expect(readLinks[0]).toHaveAttribute('href', '/legislation/acts/66150')
  })

  it('says the text is not yet available for consolidation placeholders, never implying a body', () => {
    render(<ActVersionsBand act={legalActDetailRichFixture} />)
    open()

    // The legacy consolidation row and the header stub: neither has a text.
    expect(screen.getAllByText('textul nu este încă disponibil')).toHaveLength(2)
    expect(screen.getByText('formă consolidată neoficială')).toBeInTheDocument()
    // The unofficial-consolidation caveat is part of the band.
    expect(screen.getByText(/reproduceri neoficiale/)).toBeInTheDocument()
  })

  it('marks the default (canonical) form', () => {
    render(<ActVersionsBand act={legalActDetailRichFixture} />)
    open()
    expect(screen.getByText(/forma afișată implicit/)).toBeInTheDocument()
  })

  describe('on legal_v2 forms', () => {
    it('links every readable form by its opaque f<id>, and the not-loaded one says so', () => {
      render(<ActVersionsBand act={legalActDetailV2Fixture} />)
      open()

      const readLinks = screen.getAllByRole('link', { name: /Citește această versiune/ })
      // The default consolidation (no ?doc=) and the original (?doc=f900011).
      expect(readLinks.map((link) => link.getAttribute('href'))).toEqual([
        '/legislation/acts/900001',
        '/legislation/acts/900001?doc=f900011',
      ])
      // The newer consolidation is listed, never linked.
      expect(screen.getAllByText('textul nu este încă disponibil')).toHaveLength(1)
    })

    it("quotes the Portal's own consolidation note on each consolidation row", () => {
      render(<ActVersionsBand act={legalActDetailV2Fixture} />)
      open()
      expect(screen.getAllByText(/Portalul Legislativ indică „consolidarea din/)).toHaveLength(2)
    })

    it('counts the newer versions whose text is not available (latest_not_available)', () => {
      render(<ActVersionsBand act={legalActDetailV2LatestNotAvailableFixture} />)
      open()
      expect(
        screen.getByText(
          'O versiune fără text disponibil, de la aceeași dată sau mai nouă decât cea mai recentă versiune cu text.',
        ),
      ).toBeInTheDocument()
      // The latest form with text is marked as shown by default, not current;
      // no row claims to be the current default.
      expect(screen.getByText('afișată implicit — nu este versiunea curentă')).toBeInTheDocument()
      expect(screen.queryByText('forma afișată implicit')).not.toBeInTheDocument()
    })

    it('marks a form whose Portal capture is held', () => {
      render(
        <ActVersionsBand
          act={{
            ...legalActDetailV2Fixture,
            documents: legalActDetailV2Fixture.documents.map((doc) =>
              doc.documentId === 'f900011' ? { ...doc, held: true } : doc,
            ),
          }}
        />,
      )
      open()
      expect(screen.getByText(/încă în\s+verificare/)).toBeInTheDocument()
    })
  })

  it('starts open, from the first render, and closing it drops the list', () => {
    render(<ActVersionsBand act={legalActDetailV2Fixture} />)
    const head = screen.getByRole('button', { name: /Versiunile textului/ })
    expect(head).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('link', { name: /Citește această versiune/ })).toHaveLength(2)

    fireEvent.click(head)
    expect(head).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: /Citește această versiune/ })).not.toBeInTheDocument()
  })

  it('dates each line by the date the version is named by: the Portal’s for a consolidation', () => {
    // A consolidation whose Portal note is older than its own ordering date:
    // the line shows the Portal's date, as the version selector names it, and
    // the lines stay newest first by that same date.
    render(
      <ActVersionsBand
        act={{
          ...legalActDetailV2Fixture,
          documents: legalActDetailV2Fixture.documents.map((doc) =>
            doc.documentId === 'f900012' ? { ...doc, portalLabelDate: '2023-11-17' } : doc,
          ),
        }}
      />,
    )
    const lines = within(screen.getByRole('region', { name: /Versiunile textului/ })).getAllByRole('listitem')
    expect(lines.map((line) => line.firstElementChild?.textContent)).toEqual([
      formatLegalDate('2023-11-17', 'en'),
      formatLegalDate('2020-01-15', 'en'),
      formatLegalDate('1996-04-03', 'en'),
    ])
    expect(screen.queryByText(formatLegalDate('2024-03-12', 'en'))).not.toBeInTheDocument()
  })

  it('sets each version as a line: the date at the left, the kind and its marks as plain text at the right', () => {
    render(<ActVersionsBand act={legalActDetailRichFixture} />)
    const mark = screen.getByText('forma afișată implicit')
    // A plain word in the muted colour, not a framed tag.
    expect(mark).toHaveClass('text-muted-foreground')
    expect(mark.className).not.toMatch(/rounded|border/)
    const line = mark.closest('li')
    expect(line).toHaveClass('grid')
    expect(line?.firstElementChild).toHaveClass('tabular-nums', 'text-muted-foreground')
  })

  describe('a long list (owner, 26 November 2026: the five newest, the rest on demand)', () => {
    const base = legalActDetailV2Fixture.documents[0]
    if (base === undefined) throw new Error('the legal_v2 fixture lost its versions')
    /** `count` consolidations, one a year from 2001, each readable. */
    const actWith = (count: number) => ({
      ...legalActDetailV2Fixture,
      documents: Array.from({ length: count }, (_, index) => ({
        ...base,
        documentId: `f${String(index + 1)}`,
        versionKind: 'consolidare',
        versionDate: `${String(2001 + index)}-03-01`,
        portalLabelDate: `${String(2001 + index)}-03-01`,
        isCanonical: index === count - 1,
      })),
    })
    const years = () => screen.getAllByRole('listitem').map((item) => /\b(20\d\d)\b/.exec(item.textContent ?? '')?.[1])

    it('shows the five newest and says how many there are in all; the control shows them all and back', () => {
      render(<ActVersionsBand act={actWith(21)} />)
      expect(years()).toEqual(['2021', '2020', '2019', '2018', '2017'])
      // the head still counts every version
      expect(screen.getByRole('button', { name: /Versiunile textului/ })).toHaveTextContent('21')
      const more = screen.getByRole('button', { name: 'Arată toate cele 21 de versiuni' })
      expect(more).toHaveAttribute('aria-expanded', 'false')
      // a control that opens more of the page is not blue
      expect(more.className).not.toContain('text-primary')
      fireEvent.click(more)
      expect(screen.getAllByRole('listitem')).toHaveLength(21)
      const fewer = screen.getByRole('button', { name: 'Arată mai puține' })
      expect(fewer).toHaveAttribute('aria-expanded', 'true')
      fireEvent.click(fewer)
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
    })

    it('shows a list a line or two longer whole, with no control', () => {
      render(<ActVersionsBand act={actWith(7)} />)
      expect(screen.getAllByRole('listitem')).toHaveLength(7)
      expect(screen.queryByRole('button', { name: /Arată toate/ })).not.toBeInTheDocument()
    })

    it('cuts from eight on', () => {
      render(<ActVersionsBand act={actWith(8)} />)
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
      expect(screen.getByRole('button', { name: 'Arată toate cele 8 versiuni' })).toBeInTheDocument()
    })
  })

  it('renders nothing when the act has no document expressions', () => {
    const { container } = render(
      <ActVersionsBand act={{ ...legalActDetailRichFixture, documents: [] }} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
