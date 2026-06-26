import { fireEvent, render, screen } from '@/test/test-utils'
import { mockJusticeOverview } from '@/features/justice/mocks/fixtures'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()
const useJusticeOverviewMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
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
  useJusticeOverview: () => useJusticeOverviewMock(),
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

describe('Justice landing route', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useJusticeOverviewMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: mockJusticeOverview,
    })
  })

  it('renders the domain surface, trust copy, and high-volume court links', async () => {
    const { Route } = await import('./justitie.index')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Justiție' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Metadata publică, cu persoane protejate structural/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Afișăm metadata publică despre dosare, nu documente sau căutare/i),
    ).toBeInTheDocument()
    expect(
      screen.getAllByText(/date dense din 2021 • fără ICCJ • doar metadata/i).length,
    ).toBeGreaterThan(0)

    const tribunalLink = screen.getByRole('link', { name: /Tribunalul București/i })
    expect(tribunalLink).toHaveAttribute('href', '/justitie/instante/$courtId')
    expect(tribunalLink).toHaveAttribute(
      'data-params',
      JSON.stringify({ courtId: 'TB-BUCURESTI' }),
    )
    expect(screen.getByText(/Instanțe cu volum ridicat/i)).toBeInTheDocument()
  })

  it('blocks invalid free-text lookup and navigates on an exact case number', async () => {
    const { Route } = await import('./justitie.index')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    const input = screen.getByLabelText(/Caută după număr exact de dosar/i)
    fireEvent.change(input, { target: { value: 'Ion Popescu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Caută' }))

    expect(
      screen.getByText(/Textul liber nu este păstrat în URL/i),
    ).toBeInTheDocument()
    expect(navigateMock).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { value: '1234/3/2024' } })
    fireEvent.click(screen.getByRole('button', { name: 'Caută' }))

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/justitie/cautare',
      search: { caseNumber: '1234/3/2024' },
    })
  })
})
