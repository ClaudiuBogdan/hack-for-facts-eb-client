import type { CountyCouncilResponse, ElectionResultTally, LocalMandatesResponse } from '@/schemas/elections-results'
import { foldLines, type LineCount } from './lines'

/**
 * The local elections' mandates folded into party lines: what the Mandate
 * view draws. Only this reduced shape is cached, seeded from the server and
 * sent in the page's HTML; the raw response (every vote row, every label)
 * stays inside the read.
 */

/** The local elections' general ballot day, 9 June 2024: the one day with national aggregates. */
export const LOCAL_2024 = 'ro:local:2024:2024-06-09'

/** A county council's two allocation phases, side by side: never summed. */
export type PhasePair = { readonly first: readonly LineCount[] | null; readonly second: readonly LineCount[] | null }

export type CountyMandates = { readonly code: string; readonly mayors: readonly LineCount[] | null; readonly councillors: readonly LineCount[] | null }

export type LocalMandates = {
  /** `null`: the API has no figures there; never read as zero. */
  readonly mayors: readonly LineCount[] | null
  readonly councillors: readonly LineCount[] | null
  readonly countyCouncil: PhasePair
  /** Counties with an item; a county without one is absent, and so is a county whose item has no mandates. */
  readonly counties: readonly CountyMandates[]
  /** Counties the national figures leave out (`MISSING_SCOPE:county:XX`). */
  readonly missing: readonly string[]
  /** Whether any national mandate line has a SUSPECT member. */
  readonly suspect: boolean
}

const MISSING_COUNTY = /^MISSING_SCOPE:county:([A-Z]{1,2})$/u

function missingCounties(groups: readonly (readonly ElectionResultTally[])[]): readonly string[] {
  const codes = new Set<string>()
  for (const tallies of groups)
    for (const tally of tallies)
      for (const issue of tally.issues) {
        const code = MISSING_COUNTY.exec(issue)?.[1]
        if (code) codes.add(code)
      }
  return [...codes].sort()
}

const mandatesOf = (tallies: readonly ElectionResultTally[] | undefined) => (tallies ? foldLines(tallies, 'mandates', 'final') : null)

const phasesOf = (tallies: readonly ElectionResultTally[] | undefined): PhasePair => ({
  first: tallies ? foldLines(tallies, 'mandates', 'man_1') : null,
  second: tallies ? foldLines(tallies, 'mandates', 'man_2') : null,
})

export function localMandatesOf(raw: LocalMandatesResponse): LocalMandates {
  const councillorsBy = new Map(raw.councilCounties.items.flatMap((item) => (item.place.countyCode ? [[item.place.countyCode, item.tallies] as const] : [])))
  const counties = raw.mayorCounties.items.flatMap((item) => {
    const code = item.place.countyCode
    return code ? [{ code, mayors: mandatesOf(item.tallies), councillors: mandatesOf(councillorsBy.get(code)) }] : []
  })
  const mayors = mandatesOf(raw.mayor?.tallies)
  const councillors = mandatesOf(raw.council?.tallies)
  return {
    mayors,
    councillors,
    countyCouncil: phasesOf(raw.county?.tallies),
    counties,
    missing: missingCounties([raw.mayor?.tallies ?? [], raw.council?.tallies ?? []]),
    suspect: [...(mayors ?? []), ...(councillors ?? [])].some((row) => row.suspect),
  }
}

export function countyCouncilOf(raw: CountyCouncilResponse): PhasePair {
  return phasesOf(raw.electionResult?.tallies)
}
