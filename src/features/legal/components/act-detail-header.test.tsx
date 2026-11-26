import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import {
  legalActDetailFixture,
  legalActDetailV2Fixture,
  legalActDetailV2UnbridgedFixture,
} from '../mocks/fixtures/legal-act-detail'
import { ActDetailHeader } from './act-detail-header'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

describe('ActDetailHeader — the legal_v2 bridge line', () => {
  it('says once, quietly, that status, links and summary come from the previous corpus', () => {
    render(<ActDetailHeader act={legalActDetailV2Fixture} />)
    expect(
      screen.getByText('Starea, legăturile și rezumatul provin din corpusul anterior.'),
    ).toBeInTheDocument()
    // on the act's own page the status is a size up and in full contrast
    expect(screen.getByText('În vigoare')).toHaveClass('text-base', 'font-semibold', 'text-foreground')
  })

  it('shows no status badge for an act the previous corpus does not hold, and says why', () => {
    render(<ActDetailHeader act={legalActDetailV2UnbridgedFixture} />)
    expect(screen.queryByText('Necunoscut')).not.toBeInTheDocument()
    expect(screen.queryByText('În vigoare')).not.toBeInTheDocument()
    expect(screen.getByText(/corpusul anterior nu îl conține/)).toBeInTheDocument()
  })

  it('says nothing about a bridge on the legacy source', () => {
    render(<ActDetailHeader act={legalActDetailFixture} />)
    expect(screen.queryByText(/corpusul anterior/)).not.toBeInTheDocument()
  })
})

describe('ActDetailHeader — the act\'s facts, each under its name', () => {
  const act = {
    ...legalActDetailFixture,
    displayCitation: 'Legea nr. 98/2016',
    actType: 'lege',
    issuerSlug: 'parlamentul',
    entryIntoForce: '2016-05-26',
    aliases: ['legea achizițiilor publice'],
    canonical:
      legalActDetailFixture.canonical === null
        ? null
        : { ...legalActDetailFixture.canonical, den: 'LEGE nr. 98 din 19 mai 2016' },
  }

  const fact = (name: string): string | null => {
    const term = screen.getByText(name, { selector: 'dt' })
    return term.nextElementSibling?.textContent ?? null
  }

  it('names the kind, the issuer and the date it applies from', () => {
    render(<ActDetailHeader act={act} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Legea nr. 98/2016')
    expect(fact('Tip')).toBe('Lege')
    expect(fact('Emitent')).toBe('Parlamentul României')
    // The date in the reader's language (the tests run in English).
    expect(fact('În vigoare din')).toMatch(/26.*2016/)
  })

  it('leaves out a fact the act does not have, name and all', () => {
    render(<ActDetailHeader act={{ ...act, issuerSlug: null, entryIntoForce: null }} />)
    expect(screen.queryByText('Emitent', { selector: 'dt' })).not.toBeInTheDocument()
    expect(screen.queryByText('În vigoare din', { selector: 'dt' })).not.toBeInTheDocument()
    expect(fact('Tip')).toBe('Lege')
  })

  it('shows the subject lifted from the text under the citation, and the formal name as small print', () => {
    render(<ActDetailHeader act={act} textSubject="privind achizițiile publice" />)
    expect(screen.getByText('privind achizițiile publice')).toBeInTheDocument()
    // The formal name stays its own line: it is no longer joined to the subject.
    expect(screen.getByText('LEGE nr. 98 din 19 mai 2016')).toBeInTheDocument()
    expect(screen.getByText('cunoscut și ca legea achizițiilor publice')).toBeInTheDocument()
  })

  it('does not repeat a formal name that says no more than the citation', () => {
    const same = { ...act, canonical: act.canonical === null ? null : { ...act.canonical, den: 'Legea nr. 98/2016' } }
    render(<ActDetailHeader act={same} />)
    expect(screen.getAllByText('Legea nr. 98/2016')).toHaveLength(1)
  })
})
