import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { legislationOverviewFixture } from '../mocks/fixtures/legislation-overview'
import { legislationDomainCountsFixture } from '../mocks/fixtures/legislation-domain-counts'
import { LegislationPage } from './legislation-page'

const navigateMock = vi.fn()

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
  useNavigate: () => navigateMock,
}))

vi.mock('../hooks/use-legislation', () => ({
  useLegislationOverview: vi.fn(),
  useLegislationDomainCounts: vi.fn(),
}))

import {
  useLegislationDomainCounts,
  useLegislationOverview,
} from '../hooks/use-legislation'

function mockOverviewReady() {
  vi.mocked(useLegislationOverview).mockReturnValue({
    data: legislationOverviewFixture,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useLegislationOverview>)
  vi.mocked(useLegislationDomainCounts).mockReturnValue({
    data: legislationDomainCountsFixture,
    isError: false,
  } as unknown as ReturnType<typeof useLegislationDomainCounts>)
}

describe('LegislationPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    mockOverviewReady()
  })

  it('renders the hero and the bands that help you find an act', () => {
    render(<LegislationPage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'LegislațiaRomâniei',
    )
    expect(screen.getByRole('region', { name: 'Domenii' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'Ultimele numere din Monitorul Oficial',
      }),
    ).toBeInTheDocument()
  })

  it('keeps the digital header canvas off page load until a reader engages', () => {
    const { container } = render(<LegislationPage />)

    const playButton = screen.getByRole('button', {
      name: 'Redă din nou efectul digital al imaginii',
    })

    expect(container.querySelector('canvas')).not.toBeInTheDocument()
    fireEvent.click(playButton)
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('warms the digital header up on pointer intent, before the click', () => {
    const { container } = render(<LegislationPage />)

    const playButton = screen.getByRole('button', {
      name: 'Redă din nou efectul digital al imaginii',
    })

    // Building the renderer inside the click handler cost ~234ms before the
    // first pixel moved, so the click read as a no-op. Hovering has to be what
    // pays for it, leaving the click with a renderer that is already live.
    expect(container.querySelector('canvas')).not.toBeInTheDocument()
    fireEvent.pointerEnter(playButton)
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('leaves the corpus figures to the analytics tab', () => {
    render(<LegislationPage />)

    // The KPI strip and the citation ranking moved to `/legislation/analytics`.
    // The front door is a finding aid; guard against them drifting back.
    expect(screen.queryByText('Acte normative')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', {
        name: 'Actele pe care se sprijină restul legislației',
      }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Legea nr. 227/2015')).not.toBeInTheDocument()
  })

  it('states that Constitutional Court decisions do not change act status', () => {
    render(<LegislationPage />)

    expect(
      screen.getByText(/nu modifică statutul actelor pe care le vizează/),
    ).toBeInTheDocument()
  })

  it('never claims gazette full text is available', () => {
    render(<LegislationPage />)

    // `MoIssue` carries no `hasFullText`, so the only sayable claim is that an
    // official PDF exists. Guard the copy so a future edit cannot overclaim.
    expect(screen.queryByText(/text disponibil/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('PDF oficial disponibil').length).toBeGreaterThan(
      0,
    )
    expect(
      screen.getAllByText('doar coordonate de publicare').length,
    ).toBeGreaterThan(0)
  })

  it('renders all 16 domains, counted by the one aggregate query', () => {
    render(<LegislationPage />)

    const domains = screen.getByRole('region', { name: 'Domenii' })
    expect(domains).toHaveTextContent('Fiscal și bugetar')
    expect(domains).toHaveTextContent('Telecomunicații și digital')
    // One `legalActCounts(groupBy: DOMAIN)` round-trip serves every cell —
    // numbers are served, never invented client-side, and the grid's own
    // tests pin that a failed aggregate degrades to label-only cells.
    expect(within(domains).getByText('109,969')).toBeInTheDocument()
  })

  it('shows the tab set with Prezentare and Analiză navigable', () => {
    render(<LegislationPage />)

    const nav = screen.getByRole('navigation', { name: 'Secțiuni Legislație' })
    expect(nav).toHaveTextContent('Prezentare')
    expect(nav).toHaveTextContent('Monitorul Oficial')
    expect(screen.getByText('Analiză')).toHaveAttribute(
      'href',
      '/legislation/analytics',
    )
    // Live since the server shipped the global feed — a regression back to
    // the inert span would silently unship the tab.
    expect(screen.getByText('Modificări')).toHaveAttribute(
      'href',
      '/legislation/changes',
    )
    // Caută and Ghid are still routeless and must stay honestly inert.
    expect(screen.getByText('Ghid')).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not scroll the tab navigation when it mounts', () => {
    const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView')

    try {
      render(<LegislationPage />)

      expect(scrollIntoView).not.toHaveBeenCalled()
    } finally {
      scrollIntoView.mockRestore()
    }
  })

  it('renders a skeleton while loading', () => {
    vi.mocked(useLegislationOverview).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useLegislationOverview>)

    render(<LegislationPage />)

    expect(
      screen.getByLabelText('Se încarcă prezentarea legislației'),
    ).toBeInTheDocument()
  })

  it('renders an error message when the overview fails', () => {
    vi.mocked(useLegislationOverview).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useLegislationOverview>)

    render(<LegislationPage />)

    expect(
      screen.getByText('Nu am putut încărca datele despre legislație.'),
    ).toBeInTheDocument()
  })
})
