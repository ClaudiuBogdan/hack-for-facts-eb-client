import { describe, expect, it } from 'vitest'
import { getPaginationRange } from './pagination-range'

describe('getPaginationRange', () => {
  it('returns every page for short ranges', () => {
    expect(getPaginationRange(1, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('compacts ranges near the beginning', () => {
    expect(getPaginationRange(2, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 10])
  })

  it('compacts ranges near the end', () => {
    expect(getPaginationRange(9, 10)).toEqual([1, 'ellipsis', 6, 7, 8, 9, 10])
  })

  it('keeps the current page centered in long ranges', () => {
    expect(getPaginationRange(6, 12)).toEqual([
      1,
      'ellipsis',
      5,
      6,
      7,
      'ellipsis',
      12,
    ])
  })
})
