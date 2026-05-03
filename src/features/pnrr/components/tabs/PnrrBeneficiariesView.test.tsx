import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrBeneficiariesView } from './PnrrBeneficiariesView'

const PROJECT: PnrrProject = {
  id: 'project-1',
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
  anomalies: [],
  dataQualitySignals: [],
  isReform: false,
  entityType: 'public',
  beneficiaryType: 'other-public',
  sirutaCode: null,
}

function makeProject(overrides: Partial<PnrrProject> = {}): PnrrProject {
  return {
    ...PROJECT,
    ...overrides,
  }
}

function makeFilterState(
  overrides: Partial<ReturnType<typeof usePnrrFilterState>> = {}
): ReturnType<typeof usePnrrFilterState> {
  return {
    search: {
      view: 'beneficiaries',
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
    clearFilters: vi.fn(),
    ...overrides,
  }
}

describe('PnrrBeneficiariesView', () => {
  it('keeps same-name beneficiaries with different CUIs separate', () => {
    render(
      <PnrrBeneficiariesView
        projects={[
          makeProject({ id: 'rediul-1', beneficiary: 'COMUNA REDIU', cui: '111' }),
          makeProject({ id: 'rediul-2', beneficiary: 'COMUNA REDIU', cui: '222' }),
        ]}
        filterState={makeFilterState()}
      />
    )

    expect(screen.getByText('111')).toBeInTheDocument()
    expect(screen.getByText('222')).toBeInTheDocument()
  })

  it('includes in-implementation projects in technical progress averages', () => {
    render(
      <PnrrBeneficiariesView
        projects={[
          makeProject({
            id: 'under-30',
            techProgress: 'in-implementation',
            finProgress: null,
          }),
        ]}
        filterState={makeFilterState()}
      />
    )

    expect(screen.getByText('15%')).toBeInTheDocument()
  })
})
