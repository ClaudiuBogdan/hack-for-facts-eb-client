import type { ReactNode } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { LEGAL_ORIGINAL_TEXT_CAVEAT } from '@/schemas/legal'
import {
  CCR_DECISION_COUNT,
  CHANGES_LATEST_EFFECTIVE_DATE,
  GAZETTE_LATEST_ISSUE_DATE,
  LEGAL_ACT_COUNT,
  LEGAL_PARSED_DOCUMENT_COUNT,
} from '../lib/legal-coverage'
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

/** The Lingui test mock pins `i18n.locale` to `en`. */
const asRendered = (value: number) => formatLegalNumber(value, 'en')
const dateAsRendered = (value: string) => formatLegalDate(value, 'en')
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('LegislationGuide', () => {
  it('states the corpus size from the measured constants', () => {
    render(<LegislationGuide />)

    expect(
      screen.getByText(new RegExp(escaped(asRendered(LEGAL_ACT_COUNT)))),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(escaped(asRendered(LEGAL_PARSED_DOCUMENT_COUNT))),
      ),
    ).toBeInTheDocument()
  })

  it('states the Constitutional Court gap with its measured figure, in the warning treatment', () => {
    render(<LegislationGuide />)

    const claim = screen.getByText(
      new RegExp(
        `${escaped(asRendered(CCR_DECISION_COUNT))}.*nu modifică`,
        's',
      ),
    )
    expect(claim).toBeInTheDocument()
    expect(claim.textContent).toMatch(/„în\s+vigoare”/)
  })

  it('states both freshness frontiers — gazette and status events — from the coverage constants', () => {
    render(<LegislationGuide />)

    expect(
      screen.getByText(
        new RegExp(escaped(dateAsRendered(GAZETTE_LATEST_ISSUE_DATE))),
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(escaped(dateAsRendered(CHANGES_LATEST_EFFECTIVE_DATE))),
      ),
    ).toBeInTheDocument()
  })

  it('renders the served-text caveat VERBATIM from the shared server constant', () => {
    render(<LegislationGuide />)

    // Asserted via the import, never a retyped string — the guide must speak
    // the exact bytes the server serves, not a paraphrase.
    expect(screen.getByText(LEGAL_ORIGINAL_TEXT_CAVEAT)).toBeInTheDocument()
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

  it('says plainly that phrase search does not work yet', () => {
    render(<LegislationGuide />)

    expect(screen.getByText(/nu găsește\s+nimic/)).toBeInTheDocument()
  })

  it('moves with the coverage constants — the figures are NOT hardcoded strings', async () => {
    // Re-import the component against a mocked coverage module: if the CCR
    // figure or the freshness dates were typed into the prose instead of
    // formatted from the constants, the old values would keep rendering and
    // this test would catch the drift.
    vi.resetModules()
    vi.doMock('../lib/legal-coverage', async (importOriginal) => {
      const actual =
        await importOriginal<typeof import('../lib/legal-coverage')>()
      return {
        ...actual,
        CCR_DECISION_COUNT: 12_345,
        GAZETTE_LATEST_ISSUE_DATE: '2031-01-02',
        CHANGES_LATEST_EFFECTIVE_DATE: '2031-03-04',
      }
    })

    try {
      const { LegislationGuide: RemockedGuide } = await import(
        './legislation-guide'
      )
      render(<RemockedGuide />)

      expect(
        screen.getByText(new RegExp(escaped(asRendered(12_345)))),
      ).toBeInTheDocument()
      expect(
        screen.queryByText(
          new RegExp(escaped(asRendered(CCR_DECISION_COUNT))),
        ),
      ).not.toBeInTheDocument()

      expect(
        screen.getByText(new RegExp(escaped(dateAsRendered('2031-01-02')))),
      ).toBeInTheDocument()
      expect(
        screen.getByText(new RegExp(escaped(dateAsRendered('2031-03-04')))),
      ).toBeInTheDocument()
      expect(
        screen.queryByText(
          new RegExp(escaped(dateAsRendered(GAZETTE_LATEST_ISSUE_DATE))),
        ),
      ).not.toBeInTheDocument()
    } finally {
      vi.doUnmock('../lib/legal-coverage')
      vi.resetModules()
    }
  })
})
