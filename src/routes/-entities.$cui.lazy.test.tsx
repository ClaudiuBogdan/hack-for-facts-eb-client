import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY } from '@/features/challenges/components/analysis/challenge-entity-public-maps'

const deployment = vi.hoisted(() => ({ native: false }))
vi.mock('@/lib/api/api-mode', () => ({ isRedesignOnlyApiDeployment: () => deployment.native }))
const navigateMock = vi.fn()
const challengeEntityAnalysisPagePropsMock = vi.fn()
let mockedParams = { cui: '12345678' }
let mockedSearch: Record<string, unknown> = {}
let mockedBelowHeaderIsUat = true
let mockedLoaderData:
  | {
    initialSettings?: {
      currency: string
      inflationAdjusted: boolean
    }
    forcedOverrides?: {
      currency?: string
      inflationAdjusted?: boolean
    }
    ssrSettings?: {
      currency: string
      inflationAdjusted: boolean
    }
    entityPageBootstrap?: {
      loaderPayload?: {
        ssrEntityDetailsParams?: {
          cui?: string
        }
        ssrEntityExecutionLineItemsParams?: {
          cui?: string
        }
      }
    }
  }
  | undefined = {
    initialSettings: {
      currency: 'RON',
      inflationAdjusted: false,
    },
    entityPageBootstrap: {
      loaderPayload: {
        ssrEntityDetailsParams: {
          cui: '12345678',
        },
        ssrEntityExecutionLineItemsParams: {
          cui: '12345678',
        },
      },
    },
  }

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => () => ({
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
    useLoaderData: () => mockedLoaderData,
  }),
  useNavigate: () => navigateMock,
}))

vi.mock('@/features/campaigns/buget/components/CampaignAccessShareCard', () => ({
  CampaignAccessShareCard: ({
    entityCui,
    locale,
  }: {
    readonly entityCui: string
    readonly locale: 'ro' | 'en'
  }) => (
    <a
      href={`/primarie/${entityCui}/buget/provocari${locale === 'en' ? '?lang=en' : ''}`}
    >
      Open campaign
    </a>
  ),
}))

vi.mock(
  '@/features/challenges/components/analysis/challenge-entity-analysis-page',
  () => ({
    ChallengeEntityAnalysisPage: ({
      entityCui,
      languageQuery,
      pageVariant,
      hasExplicitReportType,
      state,
      commitmentsGrouping,
      commitmentsDetailLevel,
      analyticsTarget,
      initialSettings,
      forcedSettings,
      ssrLoaderPayload,
      belowHeader,
      onStateChange,
      insSearch,
      onInsSearchChange,
      onCommitmentsViewStateChange,
      onAnalyticsTargetChange,
      onEntityCuiChange,
    }: any) => {
      const resolvedBelowHeader =
        typeof belowHeader === 'function'
          ? belowHeader({
              entity: { cui: entityCui },
              isUatEntity: mockedBelowHeaderIsUat,
              locale: languageQuery === 'en' ? 'en' : 'ro',
            })
          : belowHeader

      challengeEntityAnalysisPagePropsMock({
        insSearch,
        onInsSearchChange,
        entityCui,
        languageQuery,
        pageVariant,
        hasExplicitReportType,
        state,
        commitmentsGrouping,
        commitmentsDetailLevel,
        analyticsTarget,
        initialSettings,
        forcedSettings,
        ssrLoaderPayload,
        belowHeader,
      })

      return (
        <>
          {resolvedBelowHeader}
          <div data-testid="analysis-page">
            {entityCui}:{languageQuery ?? 'ro'}:{state.selectedYear}:
            {state.reportType}:{state.activeView}:{state.treemapAccountCategory}:{state.expenseType ?? 'all'}:
            {state.treemapPrimary}:{state.treemapDepth}:{state.treemapPath.join('|')}:
            {state.evolutionAccountCategory}:{state.evolutionPrimary}:{state.mapPreviewKey}:
            {JSON.stringify(analyticsTarget ?? null)}:
            {commitmentsGrouping ?? 'none'}:{commitmentsDetailLevel ?? 'none'}:
            {initialSettings?.currency ?? 'none'}:
            {String(initialSettings?.inflationAdjusted)}:
            {forcedSettings?.currency ?? 'none'}:
            {String(forcedSettings?.inflationAdjusted)}:
            {ssrLoaderPayload?.ssrEntityDetailsParams?.cui ?? 'none'}:
            {ssrLoaderPayload?.ssrEntityExecutionLineItemsParams?.cui ?? 'none'}
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
                  reportType: 'SECONDARY_AGGREGATED',
                  treemapPath: [],
                })
              }
            >
              Change report type to secondary
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
              onClick={() =>
                onCommitmentsViewStateChange?.('ec', 'detailed')
              }
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
              onClick={() =>
                onEntityCuiChange?.({
                  entityCui: '87654321',
                  entityName: 'Cluj-Napoca',
                  countyName: 'Cluj',
                })
              }
            >
              Select entity from map
            </button>
          </div>
        </>
      )
    },
  }),
)

describe('EntityDetailsRoutePage', () => {
  beforeEach(() => {
    deployment.native = false
    mockedParams = { cui: '12345678' }
    mockedSearch = {}
    mockedBelowHeaderIsUat = true
    mockedLoaderData = {
      initialSettings: {
        currency: 'RON',
        inflationAdjusted: false,
      },
      entityPageBootstrap: {
        loaderPayload: {
          ssrEntityDetailsParams: {
            cui: '12345678',
          },
          ssrEntityExecutionLineItemsParams: {
            cui: '12345678',
          },
        },
      },
    }
    navigateMock.mockReset()
    challengeEntityAnalysisPagePropsMock.mockReset()
    window.history.replaceState({}, '', '/')
  })

  it('normalizes legacy entity search into challenge analysis state', async () => {
    mockedSearch = {
      lang: 'en',
      view: 'ins-stats',
      year: 2024,
      report_type: 'COMMITMENT_SECONDARY_AGGREGATED',
      main_creditor_cui: '4567890',
      normalization: 'per_capita_euro',
      show_period_growth: true,
      accountCategory: 'vn',
      treemapPrimary: 'ec',
      treemapPath: '51,51.01',
      public_map: 'gxnEfLoy3EqI',
      commitmentsGrouping: 'fn',
      commitmentsDetailLevel: 'chapter',
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

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    expect(screen.getByTestId('analysis-page')).toHaveTextContent(
      `12345678:en:2024:SECONDARY_AGGREGATED:ins:vn:all:fn:chapter:51|51.01:ch:fn:local-taxes:{"target":{"subjectLabel":"Education salaries","path":[{"type":"fn","code":"65.02"},{"type":"ec","code":"10.01"}]},"view":{"tab":"execution","timeframe":"selected","commitmentsMetric":"CREDITE_ANGAJAMENT"}}:fn:chapter:RON:false:EUR:undefined:12345678:12345678`,
    )
    expect(challengeEntityAnalysisPagePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        belowHeader: expect.any(Function),
        pageVariant: 'entities',
        hasExplicitReportType: true,
        state: expect.objectContaining({
          showPeriodGrowth: true,
        }),
      }),
    )
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('shows the campaign banner for UAT entities', async () => {
    mockedParams = { cui: '4305857' }
    mockedSearch = { lang: 'en' }
    mockedBelowHeaderIsUat = true

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    expect(
      screen.getByRole('link', { name: 'Open campaign' }),
    ).toHaveAttribute('href', '/primarie/4305857/buget/provocari?lang=en')
  })

  it('does not show the campaign banner for non-UAT entities', async () => {
    mockedParams = { cui: '99999999' }
    mockedBelowHeaderIsUat = false

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    expect(
      screen.queryByRole('link', { name: 'Open campaign' }),
    ).not.toBeInTheDocument()
  })

  it('passes shared SSR loader payload and initial settings to the challenge page', async () => {
    mockedLoaderData = {
      initialSettings: {
        currency: 'EUR',
        inflationAdjusted: true,
      },
      entityPageBootstrap: {
        loaderPayload: {
          ssrEntityDetailsParams: {
            cui: 'details-cui',
          },
          ssrEntityExecutionLineItemsParams: {
            cui: 'line-items-cui',
          },
        },
      },
    }

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    expect(screen.getByTestId('analysis-page')).toHaveTextContent(
      'EUR:true:none:undefined:details-cui:line-items-cui',
    )
    expect(challengeEntityAnalysisPagePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialSettings: {
          currency: 'EUR',
          inflationAdjusted: true,
        },
        forcedSettings: undefined,
        ssrLoaderPayload: {
          ssrEntityDetailsParams: {
            cui: 'details-cui',
          },
          ssrEntityExecutionLineItemsParams: {
            cui: 'line-items-cui',
          },
        },
      }),
    )
  })

  it('passes loader forced overrides to the challenge page', async () => {
    mockedLoaderData = {
      initialSettings: {
        currency: 'EUR',
        inflationAdjusted: false,
      },
      forcedOverrides: {
        currency: 'EUR',
      },
    }

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    expect(challengeEntityAnalysisPagePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialSettings: {
          currency: 'EUR',
          inflationAdjusted: false,
        },
        forcedSettings: {
          currency: 'EUR',
        },
      }),
    )
  })

  it('uses the same constrained content width as the primarie analysis page', async () => {
    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    expect(screen.getByTestId('analysis-page').parentElement).toHaveClass(
      'mx-auto',
      'w-full',
      'max-w-3xl',
      'px-4',
      'lg:px-10',
    )
  })

  it('writes state changes back into entity URL search while preserving INS params', async () => {
    mockedSearch = {
      lang: 'en',
      inflation_adjusted: true,
      view: 'overview',
      report_type: 'COMMITMENT_SECONDARY_AGGREGATED',
      normalization: 'per_capita_euro',
      year: 2025,
      treemap_account: 'ch',
      treemap_primary: 'fn',
      treemap_depth: 'chapter',
      evolution_account: 'ch',
      evolution_primary: 'fn',
      public_map: DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
      insDataset: 'POP107D',
      insRoot: 'population',
      insSourcePins: ['D0:0', 'D1:-5'],
      insSourceUnit: null,
      insSourceCadence: 'SEMESTRIAL',
    }
    window.history.replaceState(
      {},
      '',
      '/entities/12345678?insDataset=POP107D&insRoot=population',
    )

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Change state' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(updateCall.replace).toBe(true)
    expect(updateCall.resetScroll).toBe(false)
    expect(nextSearch).toMatchObject({
      lang: 'en',
      currency: 'EUR',
      inflation_adjusted: true,
      view: 'main-info',
      report_type: 'SECONDARY_AGGREGATED',
      normalization: 'per_capita',
      year: 2023,
      treemap_path: '51,51.01.03',
      public_map: 'local-taxes',
      insDataset: 'POP107D',
      insRoot: 'population',
      insSourcePins: ['D0:0', 'D1:-5'],
      insSourceUnit: null,
      insSourceCadence: 'SEMESTRIAL',
    })
  })

  it('keeps an explicit secondary report type change from a detailed URL', async () => {
    mockedSearch = {
      report_type: 'DETAILED',
      year: 2025,
      treemap_path: '51,51.01.03',
    }

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Change report type to secondary',
      }),
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(nextSearch).toMatchObject({
      report_type: 'SECONDARY_AGGREGATED',
      year: 2025,
    })
    expect(nextSearch).not.toHaveProperty('treemap_path')
  })

  it('pushes history and resets scroll when the active view changes', async () => {
    mockedSearch = {
      view: 'overview',
    }

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

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
    expect(nextSearch).not.toHaveProperty('report_type')
  })

  it('resets treemap path when detail depth changes', async () => {
    mockedSearch = {
      view: 'overview',
      treemap_account: 'ch',
      treemap_primary: 'fn',
      treemap_depth: 'chapter',
      treemap_path: '51,51.01.03',
    }

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    fireEvent.click(screen.getByRole('button', { name: 'Change treemap depth' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(nextSearch).toMatchObject({
      view: 'main-info',
      treemap_account: 'ch',
      treemap_primary: 'fn',
      treemap_depth: 'subchapter',
    })
    expect(nextSearch).not.toHaveProperty('treemap_path')
  })

  it('writes commitments and analytics state to entity URL search', async () => {
    mockedSearch = {
      view: 'commitments',
      commitments_grouping: 'fn',
      commitments_detail_level: 'chapter',
    }

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Change commitments state' }),
    )

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const commitmentsCall = navigateMock.mock.calls[0]?.[0]
    expect(commitmentsCall.search(mockedSearch)).toMatchObject({
      view: 'commitments',
      commitments_grouping: 'ec',
      commitments_detail_level: 'detailed',
    })

    navigateMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Open analytics' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const analyticsCall = navigateMock.mock.calls[0]?.[0]
    expect(analyticsCall.search(mockedSearch)).toMatchObject({
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

    navigateMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Close analytics' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const closeAnalyticsCall = navigateMock.mock.calls[0]?.[0]
    expect(closeAnalyticsCall.search({
      ...mockedSearch,
      analytics: {
        target: {
          subjectLabel: 'Education salaries',
          path: [{ type: 'fn', code: '65.02' }],
        },
      },
    })).not.toHaveProperty('analytics')
  })

  it('routes map-selected entities through the entities page and preserves search', async () => {
    mockedSearch = {
      lang: 'en',
      view: 'main-info',
      public_map: 'local-taxes',
      insDataset: 'POP107D',
      insRoot: 'population',
      insSourcePins: ['D0:0', 'D1:-5'],
      insSourceUnit: null,
      insSourceCadence: 'SEMESTRIAL',
    }
    window.history.replaceState(
      {},
      '',
      '/entities/12345678?insDataset=POP107D&insRoot=population',
    )

    const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')

    render(<EntityDetailsRoutePage />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Select entity from map' }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Switch to a different entity?',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Cluj-Napoca')).toBeInTheDocument()
    expect(screen.getByText('Cluj · CUI 87654321')).toBeInTheDocument()

    expect(navigateMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Open analysis' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    const nextSearch = updateCall.search(mockedSearch)

    expect(updateCall).toMatchObject({
      to: '/entities/$cui',
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
      insSourcePins: ['D0:0', 'D1:-5'],
      insSourceUnit: null,
      insSourceCadence: 'SEMESTRIAL',
    })
  })

it('keeps native INS router values intact instead of merging stale window values', async () => {
  const { EntityDetailsRoutePage } = await import('./entities.$cui.lazy')
  deployment.native = true
  mockedSearch = { view: 'ins', insDataset: 'POP107D', insSourcePins: ['D0:0', 'D1:210'], insSourceUnit: null, insSeries: 'D0:4' }
  window.history.replaceState({}, '', '/?insDataset=STALE&insSeries=D0:99')
  render(<EntityDetailsRoutePage />)
  const pageProps = challengeEntityAnalysisPagePropsMock.mock.lastCall?.[0]
  expect(pageProps.insSearch).toEqual(mockedSearch)
  navigateMock.mockClear()
  pageProps.onInsSearchChange({ insSourcePins: ['D0:5'], insSeries: undefined })
  const next = navigateMock.mock.lastCall?.[0].search(mockedSearch)
  expect(next).toMatchObject({ insDataset: 'POP107D', insSourcePins: ['D0:5'], insSourceUnit: null })
  expect(next).not.toHaveProperty('insSeries')
})

})
