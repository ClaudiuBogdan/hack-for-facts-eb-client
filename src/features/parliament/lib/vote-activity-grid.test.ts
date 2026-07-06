import { describe, expect, it } from 'vitest'
import {
  bucketFor,
  buildYearGrid,
  RO_MONTHS_SHORT,
  RO_WEEKDAY_LABELS,
} from './vote-activity-grid'

/** UTC weekday (0 = Sun … 6 = Sat) for a `YYYY-MM-DD` cell. */
function utcDay(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay()
}

describe('buildYearGrid', () => {
  it('is Monday-first: every week starts on a Monday and has 7 days', () => {
    const grid = buildYearGrid(2026)
    for (const week of grid.weeks) {
      expect(week.days).toHaveLength(7)
      expect(utcDay(week.days[0]!.isoDate)).toBe(1) // Monday
      expect(utcDay(week.days[6]!.isoDate)).toBe(0) // Sunday
    }
  })

  it('pads a year starting mid-week (2026 starts Thursday)', () => {
    const grid = buildYearGrid(2026)
    const first = grid.weeks[0]!.days
    // Monday of that week is 2025-12-29; Jan 1 lands on row 3 (Thursday).
    expect(first[0]).toEqual({ isoDate: '2025-12-29', inYear: false })
    expect(first[3]).toEqual({ isoDate: '2026-01-01', inYear: true })
    expect(utcDay('2026-01-01')).toBe(4) // Thursday
  })

  it('handles a leap year (2024) — includes Feb 29, starts on a Monday', () => {
    const grid = buildYearGrid(2024)
    // 2024-01-01 is a Monday, so no leading pad.
    expect(grid.weeks[0]!.days[0]).toEqual({ isoDate: '2024-01-01', inYear: true })
    const allInYear = grid.weeks
      .flatMap((w) => w.days)
      .filter((d) => d.inYear)
      .map((d) => d.isoDate)
    expect(allInYear).toContain('2024-02-29')
    expect(allInYear).toHaveLength(366)
  })

  it('non-leap year has 365 in-year cells', () => {
    const inYear = buildYearGrid(2025)
      .weeks.flatMap((w) => w.days)
      .filter((d) => d.inYear)
    expect(inYear).toHaveLength(365)
  })

  it('emits one ascending month label per month, anchored to the 1st', () => {
    const grid = buildYearGrid(2026)
    expect(grid.monthLabels).toHaveLength(12)
    expect(grid.monthLabels.map((m) => m.month)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ])
    // January sits in the first column; each label's column holds that month's 1st.
    expect(grid.monthLabels[0]).toMatchObject({ columnIndex: 0, month: 0, label: 'ian.' })
    for (const label of grid.monthLabels) {
      const column = grid.weeks[label.columnIndex]!
      const first = column.days.find(
        (d) => d.inYear && d.isoDate.endsWith('-01'),
      )
      expect(first?.isoDate.slice(5, 7)).toBe(
        String(label.month + 1).padStart(2, '0'),
      )
    }
  })

  it('exposes 12 month + 7 weekday labels', () => {
    expect(RO_MONTHS_SHORT).toHaveLength(12)
    expect(RO_WEEKDAY_LABELS).toHaveLength(7)
    expect(RO_WEEKDAY_LABELS[0]).toBe('L')
  })
})

describe('bucketFor', () => {
  it('maps counts to fixed intensity buckets at the boundaries', () => {
    expect(bucketFor(0)).toBe(0)
    expect(bucketFor(1)).toBe(1)
    expect(bucketFor(9)).toBe(1)
    expect(bucketFor(10)).toBe(2)
    expect(bucketFor(29)).toBe(2)
    expect(bucketFor(30)).toBe(3)
    expect(bucketFor(99)).toBe(3)
    expect(bucketFor(100)).toBe(4)
    expect(bucketFor(280)).toBe(4)
  })

  it('treats negative/zero as empty', () => {
    expect(bucketFor(-5)).toBe(0)
  })
})
