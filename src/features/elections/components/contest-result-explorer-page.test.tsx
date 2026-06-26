import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContestResultExplorerPage } from './contest-result-explorer-page'
import {
  DEFAULT_CONTEST_SEARCH,
  type ContestSearch,
} from '@/schemas/elections'
import { createTestQueryClient, render, screen, waitFor } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink } = await import('../test/elections-router-mock')
  return { Link: MockElectionsLink }
})

describe('ContestResultExplorerPage', () => {
  const onSearchChange = vi.fn<(next: ContestSearch) => void>()

  beforeEach(() => {
    onSearchChange.mockReset()
  })

  it('renders pinned Cluj contest with boundary, winner, turnout, and results', async () => {
    render(
      <ContestResultExplorerPage
        contestKey="local-2024-cluj-napoca-primar"
        search={DEFAULT_CONTEST_SEARCH}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

    expect(await screen.findAllByText('Rezultate alegeri')).not.toHaveLength(0)
    expect(await screen.findAllByText('EMIL BOC - PNL')).not.toHaveLength(0)
    expect(screen.getByText('Voturi valide')).toBeInTheDocument()
    expect(screen.getAllByText('126.980').length).toBeGreaterThan(0)
    expect(screen.getByRole('tab', { name: 'Rezultate' })).toBeInTheDocument()
  })

  it('shows map integration empty state and expert polling-station geography', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <ContestResultExplorerPage
        contestKey="local-2024-cluj-napoca-primar"
        search={DEFAULT_CONTEST_SEARCH}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

    await screen.findAllByText('EMIL BOC - PNL')

    await user.click(screen.getByRole('button', { name: 'Harta' }))
    expect(onSearchChange).toHaveBeenCalledWith({
      ...DEFAULT_CONTEST_SEARCH,
      view: 'harta',
    })

    rerender(
      <ContestResultExplorerPage
        contestKey="local-2024-cluj-napoca-primar"
        search={{ ...DEFAULT_CONTEST_SEARCH, view: 'harta' }}
        onSearchChange={onSearchChange}
      />,
    )

    expect(
      await screen.findByText('Harta este pregatita pentru integrarea API'),
    ).toBeInTheDocument()

    onSearchChange.mockClear()
    rerender(
      <ContestResultExplorerPage
        contestKey="local-2024-cluj-napoca-primar"
        search={{ ...DEFAULT_CONTEST_SEARCH, expert: 1 }}
        onSearchChange={onSearchChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getAllByText(/Sectia 12/i).length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Sectii de votare disponibile in modul expert.')).toBeInTheDocument()
  })

  it('shows candidacy privacy guardrail and mandate allocation-only copy', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <ContestResultExplorerPage
        contestKey="local-2024-cluj-napoca-primar"
        search={DEFAULT_CONTEST_SEARCH}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

    await screen.findAllByText('EMIL BOC - PNL')

    await user.click(screen.getByRole('tab', { name: 'Candidaturi' }))
    expect(onSearchChange).toHaveBeenCalledWith({
      ...DEFAULT_CONTEST_SEARCH,
      tab: 'candidaturi',
    })

    rerender(
      <ContestResultExplorerPage
        contestKey="local-2024-cluj-napoca-primar"
        search={{ ...DEFAULT_CONTEST_SEARCH, tab: 'candidaturi' }}
        onSearchChange={onSearchChange}
      />,
    )

    expect(
      await screen.findByText(/Numele candidatilor sunt afisate ca etichete publicate de sursa/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Nume din sursa - identitate nerezolvata')).toBeInTheDocument()

    rerender(
      <ContestResultExplorerPage
        contestKey="local-2024-cluj-napoca-primar"
        search={{ ...DEFAULT_CONTEST_SEARCH, tab: 'mandate' }}
        onSearchChange={onSearchChange}
      />,
    )

    expect(
      screen.getByText(
        'Acestea sunt alocari numerice publicate de sursa, nu persoane alese nominal.',
      ),
    ).toBeInTheDocument()
  })

  it('renders unavailable metrics as dash context instead of zero', async () => {
    render(
      <ContestResultExplorerPage
        contestKey="local-2024-cluj-napoca-primar"
        search={DEFAULT_CONTEST_SEARCH}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

    await screen.findAllByText('UDMR')
    expect(screen.getAllByText('metric indisponibil').length).toBeGreaterThan(0)
  })

  it('shows not-found state for unknown contest keys', async () => {
    render(
      <ContestResultExplorerPage
        contestKey="unknown-contest"
        search={DEFAULT_CONTEST_SEARCH}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

    expect(await screen.findByText('Concurs negasit')).toBeInTheDocument()
  })
})
