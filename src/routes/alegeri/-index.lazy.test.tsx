import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { electionsNavigateMock } from '@/features/elections/test/elections-router-mock'
import {
  DEFAULT_ELECTIONS_LANDING_SEARCH,
  type ElectionsLandingSearch,
} from '@/schemas/elections'
import {
  createTestQueryClient,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

let mockedSearch: ElectionsLandingSearch = DEFAULT_ELECTIONS_LANDING_SEARCH

vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink, electionsNavigateMock, createMockLazyFileRoute } =
    await import('@/features/elections/test/elections-router-mock')

  return {
    Link: MockElectionsLink,
    useNavigate: () => electionsNavigateMock,
    createLazyFileRoute: createMockLazyFileRoute(() => mockedSearch),
  }
})

describe('AlegeriLandingRoutePage', () => {
  beforeEach(() => {
    mockedSearch = { ...DEFAULT_ELECTIONS_LANDING_SEARCH }
    electionsNavigateMock.mockReset()
  })

  it('passes search to the landing page and navigates on filter interactions', async () => {
    const user = userEvent.setup()
    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />, { queryClient: createTestQueryClient() })

    expect(await screen.findByRole('heading', { name: 'Rezultate alegeri' })).toBeInTheDocument()
    expect(await screen.findByText('Date demonstrative (mock)')).toBeInTheDocument()
    expect(await screen.findByText('Alegeri locale 2024')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Exista scrutine istorice ascunse; activeaza arhiva pentru a le vedea.',
      ),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Cauta dupa nume, an sau autoritate'), {
      target: { value: 'cluj' },
    })
    expect(electionsNavigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: expect.objectContaining({ q: 'cluj' }),
        replace: true,
      }),
    )

    electionsNavigateMock.mockClear()
    await user.click(screen.getByRole('button', { name: 'Locale' }))
    await waitFor(() => {
      expect(electionsNavigateMock).toHaveBeenCalledWith({
        search: expect.objectContaining({
          family: ['local'],
        }),
        replace: true,
      })
    })

    electionsNavigateMock.mockClear()
    await user.click(screen.getByRole('switch'))
    await waitFor(() => {
      expect(electionsNavigateMock).toHaveBeenCalledWith({
        search: expect.objectContaining({ arhiva: 1 }),
        replace: true,
      })
    })
  })
})
