import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { computeAggregates } from '../../lib/data-transform'
import { PnrrOverview, type PnrrOverviewMetricStats } from './PnrrOverview'

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
  }
}

function makeCachedStats(): PnrrOverviewMetricStats {
  return {
    rawTotalValue: 1_200_000,
    deduplicatedTotalValue: 1_100_000,
    rawProjectCount: 42,
    completedCount: 12,
    completedValue: 300_000,
    loanTotal: 250_000,
    loanPercent: 20.83,
    missingFinProgressCount: 8,
    missingFinProgressPercent: 19.05,
  }
}

describe('PnrrOverview', () => {
  it('renders cached metric cards and the lower skeleton while full data loads', () => {
    render(
      <PnrrOverview
        projects={[]}
        aggregates={computeAggregates([])}
        filterState={makeFilterState()}
        cachedStats={makeCachedStats()}
        isLoadingFullData
      />,
    )

    expect(screen.getByText('Total value')).toBeInTheDocument()
    expect(screen.getByText('Absorption rate')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
    expect(screen.getByText('12 completed projects out of 42')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      /Se încarcă setul complet de date PNRR|Loading the full PNRR dataset/,
    )
    expect(screen.getByTestId('pnrr-content-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('pnrr-metric-skeleton-row')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pnrr-map-preview')).not.toBeInTheDocument()
  })

  it('renders duplicate beneficiary names without React key warnings', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const aggregates = {
      ...computeAggregates([]),
      rawTotalValue: 300,
      deduplicatedTotalValue: 300,
      rawProjectCount: 2,
      topBeneficiaries: [
        {
          beneficiary:
            'DIRECTIA GENERALA DE ASISTENTA SOCIALA SI PROTECTIA COPILULUI',
          cui: '123',
          count: 1,
          value: 200,
        },
        {
          beneficiary:
            'DIRECTIA GENERALA DE ASISTENTA SOCIALA SI PROTECTIA COPILULUI',
          cui: '456',
          count: 1,
          value: 100,
        },
      ],
    }

    try {
      render(
        <PnrrOverview
          projects={[]}
          aggregates={aggregates}
          filterState={makeFilterState()}
        />,
      )

      expect(
        screen.getAllByText(
          'DIRECTIA GENERALA DE ASISTENTA SOCIALA SI PROTECTIA COPILULUI',
        ),
      ).toHaveLength(2)
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
})
