import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { landingDataMock } from '@/features/legal/mocks/fixtures'

const navigateMock = vi.fn()
let mockedSearch: { q?: string } = {}

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: () => mockedSearch,
  }),
  useSearch: () => mockedSearch,
  useNavigate: () => navigateMock,
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    readonly children: React.ReactNode
    readonly to: string
    readonly params?: { readonly id?: string }
  }) => (
    <a
      href={params?.id ? `${to.replace('$id', params.id)}` : to}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock('@/features/legal/hooks/use-legal-landing-data', () => ({
  useLegalLandingData: vi.fn(),
}))

import { useLegalLandingData } from '@/features/legal/hooks/use-legal-landing-data'

describe('Legal landing lazy route', () => {
  beforeEach(() => {
    mockedSearch = {}
    navigateMock.mockReset()
    vi.mocked(useLegalLandingData).mockReturnValue({
      data: landingDataMock,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLegalLandingData>)
  })

  it('renders the legal landing page', async () => {
    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Legislație' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Date mock')).toBeInTheDocument()
    expect(screen.getByText('Modificate recent')).toBeInTheDocument()
    expect(screen.getByText('Azi în Monitorul Oficial')).toBeInTheDocument()
  })
})
