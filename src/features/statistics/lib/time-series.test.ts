import { describe, expect, it } from 'vitest'
import type { InsObservation } from '@/schemas/ins'
import {
  buildTimeSeries,
  enumeratePeriods,
  hasAnyValue,
  seriesAxis,
} from './time-series'
import type { TimeSeriesPoint } from './time-series'

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

describe('seriesAxis', () => {
  const points = (values: readonly (number | null)[]): TimeSeriesPoint[] =>
    values.map((value, index) => ({
      period: `${2000 + index}`,
      value,
      raw: value === null ? null : String(value),
      valueStatus: null,
    }))

  it('keeps the zero baseline when the series reaches down toward zero', () => {
    // 1,9–5,0: the shape is still legible from zero, and zero is the floor a
    // reader expects on a rate.
    expect(seriesAxis(points([5, 3.2, 1.9])).domain).toEqual([0, 'auto'])
  })

  it('keeps the zero baseline for an empty or all-gap series', () => {
    expect(seriesAxis([]).domain).toEqual([0, 'auto'])
    expect(seriesAxis(points([null, null])).domain).toEqual([0, 'auto'])
  })

  it('keeps the zero baseline when a value is zero or negative', () => {
    expect(seriesAxis(points([0, 12, 14])).domain).toEqual([0, 'auto'])
    expect(seriesAxis(points([-3, 12, 14])).domain).toEqual([0, 'auto'])
  })

  it('pads the window when the series never comes near zero', () => {
    // Romania's population: 23,2M → 21,6M is a 7% fall that a zero baseline
    // draws as a flat stripe.
    const axis = seriesAxis(points([23_200_000, 22_400_000, 21_646_220]))
    expect(axis.domain[0]).toBeGreaterThan(0)
    expect(axis.domain[0]).toBeLessThan(21_646_220)
    expect(axis.domain[1]).toBeGreaterThan(23_200_000)
  })

  it('steps the ticks itself so every label is a round number', () => {
    const axis = seriesAxis(points([23_200_000, 22_400_000, 21_646_220]))
    expect(axis.ticks?.length).toBeGreaterThan(2)
    for (const tick of axis.ticks ?? []) {
      expect(tick % 500_000).toBe(0)
    }
    expect(axis.ticks?.[0]).toBe(axis.domain[0])
    expect(axis.ticks?.[axis.ticks.length - 1]).toBe(axis.domain[1])
  })

  it('degrades to the zero baseline rather than hanging on extreme values', () => {
    // 1e308 overflows the padded upper bound to Infinity, which would make the
    // tick loop endless — and this runs during render, on the server too.
    expect(seriesAxis(points([1e308, 1.7e308])).domain).toEqual([0, 'auto'])
    // A subnormal underflows the step to zero, which used to return NaN bounds.
    expect(seriesAxis(points([Number.MIN_VALUE])).domain).toEqual([0, 'auto'])
  })

  it('keeps the zero baseline for a series that barely moves', () => {
    // A flat series is flat. Padding a window around a range that spans a
    // thousandth of its magnitude turns rounding into a trend, on gridlines
    // that all round to the same label.
    expect(seriesAxis(points([100, 100, 100])).domain).toEqual([0, 'auto'])
    expect(
      seriesAxis(points([21_002_023, 21_002_024, 21_002_025])).domain,
    ).toEqual([0, 'auto'])
  })
})
