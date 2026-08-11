import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegalActDetail } from '@/schemas/legal'
import {
  legalActDetailById,
  legalActDetailFixture,
  legalActDetailRichFixture,
} from '../mocks/fixtures/legal-act-detail'
import { LegalActPage } from './legal-act-page'

vi.mock('@tanstack/react-router', () => ({
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

  it('leads with the plain-language summary', () => {
    render(<LegalActPage actId="103524" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Legea nr. 2/2020',
    )
    expect(screen.getByText('Ce spune, pe scurt')).toBeInTheDocument()
    expect(
      screen.getByText(/încurajează românii să-și cumpere mașini noi/),
    ).toBeInTheDocument()
  })

  it('routes to the official source without opening anything', () => {
    render(<LegalActPage actId="103524" />)

    // The page describes an act it does not hold the text of, so the route to
    // the official record is the one thing it owes every reader. It used to be
    // an underlined link inside the eighth card down.
    expect(
      screen
        .getByRole('link', { name: /Citește textul oficial/ })
        .getAttribute('href'),
    ).toContain('legislatie.just.ro')
  })

  it('suppresses every empty block on a thin act', () => {
    render(<LegalActPage actId="103524" />)

    // 80% of the corpus looks like this. Absent blocks must be absent, not
    // rendered empty — that is the whole reason this page is not tabbed.
    expect(screen.queryByText('Cine îl citează')).not.toBeInTheDocument()
    expect(screen.queryByText('Cum e structurat')).not.toBeInTheDocument()
    expect(screen.queryByText(/a fost modificat de/)).not.toBeInTheDocument()
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

  it('keeps the staleness warning on the summary card itself', () => {
    mockAct(legalActDetailRichFixture)
    render(<LegalActPage actId="66150" />)

    const warning = screen.getByText(
      /Acest act a fost modificat de 295 ori de la publicare/,
    )
    // The warning qualifies the summary, so it lives ON the summary card as
    // a footer row with its headline always visible (user decision
    // 2026-08-11) — one card, not a separate banner the eye can file away.
    const card = screen
      .getByText('Ce spune, pe scurt')
      .closest('section')
    expect(card).not.toBeNull()
    expect(card).toContainElement(warning)
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
        items: legalActDetailRichFixture.outLinks.items,
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
      screen.getByText(/Acest act a fost modificat de 295 ori/),
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
