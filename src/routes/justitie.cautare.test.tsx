import { fireEvent, render, screen } from '@/test/test-utils'
import { mockCaseSearchResult } from '@/features/justice/mocks/fixtures'
import type { CaseSearchResult } from '@/schemas/justice'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()
const useCaseSearchMock = vi.fn()
let mockedSearch: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
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
  useCaseSearch: (search: Record<string, unknown>) => useCaseSearchMock(search),
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

function mockCaseSearchQuery(data: CaseSearchResult | null) {
  useCaseSearchMock.mockReturnValue({
    isLoading: false,
    isError: false,
    isFetching: false,
    data,
  })
}

describe('Justice search route', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useCaseSearchMock.mockReset()
    mockedSearch = { page: 1, pageSize: 25 }
    mockCaseSearchQuery(mockCaseSearchResult)
  })

  it('renders publishable rows, provenance, privacy copy, and party previews', async () => {
    mockedSearch = { page: 1, pageSize: 25, from: 'cautare' }

    const { Route } = await import('./justitie.cautare')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Caută cauze' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Nu există căutare full-text sau după persoane/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/3 rezultate publicabile/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Persoanele fizice sunt agregate, nu afișate nominal/i),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/date dense din 2021 • fără ICCJ • doar metadata/i).length,
    ).toBeGreaterThan(0)

    expect(screen.getAllByText('1234/3/2024').length).toBeGreaterThan(0)
    expect(screen.getAllByText('S.C. EXEMPLU COMERCIAL SA').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/3 persoane fizice agregate/i).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/Fără părți publicabile în previzualizare/i).length,
    ).toBeGreaterThan(0)
  })

  it('updates URL search on exact case-number lookup and blocks free text', async () => {
    mockedSearch = { page: 2, court: 'TB-BUCURESTI' }

    const { Route } = await import('./justitie.cautare')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    const input = screen.getByLabelText(/Număr dosar/i)
    fireEvent.change(input, { target: { value: 'nume persoana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Caută dosar' }))

    expect(
      screen.getByText(/Căutarea liberă nu este păstrată/i),
    ).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: '1234/3/2024' } })
    fireEvent.click(screen.getByRole('button', { name: 'Caută dosar' }))

    expect(navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
    })
    const nextSearch = navigateMock.mock.calls[0]?.[0]?.search({
      page: 2,
      court: 'TB-BUCURESTI',
    })
    expect(nextSearch).toMatchObject({
      page: 1,
      court: 'TB-BUCURESTI',
      caseNumber: '1234/3/2024',
    })
  })

  it('resets filters through URL navigation', async () => {
    mockedSearch = {
      page: 2,
      court: 'TB-BUCURESTI',
      category: 'civil',
      caseNumber: '1234/3/2024',
    }

    const { Route } = await import('./justitie.cautare')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'Șterge filtrele' }))

    expect(navigateMock).toHaveBeenCalledWith({
      search: expect.any(Function),
    })
    const nextSearch = navigateMock.mock.calls[0]?.[0]?.search({
      page: 2,
      court: 'TB-BUCURESTI',
      category: 'civil',
      caseNumber: '1234/3/2024',
    })
    expect(nextSearch).toEqual({ page: 1 })
  })

  it('shows a no-coverage empty state when filters return zero rows', async () => {
    mockedSearch = { court: 'NO-COVERAGE' }
    mockCaseSearchQuery({
      ...mockCaseSearchResult,
      rows: [],
      pagination: { page: 1, pageSize: 25, total: 0 },
      provenance: {
        ...mockCaseSearchResult.provenance,
        coverageNote:
          'nu am găsit cauze publicabile în acoperirea curentă • date dense din 2021 • fără ICCJ',
      },
    })

    const { Route } = await import('./justitie.cautare')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(
      screen.getByText(/Nu am găsit cauze publicabile pentru aceste filtre/i),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/nu am găsit cauze publicabile în acoperirea curentă/i).length,
    ).toBeGreaterThan(0)
  })

  it('shows not-found coverage when the adapter returns null', async () => {
    mockCaseSearchQuery(null)

    const { Route } = await import('./justitie.cautare')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(
      screen.getByText(/Nu există rezultate pentru acest set de filtre/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Acesta este un rezultat de acoperire, nu o confirmare de inexistență/i),
    ).toBeInTheDocument()
  })
})
