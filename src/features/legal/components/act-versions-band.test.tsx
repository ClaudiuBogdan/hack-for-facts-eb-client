import { render, screen, fireEvent } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { legalActDetailRichFixture } from '../mocks/fixtures/legal-act-detail'
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

  it('says text indisponibil for consolidation placeholders, never implying a body', () => {
    render(<ActVersionsBand act={legalActDetailRichFixture} />)
    open()

    expect(
      screen.getByText(/reper de consolidare, fără corp de text/),
    ).toBeInTheDocument()
    // The unofficial-consolidation caveat is part of the band.
    expect(screen.getByText(/reproduceri neoficiale/)).toBeInTheDocument()
  })

  it('marks the displayed (canonical) form', () => {
    render(<ActVersionsBand act={legalActDetailRichFixture} />)
    open()
    expect(screen.getByText(/forma afișată/)).toBeInTheDocument()
  })

  it('renders nothing when the act has no document expressions', () => {
    const { container } = render(
      <ActVersionsBand act={{ ...legalActDetailRichFixture, documents: [] }} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
