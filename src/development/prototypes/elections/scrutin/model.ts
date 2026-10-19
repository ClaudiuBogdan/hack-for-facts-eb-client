import { t } from '@lingui/core/macro'
import type { ElectionContest } from '@/schemas/elections-catalog'
import { eventTitle, officeLabel, roundLabel } from '../shared/labels'
import { contestKeyOf as sharedContestKeyOf, hubData, isDisputedEvent, SCOPE_TYPES, type Edition, type ElectionEvent, type ScopeType } from '../shared/model'
import type { InsPlace, Place, PlaceIndex } from '../shared/places'

/**
 * The contest page's model: what one contest row is, from its key and from
 * the live row; where it sits (edition, election, place); the rows that
 * relate to it the only safe ways (the SIRUTA code, the fixture's counts).
 * Nothing here joins on a name or on a county code, and nothing counts races.
 */

export const DEFAULT_CONTEST_KEY = 'contest:bec-local-2024:mayor:siruta:54975'

/** `contest:<edition>:<office slug>:<scope type>:<scope key, lower-cased, ':' as '-'>` — the shape every served key follows (checked by the fixture generator). */
export interface ParsedContestKey {
  readonly editionKey: string
  readonly officeSlug: string
  readonly scopeType: ScopeType
  readonly scopeKey: string
}

const isScopeType = (value: string): value is ScopeType => (SCOPE_TYPES as readonly string[]).includes(value)

export function parseContestKey(key: string): ParsedContestKey | null {
  const parts = key.split(':')
  if (parts.length < 5 || parts[0] !== 'contest') return null
  const [, editionKey = '', officeSlug = '', scopeType = '', ...rest] = parts
  const scopeKey = rest.join(':')
  if (!editionKey || !officeSlug || !isScopeType(scopeType) || !scopeKey) return null
  return { editionKey, officeSlug, scopeType, scopeKey }
}

export const officeSlug = (office: string) => office.replace(/_/gu, '-')

/** The key a row has, built the way the API builds it (the shared rule); used only for rows the fixture or the index says exist. */
export function contestKeyOf(editionKey: string, office: string, scopeType: ScopeType, scopeKey: string): string {
  return sharedContestKeyOf(editionKey, office, scopeType, scopeKey)
}

// ───────────────────────────────────────────── the edition and its election ──

const DATA = hubData()
const EDITIONS = new Map(DATA.editions.map((edition) => [edition.key, edition]))
const EVENTS_BY_EDITION = new Map(DATA.events.flatMap((event) => event.editions.map((edition) => [edition.key, event] as const)))

export const READ_AT = DATA.readAt

export function editionOf(key: string): Edition | null {
  return EDITIONS.get(key) ?? null
}

export function eventOfEdition(key: string): ElectionEvent | null {
  return EVENTS_BY_EDITION.get(key) ?? null
}

export function allEvents(): readonly ElectionEvent[] {
  return DATA.events
}

/** The publisher the key's prefix hints at — not a served field (ask 1), said as a hint. */
export function publisherOf(editionKey: string): 'BEC' | 'AEP' | 'ROAEP' | null {
  if (editionKey.startsWith('bec-')) return 'BEC'
  if (editionKey.startsWith('aep-') || editionKey.startsWith('alegeri-pentru-')) return 'AEP'
  if (editionKey.startsWith('roaep-')) return 'ROAEP'
  return null
}

/** The „2014" local editions hold 2016 data (E1). */
export const isDisputedYear = (edition: Pick<Edition, 'eventKey'>) => edition.eventKey !== null && isDisputedEvent({ key: edition.eventKey })

/** „ediția BEC" when the publisher names one edition of the election; the key otherwise. */
export function editionPhrase(edition: Edition, event: ElectionEvent | null): string {
  const publisher = publisherOf(edition.key)
  const siblings = event ? event.editions.filter((other) => publisherOf(other.key) === publisher) : [edition]
  if (publisher && siblings.length === 1) return t`ediția ${publisher}`
  if (publisher) return t`ediția ${publisher} „${edition.key}”`
  return t`ediția „${edition.key}”`
}

/** The office the slug names, resolved against the edition's own reported labels (never guessed from the slug alone). */
export function officeOfSlug(edition: Edition | null, slug: string): string | null {
  if (!edition) return null
  const offices = new Set(edition.counts.map(([office]) => office))
  for (const office of offices) if (officeSlug(office) === slug) return office
  return null
}

// ──────────────────────────────────────────────────────── what the row is ──

/** Offices the sources report at a locality that are not that locality's own race: a reporting location (§12.3 rule 5). */
const WIDER_THAN_A_LOCALITY: ReadonlySet<string> = new Set([
  'county_president',
  'county_council',
  'consiliu-judetean',
  'county_council_or_cgmb',
  'county_president_or_primar_general',
  'bucharest_general_council',
  'consiliu-general',
  'general_mayor',
  'bucharest_general_mayor',
  'chamber_deputies',
  'senate',
  'president',
  'european_parliament',
  'referendum',
])

/** Offices held county-wide (or Bucharest-wide): a county row of one is at the office's own level. */
const COUNTY_WIDE: ReadonlySet<string> = new Set([
  'county_president',
  'county_council',
  'consiliu-judetean',
  'county_council_or_cgmb',
  'county_president_or_primar_general',
  'bucharest_general_council',
  'consiliu-general',
  'general_mayor',
  'bucharest_general_mayor',
])

/** Parliament: 1992–2004 report by county, the county being the constituency. */
const BY_CONSTITUENCY: ReadonlySet<string> = new Set(['chamber_deputies', 'senate'])

/** One race for the whole country. */
const COUNTRY_WIDE: ReadonlySet<string> = new Set(['president', 'referendum', 'european_parliament'])

export type RowNature =
  /** An office at the level it is held (a locality's at the locality, a county's or a constituency's at the county, the country's at the country): the row may be the race, as reported. */
  | 'race-candidate'
  /** An office wider than the place it is reported at: a reporting location. */
  | 'reporting-location'
  /** A county or national row of an office held lower (a mayor, a local council): a roll-up, never a sum of the rows under it. */
  | 'roll-up'
  /** A label that is a source table's shape, not an office. */
  | 'source-shape'
  /** The source's own numbering: the same place under another key, or a constituency; not joinable. */
  | 'source-numbering'
  /** Reported from abroad, by country. */
  | 'abroad'

export function rowNature(office: string, scopeType: ScopeType): RowNature {
  if (officeLabel(office) === null) return 'source-shape'
  if (scopeType === 'diaspora') return 'abroad'
  if (scopeType === 'source_constituency') return 'source-numbering'
  if (scopeType === 'siruta') return WIDER_THAN_A_LOCALITY.has(office) ? 'reporting-location' : 'race-candidate'
  if (scopeType === 'national') return COUNTRY_WIDE.has(office) ? 'race-candidate' : 'roll-up'
  // A county row: the county's own office or a constituency is at its level; a national race is reported there; a locality's office is rolled up.
  if (COUNTY_WIDE.has(office) || BY_CONSTITUENCY.has(office)) return 'race-candidate'
  if (COUNTRY_WIDE.has(office)) return 'reporting-location'
  return 'roll-up'
}

// ───────────────────────────────────────────────────────── Romanian forms ──

/** „municipiul Cluj-Napoca", „sectorul 1 al Bucureștiului": the place after „la". */
export function placeAccusative(ins: InsPlace): string {
  const sector = /Sectorul (\d)/u.exec(ins.name)
  if (ins.kind.startsWith('Secto') && sector) return t`sectorul ${sector[1]} al Bucureștiului`
  if (ins.kind.startsWith('Municipiu')) return t`municipiul ${ins.name}`
  if (ins.kind === 'Oras') return t`orașul ${ins.name}`
  if (ins.kind === 'Comuna') return t`comuna ${ins.name}`
  return ins.name
}

/** „municipiului Cluj-Napoca", „comunei Florești": the place after „primarul". */
export function placeGenitive(ins: InsPlace): string {
  const sector = /Sectorul (\d)/u.exec(ins.name)
  if (ins.kind.startsWith('Secto') && sector) return t`sectorului ${sector[1]} al Bucureștiului`
  if (ins.kind.startsWith('Municipiu')) return t`municipiului ${ins.name}`
  if (ins.kind === 'Oras') return t`orașului ${ins.name}`
  if (ins.kind === 'Comuna') return t`comunei ${ins.name}`
  return ins.name
}

/** „alegerilor locale din 2024", „referendumului din 2019": the election after „ediția BEC a". */
export function eventGenitive(event: ElectionEvent): string {
  const year = event.year
  if (event.instance === 'partial') return t`alegerilor locale parțiale din ${year}`
  switch (event.family) {
    case 'local':
      return t`alegerilor locale din ${year}`
    case 'parliamentary':
      return t`alegerilor parlamentare din ${year}`
    case 'presidential':
      return t`alegerilor prezidențiale din ${year}`
    case 'european':
      return t`alegerilor europarlamentare din ${year}`
    case 'referendum':
      return t`referendumului din ${year}`
    default:
      return t`alegerilor negrupate din ${year}`
  }
}

// ──────────────────────────────────────────────────────── the head sentence ──

export interface RowIdentity {
  readonly key: string
  readonly parsed: ParsedContestKey
  readonly edition: Edition | null
  readonly event: ElectionEvent | null
  /** The reported office: the live row's, else the one the key names in the edition's own labels. */
  readonly office: string | null
  readonly scopeType: ScopeType
  /** The scope key as served, else as the key spells it. */
  readonly scopeKey: string
  /** This row's own place label, as served; null until the row lands, and null when the source gives none (never filled from another edition). */
  readonly scopeLabel: string | null
  /** The label the place index holds for the SIRUTA code: the first a source gave it, maybe in another edition — a lookup, shown with that provenance. */
  readonly lookupLabel: string | null
  readonly round: string | null
  /** Whether the live row has landed: the round is known only then. */
  readonly live: boolean
  readonly ins: InsPlace | null
}

export function identityOf(key: string, parsed: ParsedContestKey, row: ElectionContest | null | undefined, place: Place | null): RowIdentity {
  const edition = editionOf(parsed.editionKey)
  return {
    key,
    parsed,
    edition,
    event: eventOfEdition(parsed.editionKey),
    office: row?.reportedOffice ?? officeOfSlug(edition, parsed.officeSlug),
    scopeType: row?.scopeType ?? parsed.scopeType,
    scopeKey: row?.sourceScopeKey ?? parsed.scopeKey,
    scopeLabel: row?.scopeLabel ?? null,
    lookupLabel: place?.label ?? null,
    round: row?.reportedRound ?? null,
    live: row !== undefined && row !== null,
    ins: place?.ins ?? null,
  }
}

/**
 * The place as a reader names it: the INS name, else this row's label as the
 * source spells it, else the label the place index holds (another edition's,
 * `fromIndex`), else the code.
 */
export function placeWord(identity: Pick<RowIdentity, 'ins' | 'scopeLabel' | 'lookupLabel' | 'scopeKey'>): {
  readonly text: string
  readonly asReported: boolean
  readonly code: boolean
  readonly fromIndex: boolean
} {
  if (identity.ins) return { text: identity.ins.name, asReported: false, code: false, fromIndex: false }
  if (identity.scopeLabel) return { text: identity.scopeLabel, asReported: true, code: false, fromIndex: false }
  if (identity.lookupLabel) return { text: identity.lookupLabel, asReported: true, code: false, fromIndex: true }
  return { text: identity.scopeKey, asReported: false, code: true, fromIndex: false }
}

/** „pe județul „ALBA”", „pe județul cu codul 12 al ediției": a county row's place; the code is the edition's own (§12.3 rule 5). */
function countyPhrase(identity: RowIdentity): string {
  const word = placeWord(identity)
  return word.asReported ? t`pe județul „${word.text}”` : t`pe județul cu codul ${identity.scopeKey} al ediției`
}

/** „la municipiul Cluj-Napoca", „la locul raportat „MUNICIPIUL CLUJ-NAPOCA”", „la locul raportat 54975". */
function atPlace(identity: RowIdentity): string {
  const word = placeWord(identity)
  if (identity.ins) return t`la ${placeAccusative(identity.ins)}`
  if (word.asReported) return t`la locul raportat „${word.text}”`
  return t`la locul raportat ${word.text}`
}

/** The office at the place, in the words a reader would use; honest about what the row is. */
export function officeAtPlace(identity: RowIdentity): string {
  const office = identity.office
  if (office === null) return t`Un rând de scrutin ${atPlace(identity)}`
  const label = officeLabel(office)
  const nature = rowNature(office, identity.scopeType)
  if (label === null) return t`Rândul „${office}” (etichetă din sursă, nu o funcție), ${atPlace(identity)}`
  switch (nature) {
    case 'race-candidate': {
      if (identity.scopeType === 'national') {
        if (office === 'president') return t`Președintele României, rândul pe toată țara`
        if (office === 'referendum') return t`Referendumul, rândul pe toată țara`
        return t`${label}, rândul pe toată țara`
      }
      if (identity.ins) {
        const genitive = placeGenitive(identity.ins)
        if (office === 'mayor') return t`Primarul ${genitive}`
        if (office === 'local_council') return t`Consiliul local al ${genitive}`
      }
      if (identity.scopeType === 'county') return t`${label}, ${countyPhrase(identity)}`
      return t`${label}, ${atPlace(identity)}`
    }
    case 'reporting-location':
      return identity.scopeType === 'county' ? t`${label}, cu raportare ${countyPhrase(identity)}` : t`${label}, cu raportare ${atPlace(identity)}`
    case 'roll-up':
      return identity.scopeType === 'national' ? t`${label}, rândul-centralizator pe toată țara` : t`${label}, rândul-centralizator ${countyPhrase(identity)}`
    case 'abroad': {
      const word = placeWord(identity)
      return t`${label}, cu raportare din străinătate: ${word.text}`
    }
    case 'source-numbering': {
      const word = placeWord(identity)
      return word.asReported ? t`${label}, la locul numerotat de sursă „${word.text}” (${identity.scopeKey})` : t`${label}, la locul numerotat de sursă ${word.text}`
    }
    case 'source-shape':
      return t`Rândul „${office}” (etichetă din sursă), ${atPlace(identity)}`
  }
}

/** One plain sentence (G2): the office at the place, the edition of the election, the round — each as reported. */
export function headSentence(identity: RowIdentity): string {
  const what = officeAtPlace(identity)
  const round = identity.live ? roundLabel(identity.round) : null
  const where = identity.edition
    ? identity.event
      ? isDisputedYear(identity.edition)
        ? t`în ${editionPhrase(identity.edition, identity.event)}, etichetată „${eventTitle(identity.event)}” (după auditul datelor, rezultate din 2016)`
        : t`în ${editionPhrase(identity.edition, identity.event)} a ${eventGenitive(identity.event)}`
      : t`în ediția „${identity.edition.key}”, negrupată`
    : t`într-o ediție care nu e în date („${identity.parsed.editionKey}”)`
  return round ? `${what}, ${where}, ${round}.` : `${what}, ${where}.`
}

// ───────────────────────────────────────────────── the row's relatives ──

export interface ScopeRollup {
  readonly scopeType: ScopeType
  readonly rows: number
  readonly rounds: readonly (string | null)[]
  /** The one row's key when the level holds exactly one (the national row); otherwise the level is listed, not linked. */
  readonly singleKey: string | null
}

/** The same office in the same edition, by scope type — the fixture's counts, never summed across levels. */
export function rollupsOf(edition: Edition | null, office: string | null): readonly ScopeRollup[] {
  if (!edition || office === null) return []
  return SCOPE_TYPES.flatMap((scopeType) => {
    const counts = edition.counts.filter(([o, s]) => o === office && s === scopeType)
    if (counts.length === 0) return []
    const rows = counts.reduce((sum, [, , , n]) => sum + n, 0)
    const rounds = [...new Set(counts.map(([, , round]) => round))]
    return [{ scopeType, rows, rounds, singleKey: scopeType === 'national' && rows === 1 ? contestKeyOf(edition.key, office, 'national', 'RO') : null }]
  })
}

export interface PlaceRow {
  readonly editionKey: string
  readonly office: string
  readonly round: string | null
  readonly key: string
}

/** Every row the index holds for a SIRUTA code, as [edition, office, round] resolved to keys. */
export function placeRows(index: PlaceIndex, siruta: string): readonly PlaceRow[] {
  const place = index.places.get(siruta)
  if (!place) return []
  return place.rows.flatMap(([e, o, r]) => {
    const editionKey = index.editions[e]
    const office = index.offices[o]
    if (editionKey === undefined || office === undefined) return []
    const round = index.rounds[r] ?? null
    return [{ editionKey, office, round, key: contestKeyOf(editionKey, office, 'siruta', siruta) }]
  })
}

export interface LineageEdition {
  readonly edition: Edition
  readonly rows: readonly PlaceRow[]
}

export interface LineageEvent {
  readonly event: ElectionEvent
  readonly editions: readonly LineageEdition[]
}

/** The same office at the same SIRUTA code across every edition, grouped by election, newest first; editions side by side, never added. */
export function lineageOf(rows: readonly PlaceRow[], office: string): readonly LineageEvent[] {
  const byEdition = new Map<string, PlaceRow[]>()
  for (const row of rows) if (row.office === office) byEdition.set(row.editionKey, [...(byEdition.get(row.editionKey) ?? []), row])
  const byEvent = new Map<string, LineageEdition[]>()
  const standalone = new Map<string, ElectionEvent>()
  for (const [editionKey, list] of byEdition) {
    const edition = editionOf(editionKey)
    if (!edition) continue
    const event = eventOfEdition(editionKey)
    const eventKey = event?.key ?? `edition:${editionKey}`
    if (event) standalone.set(eventKey, event)
    byEvent.set(eventKey, [...(byEvent.get(eventKey) ?? []), { edition, rows: [...list].sort((a, b) => String(a.round).localeCompare(String(b.round))) }])
  }
  return [...byEvent.entries()]
    .flatMap(([eventKey, editions]) => {
      const event = standalone.get(eventKey)
      return event ? [{ event, editions: [...editions].sort((a, b) => a.edition.key.localeCompare(b.edition.key)) }] : []
    })
    .sort((a, b) => b.event.year - a.event.year || a.event.key.localeCompare(b.event.key))
}

/** The same office at the national level in other editions: the national scope key is the one constant `RO`, so the fixture's count of one is the row. */
export function nationalLineageOf(office: string): readonly LineageEvent[] {
  const rows: PlaceRow[] = DATA.editions.flatMap((edition) =>
    edition.counts
      .filter(([o, s, , n]) => o === office && s === 'national' && n === 1)
      .map(([, , round]) => ({ editionKey: edition.key, office, round, key: contestKeyOf(edition.key, office, 'national', 'RO') })),
  )
  return lineageOf(rows, office)
}

/** The rows reported at the place in one edition, this row's office first. */
export function rowsAtPlaceInEdition(rows: readonly PlaceRow[], editionKey: string): readonly PlaceRow[] {
  return rows.filter((row) => row.editionKey === editionKey).sort((a, b) => a.office.localeCompare(b.office) || String(a.round).localeCompare(String(b.round)))
}

/** The sibling editions of the election, each with this office's row at this SIRUTA code when the index holds one. */
export function siblingEditions(event: ElectionEvent | null, edition: Edition | null, rows: readonly PlaceRow[] | null, office: string | null) {
  const editions = event?.editions ?? (edition ? [edition] : [])
  return editions.map((sibling) => ({
    edition: sibling,
    current: sibling.key === edition?.key,
    rows: rows && office !== null ? rows.filter((row) => row.editionKey === sibling.key && row.office === office) : null,
  }))
}

export function yearsSpan(lineage: readonly LineageEvent[]): { readonly first: number; readonly last: number } | null {
  if (lineage.length === 0) return null
  const years = lineage.map((entry) => entry.event.year)
  return { first: Math.min(...years), last: Math.max(...years) }
}
