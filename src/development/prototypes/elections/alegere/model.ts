import fixture from './event.fixture.json'
import {
  contestKeyOf as sharedContestKeyOf,
  FAMILIES,
  SCOPE_TYPES,
  missingFromData,
  roundsOf,
  rowsByOffice,
  type Edition,
  type ElectionEvent,
  type Family,
  type ScopeType,
} from '../shared/model'
import type { CalendarElection } from '../shared/calendar'

/**
 * The election page's model (design note §12): one platform event, its
 * editions kept apart, and what each reports — offices, levels, rounds,
 * reporting places. Every function is pure and nothing here adds a figure
 * across editions of one event (§12.3, rule 1).
 */

/** The page's own search keys, in Romanian (Guidelines G7). */
export const SEARCH_KEYS = ['alegere', 'editie', 'functie', 'arie', 'tur', 'pagina', 'loc'] as const
export type SearchKey = (typeof SEARCH_KEYS)[number]

export const DEFAULT_EVENT_KEY = 'ro:local:2024'

export interface EditionPlaces {
  readonly rows: number
  /** Rows whose source label is null: the key is all the source says. */
  readonly nullLabels: number
  readonly siruta: {
    readonly distinct: number
    /** How many of the distinct codes today's INS UAT list names (matched on the code, never on a name). */
    readonly named: number
    /** [county mnemonic | null, county name | null, reporting places, rows], most places first; null is a code the INS list does not know. */
    readonly byCounty: readonly (readonly [string | null, string | null, number, number])[]
  }
  /** Distinct source scope keys at each level that is not a locality. */
  readonly distinct: Readonly<Record<string, number>>
}

interface EventFixture {
  readonly readAt: string
  readonly editions: Readonly<Record<string, EditionPlaces>>
}

const places = fixture as unknown as EventFixture

export const PLACES_READ_AT = places.readAt

/** Where an edition's rows were reported, from the generated fixture; null for an edition it does not know. */
export function editionPlaces(editionKey: string): EditionPlaces | null {
  return places.editions[editionKey] ?? null
}

/** The publisher the key's prefix suggests — not a served field (ask 1): shown as a hint, never as the authority. */
export type PublisherHint = 'BEC' | 'AEP' | 'ROAEP'

export function publisherHint(editionKey: string): PublisherHint | null {
  if (editionKey.startsWith('bec-')) return 'BEC'
  if (editionKey.startsWith('aep-') || editionKey.startsWith('alegeri-pentru-')) return 'AEP'
  if (editionKey.startsWith('roaep-')) return 'ROAEP'
  return null
}

/** The distinct publishers an event's editions suggest, in the editions' order. */
export function publishersOf(event: ElectionEvent): readonly PublisherHint[] {
  return [...new Set(event.editions.map((edition) => publisherHint(edition.key)).filter((hint): hint is PublisherHint => hint !== null))]
}

export function findEvent(events: readonly ElectionEvent[], key: string): ElectionEvent | null {
  return events.find((event) => event.key === key) ?? null
}

/** The edition the address names when it belongs to the event, else the event's largest (the model's first). */
export function pickEdition(event: ElectionEvent, editionKey: string | undefined): Edition {
  const named = editionKey ? event.editions.find((edition) => edition.key === editionKey) : undefined
  const first = event.editions[0]
  if (!first) throw new Error(`event ${event.key} has no editions`)
  return named ?? first
}

/** The letter a page uses for an edition („A", „B"…): the edition's place in the event, not a fact about it. */
export function editionMark(event: ElectionEvent, edition: Edition): string {
  return String.fromCharCode(
    65 +
      Math.max(
        0,
        event.editions.findIndex((member) => member.key === edition.key),
      ),
  )
}

export interface EditionSummary {
  readonly edition: Edition
  readonly mark: string
  readonly publisher: PublisherHint | null
  /** The edition's family label disagrees with the event's (the European editions stored as parliamentary…). */
  readonly familyConflict: boolean
  readonly offices: readonly (readonly [string, number])[]
  readonly scopes: readonly ScopeType[]
  readonly rounds: readonly (string | null)[]
  readonly places: EditionPlaces | null
}

export function summarize(event: ElectionEvent, edition: Edition): EditionSummary {
  const present = new Set(edition.counts.map(([, scope]) => scope))
  return {
    edition,
    mark: editionMark(event, edition),
    publisher: publisherHint(edition.key),
    familyConflict: event.family !== null && edition.family !== event.family,
    offices: rowsByOffice(edition),
    scopes: SCOPE_TYPES.filter((scope) => present.has(scope)),
    rounds: roundsOf(edition),
    places: editionPlaces(edition.key),
  }
}

export function summaries(event: ElectionEvent): readonly EditionSummary[] {
  return event.editions.map((edition) => summarize(event, edition))
}

/** The distinct office labels the event's editions report — a union of labels, never a count of races. */
export function officeUnion(event: ElectionEvent): readonly string[] {
  const best = new Map<string, number>()
  for (const edition of event.editions) for (const [office, rows] of rowsByOffice(edition)) best.set(office, Math.max(best.get(office) ?? 0, rows))
  return [...best.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([office]) => office)
}

export function scopeUnion(event: ElectionEvent): readonly ScopeType[] {
  const present = new Set(event.editions.flatMap((edition) => edition.counts.map(([, scope]) => scope)))
  return SCOPE_TYPES.filter((scope) => present.has(scope))
}

export interface MatrixCell {
  readonly rows: number
  /** Rows by reported round, in the rounds' order; one entry for a null round. */
  readonly rounds: readonly (readonly [string | null, number])[]
}

/** One edition's rows by office × level: a cell is that edition's alone. */
export function editionMatrix(edition: Edition): ReadonlyMap<string, MatrixCell> {
  const cells = new Map<string, { rows: number; rounds: Map<string | null, number> }>()
  for (const [office, scope, round, n] of edition.counts) {
    const key = `${office}|${scope}`
    const cell = cells.get(key) ?? { rows: 0, rounds: new Map<string | null, number>() }
    cell.rows += n
    cell.rounds.set(round, (cell.rounds.get(round) ?? 0) + n)
    cells.set(key, cell)
  }
  return new Map([...cells.entries()].map(([key, cell]) => [key, { rows: cell.rows, rounds: [...cell.rounds.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))) }]))
}

export const cellKey = (office: string, scope: ScopeType) => `${office}|${scope}`

/** The events of one family, oldest first, with the page's own marked; the family's calendar gaps beside them. */
export interface FamilyRun {
  readonly family: Family | null
  readonly events: readonly ElectionEvent[]
  readonly previous: ElectionEvent | null
  readonly next: ElectionEvent | null
  /** The calendar's elections of the family the data lacks; `loaded` > 0 when the year is partly in the data (one of 2007's two referendums). */
  readonly missing: readonly (CalendarElection & { readonly loaded: number })[]
}

export function familyRun(events: readonly ElectionEvent[], event: ElectionEvent): FamilyRun {
  const members = events.filter((member) => member.family === event.family).sort((a, b) => a.year - b.year || a.key.localeCompare(b.key))
  const index = members.findIndex((member) => member.key === event.key)
  return {
    family: event.family,
    events: members,
    previous: index > 0 ? (members[index - 1] ?? null) : null,
    next: index >= 0 && index < members.length - 1 ? (members[index + 1] ?? null) : null,
    missing: missingFromData(events).filter((entry) => entry.family === event.family),
  }
}

export const isFamily = (value: string | null): value is Family => value !== null && (FAMILIES as readonly string[]).includes(value)

/**
 * A contest's key from its parts, as the API composes it (checked on all
 * 105,340 rows read on 2026-10-14): the shared rule — the office with `-` for
 * `_`, the level, and the source's scope key lower-cased with `:` as `-`.
 * Used only to link a place's rows to their contests; a key the API does not
 * have opens the contest page's „not found".
 */
export function contestKeyOf(editionKey: string, office: string, scope: ScopeType, sourceScopeKey: string): string {
  return sharedContestKeyOf(editionKey, office, scope, sourceScopeKey)
}

/**
 * What the data audit knows about an event that the API does not say
 * (§12.2, §12.3 rule 4). Hand-kept; each id is worded once, in the parts.
 */
export type AuditNote = 'e1-2016-data' | 'candidate-list-only' | 'bucharest-general-mayor-only'

const AUDIT_NOTES: Readonly<Record<string, readonly AuditNote[]>> = {
  'ro:local:2014': ['e1-2016-data'],
  'ro:parliamentary:2024': ['candidate-list-only'],
  'ro:local:1998:partial': ['bucharest-general-mayor-only'],
}

export function auditNotesOf(eventKey: string): readonly AuditNote[] {
  return AUDIT_NOTES[eventKey] ?? []
}

/** The address's value as text, or none: the router parses `?tur=1` into a number. */
export function textParam(value: unknown): string | undefined {
  if (typeof value === 'string') return value.length > 0 ? value : undefined
  if (typeof value === 'number') return String(value)
  return undefined
}

export function pageParam(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 1
  return Number.isInteger(n) && n >= 1 ? n : 1
}
