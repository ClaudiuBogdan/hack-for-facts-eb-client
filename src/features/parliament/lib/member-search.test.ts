import { describe, expect, it } from 'vitest'
import type { ParliamentGroup, ParliamentMember } from '@/schemas/parliament'
import {
  filterMembersBySearch,
  getActiveFilterCount,
  getChamberFilteredMemberIds,
  getPanelFilterCount,
} from './member-search'

const groups: ParliamentGroup[] = [
  {
    groupId: 'pnl-camera',
    name: 'Partidul Național Liberal',
    shortName: 'PNL',
    chamber: 'camera',
    memberCount: 1,
  },
  {
    groupId: 'pnl-senat',
    name: 'Partidul Național Liberal',
    shortName: 'PNL',
    chamber: 'senat',
    memberCount: 1,
  },
]

const members: ParliamentMember[] = [
  {
    memberId: 'dep-1',
    firstName: 'Ana',
    lastName: 'Câmp',
    chamber: 'camera',
    groupId: 'pnl-camera',
    groupName: 'PNL',
    judetSlug: 'brasov',
    judetName: 'Brașov',
  },
  {
    memberId: 'sen-1',
    firstName: 'Radu',
    lastName: 'Râu',
    chamber: 'senat',
    groupId: 'pnl-senat',
    groupName: 'PNL',
    judetSlug: 'cluj',
    judetName: 'Cluj',
  },
]

describe('member-search', () => {
  it('matches member names without requiring Romanian diacritics', () => {
    expect(filterMembersBySearch(members, { q: 'camp' })).toEqual([members[0]])
    expect(filterMembersBySearch(members, { q: 'rau' })).toEqual([members[1]])
  })

  it('keeps chamber highlights aligned with exact group filters', () => {
    expect(
      getChamberFilteredMemberIds(members, { grup: 'pnl-camera' }, 'camera', groups),
    ).toEqual(new Set(['dep-1']))
    expect(
      getChamberFilteredMemberIds(members, { grup: 'pnl-camera' }, 'senat', groups),
    ).toEqual(new Set(['sen-1']))
  })

  it('applies all-chamber party filters to equivalent groups in both chambers', () => {
    expect(filterMembersBySearch(members, { grup: 'pnl-camera' }, groups)).toEqual(
      members,
    )
  })

  it('keeps party filters chamber-scoped when a chamber is selected', () => {
    expect(
      filterMembersBySearch(
        members,
        { chamber: 'senat', grup: 'pnl-camera' },
        groups,
      ),
    ).toEqual([members[1]])
  })

  it('matches members from any selected county', () => {
    expect(
      filterMembersBySearch(members, { judet: ['brasov', 'cluj'] }),
    ).toEqual(members)
    expect(filterMembersBySearch(members, { judet: 'brasov' })).toEqual([
      members[0],
    ])
  })

  it('counts panel filters separately from name search', () => {
    const search = {
      tab: 'grupuri' as const,
      q: 'Ana',
      chamber: 'camera' as const,
      grup: ['pnl-camera', 'usr-camera'],
      judet: 'brasov',
    }

    expect(getPanelFilterCount(search)).toBe(4)
    expect(getActiveFilterCount(search)).toBe(5)
    expect(getActiveFilterCount({ tab: 'grupuri', q: 'Ana' })).toBe(1)
    expect(getPanelFilterCount({ tab: 'grupuri', q: 'Ana' })).toBe(0)
  })
})
