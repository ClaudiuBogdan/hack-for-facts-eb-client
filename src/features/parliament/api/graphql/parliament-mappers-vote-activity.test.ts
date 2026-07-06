import { describe, expect, it } from 'vitest'
import { mapMemberVoteActivity } from './parliament-mappers'
import type { RawParliamentMemberVoteActivity } from './parliament-queries'

describe('mapMemberVoteActivity', () => {
  it('maps the raw aggregate onto the UI schema', () => {
    const raw: RawParliamentMemberVoteActivity = {
      year: 2026,
      availableYears: [2024, 2025, 2026],
      days: [
        {
          date: '2026-03-20',
          total: 280,
          pentru: 0,
          impotriva: 280,
          abtinere: 0,
          nuAVotat: 0,
        },
      ],
    }

    const mapped = mapMemberVoteActivity(raw)
    expect(mapped.year).toBe(2026)
    expect(mapped.availableYears).toEqual([2024, 2025, 2026])
    expect(mapped.days).toEqual([
      {
        date: '2026-03-20',
        total: 280,
        pentru: 0,
        impotriva: 280,
        abtinere: 0,
        nuAVotat: 0,
      },
    ])
  })

  it('handles an empty year', () => {
    const mapped = mapMemberVoteActivity({ year: 2020, availableYears: [], days: [] })
    expect(mapped.days).toEqual([])
    expect(mapped.availableYears).toEqual([])
  })
})
