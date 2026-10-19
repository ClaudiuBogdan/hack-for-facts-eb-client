import countiesFixture from './counties.fixture.json'
import { ELECTION_CALENDAR } from '../shared/calendar'
import { electionKeyOf, FAMILIES, foldedEvents, hubData, SCOPE_TYPES, type Edition, type ElectionEvent, type Family, type HubData, type ScopeType } from '../shared/model'

/**
 * The analysis page's model over the catalog snapshot (design note §12): the
 * question and its address, the cells it selects, the three measures and
 * the axes they are grouped by. Everything is pure and nothing adds a figure
 * across the editions of one election: rows are counted on one edition per
 * election (the reference edition, §12.3 rule 1), editions and elections as
 * such, and a county only through the SIRUTA code of the reporting place
 * (rule 5).
 */

export const AXES = ['alegeri', 'editii', 'functii', 'niveluri', 'tururi', 'judete', 'localitati', 'timp'] as const
export type Axis = (typeof AXES)[number]
/** The records themselves, the finder's first tab: the API lists one edition's rows. */
export type Tab = Axis | 'randuri'
export const MEASURES = ['randuri', 'editii', 'alegeri'] as const
export type Measure = (typeof MEASURES)[number]
/** The address's word for a null round label: „tur neraportat" (§12.3 rule 6). */
export const ROUND_UNREPORTED = 'neraportat'

export interface Query {
  /** The election's family, read from the event key — never the edition's own label, which is wrong in seven editions. */
  readonly tip: Family | null
  readonly an: number | null
  /** One election (a platform event). */
  readonly alegere: string | null
  /** One source edition. */
  readonly editie: string | null
  readonly functie: string | null
  readonly nivel: ScopeType | null
  readonly tur: string | null
  /** An INS county code: only rows reported per locality have one. */
  readonly judet: string | null
  readonly dupa: Tab
  readonly masura: Measure
  /** The records list's page (the finder only). */
  readonly pagina: number
}

export const DEFAULT_QUERY: Query = {
  tip: null,
  an: null,
  alegere: null,
  editie: null,
  functie: null,
  nivel: null,
  tur: null,
  judet: null,
  dupa: 'alegeri',
  masura: 'randuri',
  pagina: 1,
}

/** The address's keys, in the order the sheet lists them; `v` and `layout` are the harness's. */
export const QUERY_KEYS = ['tip', 'an', 'alegere', 'editie', 'functie', 'nivel', 'tur', 'judet', 'dupa', 'masura', 'pagina'] as const

// ───────────────────────────────────────────────────────── the catalog ──

interface CountiesFixture {
  readonly readAt: string
  readonly counties: readonly { readonly code: string; readonly name: string }[]
  readonly editions: readonly string[]
  readonly offices: readonly string[]
  readonly rounds: readonly (string | null)[]
  readonly cells: readonly (readonly [number, number, number, readonly number[]])[]
  readonly unlisted: readonly (readonly [number, number, number, number])[]
  readonly places: Readonly<Record<string, { readonly all: number; readonly named: number; readonly byCounty: Readonly<Record<string, number>> }>>
}

export interface County {
  readonly code: string
  readonly name: string
}

export interface Catalog {
  readonly data: HubData
  readonly readAt: string
  readonly eventOf: ReadonlyMap<string, ElectionEvent>
  readonly editionOf: ReadonlyMap<string, Edition>
  readonly counties: readonly County[]
  readonly countyOf: ReadonlyMap<string, County>
  /** Every reported office label, most rows first; every round label; every event year. */
  readonly offices: readonly string[]
  readonly rounds: readonly (string | null)[]
  readonly years: readonly number[]
  /** SIRUTA rows per county (in `counties` order) for an edition × office × round; and rows whose code the INS list lacks. */
  readonly countyRows: ReadonlyMap<string, readonly number[]>
  readonly unlistedRows: ReadonlyMap<string, number>
  readonly places: CountiesFixture['places']
}

const cellKey = (edition: string, office: string, round: string | null) => `${edition}|${office}|${String(round)}`

let cached: Catalog | null = null

export function catalog(): Catalog {
  if (cached) return cached
  const data = hubData()
  const fixture = countiesFixture as unknown as CountiesFixture
  const eventOf = new Map<string, ElectionEvent>()
  for (const event of data.events) for (const edition of event.editions) eventOf.set(edition.key, event)
  const officeRows = new Map<string, number>()
  const rounds = new Set<string | null>()
  for (const edition of data.editions)
    for (const [office, , round, n] of edition.counts) {
      officeRows.set(office, (officeRows.get(office) ?? 0) + n)
      rounds.add(round)
    }
  const countyRows = new Map<string, readonly number[]>()
  for (const [e, o, r, perCounty] of fixture.cells) countyRows.set(cellKey(fixture.editions[e]!, fixture.offices[o]!, fixture.rounds[r] ?? null), perCounty)
  const unlistedRows = new Map<string, number>()
  for (const [e, o, r, n] of fixture.unlisted) unlistedRows.set(cellKey(fixture.editions[e]!, fixture.offices[o]!, fixture.rounds[r] ?? null), n)
  cached = {
    data,
    readAt: data.readAt,
    eventOf,
    editionOf: new Map(data.editions.map((edition) => [edition.key, edition])),
    counties: fixture.counties,
    countyOf: new Map(fixture.counties.map((county) => [county.code, county])),
    offices: [...officeRows.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([office]) => office),
    rounds: [...rounds].sort((a, b) => String(a).localeCompare(String(b))),
    years: [...new Set(data.events.map((event) => event.year))].sort((a, b) => b - a),
    countyRows,
    unlistedRows,
    places: fixture.places,
  }
  return cached
}

// ───────────────────────────────────────────────────────── the address ──

const isFamily = (value: unknown): value is Family => typeof value === 'string' && (FAMILIES as readonly string[]).includes(value)
const isScope = (value: unknown): value is ScopeType => typeof value === 'string' && (SCOPE_TYPES as readonly string[]).includes(value)
const text = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 && value.length <= 128 ? value : typeof value === 'number' ? String(value) : null)

/** The question the address asks; a value the catalog does not know is dropped (§12.5 G7). */
export function questionOf(search: Readonly<Record<string, unknown>>, cat: Catalog, tabs: readonly Tab[]): Query {
  const an = typeof search.an === 'number' ? search.an : typeof search.an === 'string' && /^\d{4}$/u.test(search.an) ? Number(search.an) : null
  const alegere = text(search.alegere)
  const editie = text(search.editie)
  const functie = text(search.functie)
  const tur = text(search.tur)
  const judet = text(search.judet)
  const dupa = typeof search.dupa === 'string' && (tabs as readonly string[]).includes(search.dupa) ? (search.dupa as Tab) : null
  const masura = typeof search.masura === 'string' && (MEASURES as readonly string[]).includes(search.masura) ? (search.masura as Measure) : null
  const pagina = typeof search.pagina === 'number' && Number.isInteger(search.pagina) && search.pagina >= 1 ? search.pagina : 1
  return {
    tip: isFamily(search.tip) ? search.tip : null,
    an: an !== null && cat.years.includes(an) ? an : null,
    alegere: alegere !== null && cat.data.events.some((event) => event.key === alegere) ? alegere : null,
    editie: editie !== null && cat.editionOf.has(editie) ? editie : null,
    functie: functie !== null && cat.offices.includes(functie) ? functie : null,
    nivel: isScope(search.nivel) ? search.nivel : null,
    tur: tur !== null && (tur === ROUND_UNREPORTED || cat.rounds.includes(tur)) ? tur : null,
    judet: judet !== null && cat.countyOf.has(judet) ? judet : null,
    dupa: dupa ?? tabs[0] ?? 'alegeri',
    masura: masura ?? 'randuri',
    pagina,
  }
}

/** The filters that name the election part of the question. */
const ELECTION_KEYS = ['tip', 'an', 'alegere', 'editie'] as const

/** The address's word for „every election" on a page whose default names one (the finder): no event has this key, so it reads as none. */
export const ALL_ELECTIONS = 'toate'

/** The address of a question: only what differs from the default view, so the default needs no address. */
export function searchOf(query: Query, defaults: Query = DEFAULT_QUERY): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  if (query.tip) out.tip = query.tip
  if (query.an !== null) out.an = query.an
  if (query.alegere) out.alegere = query.alegere
  if (query.editie) out.editie = query.editie
  // A page whose default names an election (the finder) needs a word for none, or „all elections" would read back as the default.
  if (ELECTION_KEYS.every((key) => query[key] === null) && ELECTION_KEYS.some((key) => defaults[key] !== null)) out.alegere = ALL_ELECTIONS
  if (query.functie) out.functie = query.functie
  if (query.nivel) out.nivel = query.nivel
  if (query.tur) out.tur = query.tur
  if (query.judet) out.judet = query.judet
  if (query.dupa !== defaults.dupa) out.dupa = query.dupa
  if (query.masura !== defaults.masura) out.masura = query.masura
  if (query.pagina > 1) out.pagina = query.pagina
  return out
}

/**
 * The address with the page's defaults filled in where it is silent. An
 * address that names any part of the election (family, year, election,
 * edition) takes none of the default election: a default edition never pulls
 * the question back to the newest election.
 */
export function filledSearch(search: Readonly<Record<string, unknown>>, defaults: Query): Record<string, unknown> {
  const base: Record<string, unknown> = searchOf(defaults, DEFAULT_QUERY)
  if (ELECTION_KEYS.some((key) => search[key] !== undefined && search[key] !== null)) for (const key of ELECTION_KEYS) delete base[key]
  return { ...base, ...search }
}

/** A filter set keeps the others consistent: an edition belongs to its election, a county only to rows per locality, a page to its list. */
export function repaired(query: Query, cat: Catalog): Query {
  let next = query
  if (next.editie) {
    const event = cat.eventOf.get(next.editie)
    if (event && next.alegere !== event.key) next = { ...next, alegere: event.key }
  }
  if (next.alegere) {
    const event = cat.data.events.find((item) => item.key === next.alegere)
    if (event) {
      if (next.tip !== null && next.tip !== event.family) next = { ...next, tip: event.family }
      if (next.an !== null && next.an !== event.year) next = { ...next, an: event.year }
    }
  }
  if (next.judet && next.nivel !== null && next.nivel !== 'siruta') next = { ...next, nivel: null }
  return next
}

/**
 * The question with one filter set. A new election drops an edition of
 * another; a new family or year drops an election (and its edition) of
 * another — so `repaired` never pulls the question back to the old one.
 */
export function withFilter<K extends 'tip' | 'an' | 'alegere' | 'editie' | 'functie' | 'nivel' | 'tur' | 'judet'>(query: Query, key: K, value: Query[K], cat: Catalog): Query {
  let next: Query = { ...query, [key]: value, pagina: 1 }
  const eventOfKey = (eventKey: string | null) => (eventKey ? cat.data.events.find((event) => event.key === eventKey) : undefined)
  if (key === 'alegere' && next.editie && cat.eventOf.get(next.editie)?.key !== next.alegere) next = { ...next, editie: null }
  if (key === 'tip' || key === 'an') {
    const event = eventOfKey(next.alegere)
    if (event && ((next.tip !== null && event.family !== next.tip) || (next.an !== null && event.year !== next.an))) next = { ...next, alegere: null, editie: null }
  }
  return repaired(next, cat)
}

export function withoutFilter(query: Query, key: 'tip' | 'an' | 'alegere' | 'editie' | 'functie' | 'nivel' | 'tur' | 'judet', cat: Catalog): Query {
  // Dropping an election drops its edition with it; dropping a family or a year drops the election that implied it.
  const next: Query = { ...query, [key]: null, pagina: 1 }
  if (key === 'alegere') return repaired({ ...next, editie: null }, cat)
  if (key === 'tip' || key === 'an') return repaired({ ...next, alegere: null, editie: null }, cat)
  return repaired(next, cat)
}

export const FILTER_KEYS = ['tip', 'an', 'alegere', 'editie', 'functie', 'nivel', 'tur', 'judet'] as const
export type FilterKey = (typeof FILTER_KEYS)[number]

export function filterCount(query: Query): number {
  return FILTER_KEYS.filter((key) => query[key] !== null).length
}

export function cleared(query: Query): Query {
  return { ...DEFAULT_QUERY, dupa: query.dupa, masura: query.masura }
}

/** The tabs a question can group by: the counties and the localities need rows per locality, the levels no county filter. */
export function offeredTabs(tabs: readonly Tab[], query: Pick<Query, 'nivel' | 'judet'>): readonly Tab[] {
  return tabs.filter((tab) => {
    if (tab === 'judete' || tab === 'localitati') return query.nivel === null || query.nivel === 'siruta'
    if (tab === 'niveluri') return query.judet === null
    return true
  })
}

/** The question on a tab it can show: a tab the filters hide gives way to the page's first, so no hidden tab stays active. */
export function onOfferedTab(query: Query, tabs: readonly Tab[]): Query {
  const offered = offeredTabs(tabs, query)
  return offered.includes(query.dupa) ? query : { ...query, dupa: offered[0] ?? query.dupa, pagina: 1 }
}

// ───────────────────────────────────────────────────────── the cells ──

/** One counted cell of the catalog: an edition's rows of one office at one scope type with one round label; by county when expanded. */
export interface Cell {
  readonly edition: Edition
  readonly event: ElectionEvent
  readonly office: string
  readonly scope: ScopeType
  readonly round: string | null
  readonly rows: number
  /** The INS county of the reporting places, set only by a county expansion; `unlisted` for a SIRUTA code the INS list lacks. */
  readonly county: string | null
}

const roundMatches = (round: string | null, filter: string | null) => filter === null || (filter === ROUND_UNREPORTED ? round === null : round === filter)

/** The edition filters: the event's family and year (never the edition's own label), the election, the edition. */
function editionMatches(edition: Edition, event: ElectionEvent, query: Query, ignore: FilterKey | null): boolean {
  if (ignore !== 'tip' && query.tip !== null && event.family !== query.tip) return false
  if (ignore !== 'an' && query.an !== null && event.year !== query.an) return false
  if (ignore !== 'alegere' && query.alegere !== null && event.key !== query.alegere) return false
  if (ignore !== 'editie' && query.editie !== null && edition.key !== query.editie) return false
  return true
}

/** A county expansion of a SIRUTA cell: one cell per county with rows there, and one for the codes the INS list lacks. */
function byCounty(cell: Cell, cat: Catalog): readonly Cell[] {
  const key = cellKey(cell.edition.key, cell.office, cell.round)
  const perCounty = cat.countyRows.get(key) ?? []
  const out: Cell[] = []
  perCounty.forEach((rows, index) => {
    if (rows > 0) out.push({ ...cell, rows, county: cat.counties[index]!.code })
  })
  const unlisted = cat.unlistedRows.get(key) ?? 0
  if (unlisted > 0) out.push({ ...cell, rows: unlisted, county: 'unlisted' })
  return out
}

/**
 * The cells the question selects. `ignore` leaves one filter out, so a panel
 * can count what each of its values would give. A county filter keeps only
 * the rows reported per locality in that county: rows at any other scope have
 * no county that can be joined (§12.3 rule 5).
 */
export function cellsOf(cat: Catalog, query: Query, ignore: FilterKey | null = null, expandCounties = false): readonly Cell[] {
  const out: Cell[] = []
  const county = ignore === 'judet' ? null : query.judet
  for (const event of cat.data.events) {
    for (const edition of event.editions) {
      if (!editionMatches(edition, event, query, ignore)) continue
      for (const [office, scope, round, rows] of edition.counts) {
        if (ignore !== 'functie' && query.functie !== null && office !== query.functie) continue
        if (ignore !== 'nivel' && query.nivel !== null && scope !== query.nivel) continue
        if (ignore !== 'tur' && !roundMatches(round, query.tur)) continue
        const cell: Cell = { edition, event, office, scope, round, rows, county: null }
        if (county !== null) {
          if (scope !== 'siruta') continue
          for (const part of byCounty(cell, cat)) if (part.county === county) out.push(part)
        } else if (expandCounties && scope === 'siruta') {
          out.push(...byCounty(cell, cat))
        } else {
          out.push(cell)
        }
      }
    }
  }
  return out
}

/**
 * The edition rows are counted on for an election: the one the address names,
 * else the election's edition with the most rows (the first in `eventsOf`'s
 * order). Said on the page; never a sum of the election's editions.
 */
export function referenceEdition(event: ElectionEvent, query: Query): Edition | null {
  const named = query.editie ? event.editions.find((edition) => edition.key === query.editie) : undefined
  return named ?? event.editions[0] ?? null
}

export interface Totals {
  readonly randuri: number
  readonly editii: number
  readonly alegeri: number
  /** Rows the set holds only in editions that are not their election's reference: never added in, but they make a zero a dash. */
  readonly elsewhere: number
  /** Elections of the set whose reference edition has none of its rows. */
  readonly unreferenced: number
  /** E1 events of the set whose election is counted under its own key (§12.3 rule 4): their rows and the election are not added again. */
  readonly folded: number
}

/** The E1 events among a set of cells whose election is in the set too: they are that election, not one more. */
export function foldedOf(cells: readonly Cell[]): ReadonlySet<string> {
  return foldedEvents(cells.map((cell) => cell.event.key))
}

/**
 * The three measures of a set of cells: rows on each election's reference
 * edition, distinct editions, distinct elections. `folded` is the question's
 * E1 events (computed over the whole question, so a group of the „2014" local
 * event alone still knows that 2016 is counted elsewhere).
 */
export function totalsOf(cells: readonly Cell[], query: Query, folded: ReadonlySet<string> = foldedOf(cells)): Totals {
  const editions = new Set<string>()
  const elections = new Set<string>()
  const referenced = new Set<string>()
  const events = new Set<string>()
  const foldedHere = new Set<string>()
  let randuri = 0
  let elsewhere = 0
  for (const cell of cells) {
    editions.add(cell.edition.key)
    if (folded.has(cell.event.key)) {
      foldedHere.add(cell.event.key)
      continue
    }
    events.add(cell.event.key)
    elections.add(electionKeyOf(cell.event.key))
    if (referenceEdition(cell.event, query)?.key === cell.edition.key) {
      randuri += cell.rows
      referenced.add(cell.event.key)
    } else elsewhere += cell.rows
  }
  return { randuri, editii: editions.size, alegeri: elections.size, elsewhere, unreferenced: events.size - referenced.size, folded: foldedHere.size }
}

/** A measure as the page shows it: a dash (null) where the set has rows or an election but none counted here — never a false zero (§12.3 rule 7). */
export function measureValue(totals: Totals, measure: Measure): number | null {
  if (measure === 'randuri') return totals.randuri === 0 && (totals.elsewhere > 0 || totals.folded > 0) ? null : totals.randuri
  if (measure === 'alegeri') return totals.alegeri === 0 && totals.folded > 0 ? null : totals.alegeri
  return totals.editii
}

/** Rows of every edition in the set, not only the reference ones: shown per edition, never summed (the „Ediții" axis). */
export function ownRows(cells: readonly Cell[]): number {
  return cells.reduce((sum, cell) => sum + cell.rows, 0)
}

// ───────────────────────────────────────────────────────── the groups ──

export interface Group {
  readonly key: string
  readonly cells: readonly Cell[]
  readonly totals: Totals
  /** Where the group's rows live when the axis is the editions: the edition's own rows. */
  readonly own: number
  /** For ordering in time: the year of an election, an edition or a year group. */
  readonly year: number
}

/** The axes grouped in time, newest first; the rest by the measure. */
export const TIME_AXES: readonly Axis[] = ['alegeri', 'editii', 'timp']

export const UNLISTED = 'unlisted'

function groupKeyOf(cell: Cell, axis: Axis): string | null {
  switch (axis) {
    case 'alegeri':
      return cell.event.key
    case 'editii':
      return cell.edition.key
    case 'functii':
      return cell.office
    case 'niveluri':
      return cell.scope
    case 'tururi':
      return cell.round ?? ROUND_UNREPORTED
    case 'judete':
      return cell.county
    case 'timp':
      return String(cell.event.year)
    case 'localitati':
      return null
  }
}

/** The question's cells grouped by an axis; a county axis expands the SIRUTA cells and leaves the other scopes out (they have no county). */
export function groupsOf(cat: Catalog, query: Query, axis: Axis): readonly Group[] {
  const cells = cellsOf(cat, query, null, axis === 'judete')
  const folded = foldedOf(cells)
  const buckets = new Map<string, Cell[]>()
  for (const cell of cells) {
    const key = groupKeyOf(cell, axis)
    if (key === null) continue
    buckets.set(key, [...(buckets.get(key) ?? []), cell])
  }
  const groups = [...buckets.entries()].map(([key, members]) => ({
    key,
    cells: members,
    totals: totalsOf(members, query, folded),
    own: ownRows(members),
    year: members[0]!.event.year,
  }))
  const measure = query.masura
  return groups.sort((a, b) => {
    if (TIME_AXES.includes(axis)) return b.year - a.year || b.totals[measure] - a.totals[measure] || a.key.localeCompare(b.key)
    const left = axis === 'editii' ? a.own : a.totals[measure]
    const right = axis === 'editii' ? b.own : b.totals[measure]
    return right - left || a.key.localeCompare(b.key)
  })
}

/**
 * Whether the axis cuts the measure into parts that add up to the question's
 * total, so a share and a „Restul" row are honest. Rows on the reference
 * edition are cut by every axis but the editions (each edition shows its own
 * rows, not a part of a sum); an edition has one election, one year and one
 * family but several offices, scopes, rounds and counties; an election has
 * several editions too.
 */
export function partitioned(axis: Axis, measure: Measure): boolean {
  if (measure === 'randuri') return axis !== 'editii'
  if (measure === 'editii') return axis === 'alegeri' || axis === 'editii' || axis === 'timp'
  return axis === 'alegeri' || axis === 'timp'
}

/** The axis a row of this axis narrows to, so a click on an election lists its editions, a county its localities. */
export function nextAxis(axis: Axis): Axis {
  switch (axis) {
    case 'alegeri':
      return 'editii'
    case 'editii':
      return 'functii'
    case 'functii':
      return 'niveluri'
    case 'niveluri':
      return 'tururi'
    case 'tururi':
      return 'judete'
    case 'judete':
      return 'localitati'
    case 'localitati':
      return 'functii'
    case 'timp':
      return 'alegeri'
  }
}

/** The question narrowed to one row of the axis, grouped by what is left open. */
export function drilled(query: Query, axis: Axis, key: string, cat: Catalog): Query {
  const dupa = nextAxis(axis)
  switch (axis) {
    case 'alegeri':
      return { ...withFilter(query, 'alegere', key, cat), dupa }
    case 'editii':
      return { ...withFilter(query, 'editie', key, cat), dupa }
    case 'functii':
      return { ...withFilter(query, 'functie', key, cat), dupa }
    case 'niveluri':
      return { ...withFilter(query, 'nivel', key as ScopeType, cat), dupa: query.judet ? 'tururi' : dupa }
    case 'tururi':
      return { ...withFilter(query, 'tur', key, cat), dupa }
    case 'judete':
      return key === UNLISTED ? query : { ...withFilter(query, 'judet', key, cat), dupa }
    case 'timp':
      return { ...withFilter(query, 'an', Number(key), cat), dupa }
    case 'localitati':
      return query
  }
}

// ───────────────────────────────────────────────────────── the figures ──

export interface Answer {
  readonly cells: readonly Cell[]
  readonly totals: Totals
  /** The platform events of the selection, the E1 one included (it is listed, marked, never counted as one more election). */
  readonly events: readonly ElectionEvent[]
  /** E1 events counted with the election they hold. */
  readonly folded: ReadonlySet<string>
  /** The reference editions the rows are counted on, one per election in the selection. */
  readonly references: readonly Edition[]
  /** Elections described by more than one edition, among the selection's (an E1 event's editions count with 2016's). */
  readonly multiEdition: number
  /** Distinct reporting places (SIRUTA codes) among the selection's reference editions; null when only the place index can tell. */
  readonly places: number | null
}

export function answerOf(cat: Catalog, query: Query): Answer {
  const cells = cellsOf(cat, query)
  const folded = foldedOf(cells)
  const totals = totalsOf(cells, query, folded)
  const eventKeys = [...new Set(cells.map((cell) => cell.event.key))]
  const events = cat.data.events.filter((event) => eventKeys.includes(event.key))
  const references = events.flatMap((event) => {
    if (folded.has(event.key)) return []
    const reference = referenceEdition(event, query)
    return reference && cells.some((cell) => cell.edition.key === reference.key) ? [reference] : []
  })
  const editionsIn = new Set(cells.map((cell) => cell.edition.key))
  const editionsPerElection = new Map<string, number>()
  for (const event of events) {
    const n = event.editions.filter((edition) => editionsIn.has(edition.key)).length
    editionsPerElection.set(electionKeyOf(event.key), (editionsPerElection.get(electionKeyOf(event.key)) ?? 0) + n)
  }
  const multiEdition = [...editionsPerElection.values()].filter((n) => n > 1).length
  return { cells, totals, events, folded, references, multiEdition, places: placesOf(cat, query, references) }
}

/**
 * Distinct places from the snapshot alone: the whole catalog's union, or one
 * reference edition's places (in one county when asked) with no office or
 * round filter. Any other selection needs the place index (read in the
 * browser), so the page says it is counting.
 */
function placesOf(cat: Catalog, query: Query, references: readonly Edition[]): number | null {
  if (query.functie !== null || query.tur !== null || (query.nivel !== null && query.nivel !== 'siruta')) return null
  if (filterCount(query) === 0) return cat.data.places.siruta
  if (references.length !== 1) return null
  const places = cat.places[references[0]!.key]
  if (!places) return 0
  return query.judet ? (places.byCounty[query.judet] ?? 0) : places.all
}

/** Rows per scope type for the question's other filters: the pinned bar. */
export function levelTotals(cat: Catalog, query: Query): ReadonlyMap<ScopeType | 'all', Totals> {
  const cells = cellsOf(cat, query, 'nivel')
  const folded = foldedOf(cells)
  const out = new Map<ScopeType | 'all', Totals>()
  out.set('all', totalsOf(cells, query, folded))
  for (const scope of SCOPE_TYPES)
    out.set(
      scope,
      totalsOf(
        cells.filter((cell) => cell.scope === scope),
        query,
        folded,
      ),
    )
  return out
}

// ───────────────────────────────────────────────────────── the years ──

export interface YearPoint {
  readonly year: number
  readonly totals: Totals
  /** Elections the calendar expects that year for the question's family (all families when none). */
  readonly expected: number
  /** Of them, how many the catalog itself lacks — „nu e în date", whatever the question's row filters. */
  readonly missing: number
  /** Platform events the catalog holds that year for the question's family, before the row filters: a year with some and no selected row is „nu e în această selecție", not absent. */
  readonly inCatalog: number
}

/** 1990–2025 for the question's other filters; a year the calendar expects and the catalog lacks is „nu e în date", one the filters leave empty „nu e în selecție" — never zero. */
export function yearPoints(cat: Catalog, query: Query, from = 1990, to = 2025): readonly YearPoint[] {
  const cells = cellsOf(cat, query, 'an')
  const folded = foldedOf(cells)
  const out: YearPoint[] = []
  for (let year = from; year <= to; year++) {
    const members = cells.filter((cell) => cell.event.year === year)
    const calendar = ELECTION_CALENDAR.filter((entry) => entry.year === year && (query.tip === null || entry.family === query.tip))
    const expected = calendar.reduce((sum, entry) => sum + (entry.count ?? 1), 0)
    // Coverage is the catalog's, before the row filters: an office or a level the question picks does not make an election absent.
    const missing = calendar.reduce((sum, entry) => {
      const loaded = cat.data.events.filter((event) => event.family === entry.family && event.year === entry.year && event.instance === null).length
      return sum + Math.max((entry.count ?? 1) - loaded, 0)
    }, 0)
    const inCatalog = cat.data.events.filter((event) => event.year === year && (query.tip === null || event.family === query.tip)).length
    out.push({ year, totals: totalsOf(members, query, folded), expected, missing, inCatalog })
  }
  return out
}

// ───────────────────────────────────────────────────────── the options ──

export interface Option<V extends string | number> {
  readonly value: V
  readonly editions: number
  /** Rows on the reference editions (an edition's own rows for the edition filter); null when the value's rows are all in other editions — a dash, never 0. */
  readonly rows: number | null
}

/** Each value a filter can take with what it would select, the others kept; a value that selects nothing is not offered (§12.5 G6). */
export function optionsOf<K extends FilterKey>(cat: Catalog, query: Query, key: K): readonly Option<string | number>[] {
  const cells = cellsOf(cat, query, key, key === 'judet')
  const folded = foldedOf(cells)
  const buckets = new Map<string | number, Cell[]>()
  const put = (value: string | number | null, cell: Cell) => {
    if (value === null) return
    buckets.set(value, [...(buckets.get(value) ?? []), cell])
  }
  for (const cell of cells) {
    switch (key) {
      case 'tip':
        put(cell.event.family, cell)
        break
      case 'an':
        put(cell.event.year, cell)
        break
      case 'alegere':
        put(cell.event.key, cell)
        break
      case 'editie':
        put(cell.edition.key, cell)
        break
      case 'functie':
        put(cell.office, cell)
        break
      case 'nivel':
        put(cell.scope, cell)
        break
      case 'tur':
        put(cell.round ?? ROUND_UNREPORTED, cell)
        break
      case 'judet':
        if (cell.county !== null && cell.county !== UNLISTED) put(cell.county, cell)
        break
    }
  }
  return [...buckets.entries()].map(([value, members]) => {
    const totals = totalsOf(members, query, folded)
    return { value, editions: totals.editii, rows: key === 'editie' ? ownRows(members) : measureValue(totals, 'randuri') }
  })
}

/** The elections the data holds, newest first, for a menu. */
export function eventsNewestFirst(cat: Catalog): readonly ElectionEvent[] {
  return cat.data.events
}
