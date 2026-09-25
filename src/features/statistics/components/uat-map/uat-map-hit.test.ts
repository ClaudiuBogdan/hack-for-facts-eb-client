import { describe, expect, it } from 'vitest'
import { boxGrid, pathBox } from './uat-map-hit'

describe('pathBox', () => {
  it('reads an absolute move, then relative lines', () => {
    expect(pathBox('M10 20l5-3 -8 10 3-7z')).toEqual([7, 17, 15, 27])
  })

  it('starts each ring over from its own move, holes and islands alike', () => {
    expect(pathBox('M0 0l100 0 0 100-100 0zM40 40l10 0 0 10-10 0zM200 5l1 1z')).toEqual([0, 0, 201, 100])
  })
})

describe('boxGrid', () => {
  const boxes = [
    [0, 0, 100, 100],
    [100, 0, 300, 50],
    [40, 40, 60, 60],
  ] as const
  const grid = boxGrid(boxes, 400, 200, 64)

  it('gives the UATs whose box holds the point, however many cells a box spans', () => {
    expect(grid.at(50, 50)).toEqual([0, 2])
    expect(grid.at(250, 10)).toEqual([1])
    expect(grid.at(250, 150)).toEqual([])
  })

  it('gives none outside the grid', () => {
    expect(grid.at(-1, 10)).toEqual([])
    expect(grid.at(10, 200)).toEqual([])
  })
})
