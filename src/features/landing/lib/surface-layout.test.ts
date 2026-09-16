import { describe, expect, it } from 'vitest'
import { columnsFor, fillersFor } from './surface-layout'

describe('columnsFor', () => {
  it('picks whichever of two or three columns leaves fewer empty cells', () => {
    // 4 → 2×2 with no holes, where three across would leave two.
    expect(columnsFor(4)).toBe(2)
    // 2 → one row of two.
    expect(columnsFor(2)).toBe(2)
    // 3 and 6 fill three across exactly.
    expect(columnsFor(3)).toBe(3)
    expect(columnsFor(6)).toBe(3)
  })

  it('prefers three on a tie', () => {
    // 1 leaves one hole at two and two at three — two wins. 5 leaves one hole
    // either way, so the tie goes to three.
    expect(columnsFor(1)).toBe(2)
    expect(columnsFor(5)).toBe(3)
  })
})

describe('fillersFor', () => {
  it('counts the cells needed to close the last row', () => {
    expect(fillersFor(4, 2)).toBe(0)
    expect(fillersFor(5, 3)).toBe(1)
    expect(fillersFor(4, 3)).toBe(2)
    expect(fillersFor(3, 3)).toBe(0)
  })

  it('never returns a full row of fillers', () => {
    for (let length = 1; length <= 12; length += 1) {
      expect(fillersFor(length, columnsFor(length))).toBeLessThan(columnsFor(length))
    }
  })
})
