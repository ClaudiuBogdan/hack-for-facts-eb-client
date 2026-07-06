import { describe, expect, it } from 'vitest'
import type { MemberSpeechesSearch } from '@/schemas/parliament'
import {
  buildMemberSpeechesFilter,
  countActiveMemberSpeechFilters,
  getMemberSpeechQ,
} from './member-speeches-filter'

describe('buildMemberSpeechesFilter', () => {
  it('returns undefined when no facet is active', () => {
    expect(buildMemberSpeechesFilter({}, 'senat')).toBeUndefined()
    // `an` is heatmap navigation; `q` travels separately — neither is a filter.
    expect(buildMemberSpeechesFilter({ an: 2026 }, 'senat')).toBeUndefined()
    expect(buildMemberSpeechesFilter({ q: 'buget' }, 'senat')).toBeUndefined()
  })

  it('maps session to the member chamber (camera vs senat) and to comun', () => {
    expect(buildMemberSpeechesFilter({ session: 'proprie' }, 'camera')).toEqual({
      chamber: { eq: 'camera_deputatilor' },
    })
    expect(buildMemberSpeechesFilter({ session: 'proprie' }, 'senat')).toEqual({
      chamber: { eq: 'senat' },
    })
    expect(buildMemberSpeechesFilter({ session: 'comun' }, 'camera')).toEqual({
      chamber: { eq: 'comun' },
    })
  })

  it('maps a from/to date range (day-truncated)', () => {
    expect(
      buildMemberSpeechesFilter(
        { from: '2026-01-01', to: '2026-05-31T00:00:00Z' },
        'senat',
      ),
    ).toEqual({ spokenAt: { gte: '2026-01-01', lte: '2026-05-31' } })
  })

  it('composes session + date range', () => {
    const search: MemberSpeechesSearch = {
      from: '2026-01-01',
      session: 'comun',
    }
    expect(buildMemberSpeechesFilter(search, 'senat')).toEqual({
      chamber: { eq: 'comun' },
      spokenAt: { gte: '2026-01-01' },
    })
  })

  it('strips the date range in the activity variant, keeping the session', () => {
    const search: MemberSpeechesSearch = {
      from: '2026-01-01',
      to: '2026-03-31',
      session: 'proprie',
    }
    expect(
      buildMemberSpeechesFilter(search, 'senat', { stripDate: true }),
    ).toEqual({ chamber: { eq: 'senat' } })
    // A date-only filter collapses to undefined once the date is stripped.
    expect(
      buildMemberSpeechesFilter({ from: '2026-01-01' }, 'senat', {
        stripDate: true,
      }),
    ).toBeUndefined()
  })
})

describe('getMemberSpeechQ', () => {
  it('trims and drops blank queries', () => {
    expect(getMemberSpeechQ({ q: '  buget ' })).toBe('buget')
    expect(getMemberSpeechQ({ q: '   ' })).toBeUndefined()
    expect(getMemberSpeechQ({})).toBeUndefined()
  })
})

describe('countActiveMemberSpeechFilters', () => {
  it('counts date, session and q once each; ignores the year', () => {
    expect(countActiveMemberSpeechFilters({})).toBe(0)
    expect(countActiveMemberSpeechFilters({ an: 2026 })).toBe(0)
    expect(countActiveMemberSpeechFilters({ from: '2026-01-01' })).toBe(1)
    expect(
      countActiveMemberSpeechFilters({
        from: '2026-01-01',
        to: '2026-02-01',
        session: 'comun',
        q: 'buget',
      }),
    ).toBe(3)
  })
})
