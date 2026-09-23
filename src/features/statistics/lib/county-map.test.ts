import { describe, expect, it } from 'vitest'
import { countyScale, poleOfInaccessibility, projectCounties, type CountyFeature } from './county-map'

const square = (x: number, y: number, size: number): [number, number][] => [
  [x, y],
  [x + size, y],
  [x + size, y + size],
  [x, y + size],
  [x, y],
]

describe('poleOfInaccessibility', () => {
  it('finds the middle of a square, a half-side from every edge', () => {
    const pole = poleOfInaccessibility([square(0, 0, 100)])
    expect(pole.point[0]).toBeCloseTo(50, 0)
    expect(pole.point[1]).toBeCloseTo(50, 0)
    expect(pole.distance).toBeCloseTo(50, 0)
  })

  it('keeps a ring county’s label on the ring, not in the county it surrounds', () => {
    // Ilfov around București: the centroid of the outline is the hole.
    const pole = poleOfInaccessibility([square(0, 0, 100), square(30, 30, 40)])
    const [x, y] = pole.point
    const inHole = x > 30 && x < 70 && y > 30 && y < 70
    expect(inHole).toBe(false)
    // The widest part of the ring is a corner, on the diagonal: 30√2 / (1 + √2) from the edges.
    expect(pole.distance).toBeCloseTo((30 * Math.SQRT2) / (1 + Math.SQRT2), 0)
  })

  it('stays inside an L-shaped county whose centroid falls outside it', () => {
    const shape: [number, number][] = [
      [0, 0],
      [100, 0],
      [100, 20],
      [20, 20],
      [20, 100],
      [0, 100],
      [0, 0],
    ]
    const [x, y] = poleOfInaccessibility([shape]).point
    expect(x <= 20 || y <= 20).toBe(true)
  })
})

describe('projectCounties', () => {
  const feature = (code: string, ring: [number, number][]): CountyFeature => ({
    type: 'Feature',
    properties: { name: code, mnemonic: code },
    geometry: { type: 'Polygon', coordinates: [ring] },
  })

  it('fits the counties to the width, keeps the aspect at the middle latitude and labels inside', () => {
    const { counties, height } = projectCounties([feature('A', square(20, 44, 1)), feature('B', square(21, 44, 1))], 640)
    // Two one-degree cells side by side at 44.5°N: twice as wide as tall, less the latitude's shrink.
    expect(height).toBeCloseTo(640 / 2 / Math.cos((44.5 * Math.PI) / 180), 0)
    const [a, b] = counties
    expect(a?.code).toBe('A')
    expect(a?.label[0]).toBeCloseTo(160, 0)
    expect(b?.label[0]).toBeCloseTo(480, 0)
    expect(a?.d.startsWith('M0.0 ')).toBe(true)
  })
})

describe('countyScale', () => {
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  it('puts about as many counties in each step and names each step by its lowest value', () => {
    const scale = countyScale(values, 5)
    expect(scale.thresholds).toEqual([1, 3, 5, 7, 9])
    expect(values.map(scale.stepOf)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4])
    expect(scale.min).toBe(1)
    expect(scale.max).toBe(10)
  })

  it('moves a tie at a boundary up to the last step that starts at it, so the colour matches the legend', () => {
    const scale = countyScale([1, 2, 3, 3, 3, 6, 7, 8, 9, 10], 5)
    expect(scale.thresholds).toEqual([1, 3, 3, 7, 9])
    expect([2, 3, 6].map(scale.stepOf)).toEqual([0, 2, 2])
  })

  it('places a value on equal-width steps, within its step by its share of the step’s range', () => {
    const scale = countyScale(values, 5)
    expect(scale.positionOf(1)).toBe(0)
    expect(scale.positionOf(10)).toBe(1)
    // 4 is halfway through step 1 (3 to 5): 1.5 steps of 5.
    expect(scale.positionOf(4)).toBeCloseTo(0.3)
    // Outside the counties' range, a national value sits at the end.
    expect(scale.positionOf(0)).toBe(0)
    expect(scale.positionOf(12)).toBe(1)
  })

  it('handles fewer values than steps without an empty colour for the extremes', () => {
    const scale = countyScale([5, 1, 9], 5)
    expect(scale.stepOf(1)).toBe(0)
    expect(scale.stepOf(9)).toBe(4)
  })
})
