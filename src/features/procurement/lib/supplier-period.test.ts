import { describe, expect, it } from 'vitest'
import { lastDayOf, periodOf, throughMonth } from './supplier-period'

describe('lastDayOf', () => {
  it('ends a month on its last day, leap years included', () => {
    expect(lastDayOf('2026-05')).toBe('2026-05-31')
    expect(lastDayOf('2026-06')).toBe('2026-06-30')
    expect(lastDayOf('2024-02')).toBe('2024-02-29')
    expect(lastDayOf('2026-02')).toBe('2026-02-28')
  })
})

describe('throughMonth', () => {
  it('takes the earlier cutoff that falls in the year, so one date covers the page', () => {
    expect(throughMonth(2026, { direct: '2026-06', contract: '2026-05' })).toBe('2026-05')
    expect(throughMonth(2026, { direct: '2026-06', contract: null })).toBe('2026-06')
    // A cutoff still in the year before has not reached the year in progress — nor has the page, if either population's has not.
    expect(throughMonth(2026, { direct: '2025-12', contract: '2025-11' })).toBeNull()
    expect(throughMonth(2026, { direct: '2026-05', contract: '2025-12' })).toBeNull()
    expect(throughMonth(2026, null)).toBeNull()
  })
})

describe('periodOf', () => {
  it('reads a complete year whole, against the whole year before', () => {
    expect(periodOf(2025, 2025, { direct: '2026-06', contract: '2026-05' })).toEqual({
      year: 2025,
      through: null,
      scope: { year: 2025 },
      before: { year: 2024 },
      range: { gte: '2025-01-01', lte: '2025-12-31' },
    })
  })

  it('compares 2019 with nothing: the year before is legacy SEAP', () => {
    expect(periodOf(2019, 2025, null).before).toBeNull()
  })

  it('reads the year in progress through the cutoff, compared with nothing: its last months may still be filling', () => {
    expect(periodOf(2026, 2025, { direct: '2026-06', contract: '2026-05' })).toEqual({
      year: 2026,
      through: '2026-05',
      scope: { from: '2026-01', to: '2026-05' },
      before: null,
      range: { gte: '2026-01-01', lte: '2026-05-31' },
    })
  })

  it('reads the year in progress so far, compared with nothing, when no cutoff reaches it', () => {
    expect(periodOf(2026, 2025, null)).toMatchObject({ through: null, scope: { year: 2026 }, before: null })
  })
})
