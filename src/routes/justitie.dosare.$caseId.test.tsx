import { fireEvent, render, screen } from '@/test/test-utils'
import { mockJudicialCaseSparsePersonsOnly } from '@/features/justice/mocks/fixtures'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()
const useJudicialCaseMock = vi.fn()
let mockedParams = { caseId: 'portal-just-sparse-persons' }
let mockedSearch: Record<string, unknown> = { tab: 'cronologie' }

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
  useJudicialCase: (caseId: string) => useJudicialCaseMock(caseId),
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

describe('Justice case detail route', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useJudicialCaseMock.mockReset()
    mockedParams = { caseId: 'portal-just-sparse-persons' }
    mockedSearch = { tab: 'cronologie' }
    useJudicialCaseMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockJudicialCaseSparsePersonsOnly,
    })
  })

  it('shows trust states and switches tabs through URL search', async () => {
    const { Route } = await import('./justitie.dosare.$caseId')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByRole('heading', { level: 1, name: '88/99/2021' })).toBeInTheDocument()
    expect(screen.getAllByText(/doar metadata/i).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/dosar mock cu doar părți nepublicabile • persoanele sunt agregate pe rol/i)
        .length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByText(/Persoanele fizice apar doar ca număr agregat pe rol/i),
    ).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Părți' }))

    expect(navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
    })
    const nextSearch = navigateMock.mock.calls[0]?.[0]?.search({ tab: 'cronologie' })
    expect(nextSearch).toEqual({ tab: 'parti' })
  })

  it('shows aggregate person counts on the parties tab without raw person names', async () => {
    mockedSearch = { tab: 'parti', from: 'cautare' }

    const { Route } = await import('./justitie.dosare.$caseId')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByText(/Agregate nepublicabile/i)).toBeInTheDocument()
    expect(screen.getByText('Reclamant')).toBeInTheDocument()
    expect(screen.getByText('Pârât')).toBeInTheDocument()
    expect(screen.getAllByText(/1 persoane fizice/i)).toHaveLength(2)
    expect(
      screen.getByText(/Nu există companii sau instituții publice în fixture/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Ion Popescu$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Maria Ionescu$/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Înapoi la căutare/i })).toBeInTheDocument()
  })
})
