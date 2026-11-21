import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LEGAL_ORIGINAL_TEXT_CAVEAT } from '@/schemas/legal'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { LegislationGuide } from './legislation-guide'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock('../hooks/use-legislation', () => ({
  useLegislationStatusCounts: vi.fn(),
  useLegislationFreshness: vi.fn(),
}))

import {
  useLegislationFreshness,
  useLegislationStatusCounts,
} from '../hooks/use-legislation'

/** The Lingui test mock pins `i18n.locale` to `en`. */
const asRendered = (value: number) => formatLegalNumber(value, 'en')
const dateAsRendered = (value: string) => formatLegalDate(value, 'en')
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Deliberately unlike any measured constant: the figures must come from the queries. */
const LIVE = {
  total: 231_457,
  ccrDecisionCount: 12_345,
  latestIssueDate: '2031-01-02',
  latestEffectiveChangeDate: '2031-03-04',
}

function serve(options: { readonly known: boolean }) {
  vi.mocked(useLegislationStatusCounts).mockReturnValue({
    data: options.known ? { total: LIVE.total } : undefined,
  } as unknown as ReturnType<typeof useLegislationStatusCounts>)
  vi.mocked(useLegislationFreshness).mockReturnValue({
    data: options.known
      ? {
          latestIssueDate: LIVE.latestIssueDate,
          latestEffectiveChangeDate: LIVE.latestEffectiveChangeDate,
          ccrDecisionCount: LIVE.ccrDecisionCount,
        }
      : undefined,
  } as unknown as ReturnType<typeof useLegislationFreshness>)
}

describe('LegislationGuide', () => {
  beforeEach(() => serve({ known: true }))

  it('states the corpus size from the live STATUS aggregate, and no parsed-document count', () => {
    render(<LegislationGuide />)

    expect(
      screen.getByText(new RegExp(escaped(asRendered(LIVE.total)))),
    ).toBeInTheDocument()
    expect(screen.queryByText(/documente parsate/)).not.toBeInTheDocument()
  })

  it('states the Constitutional Court gap with its live figure, in the warning treatment', () => {
    render(<LegislationGuide />)

    const claim = screen.getByText(
      new RegExp(`${escaped(asRendered(LIVE.ccrDecisionCount))}.*nu modifică`, 's'),
    )
    expect(claim.textContent).toMatch(/„în\s+vigoare”/)
  })

  it('states both live frontiers — gazette and in-force changes', () => {
    render(<LegislationGuide />)

    expect(
      screen.getByText(new RegExp(escaped(dateAsRendered(LIVE.latestIssueDate)))),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(escaped(dateAsRendered(LIVE.latestEffectiveChangeDate))),
      ),
    ).toBeInTheDocument()
  })

  it('writes every sentence without its figure while the figure is unknown — never a stale constant or a zero', () => {
    serve({ known: false })
    const { container } = render(<LegislationGuide />)

    expect(screen.getByText(/Corpusul conține acte normative/)).toBeInTheDocument()
    expect(screen.getByText(/^Deciziile Curții Constituționale există/)).toBeInTheDocument()
    expect(screen.getByText(/se opresc\s+la o anumită dată/)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/224[.,]539|23[.,]378|227[.,]278/)
  })

  it('says what text is shown — a published form or an unofficial consolidation — and never quotes the published-form-only caveat', () => {
    render(<LegislationGuide />)

    // The previous corpus' caveat ("the served texts are the published
    // versions") is false on legal_v2, which serves consolidations too.
    expect(screen.queryByText(LEGAL_ORIGINAL_TEXT_CAVEAT)).not.toBeInTheDocument()
    expect(
      screen.getByText(/formă consolidată preluată din Portalul Legislativ/),
    ).toBeInTheDocument()
    expect(screen.getByText(/neoficială și are caracter informativ/)).toBeInTheDocument()
    // The Portal is no longer called the source of "the form in force".
    expect(screen.queryByText(/forma consolidată, în vigoare/)).not.toBeInTheDocument()
  })

  it('routes into the module and to the official sources', () => {
    render(<LegislationGuide />)

    expect(screen.getByText('directorul de acte')).toHaveAttribute(
      'href',
      '/legislation/acts',
    )
    expect(screen.getByText('Pagina de căutare')).toHaveAttribute(
      'href',
      '/legislation/search',
    )
    expect(screen.getByText('modificărilor')).toHaveAttribute(
      'href',
      '/legislation/changes',
    )
    expect(screen.getAllByText('directorul Monitorului')[0]).toHaveAttribute(
      'href',
      '/legislation/gazette',
    )
    expect(screen.getByText('legislatie.just.ro')).toHaveAttribute(
      'href',
      'https://legislatie.just.ro',
    )
    expect(screen.getByText('monitoruloficial.ro')).toHaveAttribute(
      'href',
      'https://monitoruloficial.ro',
    )
  })

  it('says plainly that meaning search does not work yet, without denying text search', () => {
    render(<LegislationGuide />)

    expect(screen.getByText(/căutarea după sens/)).toBeInTheDocument()
    expect(screen.queryByText(/nu are deocamdată căutare în text/)).not.toBeInTheDocument()
  })
})
