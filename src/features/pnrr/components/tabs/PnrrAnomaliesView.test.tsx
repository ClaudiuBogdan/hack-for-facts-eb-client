import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PnrrAggregates, PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { computeAggregates } from '../../lib/data-transform'
import { PnrrAnomaliesView } from './PnrrAnomaliesView'
import type { PnrrWorkerAnomalyModel } from '../../workers/pnrr-worker-types'

vi.mock('../PnrrAnomalyRibbon', () => ({
  PnrrAnomalyRibbon: () => <div data-testid="pnrr-anomaly-ribbon" />,
}))

vi.mock('../PnrrQuickInvestigation', () => ({
  PnrrQuickInvestigation: () => <div data-testid="pnrr-quick-investigation" />,
}))

vi.mock('../table/PnrrProjectTable', () => ({
  PnrrProjectTable: () => <div data-testid="pnrr-project-table" />,
}))

vi.mock('../PnrrAnomalyInfoPanel', () => ({
  PnrrAnomalyInfoPanel: ({
    open,
    selectedSignal,
  }: {
    readonly open: boolean
    readonly selectedSignal?: { readonly kind: string; readonly type: string }
  }) =>
    open ? (
      <div data-testid="pnrr-anomaly-info-panel">
        {selectedSignal ? `${selectedSignal.kind}:${selectedSignal.type}` : 'guide'}
      </div>
    ) : null,
}))

const PROJECT: PnrrProject = {
  id: 'project-1',
  engagementId: 'engagement-1',
  title: 'Test Project',
  beneficiary: 'Test Beneficiar',
  cui: '12345678',
  county: 'București',
  locality: 'București',
  fundingSource: 'grant',
  valueEur: 100_000,
  techProgress: 50,
  finProgress: 40,
  status: 'mid-progress',
  componentCode: 'C4',
  measureCode: 'I3',
  measureFullCode: 'C4-I3',
  cri: 'MTI',
  anomalies: ['large-low-progress'],
  dataQualitySignals: [],
  isReform: false,
  entityType: 'public',
  beneficiaryType: 'other-public',
  sirutaCode: null,
}

function makeFilterState(
  overrides: Partial<ReturnType<typeof usePnrrFilterState>> = {},
): ReturnType<typeof usePnrrFilterState> {
  return {
    search: {
      view: 'anomalies',
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

describe('PnrrAnomaliesView', () => {
  it('opens the anomaly info panel from URL panel state', () => {
    const aggregates: PnrrAggregates = computeAggregates([PROJECT])
    const model: PnrrWorkerAnomalyModel = {
      riskCount: 1,
      riskValue: PROJECT.valueEur,
      dataQualityCount: 0,
      dataQualityValue: 0,
      rows: [PROJECT],
      totalCount: 1,
    }

    render(
      <PnrrAnomaliesView
        model={model}
        aggregates={aggregates}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            panel: 'anomaly-info',
            panelSignalKind: 'risk',
            panelSignalType: 'large-low-progress',
          },
        })}
      />,
    )

    expect(screen.getByTestId('pnrr-anomaly-info-panel')).toHaveTextContent(
      'risk:large-low-progress',
    )
  })
})
