import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ElectionsLandingPage } from './elections-landing-page'
import {
  DEFAULT_ELECTIONS_LANDING_SEARCH,
  type ElectionsLandingSearch,
} from '@/schemas/elections'
import {
  createTestQueryClient,
  fireEvent,
  render,
  screen,
} from '@/test/test-utils'
import userEvent from '@testing-library/user-event'

vi.mock('@tanstack/react-router', async () => {
  const { MockElectionsLink } = await import('../test/elections-router-mock')
  return { Link: MockElectionsLink }
})

describe('ElectionsLandingPage', () => {
  const onSearchChange = vi.fn<(next: ElectionsLandingSearch) => void>()

  beforeEach(() => {
    onSearchChange.mockReset()
  })

  it('renders election results, trust ribbon, mock status, and archive hint', async () => {
    render(
      <ElectionsLandingPage
        search={DEFAULT_ELECTIONS_LANDING_SEARCH}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

    expect(await screen.findByRole('heading', { name: 'Rezultate alegeri' })).toBeInTheDocument()
    expect(await screen.findByText('Date demonstrative (mock)')).toBeInTheDocument()
    expect(await screen.findByText('Alegeri locale 2024')).toBeInTheDocument()
    expect(screen.getAllByText('AEP · BEC · ROAEP').length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        'Exista scrutine istorice ascunse; activeaza arhiva pentru a le vedea.',
      ),
    ).toBeInTheDocument()
  })

  it('calls onSearchChange for search, family, archive, and reset interactions', async () => {
    const user = userEvent.setup()
    const search: ElectionsLandingSearch = {
      ...DEFAULT_ELECTIONS_LANDING_SEARCH,
      family: ['local'],
    }

    render(
      <ElectionsLandingPage search={search} onSearchChange={onSearchChange} />,
      { queryClient: createTestQueryClient() },
    )

    await screen.findByText('Alegeri locale 2024')

    fireEvent.change(screen.getByPlaceholderText('Cauta dupa nume, an sau autoritate'), {
      target: { value: '2024' },
    })
    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ q: '2024', family: ['local'] }),
    )

    onSearchChange.mockClear()
    await user.click(screen.getByRole('button', { name: 'Prezidentiale' }))
    expect(onSearchChange).toHaveBeenCalledWith({
      ...search,
      family: ['local', 'prezidentiale'],
    })

    onSearchChange.mockClear()
    await user.click(screen.getByRole('switch'))
    expect(onSearchChange).toHaveBeenCalledWith({
      ...search,
      arhiva: 1,
    })

    onSearchChange.mockClear()
    await user.click(screen.getByRole('button', { name: 'Reseteaza' }))
    expect(onSearchChange).toHaveBeenCalledWith(DEFAULT_ELECTIONS_LANDING_SEARCH)
  })

  it('shows filtered empty state without treating missing values as zero', async () => {
    render(
      <ElectionsLandingPage
        search={{
          ...DEFAULT_ELECTIONS_LANDING_SEARCH,
          q: 'zzzz-no-election-match',
        }}
        onSearchChange={onSearchChange}
      />,
      { queryClient: createTestQueryClient() },
    )

    expect(await screen.findByText('Nicio alegere nu corespunde filtrelor')).toBeInTheDocument()
  })
})
