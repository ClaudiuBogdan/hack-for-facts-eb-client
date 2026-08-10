import { render, screen, fireEvent } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { legalActDetailRichFixture } from '../mocks/fixtures/legal-act-detail'
import { ActAnchorsBand } from './act-anchors-band'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
  }) => (
    <a href={params?.actId ? to.replace('$actId', params.actId) : to}>{children}</a>
  ),
}))

describe('ActAnchorsBand', () => {
  const group = legalActDetailRichFixture.incomingAnchors

  it('names its provenance and shows the citing page wording', () => {
    render(<ActAnchorsBand group={group} />)
    fireEvent.click(screen.getByRole('button', { name: /Trimiteri afirmate de portal/ }))

    // The anchor's own words, quoted — source assertion, not inference.
    expect(screen.getByText('art. 291 alin. (3) din Codul fiscal')).toBeInTheDocument()
    expect(screen.getByText(/țintește art. 291/)).toBeInTheDocument()
    // The provenance footnote separates this graph from the inferred one.
    expect(screen.getByText(/nu deduceri\s+automate/)).toBeInTheDocument()
  })

  it('shows the real total against the shown rows', () => {
    render(<ActAnchorsBand group={group} />)
    fireEvent.click(screen.getByRole('button', { name: /Trimiteri afirmate de portal/ }))
    // 2 shown of 395 — the REAL count, unlike the citation connection.
    expect(screen.getByText(/Se afișează 2 din 395/)).toBeInTheDocument()
  })

  it('renders an act-less source as a plain document row, never a dead link', () => {
    render(<ActAnchorsBand group={group} />)
    fireEvent.click(screen.getByRole('button', { name: /Trimiteri afirmate de portal/ }))
    expect(screen.getByText(/document 254102 — fără fișă de act la noi/)).toBeInTheDocument()
  })

  it('renders nothing for an empty group', () => {
    const { container } = render(<ActAnchorsBand group={{ totalCount: 0, items: [] }} />)
    expect(container.firstChild).toBeNull()
  })
})
