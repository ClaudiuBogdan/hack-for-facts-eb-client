import { describe, expect, it } from 'vitest'
import { classLayers, mapScale, roundBound } from './uat-map-scales'

describe('roundBound', () => {
  it('keeps two significant figures', () => {
    expect([roundBound(3524), roundBound(23_360), roundBound(0.374), roundBound(-6608), roundBound(0)]).toEqual([3500, 23_000, 0.37, -6600, 0])
  })
})

describe('mapScale for a level', () => {
  // 1.000 UATs: 1, 2, …, 1.000.
  const values = Array.from({ length: 1000 }, (_, i) => i + 1)
  const scale = mapScale(values, { diverging: false })
  const shares = scale.classes.map((_, step) => values.filter((_, i) => scale.classAt(i) === step).length / values.length)

  it('leans to the top: the palest class the smallest 30%, full colour the largest 3%', () => {
    expect(scale.kind).toBe('level')
    expect(shares.map((share) => Math.round(share * 100))).toEqual([30, 30, 25, 12, 3])
  })

  it('draws one hue, paler to fuller class by class — the legend’s colours are the map’s', () => {
    const opacities = scale.classes.map((drawn) => drawn.opacity)
    expect(opacities.every((opacity, i) => i === 0 || opacity > opacities[i - 1]!)).toBe(true)
    expect(new Set(scale.classes.map((drawn) => drawn.fill)).size).toBe(1)
  })

  it('fills each class as one path, at the class’s own colour and opacity', () => {
    const layers = classLayers(scale, values.map((_, i) => `M${i} 0z`))
    expect(layers.map((layer) => [layer.fill, layer.opacity])).toEqual(scale.classes.map((drawn) => [drawn.fill, drawn.opacity]))
    expect(layers[4]!.d.startsWith('M969 0z')).toBe(true) // the UAT of 970, the class's first
    expect(layers[4]!.d.endsWith('M999 0z')).toBe(true)
  })

  it('names every class whole, the ends open', () => {
    const intervals = scale.classes.map((drawn) => drawn.interval)
    expect(intervals[0]).toEqual({ from: null, to: 300 })
    expect(intervals[4]).toEqual({ from: 970, to: null })
  })
})

describe('mapScale for a balance', () => {
  const balances = Array.from({ length: 100 }, (_, i) => i - 60)
  const scale = mapScale(balances, { diverging: true })

  it('puts a grey band around zero, orange below it and blue above', () => {
    const band = scale.classes[2]!
    expect(band.interval.from).toBe(-band.interval.to!)
    expect(band.fill).toContain('stone')
    expect(scale.classes[0]!.fill).toContain('orange')
    expect(scale.classes[4]!.fill).toContain('choropleth')
    expect(scale.classAt(balances.indexOf(0))).toBe(2)
    expect(scale.classAt(balances.indexOf(-60))).toBe(0)
  })
})

describe('mapScale where zero is common', () => {
  it('makes zero a grey class of its own, the rest in the hue', () => {
    const dwellings = [0, 0, 0, 0, 1, 2, 3, 5, 9, 40]
    const scale = mapScale(dwellings, { diverging: false })
    expect(scale.kind).toBe('level-zero')
    expect([0, 1, 2, 3].map(scale.classAt)).toEqual([0, 0, 0, 0])
    expect(scale.classes[0]!.fill).toContain('stone')
    expect(scale.classAt(4)).toBe(1)
  })

  it('can keep even a rare recorded zero distinct from positive and missing values', () => {
    const dwellings = [null, 0, ...Array.from({ length: 100 }, (_, index) => index + 1)]
    const scale = mapScale(dwellings, { diverging: false, separateZero: true })
    expect(scale.kind).toBe('level-zero')
    expect(scale.classAt(0)).toBeNull()
    expect(scale.classAt(1)).toBe(0)
    expect(scale.classes[0]!.interval).toEqual({ from: 0, to: 0, zero: true })
    expect(scale.classAt(2)).toBe(1)
    expect(scale.positionOf(0)).toBeLessThan(scale.positionOf(1))
  })
})

describe('mapScale with gaps', () => {
  it('has no class where there is no figure, and places values on the legend in order', () => {
    const scale = mapScale([null, ...Array.from({ length: 100 }, (_, i) => i)], { diverging: false })
    expect(scale.classAt(0)).toBeNull()
    const positions = [0, 10, 30, 55, 80, 99].map(scale.positionOf)
    expect(positions.every((p, i) => p >= 0 && p <= 1 && (i === 0 || p >= positions[i - 1]!))).toBe(true)
  })
})
