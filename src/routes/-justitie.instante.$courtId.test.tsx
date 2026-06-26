import { fireEvent, render, screen } from '@/test/test-utils'
import { mockCourtCaseloadBucuresti } from '@/features/justice/mocks/fixtures'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()
const useCourtCaseloadMock = vi.fn()
let mockedParams = { courtId: 'TB-BUCURESTI' }
let mockedSearch: Record<string, unknown> = { tab: 'prezentare' }

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
  }),
  useNavigate: () => navigateMock,
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
    readonly search?: Record<string, unknown>
    readonly [key: string]: unknown
  }) => (
    <a
      href={to}
      data-params={params ? JSON.stringify(params) : undefined}
      data-search={search ? JSON.stringify(search) : undefined}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock('@/features/justice/hooks/use-justice-data', () => ({
  useCourtCaseload: (courtId: string, search: Record<string, unknown>) =>
    useCourtCaseloadMock(courtId, search),
  getJusticeQueryOutcome: (value: unknown) => {
    if (value === undefined) return undefined
    if (value === null) return { kind: 'notFound' }
    if (
      typeof value === 'object' &&
      value !== null &&
      (value as { status?: unknown }).status === 'unavailable'
    ) {
      return { kind: 'unavailable', unavailable: value }
    }
    return { kind: 'populated', data: value }
  },
}))

describe('Justice court detail route', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useCourtCaseloadMock.mockReset()
    mockedParams = { courtId: 'TB-BUCURESTI' }
    mockedSearch = { tab: 'prezentare' }
    useCourtCaseloadMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockCourtCaseloadBucuresti,
    })
  })

  it('renders court metrics and provenance without claiming live backend data', async () => {
    const { Route } = await import('./justitie.instante.$courtId')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Tribunalul București' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Date demonstrative/i)).toBeInTheDocument()
    expect(
      screen.getAllByText(/date dense din 2021 • fără ICCJ • doar metadata/i).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(/312[.,\s]000/)).toBeInTheDocument()
  })

  it('shows publishable litigants with confidence and filtered search links', async () => {
    mockedSearch = { tab: 'litiganti' }

    const { Route } = await import('./justitie.instante.$courtId')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByText(/Litiganți publicabili/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Legăturile companie-dosar sunt candidați pe bază de nume publicabil/i),
    ).toBeInTheDocument()
    expect(screen.getByText('S.C. EXEMPLU PRHO SA')).toBeInTheDocument()
    expect(screen.getAllByText(/A · Încredere ridicată/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/B · Încredere medie/i)).toBeInTheDocument()

    const searchLink = screen.getAllByRole('link', { name: /Vezi cauzele/i })[0]
    expect(searchLink).toHaveAttribute('href', '/justitie/cautare')
    expect(searchLink).toHaveAttribute(
      'data-search',
      JSON.stringify({
        court: 'TB-BUCURESTI',
        partyKey: 'sct-prahova-administratie-publica',
        from: 'instante:TB-BUCURESTI',
      }),
    )
  })

  it('switches analytics tabs through URL search', async () => {
    const { Route } = await import('./justitie.instante.$courtId')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Volum' }))

    expect(navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
    })
    const nextSearch = navigateMock.mock.calls[0]?.[0]?.search({ tab: 'prezentare' })
    expect(nextSearch).toEqual({ tab: 'volum' })
  })

  it('shows zero-coverage messaging for courts without publishable litigants', async () => {
    mockedParams = { courtId: 'NO-COVERAGE' }
    mockedSearch = { tab: 'litiganti' }
    useCourtCaseloadMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        ...mockCourtCaseloadBucuresti,
        court: {
          ...mockCourtCaseloadBucuresti.court,
          institutionCode: 'NO-COVERAGE',
          courtName: 'Instanță fără acoperire mock',
        },
        headline: {
          ...mockCourtCaseloadBucuresti.headline,
          totalCases: 0,
        },
        topLitigants: [],
        provenance: {
          ...mockCourtCaseloadBucuresti.provenance,
          status: 'partial',
        },
      },
    })

    const { Route } = await import('./justitie.instante.$courtId')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(
      screen.getByText(/Nu există litiganți publicabili pentru această instanță/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Nu am găsit cauze în intervalul acoperit pentru această instanță/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/Date parțiale/i)).toBeInTheDocument()
  })
})
