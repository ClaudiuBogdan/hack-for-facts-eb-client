import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecutionLineItem } from '@/lib/api/entities'
import { ChallengeEntityCategoryEvolution } from './challenge-entity-category-evolution'
import type { ChallengeEntityAnalysisPageState } from './challenge-entity-analysis-page'

const useChartDataMock = vi.fn()
const convertToTimeSeriesDataMock = vi.fn()

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

vi.mock('@/components/charts/hooks/useChartData', () => ({
  useChartData: (...args: unknown[]) => useChartDataMock(...args),
  convertToTimeSeriesData: (...args: unknown[]) =>
    convertToTimeSeriesDataMock(...args),
}))

vi.mock('@/components/charts/components/chart-renderer/components/ChartRenderer', () => ({
  ChartRenderer: (props: any) => (
    <div data-testid="category-evolution-chart">
      {String(props.xAxisMarker)}:{props.chart.series.length}
      <button type="button" onClick={() => props.onXAxisClick?.('2021')}>
        Pick 2021
      </button>
      <button type="button" onClick={() => props.onXAxisClick?.('2021-Q2')}>
        Pick 2021-Q2
      </button>
      <button type="button" onClick={() => props.onXAxisClick?.('2021-03')}>
        Pick 2021-03
      </button>
    </div>
  ),
}))

const lineItems: ExecutionLineItem[] = [
  {
    line_item_id: 'expense-1',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '65.02',
      functional_name: 'Învățământ',
    },
    economicClassification: {
      economic_code: '20.01',
      economic_name: 'Bunuri și servicii',
    },
    amount: 5000000,
    ytd_amount: 5000000,
    quarterly_amount: 5000000,
    monthly_amount: 5000000,
  },
  {
    line_item_id: 'expense-2',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '67.02',
      functional_name: 'Cultură',
    },
    economicClassification: {
      economic_code: '10.01',
      economic_name: 'Cheltuieli de personal',
    },
    amount: 4000000,
    ytd_amount: 4000000,
    quarterly_amount: 4000000,
    monthly_amount: 4000000,
  },
  {
    line_item_id: 'expense-3',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '84.02',
      functional_name: 'Transport',
    },
    economicClassification: {
      economic_code: '58.01',
      economic_name: 'Proiecte',
    },
    amount: 3000000,
    ytd_amount: 3000000,
    quarterly_amount: 3000000,
    monthly_amount: 3000000,
  },
  {
    line_item_id: 'expense-4',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '70.02',
      functional_name: 'Locuințe',
    },
    economicClassification: {
      economic_code: '30.01',
      economic_name: 'Dobânzi',
    },
    amount: 2000000,
    ytd_amount: 2000000,
    quarterly_amount: 2000000,
    monthly_amount: 2000000,
  },
  {
    line_item_id: 'expense-5',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '54.02',
      functional_name: 'Ordine publică',
    },
    economicClassification: {
      economic_code: '71.01',
      economic_name: 'Active fixe',
    },
    amount: 1000000,
    ytd_amount: 1000000,
    quarterly_amount: 1000000,
    monthly_amount: 1000000,
  },
  {
    line_item_id: 'expense-6',
    account_category: 'ch',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '51.01',
      functional_name: 'Autorități publice',
    },
    economicClassification: {
      economic_code: '59.01',
      economic_name: 'Transferuri',
    },
    amount: 500000,
    ytd_amount: 500000,
    quarterly_amount: 500000,
    monthly_amount: 500000,
  },
  {
    line_item_id: 'income-1',
    account_category: 'vn',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '04.02',
      functional_name: 'Cote defalcate',
    },
    economicClassification: {
      economic_code: '04.02',
      economic_name: 'Impozite',
    },
    amount: 6000000,
    ytd_amount: 6000000,
    quarterly_amount: 6000000,
    monthly_amount: 6000000,
  },
  {
    line_item_id: 'income-2',
    account_category: 'vn',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '07.02',
      functional_name: 'Taxe',
    },
    economicClassification: {
      economic_code: '03.02',
      economic_name: 'Taxe locale',
    },
    amount: 5000000,
    ytd_amount: 5000000,
    quarterly_amount: 5000000,
    monthly_amount: 5000000,
  },
  {
    line_item_id: 'income-3',
    account_category: 'vn',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '11.02',
      functional_name: 'Subvenții',
    },
    economicClassification: {
      economic_code: '11.02',
      economic_name: 'Subvenții',
    },
    amount: 4000000,
    ytd_amount: 4000000,
    quarterly_amount: 4000000,
    monthly_amount: 4000000,
  },
  {
    line_item_id: 'income-4',
    account_category: 'vn',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '16.02',
      functional_name: 'Alte venituri',
    },
    economicClassification: {
      economic_code: '16.02',
      economic_name: 'Alte venituri',
    },
    amount: 3000000,
    ytd_amount: 3000000,
    quarterly_amount: 3000000,
    monthly_amount: 3000000,
  },
  {
    line_item_id: 'income-5',
    account_category: 'vn',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '18.02',
      functional_name: 'Fonduri UE',
    },
    economicClassification: {
      economic_code: '18.02',
      economic_name: 'Fonduri UE',
    },
    amount: 2000000,
    ytd_amount: 2000000,
    quarterly_amount: 2000000,
    monthly_amount: 2000000,
  },
  {
    line_item_id: 'income-6',
    account_category: 'vn',
    funding_source_id: 1,
    functionalClassification: {
      functional_code: '42.02',
      functional_name: 'Transferuri între administrații',
    },
    economicClassification: {
      economic_code: '42.02',
      economic_name: 'Transferuri',
    },
    amount: 9000000,
    ytd_amount: 9000000,
    quarterly_amount: 9000000,
    monthly_amount: 9000000,
  },
]

const DEFAULT_EVOLUTION_STATE = {
  evolutionAccountCategory: 'ch',
  evolutionPrimary: 'fn',
} satisfies Pick<
  ChallengeEntityAnalysisPageState,
  'evolutionAccountCategory' | 'evolutionPrimary'
>

function renderCategoryEvolution(
  props: {
    readonly reportType?: 'PRINCIPAL_AGGREGATED' | 'DETAILED'
    readonly currentYear?: number
    readonly periodType?: 'YEAR' | 'QUARTER' | 'MONTH'
    readonly selectedQuarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4'
    readonly selectedMonth?: '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12'
    readonly currency?: 'RON' | 'EUR' | 'USD'
    readonly inflationAdjusted?: boolean
    readonly state?: Partial<
      Pick<
        ChallengeEntityAnalysisPageState,
        'evolutionAccountCategory' | 'evolutionPrimary'
      >
    >
    readonly onYearChange?: (year: number) => void
    readonly onSelectPeriod?: (label: string) => void
  } = {},
) {
  function TestHarness() {
    const [state, setState] = useState({
      ...DEFAULT_EVOLUTION_STATE,
      ...props.state,
    })

    return (
      <ChallengeEntityCategoryEvolution
        locale="ro"
        entityCui="12345678"
        lineItems={lineItems}
        currentYear={props.currentYear ?? 2025}
        reportType={props.reportType ?? 'PRINCIPAL_AGGREGATED'}
        periodType={props.periodType ?? 'YEAR'}
        trendPeriod={{
          type: props.periodType ?? 'YEAR',
          selection: {
            interval: {
              start:
                props.periodType === 'QUARTER'
                  ? '2025-Q1'
                  : props.periodType === 'MONTH'
                    ? '2025-01'
                    : '2000',
              end:
                props.periodType === 'QUARTER'
                  ? '2025-Q4'
                  : props.periodType === 'MONTH'
                    ? '2025-12'
                    : '2025',
            },
          },
        }}
        queryNormalizationOptions={{
          normalization: 'total',
          currency: props.currency ?? 'RON',
          inflation_adjusted: props.inflationAdjusted ?? false,
          show_period_growth: false,
        }}
        displayNormalizationOptions={{
          normalization: 'total',
          currency: props.currency ?? 'RON',
          inflation_adjusted: props.inflationAdjusted ?? false,
          show_period_growth: false,
        }}
        accountCategory={state.evolutionAccountCategory}
        primary={state.evolutionPrimary}
        onStateChange={(patch) =>
          setState((previousState) => ({
            ...previousState,
            ...patch,
          }))
        }
        onYearChange={props.onYearChange ?? vi.fn()}
        onSelectPeriod={props.onSelectPeriod}
        selectedQuarter={props.selectedQuarter}
        selectedMonth={props.selectedMonth}
      />
    )
  }

  return render(<TestHarness />)
}

describe('ChallengeEntityCategoryEvolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useChartDataMock.mockReturnValue({
      dataSeriesMap: new Map([['series-1', { data: [] }]]),
      isLoadingData: false,
      dataError: null,
    })
    convertToTimeSeriesDataMock.mockReturnValue({
      data: [
        { x: '2023', seriesValues: {} },
        { x: '2024', seriesValues: {} },
        { x: '2025', seriesValues: {} },
      ],
      unitMap: new Map(),
    })
  })

  it('builds a clean top-5 expense functional chart and chart-page link by default', () => {
    renderCategoryEvolution()

    expect(screen.getByText('Evoluția Cheltuielilor')).toBeInTheDocument()
    expect(
      screen.getByText('Top 5 categorii funcționale pentru anul selectat'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('category-evolution-chart')).toHaveTextContent(
      '2025:5',
    )

    const chartLink = screen.getByRole('link', {
      name: 'Deschide în pagina de grafice',
    })
    expect(chartLink).toHaveAttribute('href', expect.stringMatching(/^\/charts\//))

    const searchState = JSON.parse(chartLink.getAttribute('data-search') ?? '{}')
    const functionalPrefixes = searchState.chart.series.map(
      (series: any) => series.filter.functional_prefixes?.[0],
    )

    expect(searchState.chart.config.chartType).toBe('line')
    expect(searchState.chart.series).toHaveLength(5)
    expect(functionalPrefixes).toEqual(['65', '67', '84', '70', '54'])
    expect(
      searchState.chart.series.every(
        (series: any) =>
          series.filter.account_category === 'ch' &&
          series.filter.report_type ===
            'Executie bugetara agregata la nivel de ordonator principal',
      ),
    ).toBe(true)
  })

  it('switches to economic expense top categories', async () => {
    renderCategoryEvolution()

    fireEvent.click(
      screen.getByRole('button', { name: 'Show top economic categories' }),
    )

    await waitFor(() => {
      expect(
        screen.getByText('Top 5 categorii economice pentru anul selectat'),
      ).toBeInTheDocument()
    })

    const chartLink = screen.getByRole('link', {
      name: 'Deschide în pagina de grafice',
    })
    const searchState = JSON.parse(chartLink.getAttribute('data-search') ?? '{}')
    const economicPrefixes = searchState.chart.series.map(
      (series: any) => series.filter.economic_prefixes?.[0],
    )

    expect(economicPrefixes).toEqual(['20', '10', '58', '30', '71'])
  })

  it('switches to income, hides the economic toggle, and keeps only the top 5 functional revenue series', async () => {
    renderCategoryEvolution({
      reportType: 'DETAILED',
      currency: 'EUR',
      inflationAdjusted: true,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Show revenue' }))

    await waitFor(() => {
      expect(screen.getByText('Evoluția Veniturilor')).toBeInTheDocument()
    })

    expect(
      screen.queryByRole('button', { name: /Show top (economic|functional) categories/ }),
    ).not.toBeInTheDocument()

    const chartLink = screen.getByRole('link', {
      name: 'Deschide în pagina de grafice',
    })
    const searchState = JSON.parse(chartLink.getAttribute('data-search') ?? '{}')
    const functionalPrefixes = searchState.chart.series.map(
      (series: any) => series.filter.functional_prefixes?.[0],
    )

    expect(functionalPrefixes).toEqual(['42', '04', '07', '11', '16'])
    expect(
      searchState.chart.series.every(
        (series: any) =>
          series.filter.account_category === 'vn' &&
          series.filter.report_type === 'Executie bugetara detaliata' &&
          series.filter.currency === 'EUR' &&
          series.filter.inflation_adjusted === true,
      ),
    ).toBe(true)
    expect(
      screen.queryByText('Deschide în pagina de grafice'),
    ).not.toBeInTheDocument()
  })

  it('changes the shared year when the user clicks a year in the chart', () => {
    const onYearChange = vi.fn()

    renderCategoryEvolution({ onYearChange })

    fireEvent.click(screen.getByRole('button', { name: 'Pick 2021' }))

    expect(onYearChange).toHaveBeenCalledWith(2021)
  })

  it('changes the shared quarter when the user clicks a quarter in the chart', () => {
    const onSelectPeriod = vi.fn()

    renderCategoryEvolution({
      periodType: 'QUARTER',
      selectedQuarter: 'Q3',
      onSelectPeriod,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Pick 2021-Q2' }))

    expect(onSelectPeriod).toHaveBeenCalledWith('Q2')
    expect(screen.getByTestId('category-evolution-chart')).toHaveTextContent(
      '2025-Q3:5',
    )
  })

  it('changes the shared month when the user clicks a month in the chart', () => {
    const onSelectPeriod = vi.fn()

    renderCategoryEvolution({
      periodType: 'MONTH',
      selectedMonth: '04',
      onSelectPeriod,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Pick 2021-03' }))

    expect(onSelectPeriod).toHaveBeenCalledWith('03')
    expect(screen.getByTestId('category-evolution-chart')).toHaveTextContent(
      '2025-04:5',
    )
  })
})
