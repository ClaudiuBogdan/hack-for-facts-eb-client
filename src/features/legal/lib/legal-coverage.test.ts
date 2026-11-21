import { describe, expect, it } from 'vitest'
import { bucharestToday, isFrontierStale, olderFrontier } from './legal-coverage'

describe('frontier staleness', () => {
  it('is stale only past the threshold, and unknown without a frontier', () => {
    expect(isFrontierStale('2026-11-13', 7, '2026-11-20')).toBe(false)
    expect(isFrontierStale('2026-11-12', 7, '2026-11-20')).toBe(true)
    expect(isFrontierStale(null, 7, '2026-11-20')).toBeNull()
  })

  it('takes the older of two frontiers, either may be unknown', () => {
    expect(olderFrontier('2026-07-09', '2026-09-25')).toBe('2026-07-09')
    expect(olderFrontier(null, '2026-09-25')).toBe('2026-09-25')
    expect(olderFrontier(null, null)).toBeNull()
  })

  it("names Bucharest's day, not UTC's", () => {
    // 22:30 UTC on 19 November is already 20 November in Bucharest (UTC+2).
    expect(bucharestToday(new Date('2026-11-19T22:30:00Z'))).toBe('2026-11-20')
  })
})
