import { describe, expect, it } from 'vitest'
import { everyYear } from './analytics-years'

describe('everyYear', () => {
  it('gives every calendar year between the first and the last a column', () => {
    const years = everyYear(
      [
        { year: 1926, values: [1, 0] },
        { year: 1946, values: [2, 3] },
      ],
      2,
    )
    expect(years).toHaveLength(21)
    expect(years[0]).toEqual({ year: 1926, values: [1, 0] })
    expect(years[1]).toEqual({ year: 1927, values: [0, 0] })
    expect(years[20]).toEqual({ year: 1946, values: [2, 3] })
  })

  it('keeps to the bounds it is given', () => {
    const years = everyYear([{ year: 1990, values: [4] }, { year: 2001, values: [5] }], 1, { from: 1999, to: 2002 })
    expect(years.map((row) => row.year)).toEqual([1999, 2000, 2001, 2002])
    expect(years.map((row) => row.values[0])).toEqual([0, 0, 5, 0])
  })

  it('draws nothing for an empty answer', () => {
    expect(everyYear([], 3)).toEqual([])
  })
})
