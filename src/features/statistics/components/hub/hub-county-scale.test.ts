import { describe, expect, it } from 'vitest'
import { countyScale } from './hub-county-scale'
import { classLabel } from '../uat-map/uat-map-class-label'

// 42 counties' life expectancy, 74,8 … 82,0, Romania 77,45.
const LIFE = Array.from({ length: 42 }, (_, i) => Number((74.8 + (i * 7.2) / 41).toFixed(2)))

describe('countyScale against the national figure', () => {
  const { scale, decimals } = countyScale(LIFE, 77.45)
  const classOf = (value: number) => scale.classAt(LIFE.indexOf(value))

  it('parts at the national figure: orange below, grey around it, blue above', () => {
    expect(scale.kind).toBe('diverging')
    expect(scale.classes.map((drawn) => drawn.fill.split(' ')[0])).toEqual([
      'fill-orange-600',
      'fill-orange-600',
      'fill-stone-500',
      'fill-choropleth-5',
      'fill-choropleth-5',
    ])
    expect(classOf(LIFE[0]!)).toBeLessThan(2)
    expect(classOf(LIFE[41]!)).toBe(4)
    const band = scale.classes[2]!.interval
    expect(band.from! < 77.45 && band.to! > 77.45).toBe(true)
  })

  it('bounds the classes in the figure’s own terms, rounded to the spread’s step', () => {
    const bounds = scale.classes.slice(1).map((drawn) => drawn.interval.from)
    expect(decimals).toBe(1)
    expect(bounds.every((bound) => bound !== null && Number(bound.toFixed(1)) === bound)).toBe(true)
    expect(bounds).toEqual([...bounds].sort((a, b) => a! - b!))
  })

  it('puts about a quarter of the counties in the grey band and a quarter in full colour', () => {
    const counts = [0, 1, 2, 3, 4].map((step) => LIFE.filter((value) => classOf(value) === step).length)
    expect(counts[2]).toBeGreaterThanOrEqual(8)
    expect(counts[2]).toBeLessThanOrEqual(14)
    expect(counts[0]! + counts[4]!).toBeGreaterThanOrEqual(8)
  })

  it('turns the hues round where more is the concern: orange above, blue below', () => {
    const reversed = countyScale(LIFE, 77.45, { reversed: true }).scale
    expect(reversed.classes.map((drawn) => drawn.fill.split(' ')[0])).toEqual([
      'fill-choropleth-5',
      'fill-choropleth-5',
      'fill-stone-500',
      'fill-orange-600',
      'fill-orange-600',
    ])
  })

  it('rounds money to a step a reader can hold, and keeps an outlier from coarsening it', () => {
    const gdp = [...Array.from({ length: 41 }, (_, i) => 37_000 + i * 1_100), 240_000]
    const money = countyScale(gdp, 83_437)
    expect(money.decimals).toBe(0)
    expect(money.scale.classes.slice(1).every((drawn) => drawn.interval.from! % 100 === 0)).toBe(true)
  })
})

describe('countyScale at the edges', () => {
  const increasing = (bounds: readonly (number | null)[]) => bounds.every((bound, i) => i === 0 || bound! > bounds[i - 1]!)
  const boundsOf = (scale: ReturnType<typeof countyScale>['scale']) => scale.classes.slice(1).map((drawn) => drawn.interval.from)

  it('keeps its classes in order when the national figure lies outside the counties’ range', () => {
    const { scale } = countyScale([4, 5, 6, 7, 8], 12)
    expect(increasing(boundsOf(scale))).toBe(true)
    // The closest county sits in the grey band, the farthest in full colour.
    expect(scale.classAt(4)).toBe(2)
    expect(scale.classAt(0)).toBe(0)
  })

  it('reads a negative national figure, turned round, with the grey band around it', () => {
    const births = [-11.4, -8.8, -7.2, -5.5, -4.4, -3.1, -0.5, 0.2]
    const { scale } = countyScale(births, -4.4, { reversed: true, digits: 1 })
    expect(scale.classAt(births.indexOf(-4.4))).toBe(2)
    expect(scale.classes[0]!.fill).toContain('choropleth')
    expect(increasing(boundsOf(scale))).toBe(true)
  })

  it('draws every county grey where all equal the national figure', () => {
    const { scale } = countyScale([3, 3, 3], 3, { digits: 0 })
    expect([0, 1, 2].map((i) => scale.classAt(i))).toEqual([2, 2, 2])
  })

  it('never bounds finer than the figures: a one-decimal layer gets one-decimal bounds', () => {
    const ages = [41.0, 41.2, 41.3, 41.3, 41.4, 41.5, 41.6, 41.9]
    const { scale, decimals } = countyScale(ages, 41.3, { digits: 1 })
    expect(decimals).toBe(1)
    expect(boundsOf(scale).every((bound) => Number(bound!.toFixed(1)) === bound)).toBe(true)
  })
})

describe('countyScale with no national figure', () => {
  it('draws five classes of about eight counties each, in one hue', () => {
    const { scale } = countyScale(LIFE, null)
    expect(scale.kind).toBe('level')
    const counts = scale.classes.map((_, step) => LIFE.filter((_, i) => scale.classAt(i) === step).length)
    expect(counts.every((count) => count >= 7 && count <= 10)).toBe(true)
    expect(new Set(scale.classes.map((drawn) => drawn.fill)).size).toBe(1)
  })
})

describe('countyScale in steps', () => {
  it('draws the ramp’s five blues by quintile even with a national figure, labels light on the two darkest', () => {
    const { scale } = countyScale(LIFE, 77.45, { ramp: 'steps' })
    expect(scale.kind).toBe('level')
    expect(scale.classes.map((drawn) => drawn.swatch)).toEqual(['bg-choropleth-1', 'bg-choropleth-2', 'bg-choropleth-3', 'bg-choropleth-4', 'bg-choropleth-5'])
    expect(scale.classes.map((drawn) => drawn.onDark)).toEqual([false, false, false, true, true])
    expect(scale.classes.every((drawn) => drawn.opacity === 1)).toBe(true)
  })

  it('keeps the darkest blue for the top class where ties merge classes', () => {
    const { scale } = countyScale([1, 1, 1, 1, 1, 1, 1, 1, 2, 3], null, { ramp: 'steps', digits: 0 })
    expect(scale.classes.length).toBeLessThan(5)
    expect(scale.classes[scale.classes.length - 1]?.swatch).toBe('bg-choropleth-5')
  })

  it('leaves no class empty where most counties are at the lowest value: the zeros first, the rest above', () => {
    const values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 7]
    const { scale } = countyScale(values, null, { ramp: 'steps', digits: 0 })
    expect(scale.classes.map((drawn) => drawn.interval)).toEqual([
      { from: null, to: 3 },
      { from: 3, to: null },
    ])
    expect(values.map((_, index) => scale.classAt(index))).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1])
    // The zeros in the lightest blue, never a dark one: none must not read as many.
    expect(scale.classes.map((drawn) => drawn.swatch)).toEqual(['bg-choropleth-1', 'bg-choropleth-5'])
  })

  it('draws every county in one class, the lightest, where all are equal', () => {
    const { scale } = countyScale([0, 0, 0], null, { ramp: 'steps', digits: 0 })
    expect(scale.classes.map((drawn) => drawn.swatch)).toEqual(['bg-choropleth-1'])
    expect(scale.classes[0]?.interval).toEqual({ from: 0, to: 0, includesTo: true })
    expect([0, 1, 2].map((index) => scale.classAt(index))).toEqual([0, 0, 0])
  })

  it.each([0, 7, 1.5])('names a single-value class as %s through the shared legend', (value) => {
    const { scale } = countyScale([value, value, value], null, { ramp: 'steps' })
    expect([0, 1, 2].map((index) => scale.classAt(index))).toEqual([0, 0, 0])
    expect(classLabel(String, scale.classes[0]!.interval, scale.wholeNumbers ?? false)).toBe(String(value))
  })

  it('rounds the bound that replaces one at the lowest value up to the step, as the legend prints it', () => {
    const values = [12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.6, 30, 40, 50]
    const { scale, decimals } = countyScale(values, null, { digits: 1 })
    expect(decimals).toBe(0)
    expect(scale.classes.map((drawn) => drawn.interval)).toEqual([
      { from: null, to: 13 },
      { from: 13, to: 30 },
      { from: 30, to: null },
    ])
    // 12,6 sits under „13", with the lowest values.
    expect(scale.classAt(9)).toBe(0)
  })
})
