import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createDefaultChart } from '@/schemas/constants'
import type { AnalyticsSeries, Chart, Series } from '@/schemas/charts'
import { ChartCoverageNotice } from '../components/chart-coverage-notice'
import { convertToAggregatedData, convertToTimeSeriesData } from './useChartData'

function config(id: string): Series { return { id, type: 'line-items-aggregated-yearly', enabled: true, label: id,
  unit: 'RON', config: { color: '#123456', showDataLabels: false }, createdAt: '', updatedAt: '', filter: { account_category: 'ch' } } }
function chart(relative = false): Chart { const c = createDefaultChart(); return { ...c, series: [config('a'), config('b')], config: { ...c.config, yearRange: { start: 2022, end: 2024 }, showRelativeValues: relative } } }
function data(id: string, missing = ['2023']): AnalyticsSeries { return { seriesId: id, xAxis: { name: 'Year', type: 'STRING', unit: 'year' }, yAxis: { name: 'Amount', type: 'FLOAT', unit: 'RON' }, data: [{ x: '2022', y: 0 }, { x: '2024', y: -2 }], missingPeriods: missing } }

describe('native chart coverage', () => {
  it('creates the missing time bucket even when no series has its value', () => {
    const result = convertToTimeSeriesData(new Map([['a', data('a')]]), chart())
    expect(result.data.map(p => p.year)).toEqual([2022, 2023, 2024])
    expect(result.data[0].a.value).toBe(0)
    expect(result.data[1].a).toBeUndefined()
    expect(result.data[2].a.value).toBe(-2)
  })
  it('keeps a healthy sibling and withholds only the incomplete total', () => {
    const result = convertToAggregatedData(new Map([['a', data('a')], ['b', data('b', [])]]), chart())
    expect(result.data.map(p => [p.id, p.value])).toEqual([['b', -2]])
  })
  it('shows an all-gap series without making zero points or totals', () => {
    const map = new Map([['a', { ...data('a'), data: [] }]])
    expect(convertToTimeSeriesData(map, chart()).data[0].a).toBeUndefined()
    const c = chart(); c.series = [config('a')]
    expect(convertToAggregatedData(map, c).data).toEqual([])
    render(<ChartCoverageNotice dataSeriesMap={map} />)
    expect(screen.getByRole('status')).toHaveTextContent('Some periods are unavailable')
  })
  it('does not choose another relative baseline across a gap', () => {
    const map = new Map([['a', data('a')], ['b', { ...data('b', []), data: [{ x: '2023', y: 10 }] }]])
    expect(convertToTimeSeriesData(map, chart(true)).data.find(p => p.year === 2023)?.b).toBeUndefined()
    expect(convertToAggregatedData(map, chart(true)).data).toEqual([])
  })
  it('preserves compatibility zero filling when coverage metadata is absent', () => {
    const a = data('a'); delete a.missingPeriods
    const map = new Map([['a', a], ['b', { ...data('b', []), data: [{ x: '2023', y: 10 }] }]])
    expect(convertToTimeSeriesData(map, chart()).data.find(p => p.year === 2023)?.a.value).toBe(0)
  })
})

it('withholds native relative values against a legacy zero or missing baseline', () => {
  for (const baseline of [[], [{ x: '2023', y: 0 }]]) {
    const a = { ...data('a'), data: baseline }; delete a.missingPeriods
    const b = { ...data('b', []), data: [{ x: '2023', y: 10 }] }
    const map = new Map([['a', a], ['b', b]])
    expect(convertToTimeSeriesData(map, chart(true)).data.find(p => p.year === 2023)?.b).toBeUndefined()
  }
})

it('applies the same interval and explicit-date selection to gaps and points', () => {
  const c = chart(); c.series = [config('a')]
  const map = new Map([['a', data('a')]])
  for (const selection of [{ interval: { start: '2024', end: '2024' } }, { dates: ['2024'] }]) {
    c.series[0] = { ...config('a'), period: { selection } } as Series
    expect(convertToAggregatedData(map, c).data.map(p => p.value)).toEqual([-2])
  }
  for (const selection of [{ interval: { start: '2023', end: '2024' } }, { dates: ['2023', '2024'] }]) {
    c.series[0] = { ...config('a'), period: { selection } } as Series
    expect(convertToAggregatedData(map, c).data).toEqual([])
  }
})
