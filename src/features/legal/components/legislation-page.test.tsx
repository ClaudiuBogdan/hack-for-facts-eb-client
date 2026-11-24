import type { ReactNode } from 'react'
import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { legislationOverviewFixture } from '../mocks/fixtures/legislation-overview'
import { legislationDomainCountsFixture } from '../mocks/fixtures/legislation-domain-counts'
import { LegislationPage } from './legislation-page'

const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useSearch: () => ({}),
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
  useLegislationFrontDoor: vi.fn(),
  useLegislationDomainCounts: vi.fn(),
  useLegislationStatusCounts: vi.fn(),
  useLegislationFreshness: vi.fn(),
}))

import {
  useLegislationDomainCounts,
  useLegislationFrontDoor,
  useLegislationFreshness,
  useLegislationStatusCounts,
} from '../hooks/use-legislation'
import { legislationFreshnessFixture } from '../mocks/fixtures/legislation-freshness'
import { legislationStatusCountsFixture } from '../mocks/fixtures/legislation-status-counts'

function mockOverviewReady() {
  vi.mocked(useLegislationFrontDoor).mockReturnValue({
    data: legislationOverviewFixture,
    isLoading: false,
    isError: false,
  } as unknown as ReturnType<typeof useLegislationFrontDoor>)
  vi.mocked(useLegislationDomainCounts).mockReturnValue({
    data: legislationDomainCountsFixture,
    isError: false,
  } as unknown as ReturnType<typeof useLegislationDomainCounts>)
  vi.mocked(useLegislationStatusCounts).mockReturnValue({
    data: legislationStatusCountsFixture,
    isError: false,
  } as unknown as ReturnType<typeof useLegislationStatusCounts>)
  vi.mocked(useLegislationFreshness).mockReturnValue({
    data: legislationFreshnessFixture,
    isError: false,
  } as unknown as ReturnType<typeof useLegislationFreshness>)
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
    // the old subject grid is gone: subjects come back with the domain lens
    expect(screen.queryByRole('region', { name: 'Domenii' })).not.toBeInTheDocument()
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
    // (the analytics board of the most amended acts is the front door's now; the citation ranking is not)
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

  it('counts the corpus from the published insights layer', async () => {
    render(<LegislationPage />)

    // the mock lane serves real answers of the server's usecase (fixture header)
    expect(await screen.findByText('acte în corpus')).toBeInTheDocument()
    expect(screen.getByText('au text citibil în Portal')).toBeInTheDocument()
    expect(screen.getByText('acte în stoc')).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Ce s-a publicat pe an' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Teme' })).toHaveTextContent('în curând')
    expect(screen.getByText(/Citite independent 385 de acte: 94%/)).toBeInTheDocument()
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
    // an inert span would silently unship the tab.
    expect(screen.getByText('Modificări')).toHaveAttribute(
      'href',
      '/legislation/changes',
    )
    // The last inert tab went live 2026-08-26 — every tab is a link now.
    expect(screen.getByText('Ghid')).toHaveAttribute(
      'href',
      '/legislation/guide',
    )
    expect(screen.getByText('Ghid')).not.toHaveAttribute('aria-disabled')
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
    vi.mocked(useLegislationFrontDoor).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof useLegislationFrontDoor>)

    render(<LegislationPage />)

    expect(
      screen.getByLabelText('Se încarcă prezentarea legislației'),
    ).toBeInTheDocument()
  })

  it('keeps the rest of the page when the gazette band fails', () => {
    vi.mocked(useLegislationFrontDoor).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useLegislationFrontDoor>)

    render(<LegislationPage />)

    expect(
      screen.queryByRole('heading', { name: 'Ultimele numere din Monitorul Oficial' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/nu modifică statutul actelor pe care le vizează/)).toBeInTheDocument()
  })
})
