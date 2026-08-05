import type {
  ParliamentChamber,
  ParliamentGroup,
  ParliamentMember,
  ParliamentMembersSearch,
} from '@/schemas/parliament'

/**
 * NOT `foldText` from `./text-fold`, on purpose.
 *
 * `\p{Diacritic}` and `foldText`'s `[̀-ͯ]` agree on every Romanian
 * spelling — `ă â î ș ț` and the legacy cedilla forms `ş ţ` decompose into
 * marks that are in both sets — so member NAMES fold identically either way.
 * They disagree on ~1150 other code points, including the spacing marks `^`,
 * `` ` ``, `´` and `·`: this fold deletes them, `foldText` keeps them. The
 * needle here is arbitrary user input, so switching would change the result
 * for a query containing one of those. Left as-is rather than "consolidated"
 * into a silent behaviour change.
 */
function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function getGroupEquivalenceKey(group: ParliamentGroup): string {
  return group.shortName ?? group.name
}

/** Normalize the grup URL param to a string array. */
export function getGrupFilterValues(
  search: Pick<ParliamentMembersSearch, 'grup'>,
): string[] {
  if (!search.grup) return []
  return Array.isArray(search.grup) ? search.grup : [search.grup]
}

/** Normalize the judet URL param to a string array. */
export function getJudetFilterValues(
  search: Pick<ParliamentMembersSearch, 'judet'>,
): string[] {
  if (!search.judet) return []
  return Array.isArray(search.judet) ? search.judet : [search.judet]
}

/**
 * The chamber the MEMBER surfaces should filter by, or undefined for "no
 * constraint". `all` means exactly that; `comun` is a votes-tab value carried
 * on the shared search object — no member belongs to a joint sitting, so
 * honouring it here would filter every roster to nothing.
 */
export function getMemberChamberFilter(
  search: ParliamentMembersSearch,
): ParliamentChamber | undefined {
  return search.chamber === 'camera' || search.chamber === 'senat'
    ? search.chamber
    : undefined
}

function resolveGroupFilterIds(
  search: ParliamentMembersSearch,
  groups?: ReadonlyArray<ParliamentGroup>,
): Set<string> | null {
  const selectedIds = getGrupFilterValues(search)
  if (selectedIds.length === 0) return null
  if (!groups) return new Set(selectedIds)

  const expandedIds = new Set<string>()
  const chamber = getMemberChamberFilter(search)

  for (const groupId of selectedIds) {
    const selectedGroup = groups.find((group) => group.groupId === groupId)
    if (!selectedGroup) {
      expandedIds.add(groupId)
      continue
    }

    const equivalenceKey = getGroupEquivalenceKey(selectedGroup)
    groups
      .filter((group) => {
        if (getGroupEquivalenceKey(group) !== equivalenceKey) return false
        return chamber ? group.chamber === chamber : true
      })
      .forEach((group) => expandedIds.add(group.groupId))
  }

  return expandedIds
}

/** Whether any member-directory filter is active. */
export function hasMemberSearchFilters(
  search: ParliamentMembersSearch,
): boolean {
  return (
    hasPanelMemberFilters(search) ||
    Boolean(search.q?.trim())
  )
}

/** Panel filters shown in the side sheet (excludes name search). */
export function hasPanelMemberFilters(
  search: ParliamentMembersSearch,
): boolean {
  return Boolean(
    getMemberChamberFilter(search) !== undefined ||
      getGrupFilterValues(search).length > 0 ||
      getJudetFilterValues(search).length > 0,
  )
}

/** Count of active panel filters for the filter button badge. */
export function getPanelFilterCount(search: ParliamentMembersSearch): number {
  let count = 0
  if (getMemberChamberFilter(search) !== undefined) count += 1
  count += getGrupFilterValues(search).length
  count += getJudetFilterValues(search).length
  return count
}

/** Count of all active member-directory filters, including name search. */
export function getActiveFilterCount(search: ParliamentMembersSearch): number {
  let count = getPanelFilterCount(search)
  if (search.q?.trim()) count += 1
  return count
}

/** Apply member directory filters to the full roster. */
export function filterMembersBySearch(
  members: ReadonlyArray<ParliamentMember>,
  search: ParliamentMembersSearch,
  groups?: ReadonlyArray<ParliamentGroup>,
): ParliamentMember[] {
  let result = [...members]

  const chamberFilter = getMemberChamberFilter(search)
  if (chamberFilter) {
    result = result.filter((member) => member.chamber === chamberFilter)
  }
  const judetSlugs = getJudetFilterValues(search)
  if (judetSlugs.length > 0) {
    const judetSet = new Set(judetSlugs)
    result = result.filter((member) => judetSet.has(member.judetSlug))
  }
  const groupFilterIds = resolveGroupFilterIds(search, groups)
  if (groupFilterIds) {
    result = result.filter((member) => groupFilterIds.has(member.groupId))
  }
  if (search.q?.trim()) {
    const query = normalizeSearchText(search.q.trim())
    result = result.filter((member) =>
      normalizeSearchText(`${member.firstName} ${member.lastName}`).includes(query),
    )
  }

  return result
}

type ChamberScopedSearch = {
  readonly search: ParliamentMembersSearch
  readonly chamberExcluded: boolean
}

/**
 * Resolve global URL filters for a single chamber chart.
 * Maps cross-chamber group ids to the equivalent group in the target chamber.
 */
export function resolveChamberScopedSearch(
  search: ParliamentMembersSearch,
  chamber: ParliamentChamber,
  groups: ReadonlyArray<ParliamentGroup>,
): ChamberScopedSearch {
  const chamberFilter = getMemberChamberFilter(search)
  if (chamberFilter && chamberFilter !== chamber) {
    return { search: {}, chamberExcluded: true }
  }

  const scopedSearch: ParliamentMembersSearch = {
    q: search.q,
    judet: search.judet,
  }

  const selectedIds = getGrupFilterValues(search)
  if (selectedIds.length > 0) {
    const scopedGroupIds: string[] = []

    for (const groupId of selectedIds) {
      const selectedGroup = groups.find((group) => group.groupId === groupId)

      if (!selectedGroup) {
        continue
      }

      if (selectedGroup.chamber === chamber) {
        scopedGroupIds.push(selectedGroup.groupId)
      } else {
        const equivalentGroup = groups.find(
          (group) =>
            group.chamber === chamber &&
            getGroupEquivalenceKey(group) === getGroupEquivalenceKey(selectedGroup),
        )

        if (equivalentGroup) {
          scopedGroupIds.push(equivalentGroup.groupId)
        }
      }
    }

    if (scopedGroupIds.length === 0) {
      return { search: {}, chamberExcluded: true }
    }

    scopedSearch.grup =
      scopedGroupIds.length === 1 ? scopedGroupIds[0] : scopedGroupIds
  }

  return { search: scopedSearch, chamberExcluded: false }
}

/** Member IDs highlighted in one chamber chart for the current filters. */
export function getChamberFilteredMemberIds(
  members: ReadonlyArray<ParliamentMember>,
  search: ParliamentMembersSearch,
  chamber: ParliamentChamber,
  groups: ReadonlyArray<ParliamentGroup>,
): Set<string> {
  if (!hasMemberSearchFilters(search)) {
    return new Set(
      members
        .filter((member) => member.chamber === chamber)
        .map((member) => member.memberId),
    )
  }

  const { search: chamberSearch, chamberExcluded } = resolveChamberScopedSearch(
    search,
    chamber,
    groups,
  )

  if (chamberExcluded) {
    return new Set()
  }

  return new Set(
    filterMembersBySearch(
      members.filter((member) => member.chamber === chamber),
      chamberSearch,
      groups,
    ).map((member) => member.memberId),
  )
}

/**
 * Group IDs highlighted in one chamber chart for a GROUP-ONLY filter — used so
 * anonymous placeholder seats (which carry a real groupId but no member id) still
 * highlight under a `grup` filter. Returns null when a judet/q filter is also
 * active (those genuinely need a resolved member, so placeholder seats can't be
 * judged active by group alone), or when no group filter is set.
 */
export function getChamberFilteredGroupIds(
  search: ParliamentMembersSearch,
  chamber: ParliamentChamber,
  groups: ReadonlyArray<ParliamentGroup>,
): Set<string> | null {
  const hasGroup = getGrupFilterValues(search).length > 0
  const hasJudetOrQ =
    getJudetFilterValues(search).length > 0 || Boolean(search.q?.trim())
  if (!hasGroup || hasJudetOrQ) return null

  const { search: chamberSearch, chamberExcluded } = resolveChamberScopedSearch(
    search,
    chamber,
    groups,
  )
  if (chamberExcluded) return new Set()
  return new Set(getGrupFilterValues(chamberSearch))
}
