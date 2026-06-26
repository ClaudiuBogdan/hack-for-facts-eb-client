import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { electionsNavigateMock } from '@/features/elections/test/elections-router-mock'
import {
  DEFAULT_CONTEST_SEARCH,
  type ContestSearch,
} from '@/schemas/elections'
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

let mockedSearch: ContestSearch = DEFAULT_CONTEST_SEARCH
let mockedParams = { contestKey: 'local-2024-cluj-napoca-primar' }

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

describe('ContestResultRoutePage', () => {
  beforeEach(() => {
    mockedSearch = { ...DEFAULT_CONTEST_SEARCH }
    mockedParams = { contestKey: 'local-2024-cluj-napoca-primar' }
    electionsNavigateMock.mockReset()
  })

  it('passes params/search and navigates on explorer interactions', async () => {
    const user = userEvent.setup()
    const { Route } = await import('./$contestKey.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />, { queryClient: createTestQueryClient() })

    expect(await screen.findByText('Rezultate alegeri')).toBeInTheDocument()
    expect(await screen.findAllByText('EMIL BOC - PNL')).not.toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Harta' }))
    await waitFor(() => {
      expect(electionsNavigateMock).toHaveBeenCalledWith({
        search: expect.objectContaining({ view: 'harta' }),
        replace: true,
      })
    })

    electionsNavigateMock.mockClear()
    await user.click(screen.getByRole('button', { name: 'Mod expert' }))
    await waitFor(() => {
      expect(electionsNavigateMock).toHaveBeenCalledWith({
        search: expect.objectContaining({ expert: 1 }),
        replace: true,
      })
    })
  })

  it('shows not-found state for unknown contest keys', async () => {
    mockedParams = { contestKey: 'unknown-contest' }
    const { Route } = await import('./$contestKey.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />, { queryClient: createTestQueryClient() })

    expect(await screen.findByText('Concurs negasit')).toBeInTheDocument()
    expect(
      screen.getByText('Fixture-ul MVP contine contestKey local-2024-cluj-napoca-primar.'),
    ).toBeInTheDocument()
  })
})
