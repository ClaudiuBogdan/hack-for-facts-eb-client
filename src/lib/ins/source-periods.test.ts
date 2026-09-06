import { describe, expect, it } from 'vitest'
import { validSourcePeriodFields } from './source-periods'

describe('native source period fields', () => {
  it.each(Array.from({ length: 12 }, (_, i) => i + 1))(
    'validates month %i and its containing quarter',
    (month) => {
      const period = {
        iso_period: `2026-${String(month).padStart(2, '0')}`,
        year: 2026,
        month,
        periodicity: 'MONTHLY' as const,
      }
      const quarter = Math.floor((month - 1) / 3) + 1
      expect(validSourcePeriodFields({ ...period, quarter })).toBe(true)
      expect(validSourcePeriodFields({ ...period, quarter: null })).toBe(true)
      expect(validSourcePeriodFields(period)).toBe(true)
      expect(
        validSourcePeriodFields({ ...period, quarter: (quarter % 4) + 1 }),
      ).toBe(false)
      expect(validSourcePeriodFields({ ...period, year: 2025 })).toBe(false)
      expect(
        validSourcePeriodFields({ ...period, month: (month % 12) + 1 }),
      ).toBe(false)
    },
  )
  it('retains annual and quarterly field validation', () => {
    expect(
      validSourcePeriodFields({
        iso_period: '2026',
        year: 2026,
        periodicity: 'ANNUAL',
      }),
    ).toBe(true)
    expect(
      validSourcePeriodFields({
        iso_period: '2026',
        year: 2026,
        quarter: 1,
        periodicity: 'ANNUAL',
      }),
    ).toBe(false)
    expect(
      validSourcePeriodFields({
        iso_period: '2026-Q2',
        year: 2026,
        quarter: 2,
        periodicity: 'QUARTERLY',
      }),
    ).toBe(true)
    expect(
      validSourcePeriodFields({
        iso_period: '2026-Q2',
        year: 2026,
        quarter: 1,
        periodicity: 'QUARTERLY',
      }),
    ).toBe(false)
    expect(
      validSourcePeriodFields({
        iso_period: '2026-13',
        year: 2026,
        month: 13,
        quarter: 5,
        periodicity: 'MONTHLY',
      }),
    ).toBe(false)
  })
})
