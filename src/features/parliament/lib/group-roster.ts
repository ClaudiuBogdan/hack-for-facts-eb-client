import type { ParliamentGroupCohesion, ParliamentMember } from '@/schemas/parliament'

/**
 * URL state and selectors for the group dossier (`/parlament/grupuri/$groupId`).
 *
 * The roster used to be a flat, unfiltered list of every seat — 91 identical
 * rows for PSD Camera, with no way to narrow it. Filters live in search params
 * because that is this app's shareable-state contract (AGENTS.md).
 */
export interface ParliamentGroupDetailSearch {
  /** Free-text over the member NAME. Diacritic- and case-insensitive. */
  readonly q?: string
  /** A `judetSlug` from the roster itself — never a hardcoded county list. */
  readonly judet?: string
}

/** Tolerant parse: anything unrecognised falls back to "no filter". */
export function parseGroupDetailSearch(
  search: Record<string, unknown>,
): ParliamentGroupDetailSearch {
  const q = search['q']
  const judet = search['judet']
  return {
    ...(typeof q === 'string' && q.trim() ? { q: q.trim() } : {}),
    ...(typeof judet === 'string' && judet.trim() ? { judet: judet.trim() } : {}),
  }
}

/** Strip diacritics and case so "tanase" finds "Tănase". */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export interface GroupCountyFacet {
  readonly slug: string
  readonly name: string
  readonly count: number
}

/**
 * The counties this group actually holds seats in, biggest delegation first.
 *
 * Derived from the roster rather than from a national county list: a group with
 * seats in 40 of 43 constituencies should not offer the reader three counties
 * that would return nothing.
 */
export function buildCountyFacets(
  members: readonly ParliamentMember[],
): readonly GroupCountyFacet[] {
  const byslug = new Map<string, GroupCountyFacet>()
  for (const member of members) {
    if (!member.judetSlug) continue
    const existing = byslug.get(member.judetSlug)
    byslug.set(member.judetSlug, {
      slug: member.judetSlug,
      name: member.judetName,
      count: (existing?.count ?? 0) + 1,
    })
  }
  return [...byslug.values()].sort(
    (left, right) =>
      right.count - left.count || left.name.localeCompare(right.name, 'ro'),
  )
}

/**
 * Apply the roster facets, then sort by surname with Romanian collation.
 *
 * Both filters are client-side, which is sound only because the whole roster
 * arrives in one response (at most ~93 rows for the largest group). Filtering a
 * partially-fetched list would describe a set the reader cannot see.
 */
export function selectRosterMembers(
  members: readonly ParliamentMember[],
  search: ParliamentGroupDetailSearch,
): readonly ParliamentMember[] {
  const q = search.q ? foldText(search.q) : undefined
  return members
    .filter((member) => {
      if (search.judet && member.judetSlug !== search.judet) return false
      if (!q) return true
      return foldText(`${member.lastName} ${member.firstName}`).includes(q)
    })
    .sort(
      (left, right) =>
        left.lastName.localeCompare(right.lastName, 'ro') ||
        left.firstName.localeCompare(right.firstName, 'ro'),
    )
}

// ── cohesion ────────────────────────────────────────────────────────────────

/**
 * How far back the cohesion window reaches.
 *
 * `parliamentVoteCohesion` refuses any window wider than 500 votes. Six months
 * is comfortably inside that for both chambers (measured 2026-07: Camera 296,
 * Senat 298), while twelve months exceeds it for Camera. The window is always
 * printed next to the numbers — see `ParliamentGroupCohesionPanel`.
 */
export const COHESION_WINDOW_MONTHS = 6

/**
 * Built from the LOCAL calendar date, then pinned to UTC midnight.
 *
 * Reading `getUTCDate()` here would print "27 iulie" to a reader whose calendar
 * says the 28th for the first three hours of every Romanian day, because the
 * window label is a date a person checks against their own calendar.
 */
export function cohesionWindow(now: Date): { from: string; to: string } {
  const to = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  )
  const from = new Date(to)
  from.setUTCMonth(from.getUTCMonth() - COHESION_WINDOW_MONTHS)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

/**
 * Find this group's cohesion row — BY EXACT FOLDED NAME, never fuzzily.
 *
 * The two endpoints disagree on vocabulary. `parliamentGroups` calls them
 * "Neafiliaţi" and "PACE"; `parliamentVoteCohesion` answers with "neafiliat",
 * "Senatori neafiliați", "PIR" and "POT" — names that are not in the group list
 * at all. Loosening the match to bridge that gap would attribute one group's
 * voting record to another, which is exactly the kind of claim this app must
 * not invent. When there is no exact match we show nothing and say why.
 */
export function matchCohesionRow(
  groupName: string,
  rows: readonly ParliamentGroupCohesion[] | undefined,
): ParliamentGroupCohesion | undefined {
  if (!rows?.length) return undefined
  const target = foldText(groupName)
  return rows.find((row) => foldText(row.groupName) === target)
}

/** Rank within the chamber, 1 = most cohesive. Ties share the better rank. */
export function cohesionRank(
  row: ParliamentGroupCohesion,
  rows: readonly ParliamentGroupCohesion[],
): { rank: number; total: number } {
  const scored = rows.filter((candidate) => candidate.cohesionIndex !== undefined)
  const ahead = scored.filter(
    (candidate) => (candidate.cohesionIndex ?? 0) > (row.cohesionIndex ?? 0),
  ).length
  return { rank: ahead + 1, total: scored.length }
}

export type CohesionBand = 'high' | 'medium' | 'low'

/**
 * Turn the index into words. A bare "0.871" tells a citizen nothing; the band
 * is what carries the meaning, and the number stays alongside it.
 */
export function cohesionBand(index: number): CohesionBand {
  if (index >= 0.85) return 'high'
  if (index >= 0.7) return 'medium'
  return 'low'
}
