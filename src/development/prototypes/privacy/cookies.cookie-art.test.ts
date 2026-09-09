import { describe, expect, it } from 'vitest'
import { COOKIE_CELLS, COOKIE_GRID, COOKIE_RECT_COUNT, buildCells } from './cookies.cookie-art'

describe('pixel cookie', () => {
  it('stays inside the element budget DESIGN.md sets for per-element animation', () => {
    expect(COOKIE_RECT_COUNT).toBeLessThan(250)
  })

  it('is deterministic, so the server and the client draw the same cookie', () => {
    const key = (cells: typeof COOKIE_CELLS) =>
      cells.map((cell) => `${cell.x},${cell.y},${cell.role},${cell.bitten},${cell.seed.toFixed(6)}`).join('|')
    expect(key(buildCells())).toBe(key(COOKIE_CELLS))
    expect(COOKIE_CELLS.every((cell) => cell.seed >= 0 && cell.seed < 1)).toBe(true)
    // Pinned: a change to the map, the chips or the bite must be a decision.
    expect(COOKIE_CELLS.filter((cell) => cell.bitten).length).toBe(19)
    expect(COOKIE_CELLS.filter((cell) => cell.role === 'chip').length).toBe(17)
  })

  it('bites a visible share of the disc from the top right and leaves the rest', () => {
    const bitten = COOKIE_CELLS.filter((cell) => cell.bitten)
    expect(bitten.length).toBeGreaterThan(10)
    expect(bitten.length).toBeLessThan(COOKIE_CELLS.length / 4)
    expect(bitten.every((cell) => cell.x >= COOKIE_GRID / 2 && cell.y < COOKIE_GRID / 2)).toBe(true)
  })

  it('keeps chips both inside and outside the bite, so both states still show chocolate', () => {
    const chips = COOKIE_CELLS.filter((cell) => cell.role === 'chip')
    expect(chips.some((cell) => cell.bitten)).toBe(true)
    expect(chips.some((cell) => !cell.bitten)).toBe(true)
  })
})
