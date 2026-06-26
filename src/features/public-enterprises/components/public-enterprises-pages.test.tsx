import type { ReactNode } from 'react'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMockPublicEnterpriseLandingSummary,
  getMockPublicEnterpriseProfile,
  searchMockPublicEnterprises,
} from '@/features/public-enterprises/mocks/fixtures'
import type { PublicEnterpriseProfileSearch } from '@/schemas/public-enterprise'

const navigateMock = vi.fn()
const landingSummaryMock = vi.fn()
const searchQueryMock = vi.fn()
const profileQueryMock = vi.fn()

type MockLinkProps = {
  readonly children: ReactNode
  readonly to: string
  readonly params?: Record<string, string>
  readonly search?: Record<string, unknown>
  readonly [key: string]: unknown
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: MockLinkProps) => (
    <a
      href={typeof to === 'string' ? to : '#'}
      data-to={to}
      data-params={JSON.stringify(params ?? null)}
      data-search={JSON.stringify(search ?? null)}
      {...props}
    >
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}))

vi.mock('../hooks/use-public-enterprises', () => ({
  usePublicEnterpriseLandingSummary: () => landingSummaryMock(),
  usePublicEnterpriseSearch: (search: unknown) => searchQueryMock(search),
  usePublicEnterpriseProfile: (cui: string) => profileQueryMock(cui),
}))

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: ReactNode }) => (
    <div data-testid="indicator-line-chart">{children}</div>
  ),
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

vi.mock('@/components/charts/safe-responsive-container', () => ({
  SafeResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="safe-responsive-container">{children}</div>
  ),
}))

function resolveNavigateSearch(
  call: { search?: unknown },
  previous: Record<string, unknown> = { tab: 'profil' },
): Record<string, unknown> {
  if (typeof call.search === 'function') {
    return (call.search as (prev: Record<string, unknown>) => Record<string, unknown>)(
      previous,
    )
  }
  return (call.search as Record<string, unknown> | undefined) ?? {}
}

function getLastNavigateCall(): { search?: unknown } {
  const calls = navigateMock.mock.calls
  return calls.length > 0 ? (calls[calls.length - 1][0] as { search?: unknown }) : {}
}

describe('PublicEnterprisesLandingRoute', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    landingSummaryMock.mockReset()
    searchQueryMock.mockReset()

    landingSummaryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: getMockPublicEnterpriseLandingSummary(),
    })
    searchQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: searchMockPublicEnterprises({ pageSize: 6 }),
    })
  })

  it('shows AMEPIP sample status, provenance affordance, and expandable lineage details', async () => {
    const { PublicEnterprisesLandingRoute } = await import('./public-enterprises-pages')
    render(<PublicEnterprisesLandingRoute />)

    expect(
      screen.getByRole('heading', { name: 'Întreprinderi publice de stat' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Indicatorii AMEPIP sunt rate și KPI, nu valori contabile absolute/),
    ).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Stare date: exemplu/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Sursă: AMEPIP \(OUG 109\/2011\)/)).toBeInTheDocument()

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Vezi proveniența datelor' })[0],
    )

    await waitFor(() => {
      expect(screen.getByText('Proveniență date')).toBeInTheDocument()
    })

    const drawer = screen.getByRole('dialog')
    expect(within(drawer).getByText('amepip-core-3a44f2c099fb711c')).toBeInTheDocument()
    expect(
      within(drawer).getByText('3a44f2c099fb711c3d0a83ddcd26941bac160f465680638fa2bc6dd8a52bbe27'),
    ).toBeInTheDocument()
    expect(within(drawer).getByText('CC-BY-4.0')).toBeInTheDocument()
    expect(
      within(drawer).getByRole('link', { name: 'Deschide sursa oficială' }),
    ).toHaveAttribute(
      'href',
      'https://data.gov.ro/dataset/5a4d4fdb-1e06-4ea6-a3b5-aef01ebba168/resource/8865d8b1-e5db-4a14-8721-9048af14cafe/download/datecompanii_ind-finnefin.xlsx',
    )
  })

  it('shows loading skeleton and error alert states', async () => {
    landingSummaryMock.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    })

    const { PublicEnterprisesLandingRoute } = await import('./public-enterprises-pages')
    const { container, rerender } = render(<PublicEnterprisesLandingRoute />)

    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    landingSummaryMock.mockReturnValue({
      isLoading: false,
      isError: true,
      data: getMockPublicEnterpriseLandingSummary(),
    })
    rerender(<PublicEnterprisesLandingRoute />)

    expect(screen.getByText('Nu am putut încărca sumarul')).toBeInTheDocument()
  })

  it('routes exact CUI search to the profile and text query to listing', async () => {
    const { PublicEnterprisesLandingRoute } = await import('./public-enterprises-pages')
    render(<PublicEnterprisesLandingRoute />)

    fireEvent.change(screen.getByLabelText('Caută întreprindere publică'), {
      target: { value: '10020943' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Caută' }).closest('form')!)

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/intreprinderi-publice/$cui',
      params: { cui: '10020943' },
      search: { tab: 'profil' },
    })

    navigateMock.mockReset()
    fireEvent.change(screen.getByLabelText('Caută întreprindere publică'), {
      target: { value: 'hidroelectrica' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Caută' }).closest('form')!)

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/intreprinderi-publice',
      search: { q: 'hidroelectrica' },
    })
  })
})

describe('PublicEnterprisesListingRoute', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    searchQueryMock.mockReset()
  })

  it('renders search results, gated facet messaging, and profile row links', async () => {
    const search = { q: 'sa', page: 1, sort: 'legalName' as const }
    searchQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: searchMockPublicEnterprises(search),
    })

    const { PublicEnterprisesListingRoute } = await import('./public-enterprises-pages')
    render(<PublicEnterprisesListingRoute search={search} />)

    expect(
      screen.getByRole('heading', { name: 'Lista întreprinderilor publice' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Filtrele pentru sancțiuni, ajutor de stat și autoritate rămân marcate ca gated/),
    ).toBeInTheDocument()
    expect(screen.getByText(/rezultate în fixture/)).toBeInTheDocument()
    expect(screen.getByText('Subordonare')).toBeInTheDocument()
    expect(screen.getAllByText('Disponibil după deblocarea sursei.').length).toBeGreaterThan(0)

    const profileLink = screen.getByRole('link', {
      name: /ADMINISTRAREA DOMENIULUI PUBLIC BUCURESTI/i,
    })
    expect(profileLink).toHaveAttribute('data-to', '/intreprinderi-publice/$cui')
    expect(profileLink).toHaveAttribute(
      'data-params',
      JSON.stringify({ cui: '10020943' }),
    )
    expect(profileLink).toHaveAttribute(
      'data-search',
      JSON.stringify({ tab: 'profil' }),
    )
    expect(screen.getByText(/Sursă afișată:/)).toBeInTheDocument()
  })

  it('shows empty results and listing error states', async () => {
    searchQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: searchMockPublicEnterprises({ q: 'zzzz-no-match-xyz' }),
    })

    const { PublicEnterprisesListingRoute } = await import('./public-enterprises-pages')
    const { container, rerender } = render(
      <PublicEnterprisesListingRoute search={{ q: 'zzzz-no-match-xyz' }} />,
    )

    expect(
      screen.getByText('Nicio întreprindere nu se potrivește filtrelor.'),
    ).toBeInTheDocument()

    searchQueryMock.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    })
    rerender(
      <PublicEnterprisesListingRoute search={{ q: 'zzzz-no-match-xyz' }} />,
    )
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    searchQueryMock.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    })
    rerender(
      <PublicEnterprisesListingRoute search={{ q: 'zzzz-no-match-xyz' }} />,
    )
    expect(screen.getByText('Nu am putut încărca lista')).toBeInTheDocument()
  })
})

describe('PublicEnterpriseProfileRoute', () => {
  const adpbProfile = getMockPublicEnterpriseProfile('10020943')!

  beforeEach(() => {
    navigateMock.mockReset()
    profileQueryMock.mockReset()
    profileQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: adpbProfile,
    })
  })

  async function renderProfile(search: PublicEnterpriseProfileSearch = { tab: 'profil' }) {
    const { PublicEnterpriseProfileRoute } = await import('./public-enterprises-pages')
    return render(
      <PublicEnterpriseProfileRoute
        profile={adpbProfile}
        cui="10020943"
        search={search}
      />,
    )
  }

  it('renders AMEPIP identity, KPI safety copy, tab navigation, and source footer', async () => {
    await renderProfile({ tab: 'profil' })

    expect(
      screen.getByRole('heading', {
        name: 'ADMINISTRAREA DOMENIULUI PUBLIC BUCURESTI (A.D.P.B.) SA',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Profil AMEPIP')).toBeInTheDocument()
    expect(
      screen.getByText(/Rate\/KPI AMEPIP, afișate fără transformare în valori contabile/),
    ).toBeInTheDocument()
    expect(screen.getAllByText('KPI').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/0,0425 %/).length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: /Profil/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText(/Indicatorii AMEPIP sunt afișați fără scalare în client/)).toBeInTheDocument()
  })

  it('navigates to indicatori from headline and profile summary actions', async () => {
    await renderProfile({ tab: 'profil' })

    fireEvent.click(screen.getByRole('button', { name: 'Toți indicatorii' }))
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/intreprinderi-publice/$cui',
        params: { cui: '10020943' },
      }),
    )
    expect(resolveNavigateSearch(navigateMock.mock.calls[0][0])).toEqual(
      expect.objectContaining({ tab: 'indicatori' }),
    )

    navigateMock.mockReset()
    fireEvent.click(screen.getByRole('button', { name: 'Vezi indicatorii' }))
    expect(resolveNavigateSearch(navigateMock.mock.calls[0][0])).toEqual(
      expect.objectContaining({ tab: 'indicatori' }),
    )
  })

  it('updates indicator tab search for year, sheet, view, and KPI while preserving tab=indicatori', async () => {
    await renderProfile({ tab: 'indicatori' })

    fireEvent.click(screen.getByRole('button', { name: '2021' }))
    expect(resolveNavigateSearch(getLastNavigateCall())).toEqual(
      expect.objectContaining({ tab: 'indicatori', years: [2021] }),
    )

    fireEvent.change(screen.getByLabelText('Foaie sursă'), {
      target: { value: 'form' },
    })
    expect(resolveNavigateSearch(getLastNavigateCall())).toEqual(
      expect.objectContaining({ tab: 'indicatori', sheet: 'form' }),
    )

    fireEvent.change(screen.getByLabelText('Vizualizare'), {
      target: { value: 'table' },
    })
    expect(resolveNavigateSearch(getLastNavigateCall())).toEqual(
      expect.objectContaining({ tab: 'indicatori', view: 'table' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'NB' }))
    expect(resolveNavigateSearch(getLastNavigateCall())).toEqual(
      expect.objectContaining({ tab: 'indicatori', kpis: expect.arrayContaining(['NB']) }),
    )

    expect(
      screen.getAllByText(/indicator\/KPI AMEPIP, nu valoare contabilă absolută/).length,
    ).toBeGreaterThan(0)
  })

  it('redirects invalid or unavailable tabs back to profil', async () => {
    await renderProfile({ tab: 'bursa' })

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/intreprinderi-publice/$cui',
          params: { cui: '10020943' },
          replace: true,
        }),
      )
    })
    expect(resolveNavigateSearch(getLastNavigateCall())).toEqual(
      expect.objectContaining({ tab: 'profil' }),
    )
  })

  it('shows gated supplemental lanes with în curând messaging and sanctions privacy guardrail', async () => {
    const { PublicEnterpriseProfileRoute } = await import('./public-enterprises-pages')
    const { rerender } = render(
      <PublicEnterpriseProfileRoute
        profile={adpbProfile}
        cui="10020943"
        search={{ tab: 'profil' }}
      />,
    )

    fireEvent.click(screen.getByRole('tab', { name: /Sancțiuni/i }))
    expect(resolveNavigateSearch(getLastNavigateCall())).toEqual(
      expect.objectContaining({ tab: 'sanctiuni' }),
    )

    rerender(
      <PublicEnterpriseProfileRoute
        profile={adpbProfile}
        cui="10020943"
        search={{ tab: 'sanctiuni' }}
      />,
    )

    const sanctionsPanel = screen.getByRole('tabpanel', { name: /Sancțiuni/i })

    expect(
      within(sanctionsPanel).getByText(/Această secțiune va folosi sursa AMEPIP OUG 109, dar nu este încă live în API/),
    ).toBeInTheDocument()
    expect(
      within(sanctionsPanel).getByText(/Nu afișăm date simulate ca rezultate reale/),
    ).toBeInTheDocument()
    expect(
      within(sanctionsPanel).getByText(/Câmpul persoană responsabilă rămâne raw-only și nu este expus în UI/),
    ).toBeInTheDocument()
    expect(within(sanctionsPanel).queryByText(/persoana responsabilă:/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Autoritate/i }))
    expect(resolveNavigateSearch(getLastNavigateCall())).toEqual(
      expect.objectContaining({ tab: 'autoritate' }),
    )

    rerender(
      <PublicEnterpriseProfileRoute
        profile={adpbProfile}
        cui="10020943"
        search={{ tab: 'autoritate' }}
      />,
    )

    const authorityPanel = screen.getByRole('tabpanel', { name: /Autoritate/i })
    expect(
      within(authorityPanel).getByText(/Această secțiune va folosi sursa S1001 \/ json_apt, dar nu este încă live în API/),
    ).toBeInTheDocument()
  })

  it('keeps refresh errors visible while showing loader profile data', async () => {
    profileQueryMock.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    })

    await renderProfile({ tab: 'profil' })

    expect(
      screen.getByText('Datele profilului nu s-au putut reîmprospăta'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: 'ADMINISTRAREA DOMENIULUI PUBLIC BUCURESTI (A.D.P.B.) SA',
      }),
    ).toBeInTheDocument()
  })

  it('does not fabricate live supplemental lane data in fixture profiles', async () => {
    await renderProfile({ tab: 'profil' })

    expect(adpbProfile.lanes.filter((lane) => lane.available)).toEqual([
      expect.objectContaining({ laneId: 'amepip-core', dataStatus: 'sample' }),
    ])
    expect(adpbProfile.sanctionsSummary?.hasSanctions).toBeNull()
    expect(adpbProfile.authoritySummary?.controllingAuthority).toBeNull()
    expect(adpbProfile.stateAidSummary?.count).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: /Ajutor de stat/i }))
    expect(
      screen.getByText(/Această secțiune va folosi sursa RegAS, dar nu este încă live în API/),
    ).toBeInTheDocument()
  })
})

describe('PublicEnterprisePageSkeleton and PublicEnterpriseNotFound', () => {
  it('renders skeleton placeholders and not-found recovery link', async () => {
    const {
      PublicEnterprisePageSkeleton,
      PublicEnterpriseNotFound,
    } = await import('./public-enterprises-pages')

    const { container } = render(<PublicEnterprisePageSkeleton />)
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)

    render(<PublicEnterpriseNotFound />)
    expect(screen.getByText('Întreprinderea nu a fost găsită')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vezi lista' })).toHaveAttribute(
      'data-to',
      '/intreprinderi-publice',
    )
  })
})
