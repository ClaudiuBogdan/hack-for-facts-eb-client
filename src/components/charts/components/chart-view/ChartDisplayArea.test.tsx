import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { ChartDisplayArea } from './ChartDisplayArea'
import { Chart, Series } from '@/schemas/charts'

// Mocks
vi.mock('@/components/ui/LoadingSpinner', () => ({
  LoadingSpinner: ({ text }: { text: string }) => <div data-testid="loading-spinner">{text}</div>
}))

vi.mock('../chart-renderer/components/ChartRenderer', () => ({
  ChartRenderer: () => <div data-testid="chart-renderer" />
}))

vi.mock('../chart-renderer/components/ChartTitle', () => ({
  ChartTitle: ({ title }: { title: string }) => <h1>{title}</h1>
}))

vi.mock('../../utils', () => ({
  getChartTypeIcon: () => <span data-testid="chart-icon" />
}))

// Mock Lingui
vi.mock('@lingui/react/macro', () => ({
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lingui/core/macro', () => ({
  t: (strings: TemplateStringsArray) => strings[0],
  msg: (strings: TemplateStringsArray) => strings[0],
}))

// Data
const mockChart: Chart = {
  id: '123',
  title: 'Test Chart',
  config: {
    chartType: 'line',
    color: '#000',
    showGridLines: true,
    showLegend: true,
    showTooltip: true,
    editAnnotations: false,
    showAnnotations: false,
  },
  series: [{ id: 's1', type: 'line-items-aggregated-yearly', enabled: true, label: 'S1', filter: {}, config: {} } as any],
  annotations: [],
  createdAt: '',
  updatedAt: ''
}

describe('ChartDisplayArea', () => {
  const onAddSeries = vi.fn()
  const onAnnotationPositionChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state', () => {
    render(
      <ChartDisplayArea
        chart={mockChart}
        timeSeriesData={[]}
        aggregatedData={[]}
        dataMap={new Map()}
        unitMap={new Map()}
        isLoading={true}
        error={null}
        onAddSeries={onAddSeries}
        onAnnotationPositionChange={onAnnotationPositionChange}
      />
    )
    expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Loading chart data...')
  })

  it('renders error state', () => {
    const error = new Error('Failed to fetch')
    render(
      <ChartDisplayArea
        chart={mockChart}
        timeSeriesData={[]}
        aggregatedData={[]}
        dataMap={new Map()}
        unitMap={new Map()}
        isLoading={false}
        error={error}
        onAddSeries={onAddSeries}
        onAnnotationPositionChange={onAnnotationPositionChange}
      />
    )
    expect(screen.getByText('Error Loading Chart Data')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
  })

  it('renders no data series state', () => {
    const emptyChart = { ...mockChart, series: [] }
    render(
      <ChartDisplayArea
        chart={emptyChart}
        timeSeriesData={[]}
        aggregatedData={[]}
        dataMap={new Map()}
        unitMap={new Map()}
        isLoading={false}
        error={null}
        onAddSeries={onAddSeries}
        onAnnotationPositionChange={onAnnotationPositionChange}
      />
    )
    expect(screen.getByText('No Data Series')).toBeInTheDocument()
    expect(screen.getByText('Add Data Series')).toBeInTheDocument()
  })

  it('renders no data available state', () => {
    // Has series but dataMap is empty (filtered out or empty response)
    render(
      <ChartDisplayArea
        chart={mockChart}
        timeSeriesData={[]}
        aggregatedData={[]}
        dataMap={new Map()}
        unitMap={new Map()}
        isLoading={false}
        error={null}
        onAddSeries={onAddSeries}
        onAnnotationPositionChange={onAnnotationPositionChange}
      />
    )
    expect(screen.getByText('No Data Available')).toBeInTheDocument()
  })

  it('renders chart content when data is available', () => {
    const dataMap = new Map([['s1', { seriesId: 's1', data: [], yAxis: { unit: 'RON', name: 'v', type: 'FLOAT' }, xAxis: { unit: 'Year', name: 't', type: 'INTEGER' } }]])
    render(
      <ChartDisplayArea
        chart={mockChart}
        timeSeriesData={[]}
        aggregatedData={[]}
        dataMap={dataMap as any}
        unitMap={new Map()}
        isLoading={false}
        error={null}
        onAddSeries={onAddSeries}
        onAnnotationPositionChange={onAnnotationPositionChange}
      />
    )
    expect(screen.getByTestId('chart-renderer')).toBeInTheDocument()
    expect(screen.getByRole('heading')).toHaveTextContent('Test Chart')
  })
})

describe('ChartDisplayArea — the footer names the sources of what is drawn', () => {
  const COMPANY_SOURCES =
    'Surse: registrul ONRC, declarațiile fiscale ANAF, situațiile financiare depuse la Ministerul Finanțelor (2008–2018) și la ANAF (2019 încoace)'
  const BUDGET_SITE = 'https://mfinante.gov.ro/transparenta-bugetara'

  const base = { label: '', unit: '', config: {}, createdAt: '', updatedAt: '' }
  const budget = (id: string, enabled = true) => ({ ...base, id, enabled, type: 'line-items-aggregated-yearly', filter: {} }) as unknown as Series
  const commitments = (id: string, enabled = true) => ({ ...base, id, enabled, type: 'commitments-analytics', filter: {} }) as unknown as Series
  const company = (id: string, enabled = true) => ({ ...base, id, enabled, type: 'companies-analytics', metric: 'TURNOVER', scope: {} }) as unknown as Series
  const ins = (id: string) => ({ ...base, id, enabled: true, type: 'ins-series' }) as unknown as Series
  const custom = (id: string) => ({ ...base, id, enabled: true, type: 'custom-series', data: [] }) as unknown as Series
  const calc = (id: string, args: unknown[], enabled = true) =>
    ({ ...base, id, enabled, type: 'aggregated-series-calculation', calculation: { op: 'sum', args } }) as unknown as Series

  /** The chart drawn (data available), its footer included. */
  function renderChart(series: Series[], isPreview = false) {
    const dataMap = new Map(series.map((item) => [item.id, { seriesId: item.id, data: [], yAxis: { unit: 'RON', name: 'v', type: 'FLOAT' }, xAxis: { unit: 'year', name: 't', type: 'INTEGER' } }]))
    render(
      <ChartDisplayArea
        chart={{ ...mockChart, series }}
        timeSeriesData={[]}
        aggregatedData={[]}
        dataMap={dataMap as any}
        unitMap={new Map()}
        isLoading={false}
        error={null}
        onAddSeries={vi.fn()}
        onAnnotationPositionChange={vi.fn()}
        isPreview={isPreview}
      />,
    )
  }
  const budgetLink = () => screen.queryByRole('link', { name: /Ministerul Finanțelor/ })
  const budgetHrefs = () => document.querySelectorAll(`a[href="${BUDGET_SITE}"]`).length
  const companySources = () => screen.queryByText(COMPANY_SOURCES)

  it('keeps the budget citation of a budget chart as it was', () => {
    renderChart([budget('b')])
    expect(budgetLink()).toHaveAttribute('href', BUDGET_SITE)
    expect(budgetLink()).toHaveTextContent('Source: Ministerul Finanțelor')
    expect(companySources()).toBeNull()
    expect(screen.getByRole('link', { name: 'Transparenta.eu' })).toHaveAttribute('id', 'chart-footer-link')
  })

  it('cites the budget site for commitments too', () => {
    renderChart([commitments('c')])
    expect(budgetHrefs()).toBe(1)
    expect(companySources()).toBeNull()
  })

  it('names the company sources, unlinked, and no budget site for a company chart', () => {
    renderChart([company('f')])
    expect(companySources()).toBeInTheDocument()
    expect(companySources()?.closest('a')).toBeNull()
    expect(budgetHrefs()).toBe(0)
    // Inside the chart card, so a captured image carries it.
    expect(document.getElementById('chart-display-area')).toContainElement(companySources())
  })

  it('attributes each family of a mixed chart', () => {
    renderChart([company('f'), budget('b')])
    expect(companySources()).toBeInTheDocument()
    expect(budgetLink()).toHaveAttribute('href', BUDGET_SITE)
  })

  it('lets a disabled company series that nothing reads leave a budget chart alone', () => {
    renderChart([budget('b'), company('f', false)])
    expect(companySources()).toBeNull()
    expect(budgetHrefs()).toBe(1)
  })

  it('follows an enabled calculation to the series it reads at any depth, disabled ones included', () => {
    // An enabled calculation over a disabled inner calculation over a disabled company series.
    renderChart([calc('outer', ['inner', 2]), calc('inner', ['f'], false), company('f', false)])
    expect(companySources()).toBeInTheDocument()
    expect(budgetHrefs()).toBe(0)
  })

  it('counts a disabled budget series an enabled calculation reads', () => {
    renderChart([company('f'), calc('ratio', ['f', 'b']), budget('b', false)])
    expect(companySources()).toBeInTheDocument()
    expect(budgetLink()).toHaveAttribute('href', BUDGET_SITE)
  })

  it('does not credit the budget site with INS or hand-entered series beside company figures', () => {
    renderChart([company('f'), ins('i'), custom('m'), calc('per', ['f', 'i'])])
    expect(companySources()).toBeInTheDocument()
    expect(budgetHrefs()).toBe(0)
  })

  it('leaves charts without company figures as they were, whatever else they draw', () => {
    renderChart([ins('i'), custom('m')])
    expect(budgetHrefs()).toBe(1)
    expect(companySources()).toBeNull()
  })

  it('still draws no footer in a preview', () => {
    renderChart([company('f')], true)
    expect(companySources()).toBeNull()
    expect(screen.queryByRole('link', { name: 'Transparenta.eu' })).toBeNull()
  })
})
