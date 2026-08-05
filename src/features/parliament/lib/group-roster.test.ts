import { describe, expect, it } from 'vitest'
import type { ParliamentGroupCohesion, ParliamentMember } from '@/schemas/parliament'
import {
  buildCountyFacets,
  cohesionBand,
  cohesionRank,
  cohesionWindow,
  matchCohesionRow,
  parseGroupDetailSearch,
  selectRosterMembers,
} from './group-roster'

function member(overrides: Partial<ParliamentMember>): ParliamentMember {
  return {
    memberId: '1',
    firstName: 'Ion',
    lastName: 'Popescu',
    chamber: 'camera',
    groupId: 'psd-camera_deputatilor',
    groupName: 'PSD',
    judetSlug: 'cluj',
    judetName: 'CLUJ',
    ...overrides,
  }
}

describe('parseGroupDetailSearch', () => {
  it('keeps trimmed string filters', () => {
    expect(parseGroupDetailSearch({ q: '  popescu ', judet: 'cluj' })).toEqual({
      q: 'popescu',
      judet: 'cluj',
    })
  })

  it('drops empty and non-string values instead of throwing', () => {
    expect(parseGroupDetailSearch({ q: '   ', judet: 42, other: 'x' })).toEqual({})
  })
})

describe('selectRosterMembers', () => {
  const members = [
    member({ memberId: '1', lastName: 'Vasile', judetSlug: 'olt', judetName: 'OLT' }),
    member({ memberId: '2', lastName: 'Băișanu', judetSlug: 'suceava', judetName: 'SUCEAVA' }),
    member({ memberId: '3', lastName: 'Andrei', judetSlug: 'olt', judetName: 'OLT' }),
  ]

  it('sorts by surname with Romanian collation', () => {
    expect(selectRosterMembers(members, {}).map((m) => m.lastName)).toEqual([
      'Andrei',
      'Băișanu',
      'Vasile',
    ])
  })

  it('matches a name typed without diacritics', () => {
    expect(selectRosterMembers(members, { q: 'baisanu' })).toHaveLength(1)
  })

  it('filters by county slug', () => {
    expect(selectRosterMembers(members, { judet: 'olt' })).toHaveLength(2)
  })

  it('applies both filters together', () => {
    expect(selectRosterMembers(members, { judet: 'olt', q: 'andrei' })).toHaveLength(1)
  })
})

describe('buildCountyFacets', () => {
  it('counts seats per county, largest delegation first', () => {
    const facets = buildCountyFacets([
      member({ memberId: '1', judetSlug: 'olt', judetName: 'OLT' }),
      member({ memberId: '2', judetSlug: 'olt', judetName: 'OLT' }),
      member({ memberId: '3', judetSlug: 'cluj', judetName: 'CLUJ' }),
    ])
    expect(facets).toEqual([
      { slug: 'olt', name: 'OLT', count: 2 },
      { slug: 'cluj', name: 'CLUJ', count: 1 },
    ])
  })

  it('skips seats with no recorded constituency rather than inventing a bucket', () => {
    expect(
      buildCountyFacets([member({ memberId: '1', judetSlug: '', judetName: '' })]),
    ).toEqual([])
  })
})

describe('cohesionWindow', () => {
  it('spans six months back from the local calendar date', () => {
    expect(cohesionWindow(new Date(2026, 6, 28, 12))).toEqual({
      from: '2026-01-28',
      to: '2026-07-28',
    })
  })

  it('uses the local date even when UTC is still on the previous day', () => {
    // 2026-07-28 01:00 in a UTC+3 zone is 2026-07-27 22:00 UTC. The reader's
    // calendar says the 28th, so the label must too.
    const localMidnightish = new Date(2026, 6, 28, 1)
    expect(cohesionWindow(localMidnightish).to).toBe('2026-07-28')
  })
})

describe('matchCohesionRow', () => {
  const rows: ParliamentGroupCohesion[] = [
    { groupName: 'PSD', cohesionIndex: 0.87 },
    { groupName: 'neafiliat', cohesionIndex: 0.7 },
  ]

  it('matches ignoring case and diacritics', () => {
    expect(matchCohesionRow('psd', rows)?.groupName).toBe('PSD')
  })

  it('refuses a near-miss rather than attributing another group’s record', () => {
    // The directory says "Neafiliaţi"; cohesion says "neafiliat". Bridging that
    // gap by prefix would put one group's votes on another's page.
    expect(matchCohesionRow('Neafiliaţi', rows)).toBeUndefined()
  })

  it('returns undefined when there are no rows at all', () => {
    expect(matchCohesionRow('PSD', undefined)).toBeUndefined()
    expect(matchCohesionRow('PSD', [])).toBeUndefined()
  })
})

describe('cohesionRank', () => {
  const rows: ParliamentGroupCohesion[] = [
    { groupName: 'PNL', cohesionIndex: 0.887 },
    { groupName: 'PSD', cohesionIndex: 0.871 },
    { groupName: 'USR', cohesionIndex: 0.741 },
  ]

  it('ranks by cohesion index, best first', () => {
    expect(cohesionRank(rows[1]!, rows)).toEqual({ rank: 2, total: 3 })
  })

  it('excludes rows with no index from the denominator', () => {
    const withGap = [...rows, { groupName: 'PACE' } as ParliamentGroupCohesion]
    expect(cohesionRank(rows[0]!, withGap)).toEqual({ rank: 1, total: 3 })
  })
})

describe('cohesionBand', () => {
  it('bands the index into words', () => {
    expect(cohesionBand(0.91)).toBe('high')
    expect(cohesionBand(0.85)).toBe('high')
    expect(cohesionBand(0.74)).toBe('medium')
    expect(cohesionBand(0.7)).toBe('medium')
    expect(cohesionBand(0.46)).toBe('low')
  })
})
