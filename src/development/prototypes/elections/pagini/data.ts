import { useQuery } from '@tanstack/react-query'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { lineOf, type Line } from '../componente-fable/model'

/**
 * Live reads for the pages prototype (owner, 2026-11-28: the elections pages laid out like legislation and the
 * national budget, prototyped on a development page). Everything here is read from the API the dev server
 * points at; nothing is a fixture. The reductions below are the model change 1 will promote: a line per party
 * (by actor key), the two alliances by their normalised ballot label, the independents by kind with the label
 * dropped, everything else „Alte partide"; a missing figure is absent, never 0; allocation phases never summed.
 */

// ───────────────────────────────────────────────────────────── raw shapes ──

type RawCompetitor = { readonly kind: string; readonly actorKey: string | null; readonly label: string }
type RawTally = {
  readonly measure: string
  readonly allocationPhase: string
  readonly value: string
  readonly status: string
  readonly issues: readonly string[]
  readonly competitor: RawCompetitor
  readonly share?: { readonly percent: string | null } | null
}
type RawTurnout = { readonly measure: string; readonly value: string; readonly includesDiaspora: boolean }
type RawCoverage = { readonly measure: string; readonly allocationPhase: string; readonly state: string; readonly issues: readonly string[] }
type RawResult = {
  readonly tallies: readonly RawTally[]
  readonly turnout?: readonly RawTurnout[]
  readonly participation?: { readonly percent: string | null } | null
  readonly coverage?: readonly RawCoverage[]
} | null
type RawScopes = { readonly total: number; readonly hasMore: boolean; readonly items: readonly { readonly place: { readonly countyCode: string | null; readonly name: string }; readonly tallies: readonly RawTally[] }[] }

const TALLY = 'measure allocationPhase value status issues competitor { kind actorKey label }'

// ───────────────────────────────────────────────────────────── party lines ──

/** The two alliances drawn as their own lines, by their ballot label once normalised (lists have no actor key). */
const LIST_LINES: Readonly<Record<string, Line>> = {
  'ALIANTA DREAPTA UNITA USR PMP FORTA DREPTEI': 'adu',
  'ALIANTA ELECTORALA PSD PNL': 'psdpnl',
}

export function normaliseLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

/** The line a competitor is drawn on. An independent's label (a name) never leaves this function. */
export function lineOfCompetitor(competitor: RawCompetitor): Line {
  if (competitor.kind === 'independent' || competitor.kind === 'independents_bucket') return 'ind'
  if (competitor.actorKey) return lineOf(competitor.actorKey)
  if (competitor.kind === 'list') return LIST_LINES[normaliseLabel(competitor.label)] ?? 'other'
  return 'other'
}

export type LineCount = { readonly line: Line; readonly value: number; readonly suspect: boolean }

/** One measure and phase folded into lines: summed counts, the worst status kept (a SUSPECT member marks the line). */
export function foldLines(tallies: readonly RawTally[], measure: string, phase: string): readonly LineCount[] | null {
  const rows = tallies.filter((tally) => tally.measure === measure && tally.allocationPhase === phase)
  if (rows.length === 0) return null
  const lines = new Map<Line, { value: number; suspect: boolean }>()
  for (const tally of rows) {
    const line = lineOfCompetitor(tally.competitor)
    const was = lines.get(line) ?? { value: 0, suspect: false }
    lines.set(line, { value: was.value + Number(tally.value), suspect: was.suspect || tally.status === 'SUSPECT' })
  }
  return ordered([...lines].map(([line, { value, suspect }]) => ({ line, value, suspect })))
}

/** Lines by size, the independents and then „Alte partide" last; empty lines dropped. */
export function ordered(rows: readonly LineCount[]): readonly LineCount[] {
  const rank = (line: Line) => (line === 'other' ? 2 : line === 'ind' ? 1 : 0)
  return rows.filter((row) => row.value > 0).slice().sort((a, b) => rank(a.line) - rank(b.line) || b.value - a.value)
}

export const total = (rows: readonly LineCount[] | null) => (rows ?? []).reduce((sum, row) => sum + row.value, 0)

// ───────────────────────────────────────────────────────────── events ──

export type Occurrence = { readonly occurrenceKey: string; readonly ballotDate: string; readonly round: string; readonly kind: string; readonly status: string; readonly offices: readonly { readonly office: string; readonly contests: number }[] }
export type ElectionEvent = { readonly eventKey: string; readonly family: string; readonly year: number; readonly publication: { readonly activatedAt: string } | null; readonly occurrences: readonly Occurrence[] }

async function readEvents(signal: AbortSignal): Promise<readonly ElectionEvent[]> {
  const data = await graphqlQuery<{ electionEvents: { items: ElectionEvent[] } }>(
    `query PagesEvents { electionEvents(page: 1, pageSize: 100) { items { eventKey family year publication { activatedAt } occurrences { occurrenceKey ballotDate round kind status offices { office contests } } } } }`,
    {},
    { operationName: 'PagesEvents', signal, auth: 'none' },
  )
  return data.electionEvents.items.slice().sort((a, b) => (latestDay(b) ?? '').localeCompare(latestDay(a) ?? ''))
}

export const latestDay = (event: ElectionEvent) => event.occurrences.map((occurrence) => occurrence.ballotDate).sort().reverse()[0] ?? null

export function useElectionEvents() {
  return useQuery({ queryKey: ['prototype', 'elections-pages', 'events'], queryFn: ({ signal }) => readEvents(signal), staleTime: 10 * 60 * 1000 })
}

// ───────────────────────────────────────────────────────────── ballot days ──

/** The offices a ballot day is summarised by, and whether its figures live in a national contest (no aggregate). */
const DAY_OFFICES: Readonly<Record<string, readonly { readonly office: string; readonly contest: boolean }[]>> = {
  parliamentary: [
    { office: 'chamber', contest: false },
    { office: 'senate', contest: false },
  ],
  presidential: [{ office: 'president', contest: true }],
  european: [{ office: 'european_parliament', contest: true }],
  local: [
    { office: 'local_council', contest: false },
    { office: 'mayor', contest: false },
  ],
}

export type Vote = { readonly line: Line; readonly label: string; readonly kind: string; readonly percent: number | null; readonly suspect: boolean }
export type DaySummary = {
  readonly occurrenceKey: string
  readonly eventKey: string
  readonly family: string
  readonly year: number
  readonly ballotDate: string
  readonly round: string
  readonly status: string
  readonly office: string
  /** Served participation, else voted ÷ registered from the served counts (`computed`). */
  readonly turnout: { readonly value: number; readonly computed: boolean; readonly diaspora: boolean } | null
  readonly votes: readonly Vote[]
  readonly seats: readonly LineCount[] | null
}

function turnoutOf(result: NonNullable<RawResult>): DaySummary['turnout'] {
  const served = result.participation?.percent
  const registered = result.turnout?.find((row) => row.measure === 'registered')
  const voted = result.turnout?.find((row) => row.measure === 'voted')
  const diaspora = Boolean(voted?.includesDiaspora)
  if (served) return { value: Number(served) / 100, computed: false, diaspora }
  if (registered && voted && Number(registered.value) > 0) return { value: Number(voted.value) / Number(registered.value), computed: true, diaspora }
  return null
}

async function readDays(events: readonly ElectionEvent[], signal: AbortSignal): Promise<readonly DaySummary[]> {
  const asks: { alias: string; event: ElectionEvent; occurrence: Occurrence; office: string; contest: boolean }[] = []
  for (const event of events) {
    for (const occurrence of event.occurrences) {
      const offices = new Set(occurrence.offices.map((row) => row.office))
      for (const spec of DAY_OFFICES[event.family] ?? []) {
        // A local runoff or repeat day has a handful of UAT contests and no national aggregate: not a summary.
        if (!offices.has(spec.office) || (event.family === 'local' && occurrence.kind !== 'general')) continue
        asks.push({ alias: `d${asks.length}`, event, occurrence, office: spec.office, contest: spec.contest })
      }
    }
  }
  const fields = `tallies { measure allocationPhase value status issues competitor { kind actorKey label } share { percent } } turnout { measure value includesDiaspora } participation { percent }`
  const query = `query PagesDays {\n${asks
    .map((ask) => {
      const contest = ask.contest ? `, contestKey: ${JSON.stringify(`${ask.occurrence.occurrenceKey}:${ask.office}:national`)}` : ''
      return `  ${ask.alias}: electionResult(occurrenceKey: ${JSON.stringify(ask.occurrence.occurrenceKey)}, office: ${JSON.stringify(ask.office)}, scopeKey: "national"${contest}) { ${fields} }`
    })
    .join('\n')}\n}`
  const data = await graphqlQuery<Record<string, RawResult>>(query, {}, { operationName: 'PagesDays', signal, auth: 'none' })
  return asks.flatMap((ask) => {
    const result = data[ask.alias]
    if (!result) return []
    const votes = result.tallies
      .filter((tally) => tally.measure === 'votes' && tally.allocationPhase === 'none')
      .slice().sort((a, b) => Number(b.value) - Number(a.value))
      .map((tally) => ({
        line: lineOfCompetitor(tally.competitor),
        // Ballot names for the president only (owner, 2026-11-28); elsewhere an independent reads „independent".
        label: tally.competitor.kind === 'independent' && ask.office !== 'president' ? 'independent' : tally.competitor.label,
        kind: tally.competitor.kind,
        percent: tally.share?.percent ? Number(tally.share.percent) : null,
        suspect: tally.status === 'SUSPECT',
      }))
    return [
      {
        occurrenceKey: ask.occurrence.occurrenceKey,
        eventKey: ask.event.eventKey,
        family: ask.event.family,
        year: ask.event.year,
        ballotDate: ask.occurrence.ballotDate,
        round: ask.occurrence.round,
        status: ask.occurrence.status,
        office: ask.office,
        turnout: turnoutOf(result),
        votes,
        seats: foldLines(result.tallies, 'mandates', 'final'),
      },
    ]
  })
}

export function useBallotDays() {
  const events = useElectionEvents()
  const days = useQuery({
    queryKey: ['prototype', 'elections-pages', 'days', events.data?.map((event) => event.eventKey).join(',')],
    queryFn: ({ signal }) => readDays(events.data ?? [], signal),
    enabled: Boolean(events.data),
    staleTime: 10 * 60 * 1000,
  })
  return { events, days }
}

// ───────────────────────────────────────────────────────────── a ballot day by county ──

export type CountyVotes = { readonly code: string; readonly votes: readonly Vote[]; readonly turnout: number | null }

/**
 * A ballot day with one national contest (the president, the European list) by county: one request, 41 counties
 * and București; the diaspora is its own scope, not a county. The president's ballot names as served (owner,
 * 2026-11-28); on a list, the list's label.
 */
export function useContestByCounty(occurrenceKey: string | null, office: 'president' | 'european_parliament') {
  return useQuery({
    queryKey: ['prototype', 'elections-pages', 'contest-counties', occurrenceKey, office],
    enabled: occurrenceKey !== null,
    staleTime: 10 * 60 * 1000,
    queryFn: async ({ signal }): Promise<readonly CountyVotes[]> => {
      const data = await graphqlQuery<{ electionResultScopes: { items: { place: { countyCode: string | null }; tallies: RawTally[]; turnout: RawTurnout[]; participation: { percent: string | null } | null }[] } }>(
        `query PagesContestCounties($o: ID!, $f: String!, $c: ID!) { electionResultScopes(occurrenceKey: $o, office: $f, scopeType: county, contestKey: $c, page: 1, pageSize: 100) {
          items { place { countyCode } tallies { measure allocationPhase value status issues competitor { kind actorKey label } share { percent } } turnout { measure value includesDiaspora } participation { percent } } } }`,
        { o: occurrenceKey, f: office, c: `${occurrenceKey}:${office}:national` },
        { operationName: 'PagesContestCounties', signal, auth: 'none' },
      )
      return data.electionResultScopes.items.flatMap((item) => {
        if (!item.place.countyCode) return []
        const result = { tallies: item.tallies, turnout: item.turnout, participation: item.participation }
        const votes = item.tallies
          .filter((tally) => tally.measure === 'votes')
          .slice()
          .sort((a, b) => Number(b.value) - Number(a.value))
          .map((tally) => ({ line: lineOfCompetitor(tally.competitor), label: tally.competitor.label, kind: tally.competitor.kind, percent: tally.share?.percent ? Number(tally.share.percent) : null, suspect: tally.status === 'SUSPECT' }))
        return [{ code: item.place.countyCode, votes, turnout: turnoutOf(result)?.value ?? null }]
      })
    },
  })
}

// ───────────────────────────────────────────────────────────── local mandates ──

export const LOCAL_2024 = 'ro:local:2024:2024-06-09'

export type CountyMandates = { readonly code: string; readonly mayors: readonly LineCount[] | null; readonly councillors: readonly LineCount[] | null }
export type LocalMandates = {
  readonly mayors: readonly LineCount[] | null
  readonly councillors: readonly LineCount[] | null
  readonly countyCouncil: { readonly first: readonly LineCount[] | null; readonly second: readonly LineCount[] | null }
  readonly counties: readonly CountyMandates[]
  /** Counties the national figures leave out (`MISSING_SCOPE:county:XX`). */
  readonly missing: readonly string[]
  readonly suspect: boolean
}

function missingCounties(results: readonly RawResult[]): readonly string[] {
  const codes = new Set<string>()
  for (const result of results)
    for (const tally of result?.tallies ?? [])
      for (const issue of tally.issues) {
        const match = /^MISSING_SCOPE:county:([A-Z]{1,2})$/.exec(issue)
        if (match?.[1]) codes.add(match[1])
      }
  return [...codes].slice().sort()
}

async function readLocalMandates(signal: AbortSignal): Promise<LocalMandates> {
  const figures = `tallies { ${TALLY} }`
  const scopes = (office: string) =>
    `electionResultScopes(occurrenceKey: $o, office: "${office}", scopeType: county, page: 1, pageSize: 100) { total hasMore items { place { countyCode name } tallies { ${TALLY} } } }`
  const data = await graphqlQuery<{ mayor: RawResult; council: RawResult; county: RawResult; mayorCounties: RawScopes; councilCounties: RawScopes }>(
    `query PagesMandates($o: ID!) {
      mayor: electionResult(occurrenceKey: $o, office: "mayor", scopeKey: "national") { ${figures} }
      council: electionResult(occurrenceKey: $o, office: "local_council", scopeKey: "national") { ${figures} }
      county: electionResult(occurrenceKey: $o, office: "county_council", scopeKey: "national") { ${figures} }
      mayorCounties: ${scopes('mayor')}
      councilCounties: ${scopes('local_council')}
    }`,
    { o: LOCAL_2024 },
    { operationName: 'PagesMandates', signal, auth: 'none' },
  )
  const councilsByCounty = new Map(data.councilCounties.items.map((item) => [item.place.countyCode ?? '', item.tallies]))
  const counties = data.mayorCounties.items.flatMap((item) =>
    item.place.countyCode ? [{ code: item.place.countyCode, mayors: foldLines(item.tallies, 'mandates', 'final'), councillors: foldLines(councilsByCounty.get(item.place.countyCode) ?? [], 'mandates', 'final') }] : [],
  )
  const mayors = data.mayor ? foldLines(data.mayor.tallies, 'mandates', 'final') : null
  return {
    mayors,
    councillors: data.council ? foldLines(data.council.tallies, 'mandates', 'final') : null,
    countyCouncil: { first: data.county ? foldLines(data.county.tallies, 'mandates', 'man_1') : null, second: data.county ? foldLines(data.county.tallies, 'mandates', 'man_2') : null },
    counties,
    missing: missingCounties([data.mayor, data.council]),
    suspect: (mayors ?? []).some((row) => row.suspect),
  }
}

export function useLocalMandates() {
  return useQuery({ queryKey: ['prototype', 'elections-pages', 'mandates', LOCAL_2024], queryFn: ({ signal }) => readLocalMandates(signal), staleTime: 10 * 60 * 1000 })
}

/** One county's council, read from its own contest (the county aggregate answers nothing for this office). */
export function useCountyCouncil(code: string | null) {
  return useQuery({
    queryKey: ['prototype', 'elections-pages', 'county-council', code],
    enabled: code !== null && code !== 'B',
    staleTime: 10 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const data = await graphqlQuery<{ electionResult: RawResult }>(
        `query PagesCountyCouncil($o: ID!, $s: ID!, $c: ID!) { electionResult(occurrenceKey: $o, office: "county_council", scopeKey: $s, contestKey: $c) { tallies { ${TALLY} } } }`,
        { o: LOCAL_2024, s: `county:${code}`, c: `${LOCAL_2024}:county_council:county:${code}` },
        { operationName: 'PagesCountyCouncil', signal, auth: 'none' },
      )
      const tallies = data.electionResult?.tallies ?? []
      return { first: foldLines(tallies, 'mandates', 'man_1'), second: foldLines(tallies, 'mandates', 'man_2') }
    },
  })
}
