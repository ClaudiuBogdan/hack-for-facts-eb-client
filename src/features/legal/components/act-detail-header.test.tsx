import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import {
  legalActDetailFixture,
  legalActDetailV2Fixture,
  legalActDetailV2UnbridgedFixture,
} from '../mocks/fixtures/legal-act-detail'
import { LEGAL_UNOFFICIAL_CONSOLIDATION_CAVEAT } from '@/schemas/legal'
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
    // a fact read at its sources holds its value on a line of its own, the links under it
    return (value?.querySelector(':scope > span.block') ?? value)?.textContent ?? null
  }

  /** The links out under a fact, by name and address. */
  const sourcesOf = (name: string): readonly (readonly [string, string | null])[] =>
    [...(screen.getByText(name, { selector: 'dt' }).nextElementSibling?.querySelectorAll('a') ?? [])].map((link) => [
      link.textContent,
      link.getAttribute('href'),
    ])

  it('links the publication to the Portal’s page of the act as published and to the gazette issue, in a new tab', () => {
    render(<ActDetailHeader act={act} />)
    // the legacy source: the canonical is the original, its Portal page is the act's
    expect(sourcesOf('Publicat în')).toEqual([
      ['Portalul legislativ', 'https://legislatie.just.ro/Public/DetaliiDocument/222901'],
      ['Monitorul Oficial', 'https://monitoruloficial.ro/Monitorul-Oficial--PI--5--2020.html'],
    ])
    for (const link of screen.getByText('Publicat în', { selector: 'dt' }).nextElementSibling?.querySelectorAll('a') ?? []) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    // the other facts link nowhere
    expect(sourcesOf('Tip')).toEqual([])
  })

  describe('on legal_v2, the Portal’s page of the text the cited issue printed', () => {
    const v2 = legalActDetailV2Fixture
    const [original, consolidation] = v2.documents
    if (original === undefined || consolidation === undefined) throw new Error('the legal_v2 fixture lost its forms')
    // The issue that printed the original form (nr. 67 of 3 April 1996, as the fixture's masthead says), tied for sure.
    const issue = { moIssueId: 'mo-1996-67', partCode: 'PI', issueNumber: 67, issueYear: 1996, issueDate: '1996-04-03', pdfUrl: 'https://monitoruloficial.ro/Monitorul-Oficial--PI--67--1996.html', resolution: 'unique', matchedVia: 'act_year' }
    const withIssue = (overrides: Partial<typeof v2> = {}, published: Partial<typeof issue> = {}) => ({ ...v2, gazettePublications: [{ ...issue, ...published }], ...overrides })
    const links = (container: HTMLElement) => [...container.querySelectorAll('dl a')].map((link) => [link.textContent, link.getAttribute('href')])

    it('links the original form’s own page, never the default consolidation’s', () => {
      const { container } = render(<ActDetailHeader act={withIssue()} />)
      expect(v2.officialTextUrl).toBe(consolidation.sourceUrl)
      expect(links(container)).toEqual([
        ['Portalul legislativ', original.sourceUrl],
        ['Monitorul Oficial', issue.pdfUrl],
      ])
    })

    it('links no Portal page the cited issue did not print: another day, a page among several, a consolidation, or none', () => {
      const gazetteOnly = [['Monitorul Oficial', issue.pdfUrl]]
      // the cited issue is a later one (a republication): the 1996 original is not what it printed
      expect(links(render(<ActDetailHeader act={withIssue({}, { issueDate: '2024-05-02' })} />).container)).toEqual(gazetteOnly)
      // two originals that day with different pages: none is chosen
      const twin = { ...original, documentId: 'f900019', sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900019' }
      expect(links(render(<ActDetailHeader act={withIssue({ documents: [original, twin, consolidation] })} />).container)).toEqual(gazetteOnly)
      // the same page named twice is one page
      expect(links(render(<ActDetailHeader act={withIssue({ documents: [original, { ...twin, sourceUrl: original.sourceUrl }, consolidation] })} />).container)[0]).toEqual(['Portalul legislativ', original.sourceUrl])
      // a form marked as a consolidation is not the text as published, whatever its kind says
      const caveated = { ...original, caveat: LEGAL_UNOFFICIAL_CONSOLIDATION_CAVEAT }
      expect(links(render(<ActDetailHeader act={withIssue({ documents: [caveated, consolidation] })} />).container)).toEqual(gazetteOnly)
      // an original with no page bound (several Portal pages claim it): on legal_v2 nothing stands in for it, not
      // even the act's page while the canonical is that same original (Codex review, round 2)
      const unbound = { ...original, isCanonical: true, sourceUrl: null }
      const canonicalOriginal = v2.canonical === null ? null : { ...v2.canonical, documentId: original.documentId, versionKind: 'original', caveat: null, firstPublicationDate: original.firstPublicationDate, versionDate: original.versionDate, sourceUrl: null }
      const fallbackBait = withIssue({ documents: [unbound, consolidation], canonical: canonicalOriginal, officialTextUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900099' })
      expect(links(render(<ActDetailHeader act={fallbackBait} />).container)).toEqual(gazetteOnly)
      // the same act on the legacy source: the act's page stands in for the canonical original
      expect(links(render(<ActDetailHeader act={{ ...fallbackBait, dataSource: 'legal' }} />).container)[0]).toEqual(['Portalul legislativ', 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900099'])
    })

    it('with no issue matched, states the Portal’s own masthead line and links only the Portal page (owner, 26 November 2026)', () => {
      // the fixture's act is matched to no issue; its text's masthead names nr. 67 of 3 April 1996, the original's day
      expect(v2.gazettePublications).toEqual([])
      expect(v2.canonical?.publicationRaw).toBe('MONITORUL OFICIAL nr. 67 din 3 aprilie 1996')
      const { container } = render(<ActDetailHeader act={v2} />)
      // the dates in the reader's language (the tests run in English); no issue page, as none was matched
      expect(fact('Publicat în')).toBe('Monitorul Oficial nr. 67 din April 3, 1996')
      expect(links(container)).toEqual([['Portalul legislativ', original.sourceUrl]])
    })

    it('states no masthead line that is not the first publication, or not in the Portal’s plain writing', () => {
      const canonical = v2.canonical
      if (canonical === null) throw new Error('the legal_v2 fixture lost its canonical')
      // a republication's line: its day is no original's
      const republished = { ...v2, canonical: { ...canonical, publicationRaw: 'MONITORUL OFICIAL nr. 345 din 2 mai 2024' } }
      render(<ActDetailHeader act={republished} />)
      expect(screen.queryByText('Publicat în', { selector: 'dt' })).not.toBeInTheDocument()
      // a line in another writing is not read
      const odd = { ...v2, canonical: { ...canonical, publicationRaw: 'M.Of. 67/1996' } }
      const second = render(<ActDetailHeader act={odd} />)
      expect(second.container.querySelector('dl')?.textContent ?? '').not.toContain('Publicat în')
      // a republication shown by default: its masthead is its own issue's, even on the original's day (Codex, round 1)
      const republication = { ...v2, canonical: { ...canonical, versionKind: 'republicare', caveat: null } }
      const fourth = render(<ActDetailHeader act={republication} />)
      expect(fourth.container.querySelector('dl')?.textContent ?? '').not.toContain('Publicat în')
      // a republication carrying the consolidation caveat is still a republication (Codex review, round 2)
      const caveatedRepublication = { ...v2, canonical: { ...canonical, versionKind: 'republicare', caveat: LEGAL_UNOFFICIAL_CONSOLIDATION_CAVEAT } }
      const sixth = render(<ActDetailHeader act={caveatedRepublication} />)
      expect(sixth.container.querySelector('dl')?.textContent ?? '').not.toContain('Publicat în')
      // a republication the same day as the original: another issue the day cannot tell apart, so no line
      const [listedOriginal] = v2.documents
      if (listedOriginal === undefined) throw new Error('the legal_v2 fixture lost its original')
      const sameDay = { ...listedOriginal, documentId: 'f900018', versionKind: 'republicare', sourceUrl: null }
      const seventh = render(<ActDetailHeader act={{ ...v2, documents: [...v2.documents, sameDay] }} />)
      expect(seventh.container.querySelector('dl')?.textContent ?? '').not.toContain('Publicat în')
      // two originals: the line must name the first one's day, not a later one's
      const [firstOriginal] = v2.documents
      if (firstOriginal === undefined) throw new Error('the legal_v2 fixture lost its original')
      const earlier = { ...firstOriginal, documentId: 'f900010', versionDate: '1990-01-05', firstPublicationDate: '1990-01-05' }
      const fifth = render(<ActDetailHeader act={{ ...v2, documents: [earlier, ...v2.documents] }} />)
      expect(fifth.container.querySelector('dl')?.textContent ?? '').not.toContain('Publicat în')
      // matches that are only probable: the record's band says how probable, the head states none
      const probable = { ...v2, gazettePublications: [{ ...issue, resolution: 'cluster' }] }
      const third = render(<ActDetailHeader act={probable} />)
      expect(third.container.querySelector('dl')?.textContent ?? '').not.toContain('Publicat în')
    })

    it('reads the masthead of a canonical original that is not listed among the forms', () => {
      const canonical = v2.canonical
      if (canonical === null) throw new Error('the legal_v2 fixture lost its canonical')
      const alone = { ...v2, documents: [], canonical: { ...canonical, versionKind: 'original', caveat: null, firstPublicationDate: '1996-04-03' } }
      const { container } = render(<ActDetailHeader act={alone} />)
      expect(container.querySelector('dl')?.textContent ?? '').toContain('Monitorul Oficial nr. 67 din April 3, 1996')
      // and its own Portal page with it (Codex review, round 2)
      expect(links(container)).toEqual([['Portalul legislativ', canonical.sourceUrl]])
    })

    it('links no address that is not a whole web address', () => {
      const { container } = render(<ActDetailHeader act={withIssue({}, { pdfUrl: 'https://' })} />)
      expect(links(container)).toEqual([['Portalul legislativ', original.sourceUrl]])
      // one slash short: the parser finds the host, but the page would open it on this site (Codex review, round 2)
      const slash = render(<ActDetailHeader act={withIssue({}, { pdfUrl: 'https:/monitoruloficial.ro/Monitorul-Oficial--PI--67--1996.html' })} />)
      expect(links(slash.container)).toEqual([['Portalul legislativ', original.sourceUrl]])
    })
  })

  it('links nothing it is not sure of: no sure publication, no address, or one that is no web page', () => {
    // a gazette issue without a page, and a Portal address that is no web page: the value alone, as before
    const bare = {
      ...act,
      gazettePublications: act.gazettePublications.map((publication) => ({ ...publication, pdfUrl: null })),
      officialTextUrl: 'javascript:alert(1)',
    }
    render(<ActDetailHeader act={bare} />)
    expect(sourcesOf('Publicat în')).toEqual([])
    expect(fact('Publicat în')).toBe('Monitorul Oficial nr. 5 (Partea I) din January 7, 2020')
  })

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
    // The same issue 5, no longer a sure match: it must not be shown as the act's publication.
    const unsure = act.gazettePublications.map((publication) => ({ ...publication, resolution: 'ambiguous' as const }))
    expect(unsure).toHaveLength(1)
    const { container } = render(<ActDetailHeader act={{ ...act, gazettePublications: unsure }} />)
    expect(screen.queryByText('Publicat în', { selector: 'dt' })).not.toBeInTheDocument()
    // and no way out to either source: the Portal page and the issue's page are said of a sure publication only
    expect(container.querySelectorAll('header a[target="_blank"]')).toHaveLength(0)
    expect(fact('Tip')).toBe('Lege')
  })

  it('shows no publication when the act has none at all', () => {
    render(<ActDetailHeader act={{ ...act, gazettePublications: [] }} />)
    expect(screen.queryByText('Publicat în', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('shows no name over nothing: an act without a type has no „Tip", and no facts means no band', () => {
    const { container } = render(<ActDetailHeader act={{ ...act, actType: '', issuerSlug: null, entryIntoForce: null, gazettePublications: [] }} />)
    expect(screen.queryByText('Tip', { selector: 'dt' })).not.toBeInTheDocument()
    expect(container.querySelector('dl')).toBeNull()
    // with one fact left the band is back, without „Tip"
    const withIssuer = render(<ActDetailHeader act={{ ...act, actType: '', entryIntoForce: null, gazettePublications: [] }} />)
    expect(withIssuer.container.querySelectorAll('dl dt')).toHaveLength(1)
    expect(withIssuer.container.querySelector('dl dt')?.textContent).toBe('Emitent')
    // blanks are no type either
    const blank = render(<ActDetailHeader act={{ ...act, actType: '   ', issuerSlug: null, entryIntoForce: null, gazettePublications: [] }} />)
    expect(blank.container.querySelector('dl')).toBeNull()
  })

  it('lets a long issuer wrap on a row of its own and keeps the publication a readable width', () => {
    const { container } = render(<ActDetailHeader act={act} />)
    const list = container.querySelector('dl')
    expect(list).toHaveClass('sm:flex', 'sm:flex-wrap')
    // no fixed column that a long value could squeeze to nothing
    expect(list?.className).not.toContain('sm:grid-cols-')
    const groups = [...(list?.children ?? [])]
    expect(groups).toHaveLength(4)
    // every value can shrink and, with no place to break, breaks anywhere instead of running past the column
    for (const group of groups) expect(group).toHaveClass('min-w-0', '[overflow-wrap:anywhere]')
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
