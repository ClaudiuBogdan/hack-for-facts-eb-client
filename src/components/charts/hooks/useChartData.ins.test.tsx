import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultChart } from '@/schemas/constants'
import type {
  AnalyticsSeries,
  Chart,
  InsSeriesConfiguration,
} from '@/schemas/charts'
import { insSeriesRuntimeMapper } from '@/lib/ins-chart-series-utils'
import {
  convertToAggregatedData,
  convertToTimeSeriesData,
  useChartData,
} from './useChartData'

vi.mock('@/lib/ins-chart-series-utils', () => ({
  insSeriesRuntimeMapper: { mapSeries: vi.fn() },
}))
const mapper = vi.mocked(insSeriesRuntimeMapper.mapSeries)
function config(id: string): InsSeriesConfiguration {
  return {
    id,
    type: 'ins-series',
    enabled: true,
    label: id,
    unit: 'pers.',
    config: { color: '#123456', showDataLabels: false },
    createdAt: '',
    updatedAt: '',
    datasetCode: 'TEST',
    aggregation: 'sum',
    hasValue: true,
  }
}
function chart(relative = false): Chart {
  const base = createDefaultChart()
  return {
    ...base,
    series: [config('first'), config('second')],
    config: { ...base.config, showRelativeValues: relative },
  }
}
function data(
  id: string,
  years: string[] = ['2024'],
  value = 10,
): AnalyticsSeries {
  return {
    seriesId: id,
    xAxis: { name: 'Period', type: 'STRING', unit: 'year' },
    yAxis: { name: 'Value', type: 'FLOAT', unit: 'pers.' },
    data: years.map((x) => ({ x, y: value })),
  }
}
const unavailable = (id: string) => ({
  series: null,
  retryable: true,
  warnings: [
    { type: 'missing_data' as const, seriesId: id, message: 'Retry INS data' },
  ],
})

describe('native INS chart consumers', () => {
  beforeEach(() => vi.resetAllMocks())
  it('omits unavailable INS from aggregated output while retaining the healthy sibling', () => {
    const result = convertToAggregatedData(
      new Map([['second', data('second')]]),
      chart(),
    )
    expect(result.data.map((point) => [point.id, point.value])).toEqual([
      ['second', 10],
    ])
  })
  it('does not fabricate zero bars when all INS series are unavailable', () => {
    expect(convertToAggregatedData(new Map(), chart()).data).toEqual([])
  })
  it('does not synthesize an INS zero in a sibling time bucket', () => {
    const result = convertToTimeSeriesData(
      new Map([
        ['first', data('first', ['2023', '2024'])],
        ['second', data('second')],
      ]),
      chart(),
    )
    expect(result.data[0]).not.toHaveProperty('second')
    expect(result.data[1].second.value).toBe(10)
  })
  it('cannot use an unavailable INS relative baseline for time-series or aggregate values', () => {
    const values = new Map([['second', data('second')]])
    expect(convertToAggregatedData(values, chart(true)).data).toEqual([])
    const trend = convertToTimeSeriesData(values, chart(true))
    expect(trend.data[0]).not.toHaveProperty('second')
    expect(trend.validation.warnings).not.toHaveLength(0)
  })
  it('does not replace a missing relative baseline bucket with zero', () => {
    const result = convertToTimeSeriesData(
      new Map([
        ['first', data('first')],
        ['second', data('second', ['2023', '2024'])],
      ]),
      chart(true),
    )
    expect(result.data[0]).not.toHaveProperty('second')
    expect(result.data[1].second.value).toBe(100)
  })
  it('does not calculate an INS percentage from a zero baseline', () => {
    const values = new Map([
      ['first', data('first', ['2024'], 0)],
      ['second', data('second')],
    ])
    expect(convertToAggregatedData(values, chart(true)).data).toEqual([])
    expect(
      convertToTimeSeriesData(values, chart(true)).data[0],
    ).not.toHaveProperty('second')
  })
  it('preserves actual zero observations in absolute charts', () => {
    const values = new Map([['first', data('first', ['2024'], 0)]])
    expect(convertToAggregatedData(values, chart()).data[0].value).toBe(0)
    expect(convertToTimeSeriesData(values, chart()).data[0].first.value).toBe(0)
  })
  it('keeps a transient failure stale, exposes retry, and recovers without editing the saved chart', async () => {
    let failed = true
    mapper.mockImplementation(async ({ series }) =>
      series.id === 'first' && failed
        ? unavailable(series.id)
        : { series: data(series.id), warnings: [] },
    )
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    })
    const saved = chart()
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    const hook = renderHook(() => useChartData({ chart: saved }), { wrapper })
    await waitFor(() => expect(hook.result.current.canRetryInsData).toBe(true))
    expect(hook.result.current.dataSeriesMap?.has('first')).toBe(false)
    expect(hook.result.current.dataSeriesMap?.get('second')?.data).toHaveLength(
      1,
    )
    const query = client
      .getQueryCache()
      .findAll()
      .find((item) => item.queryKey[0] === 'chart-data-ins-native-v1')
    expect(query?.isStale()).toBe(true)
    expect(mapper.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal)
    failed = false
    await act(async () => {
      await hook.result.current.retryInsData()
    })
    await waitFor(() => expect(hook.result.current.canRetryInsData).toBe(false))
    expect(hook.result.current.dataSeriesMap?.get('first')?.data).toHaveLength(
      1,
    )
    expect(query?.isStale()).toBe(false)
    hook.unmount()
    client.clear()
  })
  it('keeps unavailable calculated INS descendants out of aggregates and relative baselines', () => {
    const base = chart(true)
    const derived = { id: 'derived', type: 'aggregated-series-calculation' as const, enabled: true, label: 'Derived',
      config: { color: '#000000', showDataLabels: false }, createdAt: '', updatedAt: '', unit: 'pers.',
      calculation: { op: 'sum' as const, args: ['first', 1] } }
    const request = { ...base, series: [derived, { ...base.series[0], enabled: false }, base.series[1]] }
    const values = new Map([['second', data('second')]])
    expect(convertToAggregatedData(values, request).data).toEqual([])
    expect(convertToTimeSeriesData(values, request).data[0]).not.toHaveProperty('second')
    expect(convertToAggregatedData(values, { ...request, config: { ...request.config, showRelativeValues: false } }).data.map(point => point.id)).toEqual(['second'])
  })

  it('does not divide siblings by a fabricated baseline after INS aggregate overflow', () => {
    const values = new Map([['first', data('first', ['2023', '2024'], Number.MAX_VALUE)], ['second', data('second')]])
    expect(convertToAggregatedData(values, chart(true)).data).toEqual([])
  })
  it('does not divide siblings by a fabricated baseline after period filtering removes INS', () => {
    const request = chart(true)
    request.series[0] = { ...config('first'), period: { type: 'YEAR', selection: { dates: ['2022'] } } }
    const values = new Map([['first', data('first')], ['second', data('second')]])
    expect(convertToAggregatedData(values, request).data).toEqual([])
  })
  it('keeps an earlier healthy relative baseline when a later unavailable INS series has unknown unit', () => {
    const request = chart(true)
    request.series[1] = { ...config('second'), unit: '' }
    const result = convertToTimeSeriesData(new Map([['first', data('first')]]), request)
    expect(result.data[0].first.value).toBe(100)
    expect(result.validation.warnings).toEqual([])
  })

})
