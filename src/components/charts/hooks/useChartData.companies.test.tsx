import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChartSchema, type AnalyticsSeries, type Chart } from '@/schemas/charts'
import { getChartAnalytics } from '@/lib/api/charts'
import { calculateAllSeriesData } from '@/lib/chart-calculation-utils'
import { mapCompaniesSeriesToAnalyticsSeries } from '@/lib/companies-chart-series'
import { insSeriesRuntimeMapper } from '@/lib/ins-chart-series-utils'
import { convertToAggregatedData, convertToTimeSeriesData, useChartData } from './useChartData'

/**
 * Company figures in the chart builder: a year without a reported figure is a
 * gap (never a 0), a budget series that starts in 2016 is not drawn as 0 lei
 * in 2008, the exact decimal reaches the tooltip, a calculation over a gap is
 * unavailable rather than computed with a 0, an aggregate compares one year,
 * and a chart that mixes cadences or uses another chart type gives the
 * company series way — at draw time, whatever the editor allowed.
 */

vi.mock('@/lib/companies-chart-series', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/companies-chart-series')>()),
  mapCompaniesSeriesToAnalyticsSeries: vi.fn(),
}))
const mapper = vi.mocked(mapCompaniesSeriesToAnalyticsSeries)
// The monthly neighbour is refused by its saved period: its own read is not this test's, unless a test reads it.
vi.mock('@/lib/ins-chart-series-utils', () => ({
  insSeriesRuntimeMapper: { mapSeries: vi.fn(() => Promise.resolve({ series: null, warnings: [] })) },
}))
const insMapper = vi.mocked(insSeriesRuntimeMapper.mapSeries)
// The budget's own read, for a test that has one.
vi.mock('@/lib/api/charts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/charts')>()),
  getChartAnalytics: vi.fn(() => Promise.resolve([])),
}))
const budgetReader = vi.mocked(getChartAnalytics)

const companies = {
  id: 'co',
  type: 'companies-analytics',
  label: 'Turnover',
  metric: 'TURNOVER',
  period: { type: 'YEAR', selection: { interval: { start: '2008', end: '2011' } } },
  release: { id: '7', policy: 'pinned' },
}
const budget = { id: 'b', type: 'custom-series', label: 'Budget', unit: 'RON', data: [2010, 2011].map((year) => ({ year, value: 5 })) }

function chart(series: unknown[], config: Record<string, unknown> = {}): Chart {
  return ChartSchema.parse({ id: 'c', title: 't', config: { chartType: 'line', ...config }, series })
}

/** Turnover 2008–2011 as the mapper returns it: 2009 a gap, 2010 an explicit zero. */
function companiesData(): AnalyticsSeries {
  return {
    seriesId: 'co',
    xAxis: { name: 'Fiscal year', type: 'STRING', unit: 'year' },
    yAxis: { name: 'TURNOVER', type: 'FLOAT', unit: 'RON' },
    data: [
      // The plotting coordinate is the lossy float; the exact value travels beside it.
      { x: '2008', y: Number('9007199254741973.32') },
      { x: '2010', y: 0 },
      { x: '2011', y: 40 },
    ],
    missingPeriods: ['2009'],
    pointDetails: { '2008': { exact: '9007199254741973.32', note: 'reported by 70 of 80 companies with a statement' }, '2010': { exact: '0.00' }, '2011': { exact: '40.00' } },
  }
}

describe('companies series in time', () => {
  it('draws a gap where no figure was reported, a zero only where zero was reported', () => {
    const result = convertToTimeSeriesData(new Map([['co', companiesData()]]), chart([companies]))
    const byYear = new Map(result.data.map((row) => [row.year, row.co]))
    expect(byYear.get(2009)).toBeUndefined()
    expect(byYear.get(2010)?.value).toBe(0)
    expect(byYear.get(2010)?.exact).toBe('0.00')
  })

  it('hands the tooltip the exact decimal and its coverage beside the plotted float', () => {
    const result = convertToTimeSeriesData(new Map([['co', companiesData()]]), chart([companies]))
    const first = result.data.find((row) => row.year === 2008)?.co
    expect(first?.exact).toBe('9007199254741973.32')
    expect(first?.note).toBe('reported by 70 of 80 companies with a statement')
  })

  it('does not draw a budget series that starts later as 0 lei in the company years before it', () => {
    const map = calculateAllSeriesData(chart([companies, budget]).series, new Map([['co', companiesData()]])).dataSeriesMap
    const result = convertToTimeSeriesData(map, chart([companies, budget]))
    const byYear = new Map(result.data.map((row) => [row.year, row]))
    expect(byYear.get(2008)?.b).toBeUndefined()
    expect(byYear.get(2010)?.b?.value).toBe(5)
    // The 2016 default does not cut a company chart: 2008 is drawn.
    expect(result.data[0]?.year).toBe(2008)
  })

  it('makes a calculation over a company gap unavailable rather than compute it with a 0', () => {
    const difference = { id: 'd', type: 'aggregated-series-calculation', label: 'Turnover − budget', calculation: { op: 'subtract', args: ['co', 'b'] } }
    const full = chart([companies, budget, difference])
    const result = calculateAllSeriesData(full.series, new Map([['co', companiesData()]]))
    // 2008 has a company figure and no budget figure: the whole calculation is unavailable, never 9e15 − 0.
    expect(result.dataSeriesMap.has('d')).toBe(false)
    expect(result.warnings.some((warning) => warning.seriesId === 'd' && warning.type === 'missing_data')).toBe(true)
  })

  it('carries a company gap through a calculation on the company series alone', () => {
    const doubled = { id: 'x2', type: 'aggregated-series-calculation', label: '2×', calculation: { op: 'multiply', args: ['co', 2] } }
    const result = calculateAllSeriesData(chart([companies, doubled]).series, new Map([['co', companiesData()]]))
    const series = result.dataSeriesMap.get('x2')
    expect(series?.missingPeriods).toContain('2009')
    expect(series?.data.find((point) => point.x === '2009')).toBeUndefined()
  })
})

describe('companies series in an aggregate', () => {
  it('compares one fiscal year, with its exact value', () => {
    const single = { ...companies, period: { type: 'YEAR', selection: { interval: { start: '2011', end: '2011' } } } }
    const result = convertToAggregatedData(new Map([['co', companiesData()]]), chart([single], { chartType: 'bar-aggr' }))
    expect(result.data.map((point) => [point.id, point.value, point.exact])).toEqual([['co', 40, '40.00']])
  })

  it('refuses to add years of company figures together', () => {
    const result = convertToAggregatedData(new Map([['co', companiesData()]]), chart([{ ...companies, period: { type: 'YEAR', selection: { interval: { start: '2010', end: '2011' } } } }], { chartType: 'bar-aggr' }))
    expect(result.data).toEqual([])
    expect(result.validation.warnings.some((warning) => warning.type === 'invalid_aggregated_value' && warning.seriesId === 'co')).toBe(true)
  })
})

describe('useChartData with company series', () => {
  function wrapper({ children }: { readonly children: ReactNode }) {
    return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
  }

  beforeEach(() => {
    mapper.mockReset()
    mapper.mockResolvedValue({ series: companiesData(), warnings: [] })
    insMapper.mockReset()
    insMapper.mockResolvedValue({ series: null, warnings: [] })
    budgetReader.mockReset()
    budgetReader.mockResolvedValue([])
  })

  it('draws the company series beside annual ones', async () => {
    const { result } = renderHook(() => useChartData({ chart: chart([companies, budget]) }), { wrapper })
    await waitFor(() => expect(result.current.dataSeriesMap?.has('co')).toBe(true))
  })

  it('gives the company series way beside a monthly series, said — whatever the saved address asked', async () => {
    const monthly = { id: 'ins', type: 'ins-series', label: 'Monthly', datasetCode: 'X', period: { type: 'MONTH', selection: { interval: { start: '2024-01', end: '2024-12' } } } }
    const { result } = renderHook(() => useChartData({ chart: chart([companies, { ...monthly, enabled: false }, { ...budget }]) }), { wrapper })
    await waitFor(() => expect(result.current.dataSeriesMap?.has('co')).toBe(true))
    const mixed = renderHook(() => useChartData({ chart: chart([companies, monthly]) }), { wrapper })
    await waitFor(() => expect(mixed.result.current.validationResult?.warnings.some((warning) => warning.seriesId === 'co' && /annual/u.test(warning.message))).toBe(true))
    expect(mixed.result.current.dataSeriesMap?.has('co')).toBe(false)
  })

  describe('beside a disabled monthly source', () => {
    const monthlySource = { id: 'ins', type: 'ins-series', label: 'Monthly', datasetCode: 'X', enabled: false, period: { type: 'MONTH', selection: { interval: { start: '2024-01', end: '2024-12' } } } }
    const recent = { ...companies, period: { type: 'YEAR', selection: { interval: { start: '2023', end: '2024' } } } }
    const monthlyRead: AnalyticsSeries = { seriesId: 'ins', xAxis: { name: 'Month', type: 'STRING', unit: 'month' }, yAxis: { name: 'Budget', type: 'FLOAT', unit: 'RON' }, data: [{ x: '2024-01', y: 5 }] }
    const recentRead: AnalyticsSeries = { seriesId: 'co', xAxis: { name: 'Fiscal year', type: 'STRING', unit: 'year' }, yAxis: { name: 'TURNOVER', type: 'FLOAT', unit: 'RON' }, data: [{ x: '2023', y: 10 }, { x: '2024', y: 20 }], missingPeriods: [] }

    beforeEach(() => {
      insMapper.mockResolvedValue({ series: monthlyRead, warnings: [] })
      mapper.mockResolvedValue({ series: recentRead, warnings: [] })
    })

    it('gives the company series way beside an enabled calculation over it: the calculation is monthly, its operand only hidden', async () => {
      const derived = { id: 'calc', type: 'aggregated-series-calculation', label: 'Monthly ×2', calculation: { op: 'multiply', args: ['ins', 2] } }
      const mixed = chart([monthlySource, recent, derived], { yearRange: { start: 2024, end: 2024 } })
      const { result } = renderHook(() => useChartData({ chart: mixed }), { wrapper })
      await waitFor(() => expect(result.current.dataSeriesMap?.get('calc')?.xAxis.unit).toBe('month'))
      // The disabled operand is still read: the calculation needs it.
      expect(result.current.dataSeriesMap?.has('ins')).toBe(true)
      expect(result.current.dataSeriesMap?.has('co')).toBe(false)
      expect(result.current.validationResult?.warnings.some((warning) => warning.seriesId === 'co' && /annual/u.test(warning.message))).toBe(true)
      // No year beside a month: only the calculation is drawn, on its months.
      const plotted = convertToTimeSeriesData(result.current.dataSeriesMap!, mixed)
      expect(plotted.data.map((row) => row.year)).toEqual(['2024-01'])
      expect(plotted.data[0]?.calc?.value).toBe(10)
      expect(plotted.data[0]?.co).toBeUndefined()
    })

    it('keeps an enabled monthly calculation whole when a disabled annual source comes first: the hidden source sets no axis to hold it to', async () => {
      // Read first, annual, disabled: the budget; then the disabled company series; the drawn output is the monthly calculation.
      const budgetYearly = { id: 'b', type: 'line-items-aggregated-yearly', label: 'Budget', enabled: false, filter: { report_period: { type: 'YEAR', selection: { interval: { start: '2023', end: '2024' } } }, account_category: 'ch' } }
      budgetReader.mockResolvedValue([{ seriesId: 'b', xAxis: { name: 'Year', type: 'INTEGER', unit: 'year' }, yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' }, data: [{ x: '2023', y: 1 }, { x: '2024', y: 2 }] }])
      const derived = { id: 'calc', type: 'aggregated-series-calculation', label: 'Monthly ×2', calculation: { op: 'multiply', args: ['ins', 2] } }
      const hidden = chart([budgetYearly, monthlySource, { ...recent, enabled: false }, derived])
      const { result } = renderHook(() => useChartData({ chart: hidden }), { wrapper })
      await waitFor(() => expect(result.current.dataSeriesMap?.get('calc')?.data).toEqual([{ x: '2024-01', y: 10 }]))
      expect([...result.current.dataSeriesMap!.keys()][0]).toBe('b')
      expect(result.current.validationResult?.warnings.some((warning) => warning.type === 'invalid_x_value')).toBe(false)
      // The hidden sources keep their points for the calculations that read them.
      expect(result.current.dataSeriesMap?.get('b')?.data).toHaveLength(2)
      expect(result.current.dataSeriesMap?.get('ins')?.data).toEqual([{ x: '2024-01', y: 5 }])
      expect(convertToTimeSeriesData(result.current.dataSeriesMap!, hidden).data.map((row) => row.year)).toEqual(['2024-01'])
    })

    it('draws the company years in the chart range: the hidden source neither turns the axis monthly nor brings 2023 back', async () => {
      const annual = chart([monthlySource, recent], { yearRange: { start: 2024, end: 2024 } })
      const { result } = renderHook(() => useChartData({ chart: annual }), { wrapper })
      await waitFor(() => expect(result.current.dataSeriesMap?.has('co')).toBe(true))
      expect(result.current.dataSeriesMap?.has('ins')).toBe(true)
      const plotted = convertToTimeSeriesData(result.current.dataSeriesMap!, annual)
      expect(plotted.data.map((row) => row.year)).toEqual([2024])
      expect(plotted.data[0]?.co?.value).toBe(20)
      expect(plotted.data[0]?.ins).toBeUndefined()
    })
  })

  it('gives the company series way in a chart type it is not drawn in', async () => {
    const { result } = renderHook(() => useChartData({ chart: chart([companies], { chartType: 'pie-aggr' }) }), { wrapper })
    await waitFor(() => expect(result.current.validationResult?.warnings.some((warning) => warning.seriesId === 'co')).toBe(true))
    expect(result.current.dataSeriesMap?.has('co')).toBe(false)
  })
})
