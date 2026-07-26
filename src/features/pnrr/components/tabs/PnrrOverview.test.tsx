import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { computeAggregates } from '../../lib/data-transform'
import { PnrrOverview, type PnrrOverviewMetricStats } from './PnrrOverview'
import type { PnrrProject } from '@/schemas/pnrr'
import type { PnrrWorkerOverviewModel } from '../../workers/pnrr-worker-types'

vi.mock('../PnrrMapPreview', () => ({
  PnrrMapPreview: () => <div data-testid="pnrr-map-preview" />,
}))

vi.mock('../PnrrProjectsPreview', () => ({
  PnrrProjectsPreview: () => <div data-testid="pnrr-projects-preview" />,
}))

vi.mock('../PnrrEmblematicProjects', () => ({
  PnrrEmblematicProjects: () => <div data-testid="pnrr-emblematic-projects" />,
}))

vi.mock('../table/PnrrProjectDrawer', () => ({
  PnrrProjectDrawer: () => null,
}))

vi.mock('../charts/PnrrProgressHistogram', () => ({
  PnrrProgressHistogram: () => <div data-testid="pnrr-progress-histogram" />,
}))

vi.mock('../charts/PnrrFundingBar', () => ({
  PnrrFundingBar: () => <div data-testid="pnrr-funding-bar" />,
}))

function makeFilterState(): ReturnType<typeof usePnrrFilterState> {
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
      includeNational: true,
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
  }
}

function makeCachedStats(): PnrrOverviewMetricStats {
  return {
    rawTotalValue: 1_200_000,
    deduplicatedTotalValue: 1_100_000,
    projectCount: 42,
    projectRecordCount: 45,
    completedCount: 12,
    completedValue: 300_000,
    loanTotal: 250_000,
    loanPercent: 20.83,
    missingFinProgressCount: 8,
    missingFinProgressPercent: 19.05,
  }
}

function makeProject(overrides: Partial<PnrrProject>): PnrrProject {
  return {
    id: 'project-1',
    engagementId: 'engagement-1',
    title: 'Test project',
    beneficiary: 'Test beneficiary',
    cui: '123',
    county: 'Național',
    locality: 'Național',
    fundingSource: 'grant',
    listedFundingRon: 100,
    techProgress: 50,
    finProgress: 40,
    status: 'mid-progress',
    componentCode: 'C4',
    measureCode: 'I1',
    measureFullCode: 'C4-I1',
    cri: 'test',
    anomalies: [],
    dataQualitySignals: [],
    isReform: false,
    entityType: 'public',
    beneficiaryType: 'other-public',
    sirutaCode: null,
    ...overrides,
  }
}

function makeOverview(
  overrides: Partial<PnrrWorkerOverviewModel> = {},
): PnrrWorkerOverviewModel {
  return {
    aggregates: computeAggregates([]),
    topComponents: [],
    topCounties: [],
    topBeneficiaries: [],
    beneficiaryRankingSource: 'listed-project-value',
    beneficiaryRankingScope: 'filtered',
    projectPreviewRows: [],
    emblematicProjectRows: [],
    histogram: {
      tech: {
        data: [],
        countCoveragePercent: 0,
        valueCoveragePercent: 0,
        validCount: 0,
        validValue: 0,
        totalRecordCount: 0,
        totalValue: 0,
      },
      fin: {
        data: [],
        countCoveragePercent: 0,
        valueCoveragePercent: 0,
        validCount: 0,
        validValue: 0,
        totalRecordCount: 0,
        totalValue: 0,
      },
      gap: {
        data: [],
        countCoveragePercent: 0,
        valueCoveragePercent: 0,
        validCount: 0,
        validValue: 0,
        totalRecordCount: 0,
        totalValue: 0,
      },
    },
    mapPreview: {
      seriesId: 'total-value',
      granularity: 'county',
      series: {
        id: 'total-value',
        data: [],
        min: 0,
        max: 0,
      },
      nationalCount: 0,
      unmappedCount: 0,
      uatProjectCount: 0,
      selectedUat: null,
      selectedCountyProjects: [],
      selectedUatProjects: [],
    },
    ...overrides,
  }
}

describe('PnrrOverview', () => {
  it('renders cached metric cards and the lower skeleton while full data loads', () => {
    render(
      <PnrrOverview
        aggregates={computeAggregates([])}
        filterState={makeFilterState()}
        cachedStats={makeCachedStats()}
        isLoadingFullData
      />,
    )

    expect(screen.getByText('Listed EU funding')).toBeInTheDocument()
    expect(screen.getByText('Share of value of projects marked as completed')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('12 projects marked as completed from 42')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      /Se încarcă setul complet de date PNRR|Loading the full PNRR dataset/,
    )
    expect(screen.getByTestId('pnrr-content-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('pnrr-metric-skeleton-row')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pnrr-map-preview')).not.toBeInTheDocument()
  })

  it('uses official allocation for cached SSR headline metrics', () => {
    render(
      <PnrrOverview
        aggregates={computeAggregates([])}
        filterState={makeFilterState()}
        cachedStats={makeCachedStats()}
        officialAllocatedTotalEur={2_000_000}
        isLoadingFullData
      />,
    )

    expect(screen.getByText('Total PNRR allocation')).toBeInTheDocument()
    expect(document.body).toHaveTextContent(/€2M/)
    expect(screen.getAllByText(/listed EU funding/).length).toBeGreaterThan(0)
  })

  it('uses official allocated total for the unfiltered headline metric', () => {
    const projects = [
      makeProject({
        listedFundingRon: 100,
      }),
    ]

    render(
      <PnrrOverview
        aggregates={computeAggregates(projects)}
        filterState={makeFilterState()}
        officialAllocatedTotalEur={200}
      />,
    )

    expect(screen.getByText('Total PNRR allocation')).toBeInTheDocument()
    expect(screen.getAllByText(/listed EU funding/).length).toBeGreaterThan(0)
    expect(screen.queryByText('Listed EU funding')).not.toBeInTheDocument()
  })

  it('renders beneficiary values from the main project dataset without React key warnings', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const projects = [
      makeProject({
        id: 'project-123',
        engagementId: 'engagement-123',
        beneficiary:
          'DIRECTIA GENERALA DE ASISTENTA SOCIALA SI PROTECTIA COPILULUI',
        cui: '123',
        listedFundingRon: 120,
      }),
      makeProject({
        id: 'project-456',
        engagementId: 'engagement-456',
        beneficiary:
          'DIRECTIA GENERALA DE ASISTENTA SOCIALA SI PROTECTIA COPILULUI',
        cui: '456',
        listedFundingRon: 80,
      }),
    ]

    try {
      render(
        <PnrrOverview
          aggregates={computeAggregates(projects)}
          filterState={makeFilterState()}
          overview={makeOverview({
            topBeneficiaries: [
              {
                id: '123',
                itemKey: 'Test 123',
                label:
                  'DIRECTIA GENERALA DE ASISTENTA SOCIALA SI PROTECTIA COPILULUI',
                listedFundingRon: 120,
                count: 1,
                pct: 60,
              },
              {
                id: '456',
                itemKey: 'Test 456',
                label:
                  'DIRECTIA GENERALA DE ASISTENTA SOCIALA SI PROTECTIA COPILULUI',
                listedFundingRon: 80,
                count: 1,
                pct: 40,
              },
            ],
          })}
        />,
      )

      expect(
        screen.getByText('Top beneficiaries by listed EU funding (Top 100)'),
      ).toBeInTheDocument()
      expect(
        screen.getAllByText(
          'DIRECTIA GENERALA DE ASISTENTA SOCIALA SI PROTECTIA COPILULUI',
        ),
      ).toHaveLength(2)
      expect(screen.getAllByText(/1 projects/)).toHaveLength(2)
      expect(
        consoleError.mock.calls.some((call) =>
          call.some((argument) =>
            String(argument).includes('Encountered two children with the same key'),
          ),
        ),
      ).toBe(false)
    } finally {
      consoleError.mockRestore()
    }
  })

  it('uses worker payment rows for the overview beneficiary leaderboard', () => {
    const projects = [
      makeProject({
        beneficiary:
          'COMPANIA NAŢIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.',
        cui: '16054368',
        listedFundingRon: 2_000,
      }),
    ]

    render(
      <PnrrOverview
        aggregates={computeAggregates(projects)}
        filterState={makeFilterState()}
        overview={makeOverview({
          topBeneficiaries: [
            {
              id: '16054368',
              itemKey: 'payment:16054368',
              label:
                'COMPANIA NAŢIONALĂ DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.',
              listedFundingRon: 1_000,
              count: 1,
              pct: 100,
              secondaryListedFundingRon: 2_000,
            },
          ],
        })}
      />,
    )

    expect(
      screen.getByText('Top beneficiaries by reported amounts received (Top 100)'),
    ).toBeInTheDocument()
    expect(screen.queryByText('received:')).not.toBeInTheDocument()
    expect(screen.getAllByText(/Listed EU funding/).length).toBeGreaterThan(0)
    expect(screen.queryByText('share of total paid')).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Amounts received are read from the official file/),
    ).not.toBeInTheDocument()
  })
})
