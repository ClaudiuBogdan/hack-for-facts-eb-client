import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@/test/test-utils'
import { legalActDetailRichFixture } from '../mocks/fixtures/legal-act-detail'
import { ActReferencesBand } from './act-references-band'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    className,
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
    readonly className?: string
  }) => (
    <a href={params?.actId ? to.replace('$actId', params.actId) : to} className={className}>
      {children}
    </a>
  ),
}))

describe('ActReferencesBand', () => {
  it('starts closed, with its count beside its title', () => {
    render(<ActReferencesBand group={legalActDetailRichFixture.outLinks} direction="out" />)
    const head = screen.getByRole('button', { name: /Ce face acest act/ })
    expect(head).toHaveAttribute('aria-expanded', 'false')
    expect(head).toHaveTextContent('26 de trimiteri')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('sets each reference as a line: the relation at the left, the act or the cited text at the right', () => {
    render(<ActReferencesBand group={legalActDetailRichFixture.outLinks} direction="out" />)
    fireEvent.click(screen.getByRole('button', { name: /Ce face acest act/ }))

    // Only a unique match is a link, blue, with the act's status as a mark.
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '/legislation/acts/29384')
    expect(links[0]).toHaveClass('text-primary')
    const firm = links[0]?.closest('li')
    expect(firm).toHaveClass('grid')
    expect(firm?.firstElementChild).toHaveTextContent('modifică')
    expect(firm?.firstElementChild).toHaveClass('text-muted-foreground')
    expect(firm).toHaveTextContent('Abrogat parțial')

    // An unresolved or external one stays cited text, with what it is said plainly.
    expect(screen.getByText('Legea nr. 571/2003 privind Codul fiscal').closest('a')).toBeNull()
    expect(screen.getByText('potrivire posibilă — nu am identificat actul exact')).toBeInTheDocument()
    expect(screen.getByText('act din afara corpusului — fără pagină la noi')).toBeInTheDocument()
  })

  it('keeps its cut honest: says how many of the total are shown', () => {
    render(<ActReferencesBand group={legalActDetailRichFixture.inLinks} direction="in" />)
    fireEvent.click(screen.getByRole('button', { name: /Cine îl citează/ }))
    expect(screen.getByText(/Se afișează 1 din 2[.,]621/)).toBeInTheDocument()
    // and promises no list from the retired act directory (Codex review, 27 November 2026)
    expect(screen.queryByText(/directorul de acte/)).toBeNull()
    // A cluster match is not a firm link.
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
