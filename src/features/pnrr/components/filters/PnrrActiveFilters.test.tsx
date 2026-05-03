import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrActiveFilters } from './PnrrActiveFilters'

const PROJECT: PnrrProject = {
  id: 'project-1',
  title: 'Test Project',
  beneficiary: 'COMUNA CHIAJNA',
  cui: '4611538',
  county: 'Ilfov',
  locality: 'Chiajna',
  fundingSource: 'grant',
  valueEur: 100_000,
  techProgress: 50,
  finProgress: 40,
  status: 'mid-progress',
  componentCode: 'C10',
  measureCode: 'I1',
  measureFullCode: 'C10-I1',
  cri: 'MDLPA',
  anomalies: [],
  dataQualitySignals: [],
  isReform: false,
  entityType: 'public',
  beneficiaryType: 'uat',
  sirutaCode: '179132',
}

function makeFilterState(
  search: Partial<ReturnType<typeof usePnrrFilterState>['search']>,
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
      includeNational: true,
      ...search,
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

describe('PnrrActiveFilters', () => {
  it('renders multi UAT chips with names resolved by SIRUTA', () => {
    render(
      <PnrrActiveFilters
        filterState={makeFilterState({ uatSirutas: ['143450'] })}
        uatLabelsBySiruta={new Map([['143450', 'Municipiul Sibiu']])}
      />,
    )

    expect(screen.getByText('Municipiul Sibiu')).toBeInTheDocument()
    expect(screen.queryByText('143450')).not.toBeInTheDocument()
  })

  it('ignores manipulated UAT names and resolves the chip label by SIRUTA', () => {
    render(
      <PnrrActiveFilters
        filterState={makeFilterState({
          uatSiruta: '147358',
          uatName: 'Orasul Brosteni234',
        })}
        uatLabelsBySiruta={new Map([['147358', 'Orașul Broșteni']])}
      />,
    )

    expect(screen.getByText('Orașul Broșteni')).toBeInTheDocument()
    expect(screen.queryByText('Orasul Brosteni234')).not.toBeInTheDocument()
  })

  it('renders beneficiary CUI chips with loaded beneficiary names', () => {
    render(
      <PnrrActiveFilters
        filterState={makeFilterState({ beneficiaryCui: '4611538' })}
        beneficiaryNamesByCui={new Map([[PROJECT.cui ?? '', PROJECT.beneficiary]])}
      />,
    )

    expect(screen.getByText('4611538 - COMUNA CHIAJNA')).toBeInTheDocument()
  })

  it('falls back to the raw beneficiary CUI before project data is loaded', () => {
    render(
      <PnrrActiveFilters
        filterState={makeFilterState({ beneficiaryCui: '4611538' })}
      />,
    )

    expect(screen.getByText('4611538')).toBeInTheDocument()
  })
})
