import { useQuery } from '@tanstack/react-query'
import summaryJson from './results.summary.json'

/**
 * The main page's results, as extracted read-only from the production DB's
 * elections schema (the API does not serve results yet): national and county
 * figures here, the per-UAT maps loaded in the browser (`useUatResults`).
 * Numbers only, keyed by party (actor key), SIRUTA or INS county code.
 */

/** [party key, count] — votes, mandates or mayors, largest first. */
export type PartyCount = readonly [string, number]
/** [registered (PV `a`), present (PV `b`)] */
export type Turnout = readonly [number, number]

export interface OfficeTally {
  readonly national: readonly PartyCount[]
  readonly byCounty: Readonly<Record<string, readonly PartyCount[]>>
}

export interface ResultsSummary {
  readonly readAt: string
  readonly parties: Readonly<Record<string, string>>
  readonly local2024: {
    readonly edition: string
    readonly roundLabel: string
    readonly turnoutStatus: string | null
    readonly mayors: { readonly leaders: readonly PartyCount[]; readonly mandates: OfficeTally; readonly ties: number; readonly closeUnder5pp: number }
    readonly councillors: OfficeTally
    readonly countyCouncillors: OfficeTally
    readonly countyCouncilVotes: OfficeTally
    /** County → [most-voted party, its share ‰] */
    readonly countyPresidents: Readonly<Record<string, readonly [string, number]>>
    readonly turnout: { readonly byCounty: Readonly<Record<string, Turnout>>; readonly national: Turnout }
    readonly duplicateValueConflicts: number
  }
  readonly parliamentary2020: {
    readonly edition: string
    readonly turnoutStatus: string | null
    readonly chamber: OfficeTally & { readonly diaspora: readonly PartyCount[] }
    readonly senate: { readonly national: readonly PartyCount[]; readonly diaspora: readonly PartyCount[] }
    readonly turnout: { readonly byCounty: Readonly<Record<string, Turnout>>; readonly national: Turnout; readonly diaspora: Turnout }
  }
  readonly presidential2019: {
    readonly edition: string
    readonly roundLabel: string
    readonly turnoutStatus: string | null
    readonly turnout: { readonly byCounty: Readonly<Record<string, Turnout>>; readonly national: Turnout; readonly unlinked: Turnout }
  }
  readonly european2019: { readonly edition: string; readonly turnoutStatus: string | null; readonly turnout: { readonly national: Turnout } }
  readonly referendum2019: { readonly edition: string; readonly state: string }
}

/** SIRUTA → [leader party or `~tie`, leader share ‰, margin over the second ‰, valid votes, competitors] */
export type MayorUat = readonly [string, number, number, number, number]

/**
 * București's six sectors: the source reports a race per sector, but today's
 * INS list (the map, the place kinds) has București as one UAT, and the 2024
 * local figures leave the capital out. Every per-UAT count drops them.
 */
export const BUCHAREST_SECTORS: ReadonlySet<string> = new Set(['179141', '179150', '179169', '179178', '179187', '179196'])

/**
 * Mayoral races decided by under 5 points in 2024, one rule for every page:
 * outside București's sectors, two candidates or more, not a tie (the margin
 * is in ‰, so 5 points is 50).
 */
export function closeMayorRaces(rows: Readonly<Record<string, MayorUat>>): number {
  let close = 0
  for (const [siruta, [leader, , margin, , competitors]] of Object.entries(rows)) {
    if (BUCHAREST_SECTORS.has(siruta) || leader === '~tie' || competitors <= 1) continue
    if (margin < 50) close++
  }
  return close
}
/** SIRUTA → [leader party or `~tie`, leader share ‰, margin ‰, valid votes] */
export type ChamberUat = readonly [string, number, number, number]

export interface UatResults {
  readonly readAt: string
  readonly local2024Mayors: Readonly<Record<string, MayorUat>>
  readonly parliamentary2020Chamber: Readonly<Record<string, ChamberUat>>
  readonly parliamentary2020Turnout: Readonly<Record<string, Turnout>>
  readonly presidential2019Turnout: Readonly<Record<string, Turnout>>
}

export const SUMMARY = summaryJson as unknown as ResultsSummary

export function useUatResults() {
  return useQuery({
    queryKey: ['development', 'elections', 'principal', 'uat'],
    queryFn: async () => ((await import('./results.uat.json')) as unknown as { readonly default: UatResults }).default,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export const turnoutShare = ([registered, present]: Turnout): number | null => (registered > 0 ? present / registered : null)

export const total = (counts: readonly PartyCount[]) => counts.reduce((sum, [, n]) => sum + n, 0)

/** The first `n` parties, the rest folded into one `~other` row (never dropped: the shares still add up). */
export function topWithOther(counts: readonly PartyCount[], n: number): readonly PartyCount[] {
  if (counts.length <= n) return counts
  const rest = counts.slice(n).reduce((sum, [, v]) => sum + v, 0)
  return [...counts.slice(0, n), ['~other', rest]]
}

// ───────────────────────────────────────────────────── the map's views ──

export type MapElection = 'locale-2024' | 'parlamentare-2020' | 'prezidentiale-2019'
export type MapLevel = 'uat' | 'judet'
export type MapMeasure = 'partid' | 'prezenta' | 'presedinte'

export const MAP_ELECTIONS: readonly MapElection[] = ['locale-2024', 'parlamentare-2020', 'prezidentiale-2019']

/** What each election can draw, at each level: a measure the data lacks is offered disabled, with why. */
export function measureAvailable(election: MapElection, level: MapLevel, measure: MapMeasure): boolean {
  if (election === 'locale-2024') {
    if (measure === 'prezenta') return level === 'judet'
    if (measure === 'presedinte') return level === 'judet'
    return true
  }
  if (election === 'parlamentare-2020') return measure !== 'presedinte'
  return measure === 'prezenta'
}

/** Turnout classes: five bands of the election's own UAT or county turnouts (quintile breaks, rounded to whole percents). */
export function turnoutBreaks(values: readonly number[]): readonly number[] {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return []
  const at = (q: number) => Math.round(100 * (sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0)) / 100
  return [...new Set([at(0.2), at(0.4), at(0.6), at(0.8)])]
}

export function turnoutClass(value: number, breaks: readonly number[]): number {
  let index = 0
  while (index < breaks.length && value >= (breaks[index] ?? Infinity)) index++
  return index
}

/** The county a mandate tally gives most of (the map's county colour for mayors and councils). */
export function countyLeader(counts: readonly PartyCount[] | undefined): string | null {
  if (!counts || counts.length === 0) return null
  const [first, second] = counts
  if (!first) return null
  return second && second[1] === first[1] ? '~tie' : first[0]
}
