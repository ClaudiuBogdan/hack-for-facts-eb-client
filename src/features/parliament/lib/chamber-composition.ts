import type {
  ParliamentChamber,
  ParliamentChamberComposition,
  ParliamentGroup,
  ParliamentMember,
  ParliamentMembersSearch,
  ParliamentSeat,
} from '@/schemas/parliament'
import { ParliamentChamberCompositionSchema } from '@/schemas/parliament'
import { formatMemberName } from './formatting'
import {
  hasMemberSearchFilters,
  getChamberFilteredGroupIds,
  getChamberFilteredMemberIds,
} from './member-search'
import {
  computeHemicycleLayout,
  sortHemicyclePositionsLeftToRight,
} from './hemicycle-layout'

const DEFAULT_GROUP_COLOR = '#505a5f'
const CENTER_FALLBACK = { x: 50, y: 52 } as const

const SYNTHETIC_FIRST_NAMES = [
  'Adrian',
  'Alina',
  'Andrei',
  'Carmen',
  'Cristian',
  'Daniel',
  'Diana',
  'Elena',
  'Florin',
  'Gabriel',
  'Ioana',
  'Laura',
  'Marius',
  'Monica',
  'Nicolae',
  'Oana',
  'Radu',
  'Simona',
  'Tudor',
  'Victor',
] as const

const SYNTHETIC_LAST_NAMES = [
  'Ardelean',
  'Barbu',
  'Ciobanu',
  'Dumitru',
  'Enache',
  'Florescu',
  'Georgescu',
  'Horvath',
  'Iacob',
  'Lazar',
  'Marin',
  'Neagu',
  'Oprea',
  'Popescu',
  'Radu',
  'Stan',
  'Toma',
  'Ungureanu',
  'Vasile',
  'Zamfir',
] as const

const JUDETE = [
  { slug: 'bucuresti', name: 'București' },
  { slug: 'cluj', name: 'Cluj' },
  { slug: 'timis', name: 'Timiș' },
  { slug: 'iasi', name: 'Iași' },
  { slug: 'bihor', name: 'Bihor' },
  { slug: 'buzau', name: 'Buzău' },
  { slug: 'harghita', name: 'Harghita' },
  { slug: 'olt', name: 'Olt' },
  { slug: 'brasov', name: 'Brașov' },
  { slug: 'constanta', name: 'Constanța' },
] as const

function getGroupColor(
  group: ParliamentGroup,
  colorMap: Readonly<Record<string, string>>,
): string {
  return group.color ?? colorMap[group.groupId] ?? DEFAULT_GROUP_COLOR
}

function pickJudet(index: number): (typeof JUDETE)[number] {
  return JUDETE[index % JUDETE.length] ?? JUDETE[0]
}

/**
 * Extend the mock roster so each parliamentary group reaches its official seat count.
 */
export function ensureFullChamberRoster(
  baseMembers: ReadonlyArray<ParliamentMember>,
  groups: ReadonlyArray<ParliamentGroup>,
): ParliamentMember[] {
  const members = [...baseMembers]
  const existingIds = new Set(members.map((member) => member.memberId))
  let syntheticCounter = 1

  for (const group of groups) {
    const currentCount = members.filter(
      (member) => member.groupId === group.groupId,
    ).length
    const missingCount = group.memberCount - currentCount

    for (let index = 0; index < missingCount; index += 1) {
      const prefix = group.chamber === 'camera' ? 'dep' : 'sen'
      let memberId = `${prefix}-fill-${String(syntheticCounter).padStart(4, '0')}`
      while (existingIds.has(memberId)) {
        syntheticCounter += 1
        memberId = `${prefix}-fill-${String(syntheticCounter).padStart(4, '0')}`
      }

      const judet = pickJudet(syntheticCounter + index)
      const firstName =
        SYNTHETIC_FIRST_NAMES[
          (syntheticCounter + index) % SYNTHETIC_FIRST_NAMES.length
        ] ?? 'Ion'
      const lastName =
        SYNTHETIC_LAST_NAMES[
          (syntheticCounter + index) % SYNTHETIC_LAST_NAMES.length
        ] ?? 'Popescu'

      members.push({
        memberId,
        firstName,
        lastName,
        chamber: group.chamber,
        groupId: group.groupId,
        groupName: group.shortName ?? group.name,
        judetSlug: judet.slug,
        judetName: judet.name,
        mandateStart: '2024-12-01',
      })

      existingIds.add(memberId)
      syntheticCounter += 1
    }
  }

  return members
}

function buildSeatAssignments(
  chamber: ParliamentChamber,
  groups: ReadonlyArray<ParliamentGroup>,
  members: ReadonlyArray<ParliamentMember>,
  colorMap: Readonly<Record<string, string>>,
): Omit<ParliamentSeat, 'x' | 'y' | 'seatIndex' | 'isActive'>[] {
  const chamberGroups = [...groups]
    .filter((group) => group.chamber === chamber)
    .sort((a, b) => b.memberCount - a.memberCount)

  const assignments: Omit<
    ParliamentSeat,
    'x' | 'y' | 'seatIndex' | 'isActive'
  >[] = []

  for (const group of chamberGroups) {
    // The AUTHORITATIVE seat count is `group.memberCount` (sums to the chamber
    // total). Fill seats with the real members we have (their server roster page
    // may be capped/partial), then top up with anonymous placeholder seats so the
    // hemicycle + the seat-derived per-party bars match the authoritative count —
    // never undercount to the size of a paginated member page.
    const groupMembers = members
      .filter((member) => member.groupId === group.groupId)
      .slice(0, group.memberCount)
    const color = getGroupColor(group, colorMap)
    const groupName = group.shortName ?? group.name

    for (const member of groupMembers) {
      assignments.push({
        memberId: member.memberId,
        memberName: formatMemberName(member.firstName, member.lastName),
        groupId: group.groupId,
        groupName,
        color,
      })
    }
    // Anonymous remainder seats (no resolved member for this seat in the roster).
    // NO memberId: these represent "a seat this group holds", not a person, so
    // they must never become a navigable member link.
    for (let i = groupMembers.length; i < group.memberCount; i += 1) {
      assignments.push({
        memberName: '',
        groupId: group.groupId,
        groupName,
        color,
      })
    }
  }

  return assignments
}

/** Build hemicycle seat data for a chamber with layout coordinates. */
export function buildChamberComposition(
  chamber: ParliamentChamber,
  groups: ReadonlyArray<ParliamentGroup>,
  members: ReadonlyArray<ParliamentMember>,
  colorMap: Readonly<Record<string, string>>,
  search: ParliamentMembersSearch = {},
): ParliamentChamberComposition {
  const chamberGroups = groups.filter((group) => group.chamber === chamber)
  const totalSeats = chamberGroups.reduce(
    (sum, group) => sum + group.memberCount,
    0,
  )
  const majoritySeats = Math.floor(totalSeats / 2) + 1
  const hasActiveFilters = hasMemberSearchFilters(search)
  const filteredMemberIds = hasActiveFilters
    ? getChamberFilteredMemberIds(members, search, chamber, groups)
    : null
  // For a GROUP-ONLY filter, highlight by groupId so anonymous placeholder seats
  // (real groupId, no member id) also light up. null when judet/q is also active.
  const filteredGroupIds = hasActiveFilters
    ? getChamberFilteredGroupIds(search, chamber, groups)
    : null

  const assignments = buildSeatAssignments(chamber, groups, members, colorMap)
  const layout = computeHemicycleLayout(assignments.length)
  const slotOrder = sortHemicyclePositionsLeftToRight(layout.positions)

  const seats: ParliamentSeat[] = assignments.map((assignment, index) => {
    const positionIndex = slotOrder[index] ?? index
    const position = layout.positions[positionIndex]
    const isActive =
      !hasActiveFilters ||
      (assignment.memberId !== undefined &&
        filteredMemberIds?.has(assignment.memberId) === true) ||
      filteredGroupIds?.has(assignment.groupId) === true

    return {
      ...assignment,
      seatIndex: index,
      x: position?.x ?? CENTER_FALLBACK.x,
      y: position?.y ?? CENTER_FALLBACK.y,
      isActive,
    }
  })

  return ParliamentChamberCompositionSchema.parse({
    chamber,
    totalSeats,
    majoritySeats,
    activeSeatCount: seats.filter((seat) => seat.isActive).length,
    hasActiveFilters,
    groups: chamberGroups,
    seats,
    viewBox: layout.viewBox,
    seatRadius: layout.seatRadius,
  })
}
