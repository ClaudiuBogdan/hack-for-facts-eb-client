import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
  CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS,
} from './challenge-entity-public-maps'
import type { EntityDetailsData, ExecutionLineItem } from '@/lib/api/entities'
import {
  ChallengeEntityAnalysisPage,
  type ChallengeEntityAnalysisPageState,
} from './challenge-entity-analysis-page'

const useEntityDetailsMock = vi.fn()
const useEntityExecutionLineItemsMock = vi.fn()
const useReportsConnectionMock = vi.fn()
const useTreemapDrilldownMock = vi.fn()
const useQueryMock = vi.fn()
const useGlobalSettingsMock = vi.fn()
const fetchEntityAnalyticsMock = vi.fn()
const budgetTreemapMock = vi.fn()
const getEntityFeatureInfoMock = vi.fn()
const mapAnalyticsPublicPreviewCardMock = vi.fn()
const setPrimaryMock = vi.fn()
const setPathMock = vi.fn()
const resetTreemapMock = vi.fn()
let mockGeoJsonData = {
  data: {
    type: 'FeatureCollection',
    features: [],
  },
  isLoading: false,
  error: null as Error | null,
}

function buildHref(to: unknown, params?: Record<string, string>) {
  if (typeof to !== 'string') return '#'

  return Object.entries(params ?? {}).reduce(
    (resolvedPath, [key, value]) =>
      resolvedPath.replace(`$${key}`, encodeURIComponent(value)),
    to,
  )
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a
      href={buildHref(to, params)}
      data-search={search ? JSON.stringify(search) : undefined}
      {...props}
    >
      {children}
    </a>
  ),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query')
  return {
    ...actual,
    useQuery: (...args: unknown[]) => useQueryMock(...args),
  }
})

vi.mock('@/hooks/filters/useFilterLabels', () => ({
  useEntityTypeLabel: () => ({
    map: (value: string) => {
      if (value === 'admin_municipality') return 'Municipiu'
      if (value === 'school') return 'Școală'
      if (value === 'culture_institution') return 'Instituție culturală'
      return 'Instituție'
    },
    add: vi.fn(),
    fetch: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  useEntityDetails: (...args: unknown[]) => useEntityDetailsMock(...args),
  useEntityExecutionLineItems: (...args: unknown[]) =>
    useEntityExecutionLineItemsMock(...args),
  useReportsConnection: (...args: unknown[]) =>
    useReportsConnectionMock(...args),
}))

vi.mock('@/lib/hooks/useGlobalSettings', () => ({
  useGlobalSettings: (...args: unknown[]) => useGlobalSettingsMock(...args),
}))

vi.mock('@/lib/api/entity-analytics', () => ({
  fetchEntityAnalytics: (...args: unknown[]) => fetchEntityAnalyticsMock(...args),
}))

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => mockGeoJsonData,
}))

vi.mock('@/components/entities/utils', () => ({
  getEntityFeatureInfo: (...args: unknown[]) => getEntityFeatureInfoMock(...args),
}))

vi.mock('@/components/budget-explorer/useTreemapDrilldown', () => ({
  useTreemapDrilldown: (...args: unknown[]) => useTreemapDrilldownMock(...args),
}))

vi.mock('@/components/entities/EntityFinancialSummary', () => ({
  EntityFinancialSummary: (props: any) => (
    <div data-testid="financial-summary">
      {props.periodLabel}:{props.totalIncome}:{props.totalExpenses}:{props.budgetBalance}
    </div>
  ),
}))

vi.mock('@/components/entities/EntityFinancialTrends', () => ({
  EntityFinancialTrends: (props: any) => (
    <div data-testid="financial-trends">
      {props.entityCui}:{String(props.showControls)}:{String(props.showChartEditorLink)}:{props.currentYear}
      <button type="button" onClick={() => props.onYearChange?.(2024)}>
        Select 2024
      </button>
    </div>
  ),
}))

vi.mock('@/components/budget-explorer/BudgetTreemap', () => ({
  BudgetTreemap: (props: any) => {
    budgetTreemapMock(props)
    return <div data-testid="budget-treemap">{props.primary}</div>
  },
}))

vi.mock(
  '@/features/advanced-map-analytics/components/map-analytics-public-preview-card',
  () => ({
    MapAnalyticsPublicPreviewCard: (props: Record<string, unknown>) => {
      mapAnalyticsPublicPreviewCardMock(props)
      const onMapViewportChange = props.onMapViewportChange as
        | ((viewport: { mapZoom: number; mapCenter: [number, number] }) => void)
        | undefined
      return (
        <div data-testid="public-map-preview">
          {String(props.mapKey)}:{String(props.selectedYearOverride)}:
          {String(props.reportTypeOverride)}:{String(props.normalizationOverride)}:{String(props.currencyOverride)}:{String(props.inflationAdjustedOverride)}:
          {String(props.mapZoomOverride)}:{(props.mapCenterOverride as number[] | undefined)?.join('|') ?? ''}:
          {String(props.mapNameOverride)}
          <button
            type="button"
            onClick={() =>
              onMapViewportChange?.({
                mapZoom: 9.6,
                mapCenter: [47.1, 26.2],
              })
            }
          >
            Pan preview map
          </button>
        </div>
      )
    },
  }),
)

vi.mock('./challenge-entity-analysis-header', () => ({
  ChallengeEntityAnalysisHeader: (props: any) => (
    <div data-testid="analysis-header">
      <div>{props.entity?.name}</div>
      <div>{props.selectedYear}</div>
      {props.showInflationBadge ? (
        <div>
          {props.languageQuery === 'en'
            ? 'Inflation-adjusted values (2024)'
            : 'Valori ajustate cu inflația (2024)'}
        </div>
      ) : null}
      <a href="/buget/cauta">
        {props.languageQuery === 'en'
          ? 'Change City Hall'
          : 'Schimbă Primăria'}
      </a>
    </div>
  ),
}))

vi.mock('./challenge-entity-category-evolution', () => ({
  ChallengeEntityCategoryEvolution: (props: any) => (
    <div data-testid="category-evolution">
      {props.entityCui}:{props.currentYear}:{props.reportType}
      <button type="button" onClick={() => props.onYearChange?.(2023)}>
        Select 2023
      </button>
    </div>
  ),
}))

const entityDetails: EntityDetailsData = {
  cui: '12345678',
  name: 'Primăria Sibiu',
  default_report_type: 'PRINCIPAL_AGGREGATED',
  entity_type: 'admin_municipality',
  uat: {
    county_name: 'Județul Sibiu',
    population: 134309,
  },
  totalIncome: 150000000,
  totalExpenses: 145000000,
  budgetBalance: 5000000,
  incomeTrend: {
    seriesId: 'income',
    xAxis: { name: 'Year', type: 'STRING', unit: '' },
    yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' },
    data: [
      { x: '2024', y: 140000000 },
      { x: '2025', y: 150000000 },
    ],
  },
  expenseTrend: {
    seriesId: 'expense',
    xAxis: { name: 'Year', type: 'STRING', unit: '' },
    yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' },
    data: [
      { x: '2024', y: 130000000 },
      { x: '2025', y: 145000000 },
    ],
  },
  balanceTrend: {
    seriesId: 'balance',
    xAxis: { name: 'Year', type: 'STRING', unit: '' },
    yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' },
    data: [
      { x: '2024', y: 10000000 },
      { x: '2025', y: 5000000 },
    ],
  },
}

const detailedEntityDetails: EntityDetailsData = {
  ...entityDetails,
  totalIncome: 90000000,
  totalExpenses: 87000000,
  budgetBalance: 3000000,
  incomeTrend: {
    ...entityDetails.incomeTrend!,
    data: [
      { x: '2024', y: 82000000 },
      { x: '2025', y: 90000000 },
    ],
  },
  expenseTrend: {
    ...entityDetails.expenseTrend!,
    data: [
      { x: '2024', y: 79000000 },
      { x: '2025', y: 87000000 },
    ],
  },
  balanceTrend: {
    ...entityDetails.balanceTrend!,
    data: [
      { x: '2024', y: 3000000 },
      { x: '2025', y: 3000000 },
    ],
  },
}

const lineItems: ExecutionLineItem[] = [
  {
    line_item_id: 'expense-line',
    account_category: 'ch',
    funding_source_id: 1,
    anomaly: 'YTD_ANOMALY',
    functionalClassification: {
      functional_code: '65.02',
      functional_name: 'Învățământ',
    },
    economicClassification: {
      economic_code: '20.01',
      economic_name: 'Bunuri și servicii',
    },
    ytd_amount: 1000000,
    quarterly_amount: 1000000,
    monthly_amount: 1000000,
    amount: 1000000,
  },
  {
    line_item_id: 'revenue-line',
    account_category: 'vn',
    funding_source_id: 1,
    anomaly: 'MISSING_LINE_ITEM',
    functionalClassification: {
      functional_code: '00.01',
      functional_name: 'Venituri',
    },
    economicClassification: {
      economic_code: '04.02',
      economic_name: 'Impozite',
    },
    ytd_amount: 2000000,
    quarterly_amount: 2000000,
    monthly_amount: 2000000,
    amount: 2000000,
  },
]

const detailedLineItems: ExecutionLineItem[] = [
  {
    line_item_id: 'detailed-expense-line',
    account_category: 'ch',
    funding_source_id: 1,
    anomaly: 'YTD_ANOMALY',
    functionalClassification: {
      functional_code: '51.02',
      functional_name: 'Autorități executive',
    },
    economicClassification: {
      economic_code: '10.01',
      economic_name: 'Cheltuieli de personal',
    },
    ytd_amount: 650000,
    quarterly_amount: 650000,
    monthly_amount: 650000,
    amount: 650000,
  },
  {
    line_item_id: 'detailed-revenue-line',
    account_category: 'vn',
    funding_source_id: 1,
    anomaly: 'MISSING_LINE_ITEM',
    functionalClassification: {
      functional_code: '00.01',
      functional_name: 'Venituri',
    },
    economicClassification: {
      economic_code: '03.02',
      economic_name: 'Cote și sume defalcate',
    },
    ytd_amount: 1200000,
    quarterly_amount: 1200000,
    monthly_amount: 1200000,
    amount: 1200000,
  },
]

const subordinateRankingNodes = [
  {
    entity_cui: '99887766',
    entity_name: 'Liceul Teoretic Avram Iancu',
    entity_type: 'school',
    amount: 2500000,
    total_amount: 2500000,
    per_capita_amount: 0,
  },
  {
    entity_cui: '11223344',
    entity_name: 'Teatrul Municipal',
    entity_type: 'culture_institution',
    amount: 1800000,
    total_amount: 1800000,
    per_capita_amount: 0,
  },
]

const reportsConnection = {
  nodes: [
    {
      report_id: 'report-1',
      reporting_year: 2025,
      report_type: 'PRINCIPAL_AGGREGATED',
      report_date: '1761868800000',
      download_links: ['https://example.com/report-1.pdf'],
      main_creditor: {
        cui: '12345678',
        name: 'Primăria Sibiu',
      },
      budgetSector: {
        sector_id: '2',
        sector_description: 'Buget local',
      },
    },
    {
      report_id: 'report-2',
      reporting_year: 2025,
      report_type: 'PRINCIPAL_AGGREGATED',
      report_date: '1759190400000',
      download_links: ['https://example.com/report-2.pdf'],
      main_creditor: {
        cui: '12345678',
        name: 'Primăria Sibiu',
      },
      budgetSector: {
        sector_id: '2',
        sector_description: 'Buget local',
      },
    },
  ],
  pageInfo: {
    totalCount: 2,
    hasNextPage: false,
    hasPreviousPage: false,
  },
}

function createSubordinateRankingConnection(
  nodes: typeof subordinateRankingNodes = subordinateRankingNodes,
  totalCount: number = nodes.length,
) {
  return {
    nodes,
    pageInfo: {
      totalCount,
      hasNextPage: totalCount > nodes.length,
      hasPreviousPage: false,
    },
  }
}

const DEFAULT_PAGE_STATE: ChallengeEntityAnalysisPageState = {
  selectedYear: 2025,
  reportType: 'PRINCIPAL_AGGREGATED',
  normalization: 'total',
  treemapAccountCategory: 'ch',
  treemapPrimary: 'fn',
  treemapPath: [],
  evolutionAccountCategory: 'ch',
  evolutionPrimary: 'fn',
  mapPreviewKey: DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
}

function renderAnalysisPage(
  props: {
    readonly entityCui?: string
    readonly languageQuery?: 'ro' | 'en'
    readonly state?: Partial<ChallengeEntityAnalysisPageState>
  } = {},
) {
  function TestHarness() {
    const [state, setState] = useState<ChallengeEntityAnalysisPageState>({
      ...DEFAULT_PAGE_STATE,
      ...props.state,
    })

    return (
      <ChallengeEntityAnalysisPage
        entityCui={props.entityCui ?? '12345678'}
        languageQuery={props.languageQuery}
        state={state}
        onStateChange={(patch) =>
          setState((previousState) => ({
            ...previousState,
            ...patch,
          }))
        }
      />
    )
  }

  return render(<TestHarness />)
}

describe('ChallengeEntityAnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useEntityDetailsMock.mockImplementation(
      ({ reportType }: { reportType?: string }) => ({
        data:
          reportType === 'DETAILED' ? detailedEntityDetails : entityDetails,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
    )
    useEntityExecutionLineItemsMock.mockImplementation(
      ({ reportType }: { reportType?: string }) => ({
        data: {
          nodes: reportType === 'DETAILED' ? detailedLineItems : lineItems,
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
    )
    useTreemapDrilldownMock.mockReturnValue({
      primary: 'fn',
      activePrimary: 'fn',
      treemapData: [{ name: 'Învățământ', value: 1000000 }],
      breadcrumbs: [],
      excludedItemsSummary: null,
      onNodeClick: vi.fn(),
      onBreadcrumbClick: vi.fn(),
      setPath: setPathMock,
      reset: resetTreemapMock,
      setPrimary: setPrimaryMock,
    })
    useReportsConnectionMock.mockReturnValue({
      data: reportsConnection,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
    fetchEntityAnalyticsMock.mockResolvedValue(
      createSubordinateRankingConnection(),
    )
    useQueryMock.mockImplementation((options: any) => {
      if (options?.enabled !== false) {
        void options?.queryFn?.()
      }

      return {
        data: createSubordinateRankingConnection(),
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }
    })
    useGlobalSettingsMock.mockReturnValue({
      currency: 'RON',
      inflationAdjusted: false,
      displayCurrency: 'RON',
      displayInflationAdjusted: false,
      confirmSettingsApplied: vi.fn(),
    })
    budgetTreemapMock.mockReset()
    mapAnalyticsPublicPreviewCardMock.mockReset()
    fetchEntityAnalyticsMock.mockClear()
    getEntityFeatureInfoMock.mockReset()
    setPrimaryMock.mockReset()
    setPathMock.mockReset()
    resetTreemapMock.mockReset()
    mockGeoJsonData = {
      data: {
        type: 'FeatureCollection',
        features: [],
      },
      isLoading: false,
      error: null,
    }
    getEntityFeatureInfoMock.mockReturnValue({
      center: [46.77, 23.59],
      zoom: 8.1,
      featureId: '12345678',
    })
  })

  it('renders the analysis sections for the selected entity', async () => {
    renderAnalysisPage({
      entityCui: '12345678',
      languageQuery: 'ro',
    })

    expect(screen.getByText('Primăria Sibiu')).toBeInTheDocument()
    expect(screen.getByText('2025')).toBeInTheDocument()
    expect(
      screen.getByText(/Datele din această pagină vin din execuții bugetare agregate/i),
    ).toBeInTheDocument()
    expect(screen.getByTestId('financial-summary')).toBeInTheDocument()
    expect(screen.getByTestId('financial-trends')).toHaveTextContent(
      '12345678:false:false:2025',
    )
    await waitFor(() => {
      expect(screen.getByText('Rapoarte financiare')).toBeInTheDocument()
      expect(screen.getAllByText(/octombrie 2025/i).length).toBeGreaterThan(0)
      expect(screen.getByTestId('public-map-preview')).toHaveTextContent(
        'expenses:2025:Executie bugetara agregata la nivel de ordonator principal:total:RON:false:8.1:46.77|23.59:Cheltuieli UAT (2025)',
      )
    })
    expect(
      screen.getByRole('button', {
        name: CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS[0].label,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Arată opțiunile hărții' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'Taxe și impozite locale',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Schimbă Primăria' }),
    ).toHaveAttribute('href', '/buget/cauta')
    expect(screen.getByText('Cum s-au cheltuit banii')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Arată pe ce s-au cheltuit banii' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Arată cheltuieli administrative primărie',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Arată venituri' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: 'Arată Doar Cheltuieli Primăriei' }),
    ).toHaveLength(2)
    expect(
      screen.getAllByRole('button', { name: 'Arată per capita' }),
    ).toHaveLength(2)
    expect(screen.getByTestId('budget-treemap')).toHaveTextContent('fn')
    expect(screen.getByTestId('category-evolution')).toHaveTextContent(
      '12345678:2025:PRINCIPAL_AGGREGATED',
    )
    expect(screen.getByText('Instituții subordonate')).toBeInTheDocument()
    expect(screen.getByText('Liceul Teoretic Avram Iancu')).toBeInTheDocument()
    expect(screen.getByText('Semnale de Alarmă')).toBeInTheDocument()
    expect(screen.getByText(/Anomalie YTD/)).toBeInTheDocument()
    expect(screen.getByText(/Lipsește/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Arată Detaliile' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Învățământ / Bunuri și servicii'),
    ).not.toBeInTheDocument()
  })

  it('seeds the preview viewport from the entity-centered map position', async () => {
    renderAnalysisPage()

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapKey: DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY,
        mapZoomOverride: 8.1,
        mapCenterOverride: [46.77, 23.59],
        selectedYearOverride: 2025,
      })
    })
    expect(getEntityFeatureInfoMock).toHaveBeenCalled()
  })

  it('falls back to the selected map viewport when entity centering is unavailable', async () => {
    getEntityFeatureInfoMock.mockReturnValue(null)

    renderAnalysisPage({
      state: {
        mapPreviewKey: 'balance',
      },
    })

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapKey: 'balance',
        mapZoomOverride: 7.4,
        mapCenterOverride: [45.69134, 25.01306],
      })
    })
  })

  it('updates the auto-seeded fallback viewport when switching preview maps', async () => {
    getEntityFeatureInfoMock.mockReturnValue(null)

    renderAnalysisPage({
      state: {
        mapPreviewKey: 'balance',
      },
    })

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapKey: 'balance',
        mapZoomOverride: 7.4,
        mapCenterOverride: [45.69134, 25.01306],
      })
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Arată opțiunile hărții' }),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Taxe și impozite locale',
      }),
    )

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapKey: 'local-taxes',
        mapZoomOverride: 7.4,
        mapCenterOverride: [46.05086, 25.01306],
      })
    })
  })

  it('preserves the preview viewport when switching maps and changing the selected year', async () => {
    renderAnalysisPage()

    fireEvent.click(screen.getByRole('button', { name: 'Pan preview map' }))

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapZoomOverride: 9.6,
        mapCenterOverride: [47.1, 26.2],
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Arată opțiunile hărții' }))

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Taxe și impozite locale',
      }),
    )

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapKey: 'local-taxes',
        mapZoomOverride: 9.6,
        mapCenterOverride: [47.1, 26.2],
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Select 2024' }))

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapKey: 'local-taxes',
        selectedYearOverride: 2024,
        mapNameOverride: 'Taxe și impozite locale UAT (2024)',
        mapZoomOverride: 9.6,
        mapCenterOverride: [47.1, 26.2],
      })
    })
  })

  it('expands and collapses the preview map selector from the trailing toggle button', async () => {
    renderAnalysisPage()

    await waitFor(() => {
      expect(screen.getByTestId('public-map-preview')).toBeInTheDocument()
    })

    expect(
      screen.getByRole('button', {
        name: CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS[0].label,
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS[1].label,
      }),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Arată opțiunile hărții' }))

    expect(
      screen.getByRole('button', {
        name: CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS[1].label,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ascunde opțiunile hărții' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ascunde opțiunile hărții' }))

    expect(
      screen.queryByRole('button', {
        name: CHALLENGE_ENTITY_MAP_PREVIEW_DEFINITIONS[1].label,
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Arată opțiunile hărții' }),
    ).toBeInTheDocument()
  })

  it('keeps the anomaly details collapsed by default and expands on demand', async () => {
    renderAnalysisPage()

    expect(
      screen.queryByText('Învățământ / Bunuri și servicii'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Arată Detaliile' }))

    await waitFor(() => {
      expect(
        screen.getByText('Învățământ / Bunuri și servicii'),
      ).toBeInTheDocument()
    })
  })

  it('uses the global currency and inflation settings for fetches and shows the inflation badge', () => {
    useGlobalSettingsMock.mockReturnValue({
      currency: 'EUR',
      inflationAdjusted: true,
      displayCurrency: 'EUR',
      displayInflationAdjusted: true,
      confirmSettingsApplied: vi.fn(),
    })

    renderAnalysisPage()

    expect(screen.getByText('Valori ajustate cu inflația (2024)')).toBeInTheDocument()
    expect(useEntityDetailsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'EUR',
        inflation_adjusted: true,
      }),
    )
    expect(useEntityExecutionLineItemsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'EUR',
        inflation_adjusted: true,
      }),
    )
    expect(getLatestPublicPreviewCardProps()).toMatchObject({
      reportTypeOverride: 'Executie bugetara agregata la nivel de ordonator principal',
      normalizationOverride: 'total',
      currencyOverride: 'EUR',
      inflationAdjustedOverride: true,
      mapNameOverride: 'Cheltuieli UAT (2025)',
    })
  })

  it('passes the selected report type through to the map preview runtime config', async () => {
    renderAnalysisPage()

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Arată Doar Cheltuieli Primăriei' })[0],
    )

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        reportTypeOverride: 'Executie bugetara detaliata',
      })
    })
  })

  it('passes the selected normalization through to the map preview runtime config from the duplicated controls', async () => {
    renderAnalysisPage()

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Arată per capita' })[0],
    )

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        normalizationOverride: 'per_capita',
      })
    })

    expect(
      screen.getAllByRole('button', { name: 'Arată total' }),
    ).toHaveLength(2)
  })

  it('keeps only the first paragraph visible until the explainer is expanded', async () => {
    renderAnalysisPage()

    expect(
      screen.queryByText(/De aceea, sumele pot fi mai mari decât aparatul propriu al primăriei/i),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/O vedere detaliată, la nivel de instituție sau linie bugetară/i),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Citește mai mult' }))

    await waitFor(() => {
      expect(
        screen.getByText(/O vedere detaliată, la nivel de instituție sau linie bugetară/i),
      ).toBeInTheDocument()
    })
  })

  it('configures the treemap for expense line items and functional grouping', () => {
    renderAnalysisPage()

    expect(useTreemapDrilldownMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialPrimary: 'fn',
        initialPath: [],
        nodes: [
          expect.objectContaining({
            fn_c: '65.02',
            ec_c: '20.01',
            amount: 1000000,
          }),
        ],
      }),
    )
    expect(useTreemapDrilldownMock.mock.calls[0]?.[0]?.nodes).toHaveLength(1)
  })

  it('applies the report toggle to entity totals, trends, and line items', async () => {
    renderAnalysisPage()

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Arată Doar Cheltuieli Primăriei' })[0],
    )

    await waitFor(() => {
      expect(screen.getByTestId('financial-summary')).toHaveTextContent(
        '2025:90000000:87000000:3000000',
      )
    })
    expect(useEntityDetailsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reportType: 'DETAILED',
      }),
    )
    expect(useEntityExecutionLineItemsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reportType: 'DETAILED',
      }),
    )
    expect(screen.getByTestId('category-evolution')).toHaveTextContent(
      '12345678:2025:DETAILED',
    )
    expect(useTreemapDrilldownMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nodes: [
          expect.objectContaining({
            fn_c: '51.02',
            ec_c: '10.01',
            amount: 650000,
          }),
        ],
      }),
    )
    expect(
      screen.getByText(
        /Datele din această pagină arată doar execuțiile raportate direct de primărie/i,
      ),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', {
        name: 'Arată Cheltuieli Primăriei și Instituțiilor Subordonate',
      }),
    ).toHaveLength(2)
  })

  it('switches the treemap grouping when the primary CTA is clicked', async () => {
    renderAnalysisPage()

    fireEvent.click(
      screen.getByRole('button', { name: 'Arată pe ce s-au cheltuit banii' }),
    )

    await waitFor(() => {
      expect(useTreemapDrilldownMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          initialPrimary: 'ec',
          initialPath: [],
        }),
      )
    })
  })

  it('applies the administrative expenses treemap shortcut', () => {
    renderAnalysisPage()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Arată cheltuieli administrative primărie',
      }),
    )

    expect(useTreemapDrilldownMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialPrimary: 'fn',
        initialPath: ['51', '51.01', '51.01.03'],
      }),
    )
  })

  it('switches the treemap to revenue data when the category CTA is clicked', async () => {
    renderAnalysisPage()

    fireEvent.click(
      screen.getByRole('button', { name: 'Arată pe ce s-au cheltuit banii' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Arată venituri' }))

    await waitFor(() => {
      expect(screen.getByText('Distribuția Veniturilor')).toBeInTheDocument()
    })

    expect(screen.getByText('Cum sunt grupate veniturile')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Arată cheltuieli' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Arată pe ce|Arată cum/ }),
    ).not.toBeInTheDocument()
    expect(useTreemapDrilldownMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialPrimary: 'fn',
        initialPath: [],
        nodes: [
          expect.objectContaining({
            fn_c: '00.01',
            ec_c: '04.02',
            amount: 2000000,
          }),
        ],
      }),
    )
  })

  it('shows a reset shortcut when the treemap is drilled into an expense path', () => {
    useTreemapDrilldownMock.mockReturnValue({
      primary: 'fn',
      activePrimary: 'ec',
      treemapData: [{ name: 'Cheltuieli de personal', value: 650000 }],
      breadcrumbs: [
        { code: '51', label: 'Autorități publice și acțiuni externe', type: 'fn' },
        { code: '51.01', label: 'Autorități executive și legislative', type: 'fn' },
        { code: '51.01.03', label: 'Autorități executive', type: 'fn' },
      ],
      excludedItemsSummary: null,
      onNodeClick: vi.fn(),
      onBreadcrumbClick: vi.fn(),
      setPath: setPathMock,
      reset: resetTreemapMock,
      setPrimary: setPrimaryMock,
    })

    renderAnalysisPage()

    expect(
      screen.queryByRole('button', {
        name: 'Arată cheltuieli administrative primărie',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Arată toate cheltuielile' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Arată toate cheltuielile' }),
    )

    expect(useTreemapDrilldownMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialPrimary: 'ec',
        initialPath: [],
      }),
    )
  })

  it('shows an explanatory message instead of the treemap when income lands on economic mode', async () => {
    useTreemapDrilldownMock.mockReturnValue({
      primary: 'ec',
      activePrimary: 'ec',
      treemapData: [{ name: 'Impozite', value: 2000000 }],
      breadcrumbs: [],
      excludedItemsSummary: null,
      onNodeClick: vi.fn(),
      onBreadcrumbClick: vi.fn(),
      setPath: setPathMock,
      reset: resetTreemapMock,
      setPrimary: setPrimaryMock,
    })

    renderAnalysisPage({
      state: {
        treemapAccountCategory: 'vn',
        treemapPrimary: 'ec',
      },
    })

    await waitFor(() => {
      expect(
        screen.getAllByText('Veniturile nu au cod economic.'),
      ).toHaveLength(2)
    })

    expect(budgetTreemapMock).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: /Arată pe ce|Arată cum/ }),
    ).not.toBeInTheDocument()
  })

  it('builds subordinate deep links with the active creditor filter and the analytics link', () => {
    renderAnalysisPage({
      entityCui: '12345678',
      languageQuery: 'en',
    })

    const entityLink = screen.getByRole('link', {
      name: /Liceul Teoretic Avram Iancu/,
    })
    expect(entityLink).toHaveAttribute('href', '/entities/99887766')
    expect(entityLink).toHaveAttribute(
      'data-search',
      expect.stringContaining('"main_creditor_cui":"12345678"'),
    )
    expect(entityLink).toHaveAttribute(
      'data-search',
      expect.stringContaining('"report_type":"DETAILED"'),
    )
    expect(entityLink).toHaveAttribute(
      'data-search',
      expect.stringContaining('"lang":"en"'),
    )

    const showAllLink = screen.getByRole('link', {
      name: 'View all institutions',
    })
    expect(showAllLink).toHaveAttribute('href', '/entity-analytics')
    expect(showAllLink).toHaveAttribute(
      'data-search',
      expect.stringContaining('"main_creditor_cui":"12345678"'),
    )
    expect(showAllLink).toHaveAttribute(
      'data-search',
      expect.stringContaining('"entity_cuis":["12345678"]'),
    )
    expect(showAllLink).toHaveAttribute(
      'data-search',
      expect.stringContaining(
        '"report_type":"Executie bugetara detaliata"',
      ),
    )
    expect(showAllLink).toHaveAttribute(
      'data-search',
      expect.stringContaining('"lang":"en"'),
    )
  })

  it('localizes the main page buttons and map preview labels for english', async () => {
    renderAnalysisPage({
      languageQuery: 'en',
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Change City Hall' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Read more' })).toBeInTheDocument()
      expect(
        screen.getAllByRole('button', { name: 'Show only city hall spending' }),
      ).toHaveLength(2)
      expect(
        screen.getAllByRole('button', { name: 'Show per capita' }),
      ).toHaveLength(2)
      expect(screen.getByRole('button', { name: 'Show revenue' })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Show where the money was spent' }),
      ).toBeInTheDocument()
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapNameOverride: 'Expenses by UAT (2025)',
      })
    })

    fireEvent.click(
      screen.getByRole('button', { name: 'Show map preview options' }),
    )

    expect(screen.getByRole('button', { name: 'Expenses' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revenue' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Budget balance' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Local taxes and fees' }),
    ).toBeInTheDocument()
  })

  it('localizes the population geojson series unit for english previews', async () => {
    renderAnalysisPage({
      languageQuery: 'en',
      state: {
        mapPreviewKey: 'income',
      },
    })

    await waitFor(() => {
      const latestPreviewProps = getLatestPublicPreviewCardProps()
      const mapStateDefinition = latestPreviewProps.mapStateDefinition as {
        series: Array<{ type: string; label?: string; unit?: string }>
      }
      const populationSeries = mapStateDefinition.series.find(
        (series) => series.type === 'geojson-dataset-series',
      )

      expect(populationSeries).toMatchObject({
        label: 'Population',
        unit: 'inhabitants',
      })
    })
  })

  it('queries subordinate cards from entity analytics with the current period and current-entity exclusion', async () => {
    renderAnalysisPage({
      entityCui: '12345678',
      state: {
        selectedYear: 2024,
      },
    })

    await waitFor(() => {
      expect(fetchEntityAnalyticsMock).toHaveBeenCalledWith({
        filter: {
          account_category: 'ch',
          main_creditor_cui: '12345678',
          report_period: {
            type: 'YEAR',
            selection: {
              interval: {
                start: '2024',
                end: '2024',
              },
            },
          },
          report_type: 'Executie bugetara detaliata',
          normalization: 'total',
          currency: 'RON',
          inflation_adjusted: false,
          show_period_growth: false,
          exclude: {
            entity_cuis: ['12345678'],
          },
        },
        sort: {
          by: 'total_amount',
          order: 'desc',
        },
        limit: 5,
        offset: 0,
      })
    })

    const subordinateQueryOptions = useQueryMock.mock.calls[0]?.[0]
    expect(subordinateQueryOptions?.queryKey).toEqual([
      'challenge-entity-subordinates',
      '12345678',
      {
        type: 'YEAR',
        selection: {
          interval: {
            start: '2024',
            end: '2024',
          },
        },
      },
      'RON',
      false,
    ])
  })

  it('uses the paginated analytics total count for the subordinate badge', () => {
    useQueryMock.mockImplementation((options: any) => {
      if (options?.enabled !== false) {
        void options?.queryFn?.()
      }

      return {
        data: createSubordinateRankingConnection(subordinateRankingNodes, 12),
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }
    })

    renderAnalysisPage()

    expect(screen.getByText('Top 2 din 12')).toBeInTheDocument()
  })

  it('updates the selected year when the trends chart requests a different year', async () => {
    renderAnalysisPage()

    fireEvent.click(screen.getByRole('button', { name: 'Select 2024' }))

    await waitFor(() => {
      expect(screen.getByTestId('financial-summary')).toHaveTextContent(
        '2024',
      )
    })

    expect(screen.getByTestId('financial-trends')).toHaveTextContent(
      '12345678:false:false:2024',
    )
    expect(useEntityDetailsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cui: '12345678',
        reportPeriod: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2024',
              end: '2024',
            },
          },
        },
      }),
    )
    expect(useEntityExecutionLineItemsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cui: '12345678',
        reportPeriod: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2024',
              end: '2024',
            },
          },
        },
      }),
    )
  })

  it('updates the selected year when the category evolution chart requests a different year', async () => {
    renderAnalysisPage()

    fireEvent.click(screen.getByRole('button', { name: 'Select 2023' }))

    await waitFor(() => {
      expect(screen.getByTestId('category-evolution')).toHaveTextContent(
        '12345678:2023:PRINCIPAL_AGGREGATED',
      )
    })

    expect(screen.getByTestId('financial-summary')).toHaveTextContent('2023')
    expect(useEntityDetailsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reportPeriod: {
          type: 'YEAR',
          selection: {
            interval: {
              start: '2023',
              end: '2023',
            },
          },
        },
      }),
    )
  })

  it('recomputes the preview viewport when the entity changes', async () => {
    useEntityDetailsMock.mockImplementation(
      ({ cui, reportType }: { cui?: string; reportType?: string }) => ({
        data: {
          ...(reportType === 'DETAILED'
            ? detailedEntityDetails
            : entityDetails),
          cui: cui ?? '12345678',
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
    )
    getEntityFeatureInfoMock.mockImplementation(
      (entity: { cui?: string }) => {
        if (entity.cui === '87654321') {
          return {
            center: [45.65, 25.61],
            zoom: 7.4,
            featureId: '87654321',
          }
        }

        return {
          center: [46.77, 23.59],
          zoom: 8.1,
          featureId: entity.cui ?? '12345678',
        }
      },
    )

    const { rerender } = render(
      <ChallengeEntityAnalysisPage
        entityCui="12345678"
        state={DEFAULT_PAGE_STATE}
        onStateChange={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapZoomOverride: 8.1,
        mapCenterOverride: [46.77, 23.59],
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Pan preview map' }))

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapZoomOverride: 9.6,
        mapCenterOverride: [47.1, 26.2],
      })
    })

    rerender(
      <ChallengeEntityAnalysisPage
        entityCui="87654321"
        state={DEFAULT_PAGE_STATE}
        onStateChange={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(getLatestPublicPreviewCardProps()).toMatchObject({
        mapZoomOverride: 7.4,
        mapCenterOverride: [45.65, 25.61],
      })
    })
  })

  it('shows the selected-period empty state when the subordinate analytics query returns no rows', () => {
    useQueryMock.mockImplementation((options: any) => {
      if (options?.enabled !== false) {
        void options?.queryFn?.()
      }

      return {
        data: createSubordinateRankingConnection([], 0),
        isLoading: false,
        isFetching: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }
    })

    renderAnalysisPage()

    expect(
      screen.getByText(
        'Nu am găsit cheltuieli raportate pentru instituțiile subordonate în perioada selectată.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Top /)).not.toBeInTheDocument()
  })
})

function getLatestPublicPreviewCardProps(): Record<string, unknown> {
  const latestCallIndex = mapAnalyticsPublicPreviewCardMock.mock.calls.length - 1
  const latestCall = mapAnalyticsPublicPreviewCardMock.mock.calls[latestCallIndex]?.[0]

  if (!latestCall) {
    throw new Error('Missing public map preview props.')
  }

  return latestCall
}
