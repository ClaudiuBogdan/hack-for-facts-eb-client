import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElectionHubPage } from './election-hub-page'
import {
  DEFAULT_ELECTION_HUB_SEARCH,
  type ElectionHubSearch,
} from '@/schemas/elections'
import { createTestQueryClient, render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink } = await import('../test/elections-router-mock')
  return { Link: MockElectionsLink }
})

describe('ElectionHubPage', () => {
  const onSearchChange = vi.fn<(next: ElectionHubSearch) => void>()

  beforeEach(() => {
    onSearchChange.mockReset()
  })

  it('renders local-2024 contests, summary boundary copy, and explorer availability', async () => {
    render(
      <ElectionHubPage
        electionKey="local-2024"
        search={DEFAULT_ELECTION_HUB_SEARCH}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

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
  })

  it('opens summary tab with election vs parliamentary boundary copy', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <ElectionHubPage
        electionKey="local-2024"
        search={DEFAULT_ELECTION_HUB_SEARCH}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

    await screen.findByText('Primar - Cluj-Napoca')
    await user.click(screen.getByRole('tab', { name: 'Sumar' }))

    expect(onSearchChange).toHaveBeenCalledWith({
      ...DEFAULT_ELECTION_HUB_SEARCH,
      tab: 'sumar',
    })

    rerender(
      <ElectionHubPage
        electionKey="local-2024"
        search={{ ...DEFAULT_ELECTION_HUB_SEARCH, tab: 'sumar' }}
        onSearchChange={onSearchChange}
      />,
    )

    expect(
      await screen.findByText(/distinctia dintre rezultate de alegeri si voturi parlamentare/i),
    ).toBeInTheDocument()
  })

  it('filters contests to empty state and keeps non-MVP contests disabled', async () => {
    render(
      <ElectionHubPage
        electionKey="local-2024"
        search={{
          ...DEFAULT_ELECTION_HUB_SEARCH,
          q: 'zzzz-no-contest-match',
        }}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

    expect(await screen.findByText('Niciun concurs nu corespunde filtrelor')).toBeInTheDocument()
  })
})
