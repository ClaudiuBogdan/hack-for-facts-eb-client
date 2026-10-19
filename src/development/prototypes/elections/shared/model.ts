import fixture from './catalog.fixture.json'
import { ELECTION_CALENDAR, type CalendarElection } from './calendar'

/**
 * The elections front door's model, over the catalog the live API serves
 * (design note §12): source editions, grouped into the platform's events,
 * with their contest rows counted by office, scope type and round. Every
 * function is pure; nothing here adds a figure across editions of one event,
 * and the „2014" local event (E1) never counts as an election of its own.
 */

export type Family = 'local' | 'parliamentary' | 'presidential' | 'european' | 'referendum'
export const FAMILIES: readonly Family[] = ['local', 'parliamentary', 'presidential', 'european', 'referendum']

export type ScopeType = 'siruta' | 'source_constituency' | 'county' | 'diaspora' | 'national' | 'chamber'
/** The levels a page shows, from the narrowest: a locality, the source's own numbering, a county, abroad, the country. */
export const SCOPE_TYPES: readonly ScopeType[] = ['siruta', 'source_constituency', 'county', 'diaspora', 'national', 'chamber']

/** [reported office, scope type, reported round, rows] */
export type EditionCount = readonly [string, ScopeType, string | null, number]

export interface Edition {
  readonly key: string
  readonly eventKey: string | null
  readonly name: string
  readonly year: number | null
  readonly family: string
  readonly round: string | null
  readonly date: string | null
  readonly authority: string
  readonly contests: number
  readonly counts: readonly EditionCount[]
}

export interface ElectionEvent {
  /** The platform's grouping key, e.g. `ro:local:1998:partial`; unverified. */
  readonly key: string
  readonly family: Family | null
  readonly year: number
  /** `partial` for `ro:local:1998:partial`; null for a general election. */
  readonly instance: string | null
  readonly editions: readonly Edition[]
}

export interface HubData {
  readonly readAt: string
  readonly editions: readonly Edition[]
  readonly events: readonly ElectionEvent[]
  /** Distinct SIRUTA scopes the sources report; how many today's INS UAT list names; the list's size. */
  readonly places: { readonly siruta: number; readonly named: number; readonly insUats: number }
}

const isFamily = (value: string): value is Family => (FAMILIES as readonly string[]).includes(value)

/** `ro:<family>:<year>[:<instance>]`, read for display only; the API serves no event read (ask 2). */
export function parseEventKey(key: string): { readonly family: Family | null; readonly year: number | null; readonly instance: string | null } {
  const [, family = '', year = '', instance = null] = key.split(':')
  const parsedYear = /^\d{4}$/u.test(year) ? Number(year) : null
  return { family: isFamily(family) ? family : null, year: parsedYear, instance }
}

/** Events newest first, then in the families' order; an edition with no event stands as its own. */
export function eventsOf(editions: readonly Edition[]): ElectionEvent[] {
  const groups = new Map<string, Edition[]>()
  for (const edition of editions) {
    const key = edition.eventKey ?? `edition:${edition.key}`
    groups.set(key, [...(groups.get(key) ?? []), edition])
  }
  return [...groups.entries()]
    .map(([key, members]) => {
      const parsed = parseEventKey(key)
      const first = members[0]
      return {
        key,
        family: parsed.family ?? (first && isFamily(first.family) ? first.family : null),
        year: parsed.year ?? first?.year ?? 0,
        instance: parsed.instance,
        editions: [...members].sort((a, b) => b.contests - a.contests || a.key.localeCompare(b.key)),
      }
    })
    .sort((a, b) => b.year - a.year || familyOrder(a.family) - familyOrder(b.family) || a.key.localeCompare(b.key))
}

const familyOrder = (family: Family | null) => (family === null ? FAMILIES.length : FAMILIES.indexOf(family))

export function hubData(): HubData {
  // JSON widens the count tuples to arrays; the generator writes exactly [office, scope, round, rows].
  const editions = fixture.editions as unknown as readonly Edition[]
  return { readAt: fixture.readAt, editions, events: eventsOf(editions), places: fixture.places }
}

/** Editions whose own family label disagrees with their event's (the European ones stored as parliamentary…). */
export function familyConflicts(event: ElectionEvent): readonly Edition[] {
  return event.editions.filter((edition) => event.family !== null && edition.family !== event.family)
}

export function rowsByScope(edition: Edition): ReadonlyMap<ScopeType, number> {
  const out = new Map<ScopeType, number>()
  for (const [, scope, , n] of edition.counts) out.set(scope, (out.get(scope) ?? 0) + n)
  return out
}

export function rowsByOffice(edition: Edition): readonly (readonly [string, number])[] {
  const out = new Map<string, number>()
  for (const [office, , , n] of edition.counts) out.set(office, (out.get(office) ?? 0) + n)
  return [...out.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export function roundsOf(edition: Edition): readonly (string | null)[] {
  return [...new Set(edition.counts.map(([, , round]) => round))].sort((a, b) => String(a).localeCompare(String(b)))
}

export function officesOf(event: ElectionEvent): ReadonlySet<string> {
  return new Set(event.editions.flatMap((edition) => edition.counts.map(([office]) => office)))
}

/** The events whose key says the same family and year as a calendar entry. */
export interface TimelineCell {
  readonly family: Family
  readonly year: number
  readonly events: readonly ElectionEvent[]
  /** How many elections of this family the calendar holds that year (0 when none). */
  readonly expected: number
  readonly calendar: readonly CalendarElection[]
}

export function timeline(events: readonly ElectionEvent[], from: number, to: number): readonly TimelineCell[] {
  const cells: TimelineCell[] = []
  for (const family of FAMILIES) {
    for (let year = from; year <= to; year++) {
      const calendar = ELECTION_CALENDAR.filter((entry) => entry.family === family && entry.year === year)
      cells.push({
        family,
        year,
        events: events.filter((event) => event.family === family && event.year === year),
        expected: calendar.reduce((sum, entry) => sum + (entry.count ?? 1), 0),
        calendar,
      })
    }
  }
  return cells
}

/** Calendar elections no event in the data answers: an absent edition is "not in the data", never "no election". */
export function missingFromData(events: readonly ElectionEvent[]): readonly (CalendarElection & { readonly loaded: number })[] {
  return ELECTION_CALENDAR.flatMap((entry) => {
    const loaded = events.filter((event) => event.family === entry.family && event.year === entry.year && event.instance === null).length
    const expected = entry.count ?? 1
    return loaded >= expected ? [] : [{ ...entry, loaded }]
  }).sort((a, b) => b.year - a.year || familyOrder(a.family) - familyOrder(b.family))
}

/** Events the data holds that no calendar entry explains (the 1998 partial, the "2014" local editions — E1). */
export function outsideCalendar(events: readonly ElectionEvent[]): readonly ElectionEvent[] {
  return events.filter((event) => event.instance !== null || !ELECTION_CALENDAR.some((entry) => entry.family === event.family && entry.year === event.year))
}

// ───────────────────────────────────────── E1: one election, two events ──

/**
 * Events whose editions hold another election's data, and that election's
 * event (E1: the „2014" local editions are the 2016 local elections, after
 * the data audit; the API is silent, §12.3 rule 4). The event keeps its
 * reported label on every page; a count of elections never counts it as a
 * second one beside the election it holds.
 */
const SAME_ELECTION_AS: ReadonlyMap<string, string> = new Map([['ro:local:2014', 'ro:local:2016']])

/** Whether the event's year is disputed: its editions hold another election's data (E1). */
export function isDisputedEvent(event: Pick<ElectionEvent, 'key'>): boolean {
  return SAME_ELECTION_AS.has(event.key)
}

/** The election an event describes: its own key, or, for E1, the key of the election whose data it holds. */
export function electionKeyOf(eventKey: string): string {
  return SAME_ELECTION_AS.get(eventKey) ?? eventKey
}

/** The disputed events of a set whose election is in the set too: they are that election, not one more (E1). */
export function foldedEvents(eventKeys: Iterable<string>): ReadonlySet<string> {
  const keys = new Set(eventKeys)
  return new Set([...keys].filter((key) => keys.has(electionKeyOf(key)) && electionKeyOf(key) !== key))
}

/** How many elections a set of events describes: an E1 event and the election it holds count once. */
export function countElections(events: readonly Pick<ElectionEvent, 'key'>[]): number {
  return new Set(events.map((event) => electionKeyOf(event.key))).size
}

/**
 * A figure counted once per election, never added across its editions
 * (§12.3 rule 1): each event's largest value (its reference edition's), and
 * an E1 event's only when the election it holds is not in the set.
 */
export function perElection(values: readonly { readonly eventKey: string; readonly value: number }[]): number {
  const best = new Map<string, number>()
  for (const { eventKey, value } of values) best.set(eventKey, Math.max(best.get(eventKey) ?? 0, value))
  const folded = foldedEvents(best.keys())
  let sum = 0
  for (const [eventKey, value] of best) if (!folded.has(eventKey)) sum += value
  return sum
}

/** `contest:<edition>:<office, _ as ->:<scope type>:<scope key lower-cased, ':' as '-'>` — how the API composes every key (checked by the catalog generator on all 105,340 rows). */
export function contestKeyOf(editionKey: string, office: string, scopeType: ScopeType, scopeKey: string): string {
  return `contest:${editionKey}:${office.replace(/_/gu, '-')}:${scopeType}:${scopeKey.toLowerCase().replace(/:/gu, '-')}`
}

export interface CatalogFacts {
  /** Elections, not events: an E1 event counts with the election it holds. */
  readonly events: number
  readonly editions: number
  /** Rows on each election's reference edition (its largest), never the sum of its editions. */
  readonly rows: number
  readonly firstYear: number
  readonly lastYear: number
  /** Elections described by more than one edition (an E1 event's editions count with the election they hold). */
  readonly multiEdition: number
  /** Events counted with another election (E1). */
  readonly folded: number
}

export function catalogFacts(data: HubData): CatalogFacts {
  const years = data.events.map((event) => event.year)
  const folded = foldedEvents(data.events.map((event) => event.key))
  const editionsPerElection = new Map<string, number>()
  for (const event of data.events) editionsPerElection.set(electionKeyOf(event.key), (editionsPerElection.get(electionKeyOf(event.key)) ?? 0) + event.editions.length)
  return {
    events: countElections(data.events),
    editions: data.editions.length,
    rows: perElection(data.events.flatMap((event) => event.editions.map((edition) => ({ eventKey: event.key, value: edition.contests })))),
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),
    multiEdition: [...editionsPerElection.values()].filter((n) => n > 1).length,
    folded: folded.size,
  }
}

/** Per office: the events (not editions) that report it, and the years they span. */
export function officePresence(
  events: readonly ElectionEvent[],
): readonly { readonly office: string; readonly family: Family | null; readonly events: readonly ElectionEvent[] }[] {
  const out = new Map<string, ElectionEvent[]>()
  for (const event of events) for (const office of officesOf(event)) out.set(office, [...(out.get(office) ?? []), event])
  return [...out.entries()]
    .map(([office, list]) => ({ office, family: list[0]?.family ?? null, events: [...list].sort((a, b) => a.year - b.year) }))
    .sort((a, b) => familyOrder(a.family) - familyOrder(b.family) || b.events.length - a.events.length || a.office.localeCompare(b.office))
}
