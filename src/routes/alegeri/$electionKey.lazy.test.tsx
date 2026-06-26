import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { electionsNavigateMock } from '@/features/elections/test/elections-router-mock'
import {
  DEFAULT_ELECTION_HUB_SEARCH,
  type ElectionHubSearch,
} from '@/schemas/elections'
import {
  createTestQueryClient,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

let mockedSearch: ElectionHubSearch = DEFAULT_ELECTION_HUB_SEARCH
let mockedParams = { electionKey: 'local-2024' }

vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink, electionsNavigateMock, createMockLazyFileRoute } =
    await import('@/features/elections/test/elections-router-mock')

  return {
    Link: MockElectionsLink,
    useNavigate: () => electionsNavigateMock,
    createLazyFileRoute: createMockLazyFileRoute(
      () => mockedSearch,
      () => mockedParams,
    ),
  }
})

describe('ElectionHubRoutePage', () => {
  beforeEach(() => {
    mockedSearch = { ...DEFAULT_ELECTION_HUB_SEARCH }
    mockedParams = { electionKey: 'local-2024' }
    electionsNavigateMock.mockReset()
  })

  it('passes params/search and navigates on hub interactions', async () => {
    const user = userEvent.setup()
    const { Route } = await import('./$electionKey.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />, { queryClient: createTestQueryClient() })

    expect(await screen.findByRole('heading', { name: 'Alegeri locale 2024' })).toBeInTheDocument()
    expect(screen.getByText('Primar - Cluj-Napoca')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Concursul este listat in hub, dar explorerul mock este conectat doar pentru fixture-ul Cluj-Napoca primar.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Deschide/i })).toHaveAttribute(
      'href',
      '/alegeri/contest/local-2024-cluj-napoca-primar',
    )

    await user.click(screen.getByRole('tab', { name: 'Sumar' }))
    await waitFor(() => {
      expect(electionsNavigateMock).toHaveBeenCalledWith({
        search: expect.objectContaining({ tab: 'sumar' }),
        replace: true,
      })
    })

    electionsNavigateMock.mockClear()
    fireEvent.change(screen.getByPlaceholderText('Filtreaza dupa functie sau localitate'), {
      target: { value: 'zzzz-no-match' },
    })
    expect(electionsNavigateMock).toHaveBeenCalledWith({
      search: expect.objectContaining({ q: 'zzzz-no-match' }),
      replace: true,
    })
  })
})
