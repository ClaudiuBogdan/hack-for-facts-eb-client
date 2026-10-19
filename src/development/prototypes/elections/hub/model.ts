import catalog from '../shared/catalog.fixture.json'
import { CALENDAR_FIRST_YEAR, CALENDAR_LAST_YEAR, ELECTION_CALENDAR, type CalendarElection } from '../shared/calendar'
import {
  FAMILIES,
  SCOPE_TYPES,
  hubData,
  outsideCalendar,
  rowsByScope,
  timeline,
  type Edition,
  type ElectionEvent,
  type Family,
  type HubData,
  type ScopeType,
  type TimelineCell,
} from '../shared/model'
import { officeLabel } from '../shared/labels'
import coverage from './places.coverage.json'

/**
 * The front door's own model over the shared layer: what its four variants
 * compute and nothing else. Every function is pure and counts in the unit it
 * names — editions as editions, events as events, rows as rows — and nothing
 * here adds a figure across the editions of one event (§12.3).
 */

export const DATA: HubData = hubData()

/** Whether the API serves results; a constant of this release (§12.1), read from the fixture rather than assumed. */
export const RESULTS_SERVED = catalog.readiness.edition.results === 'VERIFIED'

export type FamilyChoice = Family | 'toate'
export const FAMILY_CHOICES: readonly FamilyChoice[] = ['toate', ...FAMILIES]

export function eventsOfFamily(events: readonly ElectionEvent[], family: FamilyChoice): readonly ElectionEvent[] {
  return family === 'toate' ? events : events.filter((event) => event.family === family)
}

/** The newest event of all, for the shortcut that opens an election. */
export function latestEvent(events: readonly ElectionEvent[]): ElectionEvent | undefined {
  return events[0]
}

// ─────────────────────────────────────────────── the timeline ──

export type CellState =
  /** The calendar expects it and the data holds it. */
  | 'data'
  /** The data holds it, our calendar does not list it (the 1998 partial, the „2014" local editions). */
  | 'outside'
  /** The calendar lists more than the data holds (one of 2007's two referendums). */
  | 'partial'
  /** Our calendar lists it; the data does not: not in the data, never „no election". */
  | 'missing'
  | 'none'

export interface TimelineColumn {
  readonly year: number
  readonly cells: readonly (TimelineCell & { readonly state: CellState })[]
}

export function cellState(cell: TimelineCell): CellState {
  if (cell.events.length === 0) return cell.expected > 0 ? 'missing' : 'none'
  if (cell.expected === 0) return 'outside'
  return cell.events.length < cell.expected ? 'partial' : 'data'
}

/** The years with an election in the data or in our calendar, each with one cell per family, oldest first. */
export function timelineColumns(events: readonly ElectionEvent[]): readonly TimelineColumn[] {
  const from = Math.min(CALENDAR_FIRST_YEAR, ...events.map((event) => event.year))
  const to = Math.max(CALENDAR_LAST_YEAR, ...events.map((event) => event.year))
  const cells = timeline(events, from, to)
  const columns: TimelineColumn[] = []
  for (let year = from; year <= to; year++) {
    const ofYear = cells.filter((cell) => cell.year === year).map((cell) => ({ ...cell, state: cellState(cell) }))
    if (ofYear.some((cell) => cell.state !== 'none')) columns.push({ year, cells: ofYear })
  }
  return columns
}

/** The calendar's elections, newest first, each with the events that answer it (none: not in the data). */
export interface CalendarRow extends CalendarElection {
  readonly events: readonly ElectionEvent[]
}

export function calendarRows(events: readonly ElectionEvent[]): readonly CalendarRow[] {
  return [...ELECTION_CALENDAR]
    .map((entry) => ({
      ...entry,
      events: events.filter((event) => event.family === entry.family && event.year === entry.year && event.instance === null),
    }))
    .sort((a, b) => b.year - a.year || FAMILIES.indexOf(a.family) - FAMILIES.indexOf(b.family))
}

/** Events the data holds that our calendar does not list, newest first (the shared helper, ordered for a list). */
export function eventsOutsideCalendar(events: readonly ElectionEvent[]): readonly ElectionEvent[] {
  return [...outsideCalendar(events)].sort((a, b) => b.year - a.year)
}

// ──────────────────────────────────────────────── the coverage ──

export interface OfficeMark {
  readonly key: string
  /** The Romanian word, or null for a label that is not an office the table knows (shown verbatim, marked). */
  readonly label: string | null
  readonly rows: number
}

/** An edition's offices, the known ones first by rows, the source's own labels after. */
export function editionOffices(edition: Edition): readonly OfficeMark[] {
  const rows = new Map<string, number>()
  for (const [office, , , n] of edition.counts) rows.set(office, (rows.get(office) ?? 0) + n)
  return [...rows.entries()]
    .map(([key, n]) => ({ key, label: officeLabel(key), rows: n }))
    .sort((a, b) => Number(a.label === null) - Number(b.label === null) || b.rows - a.rows || a.key.localeCompare(b.key))
}

export function editionScopes(edition: Edition): ReadonlySet<ScopeType> {
  return new Set(rowsByScope(edition).keys())
}

/** How many editions of a family report at each level; editions are counted as editions. */
export function scopeMatrix(events: readonly ElectionEvent[]): ReadonlyMap<Family, ReadonlyMap<ScopeType, number>> {
  const out = new Map<Family, Map<ScopeType, number>>()
  for (const family of FAMILIES) {
    const row = new Map<ScopeType, number>()
    for (const event of events.filter((item) => item.family === family)) {
      for (const edition of event.editions) for (const scope of editionScopes(edition)) row.set(scope, (row.get(scope) ?? 0) + 1)
    }
    out.set(family, row)
  }
  return out
}

/** The round labels in use, in the order a reader expects; null (unreported) last. */
export const ROUNDS_IN_USE: readonly (string | null)[] = ['tur1', 'tur2', 'tur3', 'final', '1', null]

export function roundMatrix(events: readonly ElectionEvent[]): ReadonlyMap<Family, ReadonlyMap<string | null, number>> {
  const out = new Map<Family, Map<string | null, number>>()
  for (const family of FAMILIES) {
    const row = new Map<string | null, number>()
    for (const event of events.filter((item) => item.family === family)) {
      for (const edition of event.editions) {
        for (const round of new Set(edition.counts.map(([, , label]) => label))) row.set(round, (row.get(round) ?? 0) + 1)
      }
    }
    out.set(family, row)
  }
  return out
}

/** The scope types a page shows, narrowest first; `chamber` is null on every row and stays out of the tables. */
export const SHOWN_SCOPES: readonly ScopeType[] = SCOPE_TYPES.filter((scope) => scope !== 'chamber')

// ───────────────────────────────────────────────── the places ──

export interface EditionPlaceCoverage {
  readonly key: string
  /** Distinct SIRUTA codes the edition reports. */
  readonly siruta: number
  /** Of them, how many today's INS UAT list names. */
  readonly named: number
}

export interface LargePlace {
  readonly siruta: string
  readonly name: string
  readonly kind: string
  readonly county: string
  readonly population: number
  /** Editions with a row here, counted as editions (never a sum of their rows). */
  readonly editions: number
}

export const PLACE_COVERAGE = {
  readAt: coverage.readAt,
  insUats: coverage.insUats,
  populationYear: coverage.populationYear,
  editions: coverage.editions as readonly EditionPlaceCoverage[],
  largest: coverage.largest as readonly LargePlace[],
}

/** The editions that report at locality level, with their event, most complete first. */
export function placeCoverageRows(data: HubData): readonly (EditionPlaceCoverage & { readonly edition: Edition; readonly event: ElectionEvent | undefined })[] {
  const editions = new Map(data.editions.map((edition) => [edition.key, edition]))
  const events = new Map(data.events.flatMap((event) => event.editions.map((edition) => [edition.key, event] as const)))
  return PLACE_COVERAGE.editions
    .flatMap((row) => {
      const edition = editions.get(row.key)
      return edition ? [{ ...row, edition, event: events.get(row.key) }] : []
    })
    .sort((a, b) => b.named - a.named || (b.event?.year ?? 0) - (a.event?.year ?? 0) || a.key.localeCompare(b.key))
}

// ──────────────────────────────────────────── sample results ──

/**
 * The shapes results will take when the API serves them (the scrapper's
 * planned contract, E17.b/E17.d): a summary apart from a paged competitor
 * list, every count with its evidence status, turnout with its quality
 * status, and list seats as allocations — never people. Placeholder names
 * only; the figures are invented and marked as such wherever they appear.
 */
export type EvidenceStatus = 'unchecked' | 'dq_suspect' | 'validated'

export interface SampleCount {
  readonly value: number
  readonly status: EvidenceStatus
}

export const SAMPLE_SUMMARY = {
  registered: { value: 12_480, status: 'unchecked' },
  present: { value: 6_912, status: 'unchecked' },
  valid: { value: 6_704, status: 'unchecked' },
  invalid: { value: 208, status: 'unchecked' },
  reportedUnits: 14,
  expectedUnits: 14,
} as const satisfies Readonly<Record<string, SampleCount | number>>

export const SAMPLE_COMPETITORS: readonly { readonly key: string; readonly votes: number }[] = [
  { key: 'A', votes: 2_612 },
  { key: 'B', votes: 1_875 },
  { key: 'C', votes: 1_140 },
  { key: 'D', votes: 684 },
  { key: 'E', votes: 393 },
]
export const SAMPLE_COMPETITOR_TOTAL = 12

export const SAMPLE_TURNOUT: readonly { readonly key: string; readonly registered: number; readonly present: number; readonly status: EvidenceStatus }[] = [
  { key: 'A', registered: 12_480, present: 6_912, status: 'unchecked' },
  { key: 'B', registered: 8_215, present: 4_002, status: 'dq_suspect' },
  { key: 'C', registered: 3_960, present: 2_377, status: 'unchecked' },
  { key: 'D', registered: 1_742, present: 1_089, status: 'dq_suspect' },
]

export const SAMPLE_SEATS: readonly { readonly key: string; readonly votes: number; readonly seats: number }[] = [
  { key: 'A', votes: 2_612, seats: 7 },
  { key: 'B', votes: 1_875, seats: 5 },
  { key: 'C', votes: 1_140, seats: 3 },
  { key: 'D', votes: 684, seats: 2 },
]
export const SAMPLE_SEATS_TOTAL = 17
