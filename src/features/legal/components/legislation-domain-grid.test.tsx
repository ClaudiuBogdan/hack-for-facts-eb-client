import type { ReactNode } from 'react'
import { render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LegalDomainActCounts } from '@/schemas/legal'
import { legislationDomainCountsFixture } from '../mocks/fixtures/legislation-domain-counts'
import { LegislationDomainGrid } from './legislation-domain-grid'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly search?: Record<string, unknown>
  }) => (
    <a href={to} data-search={JSON.stringify(search ?? null)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('../hooks/use-legislation', () => ({
  useLegislationDomainCounts: vi.fn(),
}))

import { useLegislationDomainCounts } from '../hooks/use-legislation'

function mockCounts(state: {
  readonly data?: LegalDomainActCounts
  readonly isError?: boolean
}) {
  vi.mocked(useLegislationDomainCounts).mockReturnValue({
    data: state.data,
    isError: state.isError ?? false,
  } as unknown as ReturnType<typeof useLegislationDomainCounts>)
}

describe('LegislationDomainGrid', () => {
  beforeEach(() => {
    vi.mocked(useLegislationDomainCounts).mockReset()
  })

  it('renders each count inside its own domain cell, locale-formatted', () => {
    mockCounts({ data: legislationDomainCountsFixture })
    render(<LegislationDomainGrid />)

    // The lingui test mock pins locale 'en', so Intl groups with commas here;
    // the browser (ro) renders 109.969. Label ↔ count ↔ filter stay bound:
    // the number sits INSIDE the link that filters by that same domain.
    const cases = [
      { label: 'Administrație', slug: 'administratie', formatted: '109,969' },
      { label: 'Mediu', slug: 'mediu', formatted: '18,126' },
      {
        label: 'Telecomunicații și digital',
        slug: 'telecomunicatii-si-digital',
        formatted: '6,950',
      },
    ] as const
    for (const { label, slug, formatted } of cases) {
      const cell = screen.getByRole('link', {
        name: new RegExp(`^${label}`),
      })
      expect(within(cell).getByText(formatted)).toBeInTheDocument()
      expect(cell).toHaveAttribute(
        'data-search',
        JSON.stringify({ domain: slug }),
      )
    }
  })

  it('renders the overlap disclosure while numbers are on screen', () => {
    mockCounts({ data: legislationDomainCountsFixture })
    render(<LegislationDomainGrid />)

    // DOMAIN buckets overlap (an act carries several domains), so the cells
    // sum to ~2.2x the corpus — the grid must say so next to the numbers.
    expect(screen.getByText(/numerele se suprapun/)).toBeInTheDocument()
    expect(
      screen.getByText(/depășesc numărul real de acte din corpus/),
    ).toBeInTheDocument()
  })

  it('a failed count query degrades to the 16 label-only cells — never zeros', () => {
    mockCounts({ data: undefined, isError: true })
    render(<LegislationDomainGrid />)

    expect(screen.getAllByRole('link')).toHaveLength(16)
    expect(
      screen.getByRole('link', { name: /^Administrație\s*$/ }),
    ).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText(/numerele se suprapun/)).not.toBeInTheDocument()
    expect(screen.getByText(/nu a putut fi încărcat/)).toBeInTheDocument()
  })

  it('renders the cells without numbers or disclosure while loading', () => {
    mockCounts({ data: undefined })
    render(<LegislationDomainGrid />)

    expect(screen.getAllByRole('link')).toHaveLength(16)
    expect(screen.queryByText(/numerele se suprapun/)).not.toBeInTheDocument()
    expect(screen.queryByText(/nu a putut fi încărcat/)).not.toBeInTheDocument()
  })

  it('a slug the server did not count renders label-only, never 0', () => {
    mockCounts({ data: { administratie: 109969 } })
    render(<LegislationDomainGrid />)

    expect(
      within(
        screen.getByRole('link', { name: /^Administrație/ }),
      ).getByText('109,969'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /^Mediu\s*$/ }),
    ).not.toHaveTextContent('0')
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
