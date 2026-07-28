import { describe, expect, it } from 'vitest'
import { formatParliamentVoteDay } from './freshness-format'

describe('formatParliamentVoteDay', () => {
  it('formats the day the source recorded, pinned to UTC', () => {
    // Vote dates are date-only values. Formatted in browser time they shift a
    // day for anyone west of Bucharest, which the line this replaced did.
    expect(formatParliamentVoteDay('2026-06-29')).toBe('29 iunie 2026')
    expect(formatParliamentVoteDay('2026-01-01')).toBe('1 ianuarie 2026')
  })

  it('returns null when there is no signal, so the header omits the clause', () => {
    // Never "ultimul vot înregistrat: —".
    expect(formatParliamentVoteDay(undefined)).toBeNull()
    expect(formatParliamentVoteDay('')).toBeNull()
    expect(formatParliamentVoteDay('nu-e-o-data')).toBeNull()
  })
})
