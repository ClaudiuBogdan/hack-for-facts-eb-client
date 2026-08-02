import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
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

  it('never implies it holds the text of the law', () => {
    render(<LegalActPage actId="103524" />)

    // The server serves no node text at all, so any phrasing that suggests the
    // page carries the act itself is a lie. Guard the copy.
    expect(
      screen.getByText(/Nu publicăm textul actelor normative/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Textul integral nu este disponibil aici/),
    ).toBeInTheDocument()
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

    expect(screen.getByText('fără dată exactă')).toBeInTheDocument()
    expect(
      screen.getByText(/Data de 19 martie 2019 a adoptării/),
    ).toBeInTheDocument()
  })

  it('warns that the summary is stale before the reader reaches it', () => {
    mockAct(legalActDetailRichFixture)
    render(<LegalActPage actId="66150" />)

    const warning = screen.getByText(
      /Acest act a fost modificat de 295 ori de la publicare/,
    )
    const summary = screen.getByText('Ce spune, pe scurt')

    expect(warning).toBeInTheDocument()
    // Order is the point: a warning under the summary is an apology, not a
    // caveat. `DOCUMENT_POSITION_FOLLOWING` = summary comes after the warning.
    expect(
      warning.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
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
    expect(citations).toHaveTextContent(/2[.,]621 trimiteri/)
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
    // rendering distinguishes them from served data. The label has to.
    render(<LegalActPage actId="103524" />)

    expect(screen.getByText('Date demonstrative (mock)')).toBeInTheDocument()
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
