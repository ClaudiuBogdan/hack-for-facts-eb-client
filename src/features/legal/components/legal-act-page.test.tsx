import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegalActDetail } from '@/schemas/legal'
import {
  legalActDetailById,
  legalActDetailFixture,
  legalActDetailRichFixture,
  legalActDetailV2Fixture,
} from '../mocks/fixtures/legal-act-detail'
import { LegalActPage } from './legal-act-page'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  // The real module under the stand-ins: the contents' links are written by the app's own search serializer.
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouterState: () => ({}),
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
  }) => (
    <a href={params?.actId ? to.replace('$actId', params.actId) : to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('../hooks/use-legal-act', () => ({ useLegalAct: vi.fn() }))

import { useLegalAct } from '../hooks/use-legal-act'

function mockAct(act: LegalActDetail | null, overrides = {}) {
  vi.mocked(useLegalAct).mockReturnValue({
    data: act,
    isLoading: false,
    isError: false,
    ...overrides,
  } as unknown as ReturnType<typeof useLegalAct>)
}

describe('LegalActPage', () => {
  beforeEach(() => {
    mockAct(legalActDetailFixture)
  })

  it('leads with the summary card', () => {
    render(<LegalActPage actId="103524" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Legea nr. 2/2020',
    )
    expect(screen.getByText('Pe scurt')).toBeInTheDocument()
    expect(
      screen.getByText(/încurajează românii să-și cumpere mașini noi/),
    ).toBeInTheDocument()
  })

  it('routes to the official source without opening anything', () => {
    render(<LegalActPage actId="103524" />)

    // The route to the official record lives in the summary card's footer
    // now (user decision 2026-08-12: the header button is gone) — still
    // reachable without opening anything.
    expect(
      screen
        .getByRole('link', { name: /Textul, pe legislatie/ })
        .getAttribute('href'),
    ).toContain('legislatie.just.ro')
  })

  it('suppresses every empty block on a thin act', () => {
    render(<LegalActPage actId="103524" />)

    // 80% of the corpus looks like this. Absent blocks must be absent, not
    // rendered empty — that is the whole reason this page is not tabbed.
    expect(screen.queryByText('Cine îl citează')).not.toBeInTheDocument()
    expect(screen.queryByText('Cum e structurat')).not.toBeInTheDocument()
    expect(screen.queryByText(/referințe? de modificare/)).not.toBeInTheDocument()
  })

  it('keeps key dates whose date is null instead of dropping them', () => {
    render(<LegalActPage actId="103524" />)

    fireEvent.click(screen.getByRole('button', { name: /Date cheie/ }))

    expect(screen.getByText('fără dată exactă')).toBeInTheDocument()
    expect(
      screen.getByText(/Data de 19 martie 2019 a adoptării/),
    ).toBeInTheDocument()
  })

  it('answers "does this concern me" without opening anything', () => {
    render(<LegalActPage actId="103524" />)

    // Rung 2's job is a relevance check that costs the reader nothing. Behind a
    // closed row a count would not do that — "2 categorii" tells you nothing
    // about whether you are one of them — so the audiences are the row's own
    // description and read without a click.
    const relevance = screen.getByRole('button', { name: /Pe cine privește/ })
    expect(relevance).toHaveAttribute('aria-expanded', 'false')
    expect(relevance).toHaveTextContent('cetățeni · firme')
  })

  it('shows the staleness warning once, in the box about the text shown', () => {
    mockAct(legalActDetailRichFixture)
    render(<LegalActPage actId="66150" />)

    // The warning qualifies the text shown, so with a version shown it lives
    // in the box about that text (owner, 26 November 2026, the act page's
    // redesign: the right-hand box from 88rem, the reading column below) —
    // with its headline always visible, and once at any width.
    const warnings = screen.getAllByText(
      /295 de referințe de modificare sau completare înregistrate pentru act/,
    )
    expect(warnings).toHaveLength(1)
    const about = screen.getByRole('complementary', { name: 'Despre textul afișat' })
    expect(about).toContainElement(warnings[0] ?? null)
    expect(screen.getByText('Pe scurt').closest('section')).not.toContainElement(warnings[0] ?? null)
  })

  it('keeps the warnings once on an act with no summary', () => {
    mockAct({ ...legalActDetailRichFixture, summary: null })
    render(<LegalActPage actId="66150" />)

    expect(screen.queryByText('Pe scurt')).not.toBeInTheDocument()
    const warnings = screen.getAllByText(/295 de referințe de modificare sau completare/)
    expect(warnings).toHaveLength(1)
    expect(screen.getByRole('complementary', { name: 'Despre textul afișat' })).toContainElement(warnings[0] ?? null)
  })

  it('puts the warnings on the summary when no version of the text is shown', () => {
    // No readable version: no box about the text shown, so the summary wears them.
    mockAct({
      ...legalActDetailRichFixture,
      canonical: null,
      documents: [],
      latestAvailableDocumentId: null,
    })
    render(<LegalActPage actId="66150" />)

    expect(screen.queryByRole('complementary', { name: 'Despre textul afișat' })).not.toBeInTheDocument()
    const warnings = screen.getAllByText(/295 de referințe de modificare sau completare/)
    expect(warnings).toHaveLength(1)
    expect(screen.getByText('Pe scurt').closest('section')).toContainElement(warnings[0] ?? null)
  })

  it('offers the ways back to the start only once the head has left the screen, and lands on the title', () => {
    const observers: { readonly callback: IntersectionObserverCallback; readonly targets: Element[] }[] = []
    class RecordingObserver {
      readonly root = null
      readonly rootMargin = ''
      readonly scrollMargin = ''
      readonly thresholds: readonly number[] = []
      private readonly record: { readonly callback: IntersectionObserverCallback; readonly targets: Element[] }
      constructor(callback: IntersectionObserverCallback) {
        this.record = { callback, targets: [] }
        observers.push(this.record)
      }
      observe(target: Element) {
        this.record.targets.push(target)
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    const original = window.IntersectionObserver
    vi.stubGlobal('IntersectionObserver', RecordingObserver)
    window.IntersectionObserver = RecordingObserver as unknown as typeof IntersectionObserver
    try {
      mockAct(legalActDetailRichFixture)
      render(<LegalActPage actId="66150" />)
      const back = () => screen.queryAllByRole('button', { name: 'Înapoi la începutul actului' })
      expect(back()).toHaveLength(0)

      // Every observed element reports itself out of view, above the window: the head has been scrolled past.
      const scrolledPast = (top: number) =>
        act(() => {
          for (const { callback, targets } of observers) {
            callback(
              targets.map((target) => ({ target, isIntersecting: false, boundingClientRect: { top } }) as unknown as IntersectionObserverEntry),
              {} as IntersectionObserver,
            )
          }
        })
      // Below the window (a head taller than a phone's screen) is not away.
      scrolledPast(900)
      expect(back()).toHaveLength(0)
      scrolledPast(-400)
      // The bar's, and the floating one (beside the text from 72rem, in the corner below).
      expect(back()).toHaveLength(3)

      vi.mocked(window.scrollTo).mockClear()
      fireEvent.click(back()[0] as HTMLElement)
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })
      expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
    } finally {
      vi.unstubAllGlobals()
      window.IntersectionObserver = original
    }
  })

  it('surfaces contradicted abrogations', () => {
    mockAct(legalActDetailRichFixture)
    render(<LegalActPage actId="66150" />)

    expect(
      screen.getByText('Sursele nu sunt de acord despre ce s-a abrogat.'),
    ).toBeInTheDocument()
  })

  it('reports the real citation count, not the page size', () => {
    mockAct(legalActDetailRichFixture)
    render(<LegalActPage actId="66150" />)

    // `LegalReferenceConnection.totalCount` saturates at `first`, so the raw
    // value would have read "12 trimiteri" on an act with 2.621 of them.
    // The group separator follows the active locale, so match on the digits.
    const citations = screen.getByRole('button', { name: /Cine îl citează/ })
    expect(citations).toHaveTextContent(/2[.,]621 de trimiteri/)
    expect(citations).not.toHaveTextContent(/\b12 trimiteri/)
  })

  it('says "cel puțin" when the total is genuinely unknown', () => {
    mockAct({
      ...legalActDetailRichFixture,
      outLinks: {
        totalCount: null,
        hasMore: true,
        items: legalActDetailRichFixture.outLinks?.items ?? [],
      },
    })
    render(<LegalActPage actId="66150" />)

    expect(
      screen.getByRole('button', { name: /Ce face acest act/ }),
    ).toHaveTextContent('cel puțin 3 trimiteri')
  })

  it('states each headline count once', () => {
    mockAct(legalActDetailRichFixture)
    const { container } = render(<LegalActPage actId="66150" />)

    // The header used to close with three stat chips — 295 modificări,
    // 2.621 acte îl citează, 12 elemente de structură — and every one of those
    // numbers is the subject of a block further down. Three facts, each said
    // twice, on the screen with the least room to spare.
    const header = container.querySelector('header')
    expect(header).not.toHaveTextContent(/295/)
    expect(header).not.toHaveTextContent(/2[.,]621/)

    expect(
      screen.getByText(/295 de referințe de modificare sau completare/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Cine îl citează/ }),
    ).toHaveTextContent(/2[.,]621/)
  })

  it('counts in Romanian, which needs three plural forms and not one', () => {
    mockAct(legalActDetailRichFixture)
    render(<LegalActPage actId="66150" />)

    // A single `{n} evenimente` template renders "1 evenimente" on the 18% of
    // acts with exactly one status event, and Romanian also wants "de" past 19.
    expect(
      screen.getByRole('button', { name: /Ce s-a întâmplat cu acest act/ }),
    ).toHaveTextContent('4 evenimente')
    // (The structure band now feeds from the outline transport and
    // self-suppresses without an outline for the fixture's document — its
    // plural meta is covered by the reader TOC tests.)
    expect(
      screen.getByRole('button', { name: /Unde a fost publicat/ }),
    ).toHaveTextContent('1 publicare')
  })

  it('keeps the record’s nine rows in their order, as h3s under "Fișa actului", the publication and the versions open', () => {
    mockAct(legalActDetailRichFixture)
    render(<LegalActPage actId="66150" />)

    const record = screen.getByRole('group', { name: 'Detalii despre acest act' })
    const heads = Array.from(record.querySelectorAll('section > h3 > button'))
    expect(heads.map((head) => head.closest('h3')?.id)).toEqual([
      'act-relevance-heading',
      'act-key-dates-heading',
      'act-publication-heading',
      'act-timeline-heading',
      'act-versions-heading',
      'act-references-out-heading',
      'act-references-in-heading',
      'act-anchors-heading',
      'act-provenance-heading',
    ])
    expect(heads.map((head) => head.getAttribute('aria-expanded'))).toEqual([
      'false',
      'false',
      'true',
      'false',
      'true',
      'false',
      'false',
      'false',
      'false',
    ])
    expect(screen.getByRole('heading', { level: 2, name: 'Fișa actului' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: /Unde a fost publicat/ })).toBeInTheDocument()
    expect(record.innerHTML).not.toMatch(/pnrr/)
  })

  it('starts the record afresh on another act: a row opened on one is not open on the next', () => {
    mockAct(legalActDetailRichFixture)
    const { rerender } = render(<LegalActPage actId="66150" />)
    const timeline = () => screen.getByRole('button', { name: /Ce s-a întâmplat cu acest act/ })
    fireEvent.click(timeline())
    expect(timeline()).toHaveAttribute('aria-expanded', 'true')
    // the same act read again (a refetch) keeps what the reader opened
    mockAct({ ...legalActDetailRichFixture })
    rerender(<LegalActPage actId="66150" />)
    expect(timeline()).toHaveAttribute('aria-expanded', 'true')
    // another act, reached by a link on the same route
    mockAct({ ...legalActDetailRichFixture, actId: '900001' })
    rerender(<LegalActPage actId="900001" />)
    expect(timeline()).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the line of the version the address asks for in sight in the record, and only then', () => {
    const base = legalActDetailV2Fixture.documents[0]
    const canonical = legalActDetailV2Fixture.canonical
    if (base === undefined || canonical === null) throw new Error('the legal_v2 fixture lost its default')
    // nine consolidations, one a year from 2001; the newest is the default
    const act = {
      ...legalActDetailV2Fixture,
      canonical: { ...canonical, documentId: 'f9' },
      documents: Array.from({ length: 9 }, (_, index) => ({
        ...base,
        documentId: `f${String(index + 1)}`,
        versionKind: 'consolidare',
        versionDate: `${String(2001 + index)}-03-01`,
        portalLabelDate: `${String(2001 + index)}-03-01`,
        isCanonical: index === 8,
      })),
    }
    mockAct(act)
    const lines = () => within(screen.getByRole('region', { name: /Versiunile textului/ })).getAllByRole('listitem')
    const { unmount } = render(<LegalActPage actId={act.actId} docOverride="f2" />)
    expect(lines()).toHaveLength(6)
    expect(lines()[5]?.firstElementChild).toHaveTextContent('2002')
    unmount()
    render(<LegalActPage actId={act.actId} />)
    expect(lines()).toHaveLength(5)
  })

  it('lets a line of the record break anywhere: an identifier with no space cannot run past a phone', () => {
    mockAct(legalActDetailRichFixture)
    render(<LegalActPage actId="66150" />)
    const lines = screen.getByRole('region', { name: /Versiunile textului/ }).querySelectorAll('li')
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) expect(line).toHaveClass('[overflow-wrap:anywhere]')
  })

  it('renders a not-found page for an unknown act', () => {
    mockAct(null)
    render(<LegalActPage actId="999999999" />)

    expect(screen.getByText('Nu am găsit acest act')).toBeInTheDocument()
  })

  it('never substitutes a different act for an id it does not have', () => {
    // A fallback fixture would put a real citation, with real dates, at a URL
    // that is not that act. A not-found page is the only honest answer.
    expect(legalActDetailById('999999999')).toBeNull()
    expect(legalActDetailById('103524')).toBe(legalActDetailFixture)
  })

  it('labels mock data on the page itself', () => {
    // Both fixtures are real acts copied from production, so nothing about the
    // rendering distinguishes them from served data. The label has to, and it
    // has to be the always-visible one: the matching provenance note lives
    // inside a closed accordion row.
    render(<LegalActPage actId="103524" />)

    expect(screen.getByText('Date demonstrative (mock)')).toBeInTheDocument()
  })

  it('keeps the limits of the data one click away, not one scroll past', () => {
    render(<LegalActPage actId="103524" />)

    // The catalogue of caveats used to be an always-open wall at the end of the
    // page — the most screen space on the page, spent on the block with the
    // least chance of being read. Closed, it is still one click from the
    // reader, and the claims it qualifies are each stated where they are made.
    const limits = screen.getByRole('button', {
      name: /Ce nu vă putem spune despre acest act/,
    })
    expect(limits).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByText(/deciziile Curții Constituționale/),
    ).not.toBeInTheDocument()

    fireEvent.click(limits)

    expect(limits).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByText(/rulează pe date demonstrative/),
    ).toBeInTheDocument()
  })

  it('renders a skeleton while loading', () => {
    mockAct(null, { isLoading: true })
    render(<LegalActPage actId="103524" />)

    expect(screen.getByLabelText('Se încarcă actul normativ')).toBeInTheDocument()
  })
})
