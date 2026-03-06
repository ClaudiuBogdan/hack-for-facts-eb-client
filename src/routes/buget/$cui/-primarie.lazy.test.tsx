import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY } from '@/features/challenges/components/analysis/challenge-entity-public-maps'

const navigateMock = vi.fn()
const setSelectedEntityMock = vi.fn()
let mockedParams = { cui: '12345678' }
let mockedSearch: Record<string, unknown> = {}
let campaignProgressState = {
  isReady: true,
  isInitialResolutionReady: true,
  progress: {
    selectedEntityCui: null as string | null,
  },
  setSelectedEntity: setSelectedEntityMock,
}

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => () => ({
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
  }),
  useNavigate: () => navigateMock,
}))

vi.mock('@/features/campaigns/buget/hooks/use-campaign-progress', () => ({
  useCampaignProgress: () => campaignProgressState,
}))

vi.mock(
  '@/features/challenges/components/analysis/challenge-entity-analysis-page',
  () => ({
    ChallengeEntityAnalysisPage: ({
      entityCui,
      languageQuery,
      state,
      onStateChange,
      onEntityResolved,
    }: any) => (
      <div data-testid="analysis-page">
        {entityCui}:{languageQuery ?? 'ro'}:{state.selectedYear}:
        {state.reportType}:{state.treemapAccountCategory}:{state.treemapPrimary}:
        {state.treemapPath.join('|')}:{state.evolutionAccountCategory}:
        {state.evolutionPrimary}:{state.mapPreviewKey}
        <button type="button" onClick={() => onEntityResolved?.()}>
          Resolve entity
        </button>
        <button
          type="button"
          onClick={() =>
            onStateChange?.({
              selectedYear: 2023,
              treemapPath: ['51', '51.01.03'],
              mapPreviewKey: 'local-taxes',
            })
          }
        >
          Change state
        </button>
      </div>
    ),
  }),
)

describe('PrimarieEntityRoutePage', () => {
  beforeEach(() => {
    mockedParams = { cui: '12345678' }
    mockedSearch = {}
    campaignProgressState = {
      isReady: true,
      isInitialResolutionReady: true,
      progress: {
        selectedEntityCui: null,
      },
      setSelectedEntity: setSelectedEntityMock,
    }
    navigateMock.mockReset()
    setSelectedEntityMock.mockReset()
  })

  it('renders from the URL param even when campaign progress is unresolved', async () => {
    campaignProgressState = {
      isReady: false,
      isInitialResolutionReady: false,
      progress: {
        selectedEntityCui: '99999999',
      },
      setSelectedEntity: setSelectedEntityMock,
    }
    mockedParams = { cui: '87654321' }

    const { PrimarieEntityRoutePage } = await import('./primarie.lazy')

    render(<PrimarieEntityRoutePage />)

    expect(screen.getByTestId('analysis-page')).toHaveTextContent(
      `87654321:ro:2025:PRINCIPAL_AGGREGATED:ch:fn::ch:fn:${DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY}`,
    )
  })

  it('normalizes invalid URL combinations before rendering the stable state', async () => {
    mockedSearch = {
      lang: 'en',
      year: 2024,
      report_type: 'DETAILED',
      treemap_account: 'vn',
      treemap_primary: 'ec',
      treemap_path: '51,51.01',
      evolution_account: 'vn',
      evolution_primary: 'ec',
      public_map: 'invalid-map',
    }

    const { PrimarieEntityRoutePage } = await import('./primarie.lazy')

    render(<PrimarieEntityRoutePage />)

    expect(screen.getByTestId('analysis-page')).toHaveTextContent(
      `12345678:en:2024:DETAILED:vn:fn:51|51.01:vn:fn:${DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY}`,
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const canonicalizeCall = navigateMock.mock.calls[0]?.[0]
    const canonicalSearch = canonicalizeCall.search(mockedSearch)

    expect(canonicalSearch).toMatchObject({
      treemap_primary: 'fn',
      evolution_primary: 'fn',
      public_map: DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
    })
  })

  it('canonicalizes legacy public map ids to local preview keys', async () => {
    mockedSearch = {
      public_map: 'gxnEfLoy3EqI',
    }

    const { PrimarieEntityRoutePage } = await import('./primarie.lazy')

    render(<PrimarieEntityRoutePage />)

    expect(screen.getByTestId('analysis-page')).toHaveTextContent(
      '12345678:ro:2025:PRINCIPAL_AGGREGATED:ch:fn::ch:fn:local-taxes',
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const canonicalizeCall = navigateMock.mock.calls[0]?.[0]
    const canonicalSearch = canonicalizeCall.search(mockedSearch)

    expect(canonicalSearch).toMatchObject({
      public_map: 'local-taxes',
    })
  })

  it('syncs campaign progress to the URL entity after the entity resolves successfully', async () => {
    mockedParams = { cui: '87654321' }

    const { PrimarieEntityRoutePage } = await import('./primarie.lazy')

    render(<PrimarieEntityRoutePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Resolve entity' }))

    await waitFor(() => {
      expect(setSelectedEntityMock).toHaveBeenCalledWith({
        entityCui: '87654321',
      })
    })
  })

  it('does not overwrite campaign progress when the entity never resolves', async () => {
    mockedParams = { cui: 'invalid-cui' }

    const { PrimarieEntityRoutePage } = await import('./primarie.lazy')

    render(<PrimarieEntityRoutePage />)

    await waitFor(() => {
      expect(screen.getByTestId('analysis-page')).toBeInTheDocument()
    })

    expect(setSelectedEntityMock).not.toHaveBeenCalled()
  })

  it('writes user state changes back into the URL search', async () => {
    mockedSearch = {
      lang: 'en',
      currency: 'EUR',
      inflation_adjusted: true,
      report_type: 'PRINCIPAL_AGGREGATED',
      year: 2025,
      treemap_account: 'ch',
      treemap_primary: 'fn',
      evolution_account: 'ch',
      evolution_primary: 'fn',
      public_map: DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
    }

    const { PrimarieEntityRoutePage } = await import('./primarie.lazy')

    render(<PrimarieEntityRoutePage />)

    navigateMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Change state' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(nextSearch).toMatchObject({
      lang: 'en',
      currency: 'EUR',
      inflation_adjusted: true,
      year: 2023,
      treemap_path: '51,51.01.03',
      public_map: 'local-taxes',
    })
  })
})
