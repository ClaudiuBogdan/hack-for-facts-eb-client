import { describe, expect, it } from 'vitest'
import { economyChange, partialYear } from './hub-economy'
import type { HubFiscalYear } from './hub-snapshot-types'

/**
 * „Economia, an de an" in its rules: the last year is still being filed only
 * when it has fewer statements than the one before, and a change is a
 * percent only where a percent means something.
 */

const year = (value: number, filers: number): HubFiscalYear => ({
  year: value,
  filers,
  turnover: { sum: 1, gap: null, reported: filers },
  netResult: { sum: 1, gap: null, reported: filers },
  employees: { sum: 1, gap: null, reported: filers },
})

describe('the years', () => {
  it('calls the last year incomplete when fewer companies filed for it than for the year before', () => {
    expect(partialYear([year(2024, 965_000), year(2025, 900_000)])).toBe(2025)
    expect(partialYear([year(2024, 900_000), year(2025, 965_000)])).toBeNull()
    expect(partialYear([year(2025, 900_000)])).toBeNull()
  })

  it('says a change in percent between two positive figures', () => {
    expect(economyChange(2_000, 2_100, 'turnover')).toBe('+5.0%')
    expect(economyChange(4_100_000, 4_000_000, 'employees')).toBe('-2.4%')
    expect(economyChange(null, 2_100, 'turnover')).toBeNull()
  })

  it('says a net result’s change as a difference in lei: a percent of a small or negative base misleads', () => {
    expect(economyChange(11_400_000_000, 155_200_000_000, 'netResult')).toBe('+143.8\u00a0mld. lei')
    expect(economyChange(5_000_000_000, -2_000_000_000, 'netResult')).toBe('-7.0\u00a0mld. lei')
  })
})
