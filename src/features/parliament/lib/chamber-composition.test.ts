import { describe, expect, it } from 'vitest'
import type { ParliamentGroup, ParliamentMember } from '@/schemas/parliament'
import { buildChamberComposition } from './chamber-composition'

/** Camera groups with authoritative current counts (sum 330, abbreviated set). */
const cameraGroups: ParliamentGroup[] = [
  { groupId: 'psd-camera_deputatilor', name: 'PSD', shortName: 'PSD', chamber: 'camera', memberCount: 92, color: '#E4002B' },
  { groupId: 'aur-camera_deputatilor', name: 'AUR', shortName: 'AUR', chamber: 'camera', memberCount: 62, color: '#111111' },
  { groupId: 'pnl-camera_deputatilor', name: 'PNL', shortName: 'PNL', chamber: 'camera', memberCount: 54, color: '#FFD200' },
  { groupId: 'senat-only', name: 'X', shortName: 'X', chamber: 'senat', memberCount: 10, color: '#000000' },
]
const TOTAL_CAMERA = 92 + 62 + 54

/** A PARTIAL roster (the server members page is capped) — far fewer than 208. */
const partialMembers: ParliamentMember[] = [
  { memberId: '2:2024:1', firstName: 'A', lastName: 'Unu', chamber: 'camera', groupId: 'psd-camera_deputatilor', groupName: 'PSD', judetSlug: 'cluj', judetName: 'CLUJ' },
  { memberId: '2:2024:2', firstName: 'B', lastName: 'Doi', chamber: 'camera', groupId: 'aur-camera_deputatilor', groupName: 'AUR', judetSlug: 'iasi', judetName: 'IAŞI' },
]

const colorMap = Object.fromEntries(cameraGroups.map((g) => [g.groupId, g.color!]))

describe('buildChamberComposition — authoritative counts (not the paginated page)', () => {
  it('emits one seat per group.memberCount even when the roster is partial', () => {
    const comp = buildChamberComposition('camera', cameraGroups, partialMembers, colorMap)
    expect(comp.totalSeats).toBe(TOTAL_CAMERA) // 208
    expect(comp.seats).toHaveLength(TOTAL_CAMERA) // NOT 2 (the partial roster size)
  })

  it('seat counts per party EQUAL group.memberCount (the bug: undercount to page size)', () => {
    const comp = buildChamberComposition('camera', cameraGroups, partialMembers, colorMap)
    const byGroup = new Map<string, number>()
    for (const seat of comp.seats) {
      byGroup.set(seat.groupId, (byGroup.get(seat.groupId) ?? 0) + 1)
    }
    expect(byGroup.get('psd-camera_deputatilor')).toBe(92)
    expect(byGroup.get('aur-camera_deputatilor')).toBe(62)
    expect(byGroup.get('pnl-camera_deputatilor')).toBe(54)
    // The per-party seat counts sum to the chamber total.
    const sum = [...byGroup.values()].reduce((a, b) => a + b, 0)
    expect(sum).toBe(TOTAL_CAMERA)
  })

  it('only includes the requested chamber + a correct majority threshold', () => {
    const comp = buildChamberComposition('camera', cameraGroups, partialMembers, colorMap)
    expect(comp.groups.every((g) => g.chamber === 'camera')).toBe(true)
    expect(comp.majoritySeats).toBe(Math.floor(TOTAL_CAMERA / 2) + 1)
  })
})
