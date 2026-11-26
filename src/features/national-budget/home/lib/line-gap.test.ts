import { describe, expect, it } from 'vitest'
import { gapOf, heightAt } from './line-gap'

const x = (month: number) => month * 10
const y = (value: number) => 100 - value * 10

describe('heightAt', () => {
  it('is the line’s own point, or on the segment it draws across a missing month', () => {
    const line = [{ month: 4, value: 3 }, { month: 6, value: 4 }]
    expect(heightAt(line, 4)).toBe(3)
    expect(heightAt(line, 5)).toBe(3.5)
    expect(heightAt(line, 6)).toBe(4)
  })
})

describe('gapOf', () => {
  it('runs along one line and back along the other over the months both cover, through every point either has', () => {
    // This year to March; last year all of it, May missing (as 2025's GDP share is).
    const now = [{ month: 1, value: 0 }, { month: 2, value: 1 }, { month: 3, value: 2 }]
    const before = [{ month: 1, value: 1 }, { month: 2, value: 2 }, { month: 3, value: 3 }, { month: 4, value: 4 }, { month: 6, value: 5 }]
    expect(gapOf(now, before, x, y)).toBe('polygon(10% 100%, 20% 90%, 30% 80%, 30% 70%, 20% 80%, 10% 90%)')
    // This year has May, last year hasn't: last year's edge takes May on the straight segment it draws, halfway.
    const year = [{ month: 4, value: 0 }, { month: 5, value: 0 }, { month: 6, value: 0 }]
    expect(gapOf(year, [{ month: 4, value: 4 }, { month: 6, value: 5 }], x, y)).toBe('polygon(40% 100%, 50% 100%, 60% 100%, 60% 50%, 50% 55%, 40% 60%)')
  })

  it('is nothing where the lines share fewer than two months', () => {
    expect(gapOf([{ month: 1, value: 1 }], [{ month: 1, value: 2 }], x, y)).toBeNull()
    expect(gapOf([], [{ month: 1, value: 2 }], x, y)).toBeNull()
  })
})
