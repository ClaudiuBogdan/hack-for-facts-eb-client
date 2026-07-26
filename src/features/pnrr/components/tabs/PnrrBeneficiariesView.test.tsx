import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrBeneficiariesView } from './PnrrBeneficiariesView'
import type {
  PnrrWorkerBeneficiaryPage,
  PnrrWorkerBeneficiaryRow,
} from '../../workers/pnrr-worker-types'

const usePnrrBeneficiaryDetailMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/usePnrrData', () => ({
  usePnrrBeneficiaryDetail: usePnrrBeneficiaryDetailMock,
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
  listedFundingRon: 100_000,
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

function makeBeneficiaryRow(
  overrides: Partial<PnrrWorkerBeneficiaryRow> = {},
): PnrrWorkerBeneficiaryRow {
  return {
    name: 'Test Beneficiar',
    cui: '12345678',
    aliases: [],
    count: 1,
    value: 100_000,
    techProgressAvg: 50,
    finProgressAvg: 40,
    primaryComponentCode: 'C4',
    extraComponentCount: 0,
    ...overrides,
  }
}

function makePage(
  rows: readonly PnrrWorkerBeneficiaryRow[],
  overrides: Partial<PnrrWorkerBeneficiaryPage> = {},
): PnrrWorkerBeneficiaryPage {
  return {
    rows,
    totalCount: rows.length,
    page: 1,
    pageSize: 25,
    totalPages: Math.max(1, Math.ceil(rows.length / 25)),
    sortBy: 'value',
    sortOrder: 'desc',
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

describe('PnrrBeneficiariesView', () => {
  it('keeps same-name beneficiaries with different CUIs separate', () => {
    usePnrrBeneficiaryDetailMock.mockReturnValue({ data: undefined })
    render(
      <PnrrBeneficiariesView
        page={makePage([
          makeBeneficiaryRow({ name: 'COMUNA REDIU', cui: '111' }),
          makeBeneficiaryRow({ name: 'COMUNA REDIU', cui: '222' }),
        ])}
        filterState={makeFilterState()}
      />
    )

    expect(screen.getByText('111')).toBeInTheDocument()
    expect(screen.getByText('222')).toBeInTheDocument()
  })

  it('includes in-implementation projects in technical progress averages', () => {
    usePnrrBeneficiaryDetailMock.mockReturnValue({ data: undefined })
    render(
      <PnrrBeneficiariesView
        page={makePage([
          makeBeneficiaryRow({ techProgressAvg: 15, finProgressAvg: null }),
        ])}
        filterState={makeFilterState()}
      />
    )

    expect(screen.getByText('15%')).toBeInTheDocument()
  })

  it('opens the beneficiary drawer from URL panel state', () => {
    usePnrrBeneficiaryDetailMock.mockReturnValue({
      data: {
        beneficiary: {
          ...makeBeneficiaryRow(),
          projects: [PROJECT],
          componentValues: [{ code: 'C4', value: 100_000 }],
        },
      },
    })
    render(
      <PnrrBeneficiariesView
        page={makePage([makeBeneficiaryRow()])}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            panel: 'beneficiary',
            panelBeneficiaryCui: PROJECT.cui ?? undefined,
          },
        })}
      />,
    )

    expect(screen.getAllByText('Test Beneficiar').length).toBeGreaterThan(1)
    expect(
      screen.getByRole('button', { name: /View all filtered projects/ }),
    ).toBeInTheDocument()
  })

  it('opens the beneficiary drawer when URL CUI is outside the current page', () => {
    usePnrrBeneficiaryDetailMock.mockReturnValue({ data: undefined })
    render(
      <PnrrBeneficiariesView
        page={{
          rows: [
            {
              name: 'Other Beneficiary',
              cui: '99999999',
              aliases: [],
              count: 1,
              value: 10_000,
              techProgressAvg: null,
              finProgressAvg: null,
              primaryComponentCode: 'C4',
              extraComponentCount: 0,
            },
          ],
          totalCount: 2,
          page: 1,
          pageSize: 25,
          totalPages: 1,
          sortBy: 'value',
          sortOrder: 'desc',
        }}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            panel: 'beneficiary',
            panelBeneficiaryCui: PROJECT.cui ?? undefined,
          },
        })}
      />,
    )

    expect(screen.getByText(`CUI ${PROJECT.cui}`)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /View all filtered projects/ }),
    ).toBeInTheDocument()
  })

  it('sorts beneficiaries by primary component from URL state', () => {
    usePnrrBeneficiaryDetailMock.mockReturnValue({ data: undefined })
    render(
      <PnrrBeneficiariesView
        page={makePage(
          [
            makeBeneficiaryRow({
              name: 'C2 Beneficiary',
              cui: '2',
              primaryComponentCode: 'C2',
            }),
            makeBeneficiaryRow({
              name: 'C10 Beneficiary',
              cui: '10',
              primaryComponentCode: 'C10',
            }),
          ],
          { sortBy: 'component', sortOrder: 'asc' },
        )}
        filterState={makeFilterState({
          search: {
            ...makeFilterState().search,
            beneficiarySortBy: 'component',
            beneficiarySortOrder: 'asc',
          },
        })}
      />,
    )

    const c2 = screen.getAllByText('C2 Beneficiary')[0]!
    const c10 = screen.getAllByText('C10 Beneficiary')[0]!
    expect(
      c2.compareDocumentPosition(c10) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('stores beneficiary component sorting in URL state', () => {
    usePnrrBeneficiaryDetailMock.mockReturnValue({ data: undefined })
    const setBeneficiarySorting = vi.fn()
    render(
      <PnrrBeneficiariesView
        page={makePage([makeBeneficiaryRow()])}
        filterState={makeFilterState({ setBeneficiarySorting })}
      />,
    )

    fireEvent.click(screen.getByText('Comp.'))

    expect(setBeneficiarySorting).toHaveBeenCalledWith('component', 'desc')
  })

  it('keeps a local drawer fallback for beneficiaries without CUI', () => {
    usePnrrBeneficiaryDetailMock.mockReturnValue({ data: undefined })
    const openBeneficiaryPanel = vi.fn()
    render(
      <PnrrBeneficiariesView
        page={makePage([
          makeBeneficiaryRow({
            cui: null,
            name: 'No CUI Beneficiary',
          }),
        ])}
        filterState={makeFilterState({ openBeneficiaryPanel })}
      />,
    )

    fireEvent.click(screen.getByRole('row', { name: /No CUI Beneficiary/ }))

    expect(openBeneficiaryPanel).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: /View all filtered projects/ }),
    ).toBeInTheDocument()
  })
})
