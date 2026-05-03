import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { usePnrrData } from '../hooks/usePnrrData'
import { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import {
  buildPnrrSeoSnapshotSearchKey,
  type PnrrSeoSnapshot,
} from '../seo/pnrr-seo'
import { PnrrDashboard } from './PnrrDashboard'

vi.mock('../hooks/usePnrrData', () => ({
  usePnrrData: vi.fn(),
}))

vi.mock('../hooks/usePnrrFilterState', () => ({
  usePnrrFilterState: vi.fn(),
}))

vi.mock('../lib/PnrrCurrencyProvider', () => ({
  PnrrCurrencyProvider: ({ children }: { readonly children: ReactNode }) => (
    <>{children}</>
  ),
}))

vi.mock('./PnrrHeader', () => ({
  PnrrHeader: ({
    actions,
    isLoading,
    projectsCount,
    totalValue,
  }: {
    readonly actions: ReactNode
    readonly isLoading: boolean
    readonly projectsCount: number
    readonly totalValue: number
  }) => (
    <header data-testid="pnrr-header" data-loading={String(isLoading)}>
      <span data-testid="pnrr-header-projects">{projectsCount}</span>
      <span data-testid="pnrr-header-total">{totalValue}</span>
      {actions}
    </header>
  ),
}))

vi.mock('./PnrrSkeleton', () => ({
  PnrrContentSkeleton: ({
    hideMetricCards = false,
  }: {
    readonly hideMetricCards?: boolean
  }) => (
    <div
      data-testid="pnrr-content-skeleton"
      data-hide-metric-cards={String(hideMetricCards)}
    />
  ),
}))

vi.mock('./tabs/PnrrOverview', () => ({
  PnrrOverview: ({
    cachedStats,
    isLoadingFullData,
  }: {
    readonly cachedStats?: { readonly rawTotalValue: number } | null
    readonly isLoadingFullData?: boolean
  }) => (
    <div
      data-testid="pnrr-overview"
      data-loading-full-data={String(isLoadingFullData)}
    >
      {cachedStats?.rawTotalValue}
    </div>
  ),
}))

vi.mock('./tabs/PnrrProjectsView', () => ({
  PnrrProjectsView: () => <div data-testid="pnrr-projects" />,
}))

vi.mock('./tabs/PnrrAnomaliesView', () => ({
  PnrrAnomaliesView: () => <div data-testid="pnrr-anomalies" />,
}))

vi.mock('./tabs/PnrrBeneficiariesView', () => ({
  PnrrBeneficiariesView: () => <div data-testid="pnrr-beneficiaries" />,
}))

vi.mock('./PnrrMapView', () => ({
  PnrrMapView: () => <div data-testid="pnrr-map" />,
}))

vi.mock('./filters/PnrrFilterSheet', () => ({
  PnrrFilterSheet: () => null,
  PnrrFilterTriggerButton: () => <button type="button">Filters</button>,
}))

vi.mock('./filters/PnrrInfoSheet', () => ({
  PnrrInfoSheet: () => null,
}))

vi.mock('./table/PnrrExportButton', () => ({
  PnrrExportButton: () => null,
}))

function makeFilterState(
  overrides: Partial<ReturnType<typeof usePnrrFilterState>> = {},
): ReturnType<typeof usePnrrFilterState> {
  return {
    search: {
      view: 'overview',
      page: 1,
      pageSize: 25,
      sortBy: 'value',
      sortOrder: 'desc',
      onlyAnomalies: false,
      excludeMicro: false,
      granularity: 'county',
      includeNational: false,
    },
    setView: vi.fn(),
    showBeneficiaryProjects: vi.fn(),
    showUatView: vi.fn(),
    setSearch: vi.fn(),
    setBeneficiarySearch: vi.fn(),
    setBeneficiaryCui: vi.fn(),
    setUatFilter: vi.fn(),
    setUatFilters: vi.fn(),
    setComponents: vi.fn(),
    setCounties: vi.fn(),
    setFundingSources: vi.fn(),
    setMeasures: vi.fn(),
    setCris: vi.fn(),
    setProgressCategories: vi.fn(),
    setOnlyAnomalies: vi.fn(),
    setExcludeMicro: vi.fn(),
    setAnomalyTypes: vi.fn(),
    setDataQualitySignalTypes: vi.fn(),
    setGranularity: vi.fn(),
    setEntityTypes: vi.fn(),
    setBeneficiaryTypes: vi.fn(),
    setIncludeNational: vi.fn(),
    setSorting: vi.fn(),
    setCurrency: vi.fn(),
    setPagination: vi.fn(),
    setMapView: vi.fn(),
    openProjectPanel: vi.fn(),
    openBeneficiaryPanel: vi.fn(),
    openMapCountyPanel: vi.fn(),
    openMapUatPanel: vi.fn(),
    openAnomalyInfoPanel: vi.fn(),
    closePanel: vi.fn(),
    closeProjectPanel: vi.fn(),
    clearFilters: vi.fn(),
    ...overrides,
  }
}

function makeSnapshot(): PnrrSeoSnapshot {
  return {
    lastUpdated: '2026-04-30',
    projectCount: 42,
    deduplicatedProjectCount: 40,
    totalValueEur: 1_200_000,
    deduplicatedTotalValueEur: 1_100_000,
    completedCount: 12,
    completedValueEur: 300_000,
    inProgressCount: 25,
    notStartedCount: 5,
    loanTotalEur: 250_000,
    loanPercent: 20.83,
    missingFinancialProgressCount: 8,
    missingFinancialProgressPercent: 19.05,
    anomalyCount: 3,
    dataQualitySignalCount: 2,
    topComponents: [],
    topCounties: [],
    topBeneficiaries: [],
  }
}

function makeSnapshotSearchKey(
  search = makeFilterState().search,
): string {
  return buildPnrrSeoSnapshotSearchKey(search)
}

describe('PnrrDashboard', () => {
  it('uses cached SSR stats for the overview cards and header while full data loads', () => {
    vi.mocked(usePnrrData).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrData>)
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState())

    render(
      <PnrrDashboard
        ssrSnapshot={makeSnapshot()}
        ssrSnapshotSearchKey={makeSnapshotSearchKey()}
      />,
    )

    expect(screen.getByTestId('pnrr-header')).toHaveAttribute(
      'data-loading',
      'false',
    )
    expect(screen.getByTestId('pnrr-header-projects')).toHaveTextContent('42')
    expect(screen.getByTestId('pnrr-header-total')).toHaveTextContent('1200000')
    expect(screen.getByTestId('pnrr-overview')).toHaveAttribute(
      'data-loading-full-data',
      'true',
    )
    expect(screen.getByTestId('pnrr-overview')).toHaveTextContent('1200000')
  })

  it('keeps non-overview tabs on the standard skeleton while using cached header stats', () => {
    vi.mocked(usePnrrData).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrData>)
    const filterState = makeFilterState({
      search: {
        ...makeFilterState().search,
        view: 'projects',
      },
    })
    vi.mocked(usePnrrFilterState).mockReturnValue(filterState)

    render(
      <PnrrDashboard
        ssrSnapshot={makeSnapshot()}
        ssrSnapshotSearchKey={makeSnapshotSearchKey(filterState.search)}
      />,
    )

    expect(screen.getByTestId('pnrr-header')).toHaveAttribute(
      'data-loading',
      'false',
    )
    expect(screen.queryByTestId('pnrr-overview')).not.toBeInTheDocument()
    expect(screen.getByTestId('pnrr-content-skeleton')).toHaveAttribute(
      'data-hide-metric-cards',
      'false',
    )
  })

  it('ignores cached SSR stats when they were built for different filters', () => {
    vi.mocked(usePnrrData).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrData>)
    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: {
          ...makeFilterState().search,
          search: 'spital',
        },
      }),
    )

    render(
      <PnrrDashboard
        ssrSnapshot={makeSnapshot()}
        ssrSnapshotSearchKey={makeSnapshotSearchKey()}
      />,
    )

    expect(screen.getByTestId('pnrr-header')).toHaveAttribute(
      'data-loading',
      'true',
    )
    expect(screen.getByTestId('pnrr-header-projects')).toHaveTextContent('0')
    expect(screen.queryByTestId('pnrr-overview')).not.toBeInTheDocument()
    expect(screen.getByTestId('pnrr-content-skeleton')).toBeInTheDocument()
  })

  it('shows a retryable error state when the dataset fails to load', () => {
    const refetch = vi.fn()
    vi.mocked(usePnrrData).mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch PNRR projects'),
      isError: true,
      isLoading: false,
      isRefetching: false,
      refetch,
    } as unknown as ReturnType<typeof usePnrrData>)
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState())

    render(<PnrrDashboard />)

    expect(
      screen.queryByTestId('pnrr-content-skeleton'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Could not load PNRR data')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
