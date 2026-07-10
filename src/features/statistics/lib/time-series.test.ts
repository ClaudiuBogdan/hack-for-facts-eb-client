import { describe, expect, it } from 'vitest'
import type { InsObservation } from '@/schemas/ins'
import { buildTimeSeries, enumeratePeriods, hasAnyValue, toChartValue } from './time-series'

function annual(year: number, value: string | null, valueStatus?: string): InsObservation {
  return {
    dataset_code: 'POP107D',
    value,
    value_status: valueStatus ?? null,
    time_period: { iso_period: `${year}`, year, periodicity: 'ANNUAL' },
  }
}

describe('enumeratePeriods', () => {
  it('enumerates years', () => {
    expect(enumeratePeriods({ from: 2020, to: 2022, periodicity: 'ANNUAL' })).toEqual([
      '2020',
      '2021',
      '2022',
    ])
  })

  it('enumerates all four quarters of every year in the window', () => {
    expect(enumeratePeriods({ from: 2022, to: 2023, periodicity: 'QUARTERLY' })).toEqual([
      '2022-Q1',
      '2022-Q2',
      '2022-Q3',
      '2022-Q4',
      '2023-Q1',
      '2023-Q2',
      '2023-Q3',
      '2023-Q4',
    ])
  })

  it('zero-pads months', () => {
    const months = enumeratePeriods({ from: 2024, to: 2024, periodicity: 'MONTHLY' })
    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2024-01')
    expect(months[11]).toBe('2024-12')
  })

  it('returns nothing for an inverted window', () => {
    expect(enumeratePeriods({ from: 2024, to: 2020, periodicity: 'ANNUAL' })).toEqual([])
  })
})

describe('toChartValue', () => {
  it('parses a decimal string', () => {
    expect(toChartValue('324576.5')).toBe(324576.5)
  })

  it.each([null, undefined, '', '  ', '..', ':'])('treats %s as a gap, not a zero', (value) => {
    expect(toChartValue(value)).toBeNull()
  })
})

describe('buildTimeSeries', () => {
  const observations = [
    annual(2017, '323114'),
    annual(2018, '322108'),
    // 2019 is absent on purpose — INS never published it.
    annual(2020, '320123'),
    annual(2021, '318602', 'e'),
  ]

  it('injects an explicit null for a missing period instead of interpolating', () => {
    const series = buildTimeSeries({
      observations,
      periodicity: 'ANNUAL',
      from: 2017,
      to: 2021,
    })

    expect(series.points.map((point) => point.period)).toEqual([
      '2017',
      '2018',
      '2019',
      '2020',
      '2021',
    ])
    expect(series.points.map((point) => point.value)).toEqual([
      323114,
      322108,
      null,
      320123,
      318602,
    ])
  })

  it('never invents a value between the two periods that bracket the gap', () => {
    const series = buildTimeSeries({
      observations,
      periodicity: 'ANNUAL',
      from: 2017,
      to: 2021,
    })
    const gap = series.points.find((point) => point.period === '2019')

    expect(gap?.value).toBeNull()
    expect(gap?.raw).toBeNull()
    // The interpolated midpoint of 322108 and 320123 must appear nowhere.
    expect(series.points.some((point) => point.value === 321115.5)).toBe(false)
  })

  it('keeps the wire value verbatim for the tooltip', () => {
    const series = buildTimeSeries({
      observations: [annual(2020, '1234567.890')],
      periodicity: 'ANNUAL',
      from: 2020,
      to: 2020,
    })
    expect(series.points[0].raw).toBe('1234567.890')
  })

  it('carries the INS quality flag onto the point', () => {
    const series = buildTimeSeries({
      observations,
      periodicity: 'ANNUAL',
      from: 2021,
      to: 2021,
    })
    expect(series.points[0].valueStatus).toBe('e')
  })

  it('ignores observations of another periodicity', () => {
    const series = buildTimeSeries({
      observations: [
        {
          dataset_code: 'SOM101F',
          value: '4200',
          time_period: { iso_period: '2022-Q1', year: 2022, quarter: 1, periodicity: 'QUARTERLY' },
        },
      ],
      periodicity: 'ANNUAL',
      from: 2022,
      to: 2022,
    })
    expect(series.points).toEqual([
      { period: '2022', value: null, raw: null, valueStatus: null },
    ])
  })

  it('keeps the most recent points when the window exceeds the cap', () => {
    const series = buildTimeSeries({
      observations: [],
      periodicity: 'ANNUAL',
      from: 2000,
      to: 2024,
      maxPoints: 5,
    })

    expect(series.truncated).toBe(true)
    expect(series.points).toHaveLength(5)
    expect(series.points[0].period).toBe('2020')
    expect(series.points[4].period).toBe('2024')
  })

  it('reports an all-gap series as having no values', () => {
    const series = buildTimeSeries({
      observations: [],
      periodicity: 'ANNUAL',
      from: 2020,
      to: 2022,
    })
    expect(hasAnyValue(series)).toBe(false)
  })
})
