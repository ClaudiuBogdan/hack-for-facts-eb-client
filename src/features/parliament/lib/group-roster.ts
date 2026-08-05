import type { ParliamentGroupCohesion, ParliamentMember } from '@/schemas/parliament'
import {
  LATEST_LEGISLATURE,
  PARLIAMENT_LEGISLATURE_YEARS,
} from '../api/graphql/parliament-translate'
import { foldText } from './text-fold'

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
  /**
   * Which legislature's seats to show. Absent = the latest one.
   *
   * The page used to be pinned to `LATEST_LEGISLATURE` in the fetch layer, so a
   * group's earlier terms were unreachable even though the server accepts the
   * argument and the data carries ten of them (PSD Camera alone: 924 mandates
   * across seven legislatures, of which 2024 is 93).
   */
  readonly legislatura?: string
}

const LEGISLATURE_VALUES: ReadonlySet<string> = new Set(PARLIAMENT_LEGISLATURE_YEARS)

/** Tolerant parse: anything unrecognised falls back to "no filter". */
export function parseGroupDetailSearch(
  search: Record<string, unknown>,
): ParliamentGroupDetailSearch {
  const q = search['q']
  const judet = search['judet']
  const legislatura = search['legislatura']
  return {
    ...(typeof q === 'string' && q.trim() ? { q: q.trim() } : {}),
    ...(typeof judet === 'string' && judet.trim() ? { judet: judet.trim() } : {}),
    ...(toLegislature(legislatura) !== null
      ? { legislatura: toLegislature(legislatura)! }
      : {}),
  }
}

/**
 * A legislature year out of a RAW search value, or null.
 *
 * Accepts a number as well as a string, and that is not defensive padding —
 * it is what this page actually receives. The router parses search values with
 * `JSON.parse` (src/router.tsx), so a shared or hand-typed `?legislatura=2016`
 * arrives as the NUMBER 2016, while the router's own links carry the JSON form
 * `?legislatura=%222016%22` and arrive as a string. Verified by A/B on the dev
 * stack: with a string-only check, `?legislatura=2012` silently rendered the
 * 2024 roster under a "Legislatura 2024" heading — the reader gets an answer to
 * a question they did not ask.
 *
 * The committee browse is not exposed to this because it reads the
 * route-VALIDATED search (`Route.useSearch()`), while this page re-parses the
 * raw one (`useSearch({ strict: false })`). Routing that page through its
 * validated search too would remove the asymmetry; until then the tolerant
 * parse this function is documented to be has to cover both forms.
 */
function toLegislature(value: unknown): string | null {
  const text =
    typeof value === 'string'
      ? value.trim()
      : typeof value === 'number' && Number.isInteger(value)
        ? String(value)
        : null
  return text !== null && LEGISLATURE_VALUES.has(text) ? text : null
}

/**
 * The legislature a group page is currently showing.
 *
 * Kept as one function so the fetch layer, the labels and the "is this the
 * current term" test can never disagree about which term is on screen.
 */
export function resolveGroupLegislature(
  search: ParliamentGroupDetailSearch,
): string {
  return search.legislatura ?? LATEST_LEGISLATURE
}

/**
 * Whether the shown legislature is the sitting one.
 *
 * `current: true` on the server means "seat held TODAY", so pairing it with a
 * past legislature is not a narrower filter — it is an empty one (measured:
 * psd-camera_deputatilor + 2016 + current:true returns 0 of 156). Every surface
 * that means "currently seated" has to ask this first.
 */
export function isCurrentLegislature(legislature: string): boolean {
  return legislature === LATEST_LEGISLATURE
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
