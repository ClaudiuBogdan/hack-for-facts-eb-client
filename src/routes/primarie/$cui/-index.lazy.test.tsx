import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY } from '@/features/challenges/components/analysis/challenge-entity-public-maps'

const navigateMock = vi.fn()
const setSelectedEntityMock = vi.fn()
let mockedParams = { cui: '12345678' }
let mockedSearch: Record<string, unknown> = {}
let mockedLoaderData:
  | {
    initialSettings?: {
      currency: string
      inflationAdjusted: boolean
    }
  }
  | undefined = {
    initialSettings: {
      currency: 'RON',
      inflationAdjusted: false,
    },
  }
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
    useLoaderData: () => mockedLoaderData,
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
      commitmentsGrouping,
      commitmentsDetailLevel,
      analyticsTarget,
      initialSettings,
      onStateChange,
      onCommitmentsViewStateChange,
      onAnalyticsTargetChange,
      onEntityCuiChange,
      onEntityResolved,
    }: any) => (
      <div data-testid="analysis-page">
        {entityCui}:{languageQuery ?? 'ro'}:{state.selectedYear}:
        {state.reportType}:{state.activeView}:{state.treemapAccountCategory}:{state.treemapPrimary}:
        {state.treemapDepth}:{state.treemapPath.join('|')}:{state.evolutionAccountCategory}:
        {state.evolutionPrimary}:{state.mapPreviewKey}:
        {JSON.stringify(analyticsTarget ?? null)}:
        {commitmentsGrouping ?? 'none'}:{commitmentsDetailLevel ?? 'none'}:
        {initialSettings?.currency ?? 'none'}:
        {String(initialSettings?.inflationAdjusted)}
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
        <button
          type="button"
          onClick={() =>
            onStateChange?.({
              activeView: 'contracts',
            })
          }
        >
          Change view
        </button>
        <button
          type="button"
          onClick={() =>
            onStateChange?.({
              treemapDepth: 'subchapter',
            })
          }
        >
          Change treemap depth
        </button>
        <button
          type="button"
          onClick={() => onCommitmentsViewStateChange?.('ec', 'detailed')}
        >
          Change commitments state
        </button>
        <button
          type="button"
          onClick={() =>
            onAnalyticsTargetChange?.({
              target: {
                subjectLabel: 'Education salaries',
                path: [
                  { type: 'fn', code: '65.00' },
                  { type: 'ec', code: '10.01.00' },
                ],
              },
              view: {
                tab: 'execution',
                timeframe: 'selected',
                commitmentsMetric: 'CREDITE_ANGAJAMENT',
              },
            })
          }
        >
          Open analytics
        </button>
        <button
          type="button"
          onClick={() => onAnalyticsTargetChange?.(null)}
        >
          Close analytics
        </button>
        <button
          type="button"
          onClick={() => onEntityCuiChange?.('87654321')}
        >
          Select entity from map
        </button>
      </div>
    ),
  }),
)

describe('PrimarieEntityIndexRoutePage', () => {
  beforeEach(() => {
    mockedParams = { cui: '12345678' }
    mockedSearch = {}
    mockedLoaderData = {
      initialSettings: {
        currency: 'RON',
        inflationAdjusted: false,
      },
    }
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
    window.history.replaceState({}, '', '/')
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

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    expect(screen.getByTestId('analysis-page')).toHaveTextContent(
      `87654321:ro:2025:PRINCIPAL_AGGREGATED:main-info:ch:fn:chapter::ch:fn:${DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY}:null:none:none:RON:false`,
    )
  })

  it('normalizes invalid URL combinations before rendering the stable state', async () => {
    mockedSearch = {
      lang: 'en',
      view: 'not-a-view',
      year: 2024,
      report_type: 'DETAILED',
      treemap_account: 'vn',
      treemap_primary: 'ec',
      treemap_path: '51,51.01',
      evolution_account: 'vn',
      evolution_primary: 'ec',
      public_map: 'invalid-map',
      commitments_grouping: 'invalid-grouping',
      commitments_detail_level: 'invalid-detail-level',
      analytics: {
        target: {
          subjectLabel: 'Education salaries',
          path: [
            { type: 'fn', code: '65.00' },
            { type: 'ec', code: '10.01.00' },
            { type: 'fn', code: '65.02' },
          ],
        },
      },
    }

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    expect(screen.getByTestId('analysis-page')).toHaveTextContent(
      `12345678:en:2024:DETAILED:main-info:vn:fn:chapter:51|51.01:vn:fn:${DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY}:{"target":{"subjectLabel":"Education salaries","path":[{"type":"fn","code":"65.02"},{"type":"ec","code":"10.01"}]},"view":{"tab":"execution","timeframe":"selected","commitmentsMetric":"CREDITE_ANGAJAMENT"}}:none:none:RON:false`,
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const canonicalizeCall = navigateMock.mock.calls[0]?.[0]
    const canonicalSearch = canonicalizeCall.search(mockedSearch)

    expect(canonicalizeCall.resetScroll).toBeUndefined()
    expect(canonicalSearch).toMatchObject({
      view: 'main-info',
      treemap_primary: 'fn',
      evolution_primary: 'fn',
      public_map: DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
      analytics: {
        target: {
          subjectLabel: 'Education salaries',
          path: [
            { type: 'fn', code: '65.02' },
            { type: 'ec', code: '10.01' },
          ],
        },
        view: {
          tab: 'execution',
          timeframe: 'selected',
          commitmentsMetric: 'CREDITE_ANGAJAMENT',
        },
      },
    })
    expect(canonicalSearch).not.toHaveProperty('commitments_grouping')
    expect(canonicalSearch).not.toHaveProperty('commitments_detail_level')
  })

  it('canonicalizes legacy public map ids to local preview keys', async () => {
    mockedSearch = {
      public_map: 'gxnEfLoy3EqI',
    }

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    expect(screen.getByTestId('analysis-page')).toHaveTextContent(
      '12345678:ro:2025:PRINCIPAL_AGGREGATED:main-info:ch:fn:chapter::ch:fn:local-taxes:null:none:none:RON:false',
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const canonicalizeCall = navigateMock.mock.calls[0]?.[0]
    const canonicalSearch = canonicalizeCall.search(mockedSearch)

    expect(canonicalizeCall.resetScroll).toBeUndefined()
    expect(canonicalSearch).toMatchObject({
      view: 'main-info',
      public_map: 'local-taxes',
    })
  })

  it('syncs campaign progress to the URL entity after the entity resolves successfully', async () => {
    mockedParams = { cui: '87654321' }

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

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

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

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
      view: 'main-info',
      report_type: 'PRINCIPAL_AGGREGATED',
      year: 2025,
      treemap_account: 'ch',
      treemap_primary: 'fn',
      treemap_depth: 'chapter',
      evolution_account: 'ch',
      evolution_primary: 'fn',
      public_map: DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
      insDataset: 'POP107D',
      insRoot: 'population',
    }

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    navigateMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Change state' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(updateCall.resetScroll).toBe(false)
    expect(nextSearch).toMatchObject({
      lang: 'en',
      currency: 'EUR',
      inflation_adjusted: true,
      view: 'main-info',
      year: 2023,
      treemap_path: '51,51.01.03',
      treemap_depth: 'chapter',
      public_map: 'local-taxes',
      insDataset: 'POP107D',
      insRoot: 'population',
    })
  })

  it('writes treemap depth changes back into the URL search and resets the path', async () => {
    mockedSearch = {
      view: 'main-info',
      treemap_account: 'ch',
      treemap_primary: 'fn',
      treemap_depth: 'chapter',
      treemap_path: '51,51.01.03',
    }

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    navigateMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Change treemap depth' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(updateCall.replace).toBe(true)
    expect(updateCall.resetScroll).toBe(false)
    expect(nextSearch).toMatchObject({
      view: 'main-info',
      treemap_account: 'ch',
      treemap_primary: 'fn',
      treemap_depth: 'subchapter',
    })
    expect(nextSearch).not.toHaveProperty('treemap_path')
  })

  it('pushes history and resets scroll when the active view changes', async () => {
    mockedSearch = {
      view: 'main-info',
    }

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    navigateMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Change view' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(updateCall.replace).toBe(false)
    expect(updateCall.resetScroll).toBe(true)
    expect(nextSearch).toMatchObject({
      view: 'contracts',
    })
  })

  it('writes commitments view state back into the URL search', async () => {
    mockedSearch = {
      view: 'commitments',
      commitments_grouping: 'fn',
      commitments_detail_level: 'chapter',
    }

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    navigateMock.mockClear()
    fireEvent.click(
      screen.getByRole('button', { name: 'Change commitments state' }),
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(updateCall.replace).toBe(true)
    expect(updateCall.resetScroll).toBe(false)
    expect(nextSearch).toMatchObject({
      view: 'commitments',
      commitments_grouping: 'ec',
      commitments_detail_level: 'detailed',
    })
  })

  it('writes analytics target changes back into the URL search', async () => {
    mockedSearch = {
      view: 'main-info',
    }

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    navigateMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Open analytics' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(updateCall.replace).toBe(true)
    expect(updateCall.resetScroll).toBe(false)
    expect(nextSearch).toMatchObject({
      view: 'main-info',
      analytics: {
        target: {
          subjectLabel: 'Education salaries',
          path: [
            { type: 'fn', code: '65' },
            { type: 'ec', code: '10.01' },
          ],
        },
        view: {
          tab: 'execution',
          timeframe: 'selected',
          commitmentsMetric: 'CREDITE_ANGAJAMENT',
        },
      },
    })
  })

  it('removes the analytics target from the URL when the modal closes', async () => {
    mockedSearch = {
      analytics: {
        target: {
          subjectLabel: 'Education salaries',
          path: [
            { type: 'fn', code: '65.02' },
            { type: 'ec', code: '10.01' },
          ],
        },
        view: {
          tab: 'execution',
          timeframe: 'selected',
          commitmentsMetric: 'CREDITE_ANGAJAMENT',
        },
      },
    }

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    navigateMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Close analytics' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(nextSearch).not.toHaveProperty('analytics')
  })

  it('routes map-selected entities through the current primarie page and preserves search', async () => {
    mockedSearch = {
      lang: 'en',
      view: 'main-info',
      public_map: 'local-taxes',
      insDataset: 'POP107D',
      insRoot: 'population',
    }
    window.history.replaceState(
      {},
      '',
      '/primarie/12345678?insDataset=POP107D&insRoot=population',
    )

    const { PrimarieEntityRoutePage } = await import('./index.lazy')

    render(<PrimarieEntityRoutePage />)

    navigateMock.mockClear()
    fireEvent.click(
      screen.getByRole('button', { name: 'Select entity from map' }),
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(updateCall).toMatchObject({
      to: '/primarie/$cui',
      params: { cui: '87654321' },
      replace: false,
      resetScroll: false,
    })
    expect(nextSearch).toMatchObject({
      lang: 'en',
      view: 'main-info',
      public_map: 'local-taxes',
      insDataset: 'POP107D',
      insRoot: 'population',
    })
  })
})
