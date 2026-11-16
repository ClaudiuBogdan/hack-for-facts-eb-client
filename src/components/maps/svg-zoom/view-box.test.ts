import { describe, expect, it } from 'vitest'
import { boxKeeping, clampBox, ease, fitBox, gridPointAt, interpolateBox, zoomAbout, type ViewBox } from './view-box'

const FULL: ViewBox = [0, 0, 4000, 2000]

describe('fitBox', () => {
  it('pads a county and widens it to the map’s aspect ratio, centred on it', () => {
    const [x, y, w, h] = fitBox([1000, 1000, 1200, 1400], FULL, 0.1)
    expect(w / h).toBeCloseTo(2)
    expect(h).toBeCloseTo(400 * 1.2)
    expect(x + w / 2).toBeCloseTo(1100)
    expect(y + h / 2).toBeCloseTo(1200)
  })
})

describe('clampBox', () => {
  it('never shows more than the country, nor less than the closest zoom', () => {
    expect(clampBox([-500, -500, 8000, 4000], FULL, 250)).toEqual(FULL)
    const [, , w, h] = clampBox([1000, 500, 100, 50], FULL, 250)
    expect([w, h]).toEqual([250, 125])
  })

  it('slides a box past an edge back inside, keeping its size', () => {
    expect(clampBox([3800, 1900, 400, 200], FULL, 250)).toEqual([3600, 1800, 400, 200])
    expect(clampBox([-100, -50, 400, 200], FULL, 250)).toEqual([0, 0, 400, 200])
  })
})

describe('zoomAbout', () => {
  it('keeps the point under the cursor where it is', () => {
    const box: ViewBox = [1000, 500, 1000, 500]
    const at = { x: 1250, y: 600 }
    const [x, y, w, h] = zoomAbout(box, at, 2, FULL, 250)
    expect([w, h]).toEqual([500, 250])
    // The same fraction of the box before and after.
    expect((at.x - x) / w).toBeCloseTo((at.x - box[0]) / box[2])
    expect((at.y - y) / h).toBeCloseTo((at.y - box[1]) / box[3])
  })
})

describe('interpolateBox and ease', () => {
  it('starts, passes the middle and ends where it should', () => {
    expect([ease(0), ease(0.5), ease(1)]).toEqual([0, 0.5, 1])
    expect(interpolateBox([0, 0, 100, 50], [100, 50, 300, 150], 0.5)).toEqual([50, 25, 200, 100])
  })
})

describe('boxKeeping', () => {
  const rect = { left: 100, top: 50, width: 400, height: 200 }
  const min = 4000 / 24

  it('keeps the grid point under the screen point at the new width', () => {
    const from: ViewBox = [1000, 500, 2000, 1000]
    const at = { x: 220, y: 90 }
    const anchor = gridPointAt(from, rect, at)
    const next = boxKeeping(anchor, at, 1000, rect, FULL, min)
    expect(next[2]).toBe(1000)
    const after = gridPointAt(next, rect, at)
    expect(after.x).toBeCloseTo(anchor.x)
    expect(after.y).toBeCloseTo(anchor.y)
  })

  it('follows the fingers when they move as well as spread', () => {
    const from: ViewBox = [1000, 500, 2000, 1000]
    const anchor = gridPointAt(from, rect, { x: 300, y: 150 })
    const moved = { x: 340, y: 170 }
    const next = boxKeeping(anchor, moved, 800, rect, FULL, min)
    const after = gridPointAt(next, rect, moved)
    expect(after.x).toBeCloseTo(anchor.x)
    expect(after.y).toBeCloseTo(anchor.y)
  })

  it('holds the width between the closest zoom and the whole map, and the view inside the map', () => {
    const anchor = { x: 10, y: 10 }
    expect(boxKeeping(anchor, { x: 300, y: 150 }, 1, rect, FULL, min)[2]).toBe(min)
    expect(boxKeeping(anchor, { x: 300, y: 150 }, 1e9, rect, FULL, min)).toEqual(FULL)
    const [x, y] = boxKeeping(anchor, { x: 300, y: 150 }, 1000, rect, FULL, min)
    expect(x).toBeGreaterThanOrEqual(0)
    expect(y).toBeGreaterThanOrEqual(0)
  })
})
