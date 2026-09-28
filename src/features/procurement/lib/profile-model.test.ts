import { describe, expect, it } from 'vitest'
import { newestYearWithRecords } from './profile-model'

describe('newestYearWithRecords', () => {
  it('points an empty year to the newest other year with a record in any population', () => {
    const direct = [
      { year: 2024, value: 1, count: 3 },
      { year: 2026, value: null, count: 0 },
    ]
    const contracts = [{ year: 2025, value: null, count: 2 }]
    expect(newestYearWithRecords(2026, direct, contracts)).toBe(2025)
    expect(newestYearWithRecords(2025, direct, contracts)).toBe(2024)
    expect(newestYearWithRecords(2024, [{ year: 2024, value: 1, count: 3 }])).toBeNull()
  })
})
