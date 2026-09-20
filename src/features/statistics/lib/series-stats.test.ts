import { describe, expect, it } from 'vitest'
import type { InsObservation } from '@/schemas/ins'
import { summarizeSeries } from './series-stats'

function row(period: string, value: string | null): InsObservation {
  return {
    id: period,
    dataset_code: 'TEST',
    value,
    value_status: null,
    time_period: {
      iso_period: period,
      year: Number(period.slice(0, 4)),
      quarter: null,
      month: null,
      periodicity: 'ANNUAL',
    },
    territory: null,
    unit: null,
    classifications: [],
  } as unknown as InsObservation
}

describe('summarizeSeries', () => {
  it('reads the ends and the extremes of a sorted series', () => {
    const stats = summarizeSeries([
      row('2020', '24'),
      row('2021', '50'),
      row('2022', '10'),
    ])
    expect(stats.count).toBe(3)
    expect(stats.first?.period).toBe('2020')
    expect(stats.latest?.period).toBe('2022')
    expect(stats.peak).toMatchObject({ value: 50, period: '2021' })
    expect(stats.trough).toMatchObject({ value: 10, period: '2022' })
    expect(stats.mean).toBe(28)
  })

  it('excludes unreadable values rather than counting them as zero', () => {
    // `Number.parseFloat('0oops')` is 0 — a summary built on it would report a
    // new minimum for a row the chart draws as a gap.
    const stats = summarizeSeries([
      row('2020', '10'),
      row('2021', '0oops'),
      row('2022', null),
      row('2023', '..'),
    ])
    expect(stats.count).toBe(1)
    expect(stats.trough?.value).toBe(10)
    expect(stats.mean).toBe(10)
  })

  it('counts usable observations, not rows', () => {
    const stats = summarizeSeries([row('2020', null), row('2021', 'abc')])
    expect(stats.count).toBe(0)
    expect(stats.latest).toBeNull()
  })

  it('keeps the wire value verbatim', () => {
    const stats = summarizeSeries([row('2020', '21646220.500')])
    expect(stats.latest?.raw).toBe('21646220.500')
  })

  it('reports no mean when the sum overflows', () => {
    const stats = summarizeSeries([row('2020', '1e308'), row('2021', '1e308')])
    expect(stats.mean).toBeNull()
  })

  it('lets a single point be both extremes', () => {
    const stats = summarizeSeries([row('2020', '7')])
    expect(stats.peak?.value).toBe(7)
    expect(stats.trough?.value).toBe(7)
  })
})

describe('the mean against a plotted domain', () => {
  it('is a real number for an all-negative series', () => {
    // The chart's zero-baseline path asks for a floor of 0, but Recharts
    // expands the domain to hold the data — the mean of -10 and -20 belongs
    // inside the plot, not above its requested floor.
    const stats = summarizeSeries([row('2020', '-10'), row('2021', '-20')])
    expect(stats.mean).toBe(-15)
    expect(stats.trough?.value).toBe(-20)
    expect(stats.peak?.value).toBe(-10)
  })
})
