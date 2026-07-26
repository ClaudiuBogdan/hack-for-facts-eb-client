import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PnrrProject, PnrrSearchState } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrProjectTable } from './PnrrProjectTable'
import type { PnrrWorkerProjectPage } from '../../workers/pnrr-worker-types'

const usePnrrProjectDetailMock = vi.hoisted(() => vi.fn())

vi.mock('../../hooks/usePnrrData', () => ({
  usePnrrProjectDetail: usePnrrProjectDetailMock,
}))

vi.mock('./PnrrProjectDrawer', () => ({
  PnrrProjectDrawer: ({
    project,
    onClose,
  }: {
    readonly project: PnrrProject | null
    readonly onClose: () => void
  }) =>
    project ? (
      <div data-testid="pnrr-project-drawer">
        <span>{project.title}</span>
        <button type="button" onClick={onClose}>
          Close project
        </button>
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

function makeProject(overrides: Partial<PnrrProject> = {}): PnrrProject {
  return {
    ...PROJECT,
    ...overrides,
  }
}

function makePage(
  rows: readonly PnrrProject[],
  overrides: Partial<PnrrWorkerProjectPage> = {},
): PnrrWorkerProjectPage {
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
  overrides: Partial<ReturnType<typeof usePnrrFilterState>> = {},
): ReturnType<typeof usePnrrFilterState> {
  return {
    search: {
      view: 'projects',
      page: 999,
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

describe('PnrrProjectTable', () => {
  it('explains incompatible component and measure filters', () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: undefined })
    const filterState = makeFilterState({
      search: {
        ...makeFilterState().search,
        components: ['C15'],
        measures: ['C16.I4.grant'],
      },
    })

    render(
      <PnrrProjectTable
        page={makePage([], { totalCount: 0 })}
        filterState={filterState}
      />,
    )

    expect(
      screen.getByText('Selected component and measure cannot match'),
    ).toBeInTheDocument()
  })

  it('renders the last available page and corrects out-of-range URL pages', async () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: undefined })
    const setPagination = vi.fn()
    const filterState = makeFilterState({ setPagination })

    render(<PnrrProjectTable page={makePage([PROJECT])} filterState={filterState} />)

    expect(screen.getAllByText('Test Project')).toHaveLength(2)
    expect(screen.getAllByText('1 / 1').length).toBeGreaterThan(0)
    await waitFor(() => expect(setPagination).toHaveBeenCalledWith(1, 25))
  })

  it('does not revert a valid requested page while worker rows are stale', async () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: undefined })
    const setPagination = vi.fn()
    const filterState = makeFilterState({
      setPagination,
      search: {
        ...makeFilterState().search,
        page: 2,
      },
    })

    render(
      <PnrrProjectTable
        page={makePage([PROJECT], {
          totalCount: 75,
          page: 1,
          pageSize: 25,
          totalPages: 3,
        })}
        filterState={filterState}
      />,
    )

    await waitFor(() => expect(screen.getAllByText('1 / 3').length).toBeGreaterThan(0))
    expect(setPagination).not.toHaveBeenCalled()
  })

  it('does not correct out-of-range pages while worker data is placeholder state', async () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: undefined })
    const setPagination = vi.fn()
    const filterState = makeFilterState({
      setPagination,
      search: {
        ...makeFilterState().search,
        page: 8,
      },
    })

    render(
      <PnrrProjectTable
        page={makePage([PROJECT])}
        filterState={filterState}
        isPageStatePending
      />,
    )

    await waitFor(() => expect(screen.getAllByText('1 / 1').length).toBeGreaterThan(0))
    expect(setPagination).not.toHaveBeenCalled()
  })

  it('rounds reported progress percentages to two decimals', () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: undefined })
    const filterState = makeFilterState()
    const project = makeProject({
      techProgress: 60,
      finProgress: 29.020000000000003,
    })

    render(<PnrrProjectTable page={makePage([project])} filterState={filterState} />)

    expect(screen.getAllByText(/29[,.]02%/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/29[,.]020000/)).not.toBeInTheDocument()
  })

  it('renders one grouped project row with primary values and variant counts', () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: undefined })
    const filterState = makeFilterState({ search: { ...makeFilterState().search, page: 1 } })
    const secondaryRecord = makeProject({
      id: 'record-2',
      componentCode: 'C5',
      county: 'Cluj',
      listedFundingRon: 40_000,
    })
    const groupedProject = makeProject({
      id: 'engagement:engagement-1',
      primaryRecord: PROJECT,
      records: [PROJECT, secondaryRecord],
      listedFundingTotalRon: 140_000,
      recordCount: 2,
      listedFundingRon: 140_000,
      componentCodes: ['C4', 'C5'],
      counties: ['București', 'Cluj'],
      variantCounts: {
        components: 1,
        measures: 0,
        fundingSources: 0,
        counties: 1,
        localities: 0,
        cris: 0,
        techProgress: 0,
        finProgress: 0,
      },
    })

    render(<PnrrProjectTable page={makePage([groupedProject])} filterState={filterState} />)

    expect(screen.getAllByText('Test Project')).toHaveLength(2)
    expect(screen.getAllByText('+1').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/1 projects/)).toBeInTheDocument()
  })

  it('renders worker-sorted technical progress rows', () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: undefined })
    const filterState = makeFilterState({
      search: {
        ...makeFilterState().search,
        page: 1,
        sortBy: 'techProgress',
        sortOrder: 'asc',
      },
    })
    const zero = makeProject({
      id: 'zero',
      title: 'Zero Progress',
      techProgress: 0,
    })
    const under30 = makeProject({
      id: 'under-30',
      title: 'Under 30 Progress',
      techProgress: 'under-30-reported',
    })
    const mid = makeProject({
      id: 'mid',
      title: 'Mid Progress',
      techProgress: 50,
    })

    render(
      <PnrrProjectTable
        page={makePage([zero, under30, mid], {
          sortBy: 'techProgress',
          sortOrder: 'asc',
        })}
        filterState={filterState}
      />,
    )

    const zeroTitle = screen.getAllByText('Zero Progress')[0]
    const under30Title = screen.getAllByText('Under 30 Progress')[0]
    const midTitle = screen.getAllByText('Mid Progress')[0]

    expect(
      zeroTitle.compareDocumentPosition(under30Title) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      under30Title.compareDocumentPosition(midTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('toggles value sorting when value is the implicit default sort', async () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: undefined })
    const user = userEvent.setup()
    const setSorting = vi.fn()
    const search = {
      ...makeFilterState().search,
      page: 1,
    } as Partial<PnrrSearchState>
    delete search.sortBy
    delete search.sortOrder
    const filterState = makeFilterState({
      setSorting,
      search: search as PnrrSearchState,
    })

    render(
      <PnrrProjectTable
        page={makePage([PROJECT], { sortBy: 'value', sortOrder: 'desc' })}
        filterState={filterState}
      />,
    )

    await user.click(screen.getByText('EU funding'))

    expect(setSorting).toHaveBeenCalledWith('value', 'asc')
  })

  it('renders worker-sorted component rows and stores component sort in URL state', async () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: undefined })
    const user = userEvent.setup()
    const setSorting = vi.fn()
    const filterState = makeFilterState({
      setSorting,
      search: {
        ...makeFilterState().search,
        page: 1,
        sortBy: 'component',
        sortOrder: 'asc',
      },
    })
    const componentTen = makeProject({
      id: 'component-10',
      title: 'Component Ten',
      componentCode: 'C10',
    })
    const componentTwo = makeProject({
      id: 'component-2',
      title: 'Component Two',
      componentCode: 'C2',
    })

    render(
      <PnrrProjectTable
        page={makePage([componentTwo, componentTen], {
          sortBy: 'component',
          sortOrder: 'asc',
        })}
        filterState={filterState}
      />,
    )

    const componentTwoTitle = screen.getAllByText('Component Two')[0]
    const componentTenTitle = screen.getAllByText('Component Ten')[0]
    expect(
      componentTwoTitle.compareDocumentPosition(componentTenTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    await user.click(screen.getByText('Comp.'))

    expect(setSorting).toHaveBeenCalledWith('component', 'desc')
  })

  it('opens the project drawer from URL panel state and closes through URL state', () => {
    usePnrrProjectDetailMock.mockReturnValue({ data: { project: PROJECT } })
    const closePanel = vi.fn()
    const filterState = makeFilterState({
      closePanel,
      search: {
        ...makeFilterState().search,
        page: 1,
        panel: 'project',
        panelProjectId: PROJECT.id,
      },
    })

    render(<PnrrProjectTable page={makePage([PROJECT])} filterState={filterState} />)

    expect(screen.getByTestId('pnrr-project-drawer')).toHaveTextContent(
      'Test Project',
    )

    screen.getByRole('button', { name: 'Close project' }).click()

    expect(closePanel).toHaveBeenCalledTimes(1)
  })
})
