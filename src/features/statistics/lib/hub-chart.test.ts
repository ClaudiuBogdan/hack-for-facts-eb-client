import { describe, expect, it } from 'vitest'
import { gapRegions, niceScale, yearTickIndices } from './hub-chart'

describe('niceScale', () => {
  it('rounds the births-and-deaths range to steps of 50.000', () => {
    expect(niceScale(145725, 336678)).toEqual({ from: 100000, to: 350000, ticks: [100000, 150000, 200000, 250000, 300000, 350000] })
  })

  it('picks 1, 2, 2,5 or 5 times a power of ten, without float noise', () => {
    expect(niceScale(0.1, 0.9).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1])
    expect(niceScale(69.56, 77.45).ticks).toEqual([68, 70, 72, 74, 76, 78])
    expect(niceScale(-0.7, 0.25).ticks).toEqual([-0.75, -0.5, -0.25, 0, 0.25])
  })

  it('puts an exact zero on a range that crosses it, never „-0"', () => {
    const { ticks } = niceScale(-0.32, 0.0047)
    expect(ticks).toContain(0)
    expect(ticks.some((tick) => Object.is(tick, -0))).toBe(false)
    expect(ticks.every((tick) => tick === Number(tick.toFixed(2)))).toBe(true)
  })

  it('opens a flat series into a band, and survives no data', () => {
    const flat = niceScale(5, 5)
    expect(flat.from).toBeLessThan(5)
    expect(flat.to).toBeGreaterThan(5)
    expect(niceScale(Infinity, -Infinity)).toEqual({ from: 0, to: 1, ticks: [0, 1] })
  })
})

describe('yearTickIndices', () => {
  const years = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => String(from + index))

  it('labels the ends and the decades between, dropping a decade that would crowd an end', () => {
    const periods = years(1990, 2025)
    expect(yearTickIndices(periods).map((index) => periods[index])).toEqual(['1990', '2000', '2010', '2020', '2025'])
    const late = years(1992, 2021)
    expect(yearTickIndices(late).map((index) => late[index])).toEqual(['1992', '2000', '2010', '2021'])
    // Three years from the end is too close on a phone.
    const short = years(1990, 2023)
    expect(yearTickIndices(short).map((index) => short[index])).toEqual(['1990', '2000', '2010', '2023'])
  })

  it('labels only the ends of periods that are not years', () => {
    expect(yearTickIndices(['2024-Q1', '2024-Q2', '2024-Q3'])).toEqual([0, 2])
    expect(yearTickIndices(['2025'])).toEqual([0])
    expect(yearTickIndices([])).toEqual([])
  })
})

describe('gapRegions', () => {
  it('splits at the crossing, interpolated, so each shading meets both lines', () => {
    // Births above deaths, then below from between the second and third year.
    const regions = gapRegions([300, 260, 220, 200], [250, 255, 250, 240])
    expect(regions.map((region) => region.sign)).toEqual([1, -1])
    const [above, below] = regions
    // 260 − 255 = 5 and 220 − 250 = −30: they cross 5/35 of the way from year 1 to year 2.
    const crossing = above!.polygon[2]!
    expect(crossing[0]).toBeCloseTo(1 + 5 / 35)
    expect(crossing[1]).toBeCloseTo(260 - 40 * (5 / 35))
    expect(below!.polygon[0]).toEqual(crossing)
    // Along the first series, then back along the second.
    expect(above!.polygon.map(([x]) => x)).toEqual([0, 1, crossing[0], crossing[0], 1, 0])
  })

  it('breaks a region where either series has no value', () => {
    const regions = gapRegions([100, 100, null, 100, 100], [50, 50, 50, 50, 50])
    expect(regions).toHaveLength(2)
    expect(regions.every((region) => region.sign === 1)).toBe(true)
  })

  it('starts a region at a tie and keeps a touch inside one', () => {
    const regions = gapRegions([100, 120, 110, 130], [100, 90, 110, 90])
    expect(regions).toHaveLength(1)
    expect(regions[0]!.polygon[0]).toEqual([0, 100])
    expect(regions[0]!.sign).toBe(1)
  })
})
