import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PnrrProject } from '@/schemas/pnrr'
import type { usePnrrFilterState } from '../../hooks/usePnrrFilterState'
import { PnrrProjectTable } from './PnrrProjectTable'

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
  overrides: Partial<ReturnType<typeof usePnrrFilterState>> = {},
): ReturnType<typeof usePnrrFilterState> {
  return {
    search: {
      view: 'projects',
      page: 999,
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

describe('PnrrProjectTable', () => {
  it('renders the last available page and corrects out-of-range URL pages', async () => {
    const setPagination = vi.fn()
    const filterState = makeFilterState({ setPagination })

    render(<PnrrProjectTable projects={[PROJECT]} filterState={filterState} />)

    expect(screen.getAllByText('Test Project')).toHaveLength(2)
    expect(screen.getByText('page 1 of 1')).toBeInTheDocument()
    await waitFor(() => expect(setPagination).toHaveBeenCalledWith(1, 25))
  })

  it('sorts in-implementation technical progress as a sub-30 value', () => {
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
      techProgress: 'in-implementation',
    })
    const mid = makeProject({
      id: 'mid',
      title: 'Mid Progress',
      techProgress: 50,
    })

    render(
      <PnrrProjectTable
        projects={[under30, mid, zero]}
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

  it('opens the project drawer from URL panel state and closes through URL state', () => {
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

    render(<PnrrProjectTable projects={[PROJECT]} filterState={filterState} />)

    expect(screen.getByTestId('pnrr-project-drawer')).toHaveTextContent(
      'Test Project',
    )

    screen.getByRole('button', { name: 'Close project' }).click()

    expect(closePanel).toHaveBeenCalledTimes(1)
  })
})
