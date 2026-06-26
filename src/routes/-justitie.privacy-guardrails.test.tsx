import { fireEvent, render, screen } from '@/test/test-utils'
import { mockCaseSearchResult } from '@/features/justice/mocks/fixtures'
import {
  sanitizeJusticeUrl,
  sanitizeJusticeUrlFragment,
} from '@/lib/privacy/sensitive-route-sanitizer'
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

describe('Justice privacy guardrails', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    useCaseSearchMock.mockReset()
    mockedSearch = { page: 1, pageSize: 25, from: 'cautare' }
    useCaseSearchMock.mockReturnValue({
      isLoading: false,
      isError: false,
      isFetching: false,
      data: mockCaseSearchResult,
    })
  })

  it('keeps sensitive search params in UI links but strips them for telemetry URLs', async () => {
    const { Route } = await import('./justitie.cautare')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    const detailLink = screen.getAllByRole('link', { name: /Deschide dosarul|Deschide/i })[0]
    expect(detailLink).toHaveAttribute(
      'data-search',
      JSON.stringify({ from: 'cautare' }),
    )

    const partyLink = screen.getAllByRole('link', {
      name: 'S.C. EXEMPLU COMERCIAL SA',
    })[0]
    const partySearch = JSON.parse(partyLink.getAttribute('data-search') ?? '{}') as Record<
      string,
      string
    >
    expect(partySearch).toMatchObject({
      partyKey: 'sc-exemplu-comercial-sa',
      court: 'TB-BUCURESTI',
      from: 'cautare',
    })

    const telemetryUrl = sanitizeJusticeUrl(
      `https://transparenta.eu/justitie/cautare?court=${partySearch.court}&partyKey=${partySearch.partyKey}&from=${partySearch.from}`,
    )
    expect(telemetryUrl).toBe('https://transparenta.eu/justitie/cautare?court=TB-BUCURESTI')

    const companyTelemetry = sanitizeJusticeUrlFragment(
      '/companies/9000002?tab=litigii&litPage=2&partyKey=secret&caseNumber=1234/3/2024&from=companies:9000002',
    )
    expect(companyTelemetry).toBe('/companies/9000002?tab=litigii&litPage=2')

    const caseTelemetry = sanitizeJusticeUrlFragment(
      '/justitie/dosare/portal-just-bucuresti-2024-001?caseNumber=1234/3/2024&court=TB-BUCURESTI',
    )
    expect(caseTelemetry).toBe('/justitie/dosare/:caseId?court=TB-BUCURESTI')
  })

  it('does not persist person-name free text in justice search navigation', async () => {
    mockedSearch = { page: 1 }

    const { Route } = await import('./justitie.cautare')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    const input = screen.getByLabelText(/Număr dosar/i)
    fireEvent.change(input, { target: { value: 'Maria Ionescu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Caută dosar' }))

    expect(navigateMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Căutarea liberă nu este păstrată/i)).toBeInTheDocument()
  })
})
