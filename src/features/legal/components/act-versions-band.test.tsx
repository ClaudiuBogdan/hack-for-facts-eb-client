import { render, screen, fireEvent } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
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

const open = () => {
  fireEvent.click(screen.getByRole('button', { name: /Versiunile textului/ }))
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
      expect(screen.getByText(/mai listează o versiune mai nouă/)).toBeInTheDocument()
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

  it('renders nothing when the act has no document expressions', () => {
    const { container } = render(
      <ActVersionsBand act={{ ...legalActDetailRichFixture, documents: [] }} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
