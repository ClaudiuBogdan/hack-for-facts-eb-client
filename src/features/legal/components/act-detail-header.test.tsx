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

  /** A fact's value: the `dd` paired with the `dt` of that name, inside one group of the list. */
  const fact = (name: string): string | null => {
    const term = screen.getByText(name, { selector: 'dt' })
    const value = term.nextElementSibling
    expect(value?.tagName).toBe('DD')
    expect(term.parentElement?.parentElement?.tagName).toBe('DL')
    expect(term.parentElement?.children).toHaveLength(2)
    return value?.textContent ?? null
  }

  it('names the kind, the issuer and the date it applies from', () => {
    render(<ActDetailHeader act={act} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Legea nr. 98/2016')
    expect(fact('Tip')).toBe('Lege')
    expect(fact('Emitent')).toBe('Parlamentul României')
    // The date in the reader's language (the tests run in English).
    expect(fact('În vigoare din')).toBe('May 26, 2016')
    // The fixture's one sure publication: issue 5, part I, of 7 January 2020. The citation's own words stay Romanian.
    expect(fact('Publicat în')).toBe('Monitorul Oficial nr. 5 (Partea I) din January 7, 2020')
  })

  it('names no publication when the act is not tied to one issue for sure', () => {
    render(<ActDetailHeader act={{ ...act, gazettePublications: [] }} />)
    expect(screen.queryByText('Publicat în', { selector: 'dt' })).not.toBeInTheDocument()
    expect(fact('Tip')).toBe('Lege')
  })

  it('shows no name over nothing: an act without a type has no „Tip", and no facts means no band', () => {
    const { container } = render(<ActDetailHeader act={{ ...act, actType: '', issuerSlug: null, entryIntoForce: null, gazettePublications: [] }} />)
    expect(screen.queryByText('Tip', { selector: 'dt' })).not.toBeInTheDocument()
    expect(container.querySelector('dl')).toBeNull()
    // with one fact left the band is back, without „Tip"
    const withIssuer = render(<ActDetailHeader act={{ ...act, actType: '', entryIntoForce: null, gazettePublications: [] }} />)
    expect(withIssuer.container.querySelectorAll('dl dt')).toHaveLength(1)
    expect(withIssuer.container.querySelector('dl dt')?.textContent).toBe('Emitent')
  })

  it('lets a long issuer wrap on a row of its own and keeps the publication a readable width', () => {
    const { container } = render(<ActDetailHeader act={act} />)
    const list = container.querySelector('dl')
    expect(list?.className).toContain('sm:flex')
    expect(list?.className).toContain('sm:flex-wrap')
    // no fixed column that a long value could squeeze to nothing
    expect(list?.className).not.toContain('sm:grid-cols-')
    const groups = [...(list?.children ?? [])]
    expect(groups.every((group) => group.className.includes('min-w-0'))).toBe(true)
    const publication = screen.getByText('Publicat în', { selector: 'dt' }).parentElement
    expect(publication?.className).toContain('sm:flex-1')
    expect(publication?.className).toContain('sm:min-w-[min(100%,14rem)]')
    // on a phone it still takes a row of its own
    expect(publication?.className).toContain('col-span-2')
  })

  it('leaves out a fact the act does not have, name and all', () => {
    render(<ActDetailHeader act={{ ...act, issuerSlug: null, entryIntoForce: null }} />)
    expect(screen.queryByText('Emitent', { selector: 'dt' })).not.toBeInTheDocument()
    expect(screen.queryByText('În vigoare din', { selector: 'dt' })).not.toBeInTheDocument()
    expect(fact('Tip')).toBe('Lege')
  })

  it('shows the subject lifted from the text under the citation, and the formal name as small print', () => {
    const { container } = render(<ActDetailHeader act={act} textSubject="privind achizițiile publice" />)
    const subject = screen.getByText('privind achizițiile publice')
    // right under the title, before the facts
    expect(screen.getByRole('heading', { level: 1 }).nextElementSibling).toBe(subject)
    expect(subject.compareDocumentPosition(container.querySelector('dl') as Element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // The formal name stays its own line: it is no longer joined to the subject.
    expect(screen.getByText('LEGE nr. 98 din 19 mai 2016')).toBeInTheDocument()
    expect(screen.getByText('cunoscut și ca legea achizițiilor publice')).toBeInTheDocument()
  })

  it('does not repeat a formal name that says no more than the citation', () => {
    const same = { ...act, canonical: act.canonical === null ? null : { ...act.canonical, den: 'Legea nr. 98/2016' } }
    render(<ActDetailHeader act={same} />)
    expect(screen.getAllByText('Legea nr. 98/2016')).toHaveLength(1)
  })

  it('repeats neither the name nor the subject when the citation already is both', () => {
    // An act without a number is cited by its formal name and subject together.
    const whole = {
      ...act,
      displayCitation: 'REGULAMENT privind achizițiile publice',
      canonical: act.canonical === null ? null : { ...act.canonical, den: 'REGULAMENT' },
    }
    const { container } = render(<ActDetailHeader act={whole} textSubject="privind achizițiile publice" />)
    const header = container.querySelector('header')?.textContent ?? ''
    expect(header.split('privind achizițiile publice')).toHaveLength(2)
    expect(header.split('REGULAMENT')).toHaveLength(2)
    // before the subject is known, the formal name alone still says less than the citation: it shows
    const early = render(<ActDetailHeader act={whole} />)
    expect((early.container.querySelector('header')?.textContent ?? '').split('REGULAMENT')).toHaveLength(3)
  })
})
