import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EntityDetailsData, ExecutionLineItem } from '@/lib/api/entities'
import {
  ChallengeEntityAnalysisPage,
  type ChallengeEntityAnalysisPageState,
} from './challenge-entity-analysis-page'

const useEntityDetailsMock = vi.fn()
const useEntityExecutionLineItemsMock = vi.fn()
const useEntityRelationshipsMock = vi.fn()
const useTreemapDrilldownMock = vi.fn()
const useQueryMock = vi.fn()
const useGlobalSettingsMock = vi.fn()
const budgetTreemapMock = vi.fn()
const setPrimaryMock = vi.fn()
const setPathMock = vi.fn()
const resetTreemapMock = vi.fn()

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
  useEntityRelationships: (...args: unknown[]) =>
    useEntityRelationshipsMock(...args),
}))

vi.mock('@/lib/hooks/useGlobalSettings', () => ({
  useGlobalSettings: (...args: unknown[]) => useGlobalSettingsMock(...args),
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

vi.mock('./challenge-entity-analysis-header', () => ({
  ChallengeEntityAnalysisHeader: (props: any) => (
    <div data-testid="analysis-header">
      <div>{props.entity?.name}</div>
      <div>{props.selectedYear}</div>
      {props.showInflationBadge ? (
        <div>Valori ajustate cu inflația (2024)</div>
      ) : null}
      <a href="/bugete-locale-2026/cauta">Schimbă Primăria</a>
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

const DEFAULT_PAGE_STATE: ChallengeEntityAnalysisPageState = {
  selectedYear: 2025,
  reportType: 'PRINCIPAL_AGGREGATED',
  normalization: 'total',
  treemapAccountCategory: 'ch',
  treemapPrimary: 'fn',
  treemapPath: [],
  evolutionAccountCategory: 'ch',
  evolutionPrimary: 'fn',
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
    useEntityRelationshipsMock.mockReturnValue({
      data: {
        children: [
          { cui: '99887766', name: 'Liceul Teoretic Avram Iancu' },
          { cui: '11223344', name: 'Teatrul Municipal' },
        ],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
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
    useQueryMock.mockReturnValue({
      data: {
        nodes: subordinateRankingNodes,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    useGlobalSettingsMock.mockReturnValue({
      currency: 'RON',
      inflationAdjusted: false,
      displayCurrency: 'RON',
      displayInflationAdjusted: false,
      confirmSettingsApplied: vi.fn(),
    })
    budgetTreemapMock.mockReset()
    setPrimaryMock.mockReset()
    setPathMock.mockReset()
    resetTreemapMock.mockReset()
  })

  it('renders the analysis sections for the selected entity', () => {
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
    expect(
      screen.getByRole('link', { name: 'Schimbă Primăria' }),
    ).toHaveAttribute('href', '/bugete-locale-2026/cauta')
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
      screen.getByRole('button', { name: 'Arată Doar Cheltuieli Primăriei' }),
    ).toBeInTheDocument()
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
      screen.getByRole('button', { name: 'Arată Doar Cheltuieli Primăriei' }),
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
      screen.getByRole('button', {
        name: 'Arată Cheltuieli Primăriei și Instituțiilor Subordonate',
      }),
    ).toBeInTheDocument()
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
      expect.stringContaining(
        '"report_type":"Executie bugetara detaliata"',
      ),
    )
    expect(showAllLink).toHaveAttribute(
      'data-search',
      expect.stringContaining('"lang":"en"'),
    )
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

  it('shows a subordinate empty state when the selected entity has no children', () => {
    useEntityRelationshipsMock.mockReturnValue({
      data: {
        children: [],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    useQueryMock.mockReturnValue({
      data: {
        nodes: [],
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })

    renderAnalysisPage()

    expect(
      screen.getByText(
        'Nu există instituții subordonate conectate acestei primării în datele disponibile.',
      ),
    ).toBeInTheDocument()
  })
})
