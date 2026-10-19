import type { CalendarElection } from '../shared/calendar'
import {
  contestKeyOf as sharedContestKeyOf,
  countElections,
  electionKeyOf,
  FAMILIES,
  isDisputedEvent,
  missingFromData,
  perElection,
  type Edition,
  type ElectionEvent,
  type HubData,
  type ScopeType,
} from '../shared/model'
import type { Place, PlaceIndex } from '../shared/places'
import names from './names.fixture.json'

/**
 * One place (a SIRUTA code) as the sources report it: its rows from the
 * shared place index, grouped into the platform's events, the offices told
 * apart by what they are to the place, and the catalog's events that have no
 * row here. Pure functions; nothing adds a figure across editions.
 */

// ───────────────────────────────────────────── the name map (SSR) ──

export type KindLetter = 'R' | 'M' | 'O' | 'C' | 'S' | '?'

export interface NamedPlace {
  readonly siruta: string
  /** The INS name, or the source's own label when today's INS list lacks the code. */
  readonly name: string
  readonly kind: KindLetter
  readonly countyCode: string | null
  readonly county: string | null
  /** Elections with at least one row here (counted by the generator; the „2014" local event counts with 2016, E1). */
  readonly events: number
  readonly inInsList: boolean
}

interface NamesFixture {
  readonly readAt: string
  readonly counties: Readonly<Record<string, string>>
  readonly places: Readonly<Record<string, readonly [string, string, string, number]>>
}

const NAMES = names as unknown as NamesFixture

const isKind = (value: string): value is KindLetter => ['R', 'M', 'O', 'C', 'S', '?'].includes(value)

function toNamed(siruta: string, entry: readonly [string, string, string, number]): NamedPlace {
  const [name, kind, countyCode, events] = entry
  return {
    siruta,
    name,
    kind: isKind(kind) ? kind : '?',
    countyCode: countyCode || null,
    county: countyCode ? (NAMES.counties[countyCode] ?? null) : null,
    events,
    inInsList: kind !== '?',
  }
}

/** The place's name, kind and county without the row index: what the server can render. */
export function namedPlace(siruta: string): NamedPlace | null {
  const entry = NAMES.places[siruta]
  return entry ? toNamed(siruta, entry) : null
}

const KIND_RANK: Readonly<Record<KindLetter, number>> = { R: 0, S: 0, M: 1, O: 2, C: 3, '?': 4 }

/** The other places of one INS county, the largest kinds first, then by name. */
export function countyPlaces(countyCode: string): readonly NamedPlace[] {
  return Object.entries(NAMES.places)
    .filter(([, entry]) => entry[2] === countyCode)
    .map(([siruta, entry]) => toNamed(siruta, entry))
    .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.name.localeCompare(b.name, 'ro'))
}

// ──────────────────────────────────────────────────── the offices ──

/**
 * What a reported office is to the place: the place's own race (`own`), a
 * wider race the source reported here (`wider`: a county president or a
 * parliamentary seat reported per locality is never the locality's race), or
 * a source table's shape that names no office (`source`).
 */
export type OfficeRole = 'own' | 'wider' | 'source'

const OWN: ReadonlySet<string> = new Set(['mayor', 'local_council', 'general_mayor', 'bucharest_general_mayor'])
const WIDER: ReadonlySet<string> = new Set([
  'county_president',
  'county_council',
  'consiliu-judetean',
  'county_council_or_cgmb',
  'county_president_or_primar_general',
  'bucharest_general_council',
  'consiliu-general',
  'chamber_deputies',
  'senate',
  'president',
  'european_parliament',
  'referendum',
])

export function officeRole(office: string): OfficeRole {
  if (OWN.has(office)) return 'own'
  if (WIDER.has(office)) return 'wider'
  return 'source'
}

export const OFFICE_ROLES: readonly OfficeRole[] = ['own', 'wider', 'source']

/** `contest:<edition>:<office with _ as ->:siruta:<siruta>` — the shared rule the generator verified on every row. */
export function contestKeyOf(editionKey: string, office: string, siruta: string): string {
  return sharedContestKeyOf(editionKey, office, 'siruta', siruta)
}

// ────────────────────────────────────────────────────── the sheet ──

export interface PlaceRow {
  readonly edition: Edition
  readonly office: string
  readonly round: string | null
  readonly contestKey: string
}

export interface PlaceEdition {
  readonly edition: Edition
  readonly rows: readonly PlaceRow[]
}

/** One platform event at this place, with only the editions that report here, side by side. */
export interface PlaceEvent {
  readonly event: ElectionEvent
  readonly editions: readonly PlaceEdition[]
  readonly rows: readonly PlaceRow[]
}

export interface PlaceOffice {
  readonly office: string
  readonly role: OfficeRole
  readonly rows: number
}

/** A catalog event with no row at this place, and why that can be. */
export interface AbsentEvent {
  readonly event: ElectionEvent
  /** `elsewhere`: its editions report per locality, just not this code; `wider`: no edition reports per locality at all. */
  readonly reason: 'elsewhere' | 'wider'
  /** The scope types its editions report, narrowest first. */
  readonly scopes: readonly ScopeType[]
}

export interface PlaceSheet {
  readonly siruta: string
  readonly place: Place
  readonly rows: readonly PlaceRow[]
  /** Newest first. */
  readonly events: readonly PlaceEvent[]
  /** Chronological: the matrix's columns. */
  readonly columns: readonly PlaceEvent[]
  readonly editions: number
  /** Elections reported here: the „2014" local event counts with 2016 (E1). */
  readonly elections: number
  /** Elections reported here by more than one edition. */
  readonly multiEdition: number
  /** Rows here on each election's edition with the most rows here — never the sum of its editions. */
  readonly referenceRows: number
  /** Elections in the whole catalog (E1 folded), for „N of M". */
  readonly catalogElections: number
  readonly offices: readonly PlaceOffice[]
  /** Catalog events with no row here; an event whose election is reported here under its other key (E1) is not absent. */
  readonly absent: readonly AbsentEvent[]
  readonly calendarMissing: readonly (CalendarElection & { readonly loaded: number })[]
  readonly firstYear: number
  readonly lastYear: number
}

const familyOrder = (event: ElectionEvent) => (event.family === null ? FAMILIES.length : FAMILIES.indexOf(event.family))
const ROLE_ORDER: Readonly<Record<OfficeRole, number>> = { own: 0, wider: 1, source: 2 }
const SCOPE_ORDER: readonly ScopeType[] = ['siruta', 'source_constituency', 'county', 'diaspora', 'national', 'chamber']

export function placeSheet(index: PlaceIndex, hub: HubData, siruta: string): PlaceSheet | null {
  const place = index.places.get(siruta)
  if (!place) return null
  const editionByKey = new Map(hub.editions.map((edition) => [edition.key, edition]))
  const eventOfEdition = new Map<string, ElectionEvent>()
  for (const event of hub.events) for (const edition of event.editions) eventOfEdition.set(edition.key, event)

  const rows: PlaceRow[] = []
  for (const [editionIndex, officeIndex, roundIndex] of place.rows) {
    const key = index.editions[editionIndex]
    const office = index.offices[officeIndex]
    const edition = key ? editionByKey.get(key) : undefined
    if (!edition || office === undefined) continue
    rows.push({ edition, office, round: index.rounds[roundIndex] ?? null, contestKey: contestKeyOf(edition.key, office, siruta) })
  }

  const byEvent = new Map<string, PlaceRow[]>()
  for (const row of rows) {
    const event = eventOfEdition.get(row.edition.key)
    if (!event) continue
    byEvent.set(event.key, [...(byEvent.get(event.key) ?? []), row])
  }
  const events: PlaceEvent[] = hub.events
    .filter((event) => byEvent.has(event.key))
    .map((event) => {
      const eventRows = byEvent.get(event.key) ?? []
      return {
        event,
        rows: eventRows,
        editions: event.editions
          .filter((edition) => eventRows.some((row) => row.edition.key === edition.key))
          .map((edition) => ({
            edition,
            rows: eventRows.filter((row) => row.edition.key === edition.key),
          })),
      }
    })
  const columns = [...events].sort((a, b) => a.event.year - b.event.year || familyOrder(a.event) - familyOrder(b.event))

  const officeRows = new Map<string, number>()
  for (const row of rows) officeRows.set(row.office, (officeRows.get(row.office) ?? 0) + 1)
  const offices = [...officeRows.entries()]
    .map(([office, count]) => ({ office, role: officeRole(office), rows: count }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || b.rows - a.rows || a.office.localeCompare(b.office))

  const presentElections = new Set(events.map((entry) => electionKeyOf(entry.event.key)))
  const absent: AbsentEvent[] = hub.events
    .filter((event) => !byEvent.has(event.key) && !presentElections.has(electionKeyOf(event.key)))
    .map((event) => {
      const scopes = new Set<ScopeType>()
      for (const edition of event.editions) for (const [, scope] of edition.counts) scopes.add(scope)
      return { event, reason: scopes.has('siruta') ? ('elsewhere' as const) : ('wider' as const), scopes: SCOPE_ORDER.filter((scope) => scopes.has(scope)) }
    })

  const years = events.map((entry) => entry.event.year)
  const editionsPerElection = new Map<string, number>()
  for (const entry of events) editionsPerElection.set(electionKeyOf(entry.event.key), (editionsPerElection.get(electionKeyOf(entry.event.key)) ?? 0) + entry.editions.length)
  return {
    siruta,
    place,
    rows,
    events,
    columns,
    editions: new Set(rows.map((row) => row.edition.key)).size,
    elections: countElections(events.map((entry) => entry.event)),
    multiEdition: [...editionsPerElection.values()].filter((n) => n > 1).length,
    referenceRows: perElection(events.flatMap((entry) => entry.editions.map((edition) => ({ eventKey: entry.event.key, value: edition.rows.length })))),
    catalogElections: countElections(hub.events),
    offices,
    absent,
    calendarMissing: missingFromData(hub.events),
    firstYear: years.length > 0 ? Math.min(...years) : 0,
    lastYear: years.length > 0 ? Math.max(...years) : 0,
  }
}

/** Distinct SIRUTA codes with a row in any edition of each event — „localități raportate", never races. */
const placesPerEventCache = new WeakMap<PlaceIndex, ReadonlyMap<string, number>>()
export function placesPerEvent(index: PlaceIndex, hub: HubData): ReadonlyMap<string, number> {
  const cached = placesPerEventCache.get(index)
  if (cached) return cached
  const eventOfEditionIndex = new Map<number, string>()
  for (const event of hub.events) for (const edition of event.editions) eventOfEditionIndex.set(index.editions.indexOf(edition.key), event.key)
  const out = new Map<string, number>()
  for (const place of index.places.values()) {
    const seen = new Set<string>()
    for (const [editionIndex] of place.rows) {
      const key = eventOfEditionIndex.get(editionIndex)
      if (key) seen.add(key)
    }
    for (const key of seen) out.set(key, (out.get(key) ?? 0) + 1)
  }
  placesPerEventCache.set(index, out)
  return out
}

/** The ro:local:2014 editions hold 2016 data (E1): the year is shown as the source's label, marked. */
export function isDisputedYear(event: Pick<ElectionEvent, 'key'>): boolean {
  return isDisputedEvent(event)
}

/** A sector of Bucharest: the E2 note (the general mayor filed under a sector) applies. */
export function isSector(named: Pick<NamedPlace, 'kind'>): boolean {
  return named.kind === 'S'
}
