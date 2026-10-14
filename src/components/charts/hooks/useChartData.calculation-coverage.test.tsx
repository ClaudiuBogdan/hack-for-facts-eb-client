import { render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getChartAnalytics } from '@/lib/api/charts'
import { createDefaultChart } from '@/schemas/constants'
import type { AnalyticsSeries, Chart, Series } from '@/schemas/charts'
import { ChartCoverageNotice } from '../components/chart-coverage-notice'
import { TimeSeriesBarChart } from '../components/chart-renderer/components/TimeSeriesBarChart'
import { convertToAggregatedData, convertToTimeSeriesData, useChartData } from './useChartData'

vi.mock('@/lib/api/charts', () => ({ getChartAnalytics: vi.fn(), getStaticChartAnalytics: vi.fn() }))

// The bar renderer as drawn: each bar's and data label's accessor, read per row below.
const drawn = vi.hoisted(() => ({ bars: [] as { name: string; value: (row: unknown) => unknown }[], labels: [] as ((row: unknown) => unknown)[] }))
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: ({ children, name, dataKey }: { children: ReactNode; name: string; dataKey: (row: unknown) => unknown }) => {
    drawn.bars.push({ name, value: dataKey })
    return <div>{children}</div>
  },
  LabelList: ({ dataKey }: { dataKey: (row: unknown) => unknown }) => {
    drawn.labels.push(dataKey)
    return null
  },
}))
vi.mock('@/components/charts/safe-responsive-container', () => ({
  SafeResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('../components/chart-renderer/components/MultiAxisChartContainer', () => ({
  MultiAxisChartContainer: ({ children }: { children: (axis: (id: string) => string) => ReactNode }) => <div>{children((id) => `y-${id}`)}</div>,
}))

/** The audit's chart: Corbeanca spending selecting 2024, then 2025, and "2025 minus 2024". */
function budget(year: string): Series {
  return { id: `budget-${year}`, type: 'line-items-aggregated-yearly', enabled: true, label: `Corbeanca ${year}`, unit: 'RON',
    config: { color: '#123456', showDataLabels: true }, createdAt: '', updatedAt: '',
    filter: { report_period: { type: 'YEAR', selection: { dates: [year] } }, account_category: 'ch',
      report_type: 'Executie bugetara agregata la nivel de ordonator principal', entity_cuis: ['4611538'],
      normalization: 'total', currency: 'RON', inflation_adjusted: false } } as Series
}
function auditChart(): Chart {
  const base = createDefaultChart()
  return { ...base, config: { ...base.config, chartType: 'bar', yearRange: { start: 2024, end: 2025 } }, series: [budget('2024'), budget('2025'),
    { id: 'difference', type: 'aggregated-series-calculation', enabled: true, label: '2025 series minus 2024 series', unit: 'RON',
      config: { color: '#654321', showDataLabels: true }, createdAt: '', updatedAt: '',
      calculation: { op: 'subtract', args: ['budget-2025', 'budget-2024'] } } as Series] }
}
/** The live executionAnalytics answer (13 October 2026): each series has its own year and no missing period. */
function served(id: string, x: string, y: number): AnalyticsSeries {
  return { seriesId: id, missingPeriods: [], xAxis: { name: 'Year', type: 'INTEGER', unit: 'year' }, yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' }, data: [{ x, y }] }
}

async function readChart(chart: Chart, answer: AnalyticsSeries[], served = 'budget-2025') {
  vi.mocked(getChartAnalytics).mockResolvedValue(answer)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(() => useChartData({ chart }), { wrapper })
  // The calculation is computed before the read lands too: wait for the served operands.
  await waitFor(() => expect(hook.result.current.dataSeriesMap?.has(served)).toBe(true))
  return hook.result.current
}

describe('a budget difference whose operands cover different periods', () => {
  afterEach(() => {
    drawn.bars.length = 0
    drawn.labels.length = 0
    vi.resetAllMocks()
  })

  it('draws the operands and no calculated bar or label at a period missing an operand', async () => {
    const chart = auditChart()
    const read = await readChart(chart, [served('budget-2024', '2024', 40517740.48), served('budget-2025', '2025', 69217739.42)])
    const dataSeriesMap = read.dataSeriesMap!
    expect(dataSeriesMap.get('difference')?.data).toEqual([])
    expect(dataSeriesMap.get('difference')?.missingPeriods).toEqual(['2024', '2025'])
    expect(read.validationResult?.warnings).toContainEqual(expect.objectContaining({ type: 'missing_data', seriesId: 'difference' }))

    const { data: rows, unitMap } = convertToTimeSeriesData(dataSeriesMap, chart)
    expect(rows.map((row) => row.year)).toEqual([2024, 2025])
    render(<TimeSeriesBarChart chart={chart} dataMap={dataSeriesMap} timeSeriesData={rows} aggregatedData={[]} unitMap={unitMap} onAnnotationPositionChange={() => {}} />)
    const bar = (name: string) => drawn.bars.find((item) => item.name === name)!.value
    expect(rows.map(bar('2025 series minus 2024 series'))).toEqual([undefined, undefined])
    expect(rows.map(bar('Corbeanca 2024'))).toEqual([40517740.48, undefined])
    expect(rows.map(bar('Corbeanca 2025'))).toEqual([undefined, 69217739.42])
    expect(drawn.labels).toHaveLength(3)
    expect(drawn.labels.map((label) => rows.map(label).filter(Boolean).length)).toEqual([1, 1, 0])

    render(<ChartCoverageNotice dataSeriesMap={dataSeriesMap} />)
    expect(screen.getByRole('status')).toHaveTextContent('Some periods are unavailable')
    // Aggregated, the difference is withheld rather than totalled from 0; the operands remain.
    expect(convertToAggregatedData(dataSeriesMap, chart).data.map((point) => [point.id, point.value]))
      .toEqual([['budget-2024', 40517740.48], ['budget-2025', 69217739.42]])
  })

  it('keeps the difference at the periods both operands cover, including a true zero', async () => {
    const chart = auditChart()
    chart.config = { ...chart.config, yearRange: { start: 2023, end: 2026 } }
    const span = (id: string, points: [string, number][]): AnalyticsSeries => ({ ...served(id, '', 0), data: points.map(([x, y]) => ({ x, y })) })
    const read = await readChart(chart, [span('budget-2024', [['2023', 5], ['2024', 40517740.48], ['2025', 7]]), span('budget-2025', [['2024', 40517740.48], ['2025', 69217739.42], ['2026', 1]])])
    const difference = read.dataSeriesMap!.get('difference')
    expect(difference?.data).toEqual([{ x: '2024', y: 0 }, { x: '2025', y: 69217732.42 }])
    expect(difference?.missingPeriods).toEqual(['2023', '2026'])
    const rows = convertToTimeSeriesData(read.dataSeriesMap!, chart).data
    expect(rows.map((row) => [row.year, row.difference?.value])).toEqual([[2023, undefined], [2024, 0], [2025, 69217732.42], [2026, undefined]])
  })

  it('totals a budget series and its sum with a nested literal over the requested year, with no invented gap', async () => {
    const base = auditChart()
    const chart: Chart = { ...base, config: { ...base.config, yearRange: { start: 2024, end: 2024 } }, series: [budget('2024'),
      { ...base.series[2], id: 'plus-three', label: 'Corbeanca 2024 plus (1 + 2)', calculation: { op: 'sum', args: ['budget-2024', { op: 'sum', args: [1, 2] }] } } as Series] }
    const read = await readChart(chart, [served('budget-2024', '2024', 40517740.48)], 'budget-2024')
    expect(read.dataSeriesMap!.get('plus-three')?.data).toEqual([{ x: '2024', y: 40517740.48 + 3 }])
    expect(read.dataSeriesMap!.get('plus-three')?.missingPeriods).toEqual([])
    expect(read.validationResult?.warnings.filter((warning) => warning.type === 'missing_data')).toEqual([])
    const aggregated = convertToAggregatedData(read.dataSeriesMap!, chart)
    expect(aggregated.data.map((point) => [point.id, point.value])).toEqual([['budget-2024', 40517740.48], ['plus-three', 40517740.48 + 3]])
    expect(aggregated.validation.warnings).toEqual([])
    expect(convertToTimeSeriesData(read.dataSeriesMap!, chart).data.map((row) => [row.year, row['plus-three']?.value])).toEqual([[2024, 40517740.48 + 3]])
    const { container } = render(<ChartCoverageNotice dataSeriesMap={read.dataSeriesMap} />)
    expect(container).toBeEmptyDOMElement()
  })
})
