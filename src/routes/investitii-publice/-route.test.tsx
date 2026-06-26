import type { ComponentType, ReactNode } from 'react'
import { fireEvent, render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePublicInvestmentsEvidence } from '@/features/public-investments/components/PublicInvestmentsEvidenceContext'
import { MOCK_LANDING_DATA } from '@/features/public-investments/mocks/public-investments-mock-data'
const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: {} as Record<string, unknown>,
}))

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: () => routerMocks.search,
  }),
  Link: ({
    to,
    children,
    ...props
  }: {
    readonly to: string
    readonly children: ReactNode
    readonly [key: string]: unknown
  }) => (
    <a href={typeof to === 'string' ? to : '#'} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => routerMocks.navigate,
  Outlet: function MockOutlet() {
    const { openEvidence } = usePublicInvestmentsEvidence()
    return (
      <button
        type="button"
        onClick={() => openEvidence(MOCK_LANDING_DATA.kpis.evidenceRef)}
      >
        Deschide dovada din pagină
      </button>
    )
  },
}))

vi.mock('@/features/public-investments/hooks/use-public-investments-data', () => ({
  useEvidenceDetail: vi.fn(() => ({
    data: undefined,
    isBlocked: false,
    blockedReason: undefined,
    blockedMessageKey: undefined,
    blockedMessageParams: undefined,
    isLoading: false,
    isFetching: false,
    isPlaceholderData: false,
    isStale: false,
    isEmpty: false,
    isError: false,
    error: null,
  })),
}))

describe('investitii-publice layout route', () => {
  beforeEach(() => {
    routerMocks.navigate.mockReset()
    routerMocks.search = {}
  })

  it('renders layout navigation and writes dovada search param when evidence opens', async () => {
    const { Route } = await import('./route')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByText('Investiții publice')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privire generală' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Căutare' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Deschide dovada din pagină' }))

    expect(routerMocks.navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        replace: false,
      }),
    )

    const navigateArg = routerMocks.navigate.mock.calls[0]?.[0] as {
      readonly search?: (previous: Record<string, unknown>) => Record<string, unknown>
    }
    expect(typeof navigateArg.search).toBe('function')
    expect(navigateArg.search?.({})).toEqual(
      expect.objectContaining({
        dovada: MOCK_LANDING_DATA.kpis.evidenceRef.sourceRowKey,
      }),
    )
  })
})
