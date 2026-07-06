import { describe, expect, it } from 'vitest'
import type { MemberVotesSearch } from '@/schemas/parliament'
import {
  buildMemberVotesFilter,
  countActiveMemberVoteFilters,
  getMemberVoteChoiceValues,
} from './member-votes-filter'

describe('buildMemberVotesFilter', () => {
  it('returns undefined when no facet is active', () => {
    expect(buildMemberVotesFilter({}, 'senat')).toBeUndefined()
    // `an` is heatmap navigation, not a filter — never produces a filter.
    expect(buildMemberVotesFilter({ an: 2026 }, 'senat')).toBeUndefined()
  })

  it('maps a single choice to a one-element `in`', () => {
    expect(buildMemberVotesFilter({ choice: 'impotriva' }, 'senat')).toEqual({
      choice: { in: ['impotriva'] },
    })
  })

  it('maps a choice array, dropping junk tokens', () => {
    expect(
      buildMemberVotesFilter({ choice: ['pentru', 'nope', 'abtinere'] }, 'camera'),
    ).toEqual({ choice: { in: ['pentru', 'abtinere'] } })
  })

  it('maps outcome', () => {
    expect(buildMemberVotesFilter({ outcome: 'respins' }, 'senat')).toEqual({
      outcome: { eq: 'respins' },
    })
  })

  it('maps session to the member chamber (camera vs senat) and to comun', () => {
    expect(buildMemberVotesFilter({ session: 'proprie' }, 'camera')).toEqual({
      chamber: { eq: 'camera_deputatilor' },
    })
    expect(buildMemberVotesFilter({ session: 'proprie' }, 'senat')).toEqual({
      chamber: { eq: 'senat' },
    })
    expect(buildMemberVotesFilter({ session: 'comun' }, 'camera')).toEqual({
      chamber: { eq: 'comun' },
    })
  })

  it('maps a from/to date range (day-truncated)', () => {
    expect(
      buildMemberVotesFilter(
        { from: '2026-01-01', to: '2026-03-31T00:00:00Z' },
        'senat',
      ),
    ).toEqual({ voteDate: { gte: '2026-01-01', lte: '2026-03-31' } })
  })

  it('composes multiple facets', () => {
    const search: MemberVotesSearch = {
      from: '2026-01-01',
      choice: ['impotriva'],
      outcome: 'adoptat',
      session: 'comun',
    }
    expect(buildMemberVotesFilter(search, 'senat')).toEqual({
      choice: { in: ['impotriva'] },
      outcome: { eq: 'adoptat' },
      chamber: { eq: 'comun' },
      voteDate: { gte: '2026-01-01' },
    })
  })

  it('strips the date range in the activity variant, keeping the rest', () => {
    const search: MemberVotesSearch = {
      from: '2026-01-01',
      to: '2026-03-31',
      choice: ['impotriva'],
    }
    expect(buildMemberVotesFilter(search, 'senat', { stripDate: true })).toEqual({
      choice: { in: ['impotriva'] },
    })
    // A date-only filter collapses to undefined once the date is stripped.
    expect(
      buildMemberVotesFilter({ from: '2026-01-01' }, 'senat', { stripDate: true }),
    ).toBeUndefined()
  })
})

describe('getMemberVoteChoiceValues', () => {
  it('normalizes single and array choices, dropping junk', () => {
    expect(getMemberVoteChoiceValues({ choice: 'pentru' })).toEqual(['pentru'])
    expect(getMemberVoteChoiceValues({ choice: ['pentru', 'x'] })).toEqual(['pentru'])
    expect(getMemberVoteChoiceValues({})).toEqual([])
  })
})

describe('countActiveMemberVoteFilters', () => {
  it('counts each active facet once; ignores the year', () => {
    expect(countActiveMemberVoteFilters({})).toBe(0)
    expect(countActiveMemberVoteFilters({ an: 2026 })).toBe(0)
    expect(countActiveMemberVoteFilters({ from: '2026-01-01' })).toBe(1)
    expect(
      countActiveMemberVoteFilters({
        from: '2026-01-01',
        to: '2026-02-01',
        choice: ['impotriva', 'pentru'],
        outcome: 'adoptat',
        session: 'comun',
      }),
    ).toBe(4)
  })
})
