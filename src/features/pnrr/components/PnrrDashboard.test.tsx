import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { usePnrrWorkerModel } from '../hooks/usePnrrData'
import { usePnrrFilterState } from '../hooks/usePnrrFilterState'
import {
  buildPnrrSeoSnapshotSearchKey,
  type PnrrSeoSnapshot,
} from '../seo/pnrr-seo'
import { computeAggregates, processPnrrData } from '../lib/data-transform'
import { PnrrDashboard } from './PnrrDashboard'
import type { PnrrWorkerQueryResult } from '../workers/pnrr-worker-types'

vi.mock('../hooks/usePnrrData', () => ({
  usePnrrWorkerModel: vi.fn(),
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
    totalValueLabel,
  }: {
    readonly actions: ReactNode
    readonly isLoading: boolean
    readonly projectsCount: number
    readonly totalValue: number
    readonly totalValueLabel?: ReactNode
  }) => (
    <header data-testid="pnrr-header" data-loading={String(isLoading)}>
      <span data-testid="pnrr-header-projects">{projectsCount}</span>
      <span data-testid="pnrr-header-total">{totalValue}</span>
      <span data-testid="pnrr-header-total-label">{totalValueLabel}</span>
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
      beneficiarySortBy: 'value',
      beneficiarySortOrder: 'desc',
      beneficiaryPage: 1,
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
    setBeneficiarySorting: vi.fn(),
    setCurrency: vi.fn(),
    setPagination: vi.fn(),
    setBeneficiaryPagination: vi.fn(),
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
    projectRecordCount: 45,
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
    officialAllocatedTotalEur: null,
    officialPaidTotalEur: null,
    paidBeneficiaryCount: null,
  }
}

function makeSnapshotSearchKey(
  search = makeFilterState().search,
): string {
  return buildPnrrSeoSnapshotSearchKey(search)
}

function makeWorkerResult(
  data = processPnrrData([]),
  overrides: Partial<PnrrWorkerQueryResult['meta']> = {},
): PnrrWorkerQueryResult {
  const aggregates = computeAggregates(data.projects)
  const meta = {
    projectCount: data.meta.projectCount,
    projectRecordCount: data.meta.projectRecordCount,
    source: 'worker' as const,
    paymentSource: 'worker' as const,
    indicatorSource: 'worker' as const,
    beneficiaryPaymentCount: 0,
    officialAllocatedTotalEur: null,
    officialPaidTotalEur: null,
    paidBeneficiaryCount: null,
    ...overrides,
  }
  const emptyHistogramMetric = {
    data: [],
    countCoveragePercent: 0,
    valueCoveragePercent: 0,
    validCount: 0,
    validValue: 0,
    totalRecordCount: aggregates.projectRecordCount,
    totalValue: aggregates.rawTotalValue,
  }
  const emptyMapModel = {
    seriesId: 'total-value' as const,
    granularity: 'county' as const,
    series: { id: 'total-value' as const, data: [], min: 0, max: 0 },
    nationalCount: 0,
    unmappedCount: 0,
    uatProjectCount: 0,
    selectedUat: null,
    selectedCountyProjects: [],
    selectedUatProjects: [],
  }

  return {
    overview: {
      aggregates,
      topComponents: [],
      topCounties: [],
      topBeneficiaries: [],
      projectPreviewRows: [],
      emblematicProjectRows: [],
      histogram: {
        tech: emptyHistogramMetric,
        fin: emptyHistogramMetric,
        gap: emptyHistogramMetric,
      },
      mapPreview: emptyMapModel,
    },
    projectPage: {
      rows: data.projects,
      totalCount: data.projects.length,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      sortBy: 'value',
      sortOrder: 'desc',
    },
    beneficiaryPage: {
      rows: [],
      totalCount: 0,
      page: 1,
      pageSize: 25,
      totalPages: 1,
      sortBy: 'value',
      sortOrder: 'desc',
    },
    anomalyModel: {
      riskCount: 0,
      riskValue: 0,
      dataQualityCount: 0,
      dataQualityValue: 0,
      rows: [],
      totalCount: 0,
    },
    mapModel: emptyMapModel,
    filterFacets: {
      components: [],
      counties: [],
      uats: [],
      measures: [],
      cris: [],
    },
    meta,
  }
}

describe('PnrrDashboard', () => {
  it('uses distinct official project count in the header', () => {
    const data = processPnrrData([
      {
        id_angajament: 123,
        titlu_contract: 'Same project',
        denumire_beneficiar: 'Beneficiar',
        cui: '123',
        judet_implementare: 'București',
        localitate_implementare: 'București',
        sursa_finantare: 'grant',
        valoare_fe: 1_000,
        progres_fizic: 0.5,
        progres_financiar: 0.4,
        cod_componenta: 'C4',
        cod_masura: 'I3',
        cri: 'MTI',
      },
      {
        id_angajament: 123,
        titlu_contract: 'Same project',
        denumire_beneficiar: 'Beneficiar',
        cui: '123',
        judet_implementare: 'București',
        localitate_implementare: 'București',
        sursa_finantare: 'loan',
        valoare_fe: 2_000,
        progres_fizic: 0.5,
        progres_financiar: 0.4,
        cod_componenta: 'C4',
        cod_masura: 'I3',
        cri: 'MTI',
      },
    ])
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: makeWorkerResult(data),
      error: null,
      isError: false,
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>)
    vi.mocked(usePnrrFilterState).mockReturnValue(makeFilterState())

    render(<PnrrDashboard />)

    expect(screen.getByTestId('pnrr-header-projects')).toHaveTextContent('1')
    expect(screen.getByTestId('pnrr-header-total')).toHaveTextContent('600')
  })

  it('uses official allocated total in the unfiltered header', () => {
    const data = processPnrrData([
      {
        id_angajament: 123,
        titlu_contract: 'Same project',
        denumire_beneficiar: 'Beneficiar',
        cui: '123',
        judet_implementare: 'București',
        localitate_implementare: 'București',
        sursa_finantare: 'grant',
        valoare_fe: 1_000,
        progres_fizic: 0.5,
        progres_financiar: 0.4,
        cod_componenta: 'C4',
        cod_masura: 'I3',
        cri: 'MTI',
      },
    ])
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: makeWorkerResult(data, { officialAllocatedTotalEur: 2_000 }),
      error: null,
      isError: false,
      isLoading: false,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>)
    vi.mocked(usePnrrFilterState).mockReturnValue(
      makeFilterState({
        search: {
          ...makeFilterState().search,
          includeNational: true,
        },
      }),
    )

    render(<PnrrDashboard />)

    expect(screen.getByTestId('pnrr-header-total')).toHaveTextContent('2000')
    expect(screen.getByTestId('pnrr-header-total-label')).toHaveTextContent(
      /alocat total|total allocated/,
    )
  })

  it('uses cached SSR stats for the overview cards and header while full data loads', () => {
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>)
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
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>)
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
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isLoading: true,
      isRefetching: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePnrrWorkerModel>)
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
    vi.mocked(usePnrrWorkerModel).mockReturnValue({
      data: undefined,
      error: new Error('Failed to fetch PNRR projects'),
      isError: true,
      isLoading: false,
      isRefetching: false,
      refetch,
    } as unknown as ReturnType<typeof usePnrrWorkerModel>)
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
