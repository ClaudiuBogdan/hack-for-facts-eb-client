/**
 * The analytics page's model (`/procurement/analytics`, design.md §18): one
 * query — what records (`tip`), which period, which filters, grouped by what,
 * measured how — read from and written to the URL, checked against what the
 * API can answer, and moved by clicking rows (a drill adds the row's filter
 * and groups by the next natural axis).
 *
 * The registry below is the page's extension point: an axis, a level or a
 * population the API learns to serve is an entry here, not a new screen.
 * Every filter holds a list of values (one today — the API scopes are
 * single-valued), so multi-select is a number change, not a URL migration.
 */

// ─────────────────────────────────────────────────────────── populations ──

export type PopulationId = 'directe' | 'contracte' | 'acorduri'

export interface Population {
  readonly id: PopulationId
  readonly grain: 'direct_acquisition' | 'contract'
  readonly recordKind?: 'contract_award' | 'framework_agreement'
  /**
   * What its money may say: `clean` (checked, without VAT — direct purchases),
   * `provisional` (contract awards: framework ceilings and call-offs still
   * counted, a quarter valued), `none` (frameworks: a ceiling is not spend).
   */
  readonly money: 'clean' | 'provisional' | 'none'
  /** The first year whose records compare with today's (direct purchases before 2019 cannot tell a purchase from a refused offer). */
  readonly comparableFrom: number
  /**
   * The last month the record kind splits awards from frameworks. SEAP's
   * export stamps it; e-licitatie's award notices do not, so their frameworks
   * (and call-offs) count as awards — and from 2026 the rows come mostly from
   * e-licitatie: awards rise, frameworks all but vanish. Past this month the
   * population is not comparable with its own past.
   */
  readonly kindSplitUntil?: string
  /**
   * Whether a window's change against the one before may be shown. Contract
   * rows come from channels whose coverage moves year to year (SEAP's 2019
   * bulk year missed, thin 2025 export months, e-licitatie's unsplit kinds),
   * so a contract count's change measures the sources, not the buying.
   */
  readonly changes: boolean
  /** Which cutoff month the population follows. */
  readonly cutoff: 'direct' | 'contract'
  /** The measure it opens on: direct purchases by money, contracts by number. */
  readonly defaultMeasure: Measure
}

export const POPULATIONS: Readonly<Record<PopulationId, Population>> = {
  directe: { id: 'directe', grain: 'direct_acquisition', money: 'clean', comparableFrom: 2019, changes: true, cutoff: 'direct', defaultMeasure: 'lei' },
  contracte: { id: 'contracte', grain: 'contract', recordKind: 'contract_award', money: 'provisional', comparableFrom: 2019, kindSplitUntil: '2025-12', changes: false, cutoff: 'contract', defaultMeasure: 'numar' },
  acorduri: { id: 'acorduri', grain: 'contract', recordKind: 'framework_agreement', money: 'none', comparableFrom: 2019, kindSplitUntil: '2025-12', changes: false, cutoff: 'contract', defaultMeasure: 'numar' },
}

// ────────────────────────────────────────────────────────────────── axes ──

export type AxisId = 'cumparator' | 'furnizor' | 'cpv' | 'loc' | 'loc_firma' | 'procedura'
export type Dimension =
  | 'authority'
  | 'supplier'
  | 'cpvDivision'
  | 'cpvGroup'
  | 'cpvClass'
  | 'cpvCategory'
  | 'cpvCode'
  | 'buyerRegion'
  | 'buyerCounty'
  | 'buyerSiruta'
  | 'supplierRegion'
  | 'supplierCounty'
  | 'supplierSiruta'
  | 'procedureType'

/** A level of an axis: the API dimension that groups by it, the scope field that filters by it, its URL key. */
export interface Level {
  readonly id: string
  readonly dimension: Dimension
  readonly scopeKey: string
  /** The URL key a filter at this level is written under. */
  readonly param: string
  /** How a value looks in the URL (and is checked before any request: the API answers a bad value with zero rows). */
  readonly valid: RegExp
}

export interface Axis {
  readonly id: AxisId
  /** Coarse to fine. */
  readonly levels: readonly Level[]
  /** How its keys are named: organizations (the spine's labels), CPV codes, places, or SEAP's own words. */
  readonly names: 'org' | 'cpv' | 'place' | 'enum'
  /** How many values a filter may hold: 1 until the API takes a list. */
  readonly maxValues: number
  /** The populations it applies to. */
  readonly populations: readonly PopulationId[]
}

const COUNTY = /^[A-Z]{1,2}$/u
const SIRUTA = /^\d{1,8}$/u
const REGION = /^[\p{L} -]{2,40}$/u
const CUI = /^\d{2,12}$/u

export const AXES: Readonly<Record<AxisId, Axis>> = {
  cumparator: {
    id: 'cumparator',
    levels: [{ id: 'cui', dimension: 'authority', scopeKey: 'authorityCui', param: 'cumparator', valid: CUI }],
    names: 'org',
    maxValues: 1,
    populations: ['directe', 'contracte', 'acorduri'],
  },
  furnizor: {
    id: 'furnizor',
    levels: [{ id: 'cui', dimension: 'supplier', scopeKey: 'supplierCui', param: 'furnizor', valid: CUI }],
    names: 'org',
    maxValues: 1,
    populations: ['directe', 'contracte', 'acorduri'],
  },
  cpv: {
    id: 'cpv',
    // The URL keeps a CPV code as its digit prefix (2/3/4/5/8 digits): the API keys every level as eight digits, so „45000000" would name both division 45 and the generic code.
    levels: [
      { id: 'diviziune', dimension: 'cpvDivision', scopeKey: 'cpvDivision', param: 'cpv', valid: /^\d{2}$/u },
      { id: 'grup', dimension: 'cpvGroup', scopeKey: 'cpvGroup', param: 'cpv', valid: /^\d{2}[1-9]$/u },
      { id: 'clasa', dimension: 'cpvClass', scopeKey: 'cpvClass', param: 'cpv', valid: /^\d{3}[1-9]$/u },
      { id: 'categorie', dimension: 'cpvCategory', scopeKey: 'cpvCategory', param: 'cpv', valid: /^\d{4}[1-9]$/u },
      { id: 'cod', dimension: 'cpvCode', scopeKey: 'cpvCode', param: 'cpv', valid: /^\d{8}$/u },
    ],
    names: 'cpv',
    maxValues: 1,
    populations: ['directe', 'contracte', 'acorduri'],
  },
  loc: {
    id: 'loc',
    levels: [
      { id: 'regiune', dimension: 'buyerRegion', scopeKey: 'buyerRegion', param: 'regiune', valid: REGION },
      { id: 'judet', dimension: 'buyerCounty', scopeKey: 'buyerCounty', param: 'judet', valid: COUNTY },
      { id: 'localitate', dimension: 'buyerSiruta', scopeKey: 'buyerSiruta', param: 'localitate', valid: SIRUTA },
    ],
    names: 'place',
    maxValues: 1,
    populations: ['directe', 'contracte', 'acorduri'],
  },
  loc_firma: {
    id: 'loc_firma',
    levels: [
      { id: 'regiune', dimension: 'supplierRegion', scopeKey: 'supplierRegion', param: 'regiune_firma', valid: REGION },
      { id: 'judet', dimension: 'supplierCounty', scopeKey: 'supplierCounty', param: 'judet_firma', valid: COUNTY },
      { id: 'localitate', dimension: 'supplierSiruta', scopeKey: 'supplierSiruta', param: 'localitate_firma', valid: SIRUTA },
    ],
    names: 'place',
    maxValues: 1,
    populations: ['directe', 'contracte', 'acorduri'],
  },
  procedura: {
    id: 'procedura',
    // SEAP's own label without diacritics („Negociere fara publicare prealabila"): the scope takes it as it is.
    levels: [{ id: 'tip', dimension: 'procedureType', scopeKey: 'procedureType', param: 'procedura', valid: /^[\p{L}\p{N} ()-]{3,80}$/u }],
    names: 'enum',
    maxValues: 1,
    // Direct purchases have no procedure; the award rows carry the procedure's type.
    populations: ['contracte', 'acorduri'],
  },
}

export const AXIS_ORDER: readonly AxisId[] = ['cumparator', 'furnizor', 'cpv', 'loc', 'loc_firma', 'procedura']

export function levelOf(axis: AxisId, level: string): Level | null {
  return AXES[axis].levels.find((item) => item.id === level) ?? null
}

/** The CPV level a digit prefix names: 2 digits a division … 8 a code. */
export function cpvLevelOf(prefix: string): Level | null {
  return AXES.cpv.levels.find((level) => level.valid.test(prefix)) ?? null
}

/** A CPV prefix as the API keys it: eight digits, zero-padded. */
export function cpvKey(prefix: string): string {
  return prefix.padEnd(8, '0')
}

/** A filter's value as the API scope takes it: a division as its two digits, every finer level as eight. */
export function scopeValue(axis: AxisId, level: string, value: string): string {
  if (axis !== 'cpv') return value
  return level === 'diviziune' ? value : cpvKey(value)
}

/** A CPV bucket key back to its prefix at a level: „45200000" at `grup` → „452". */
export function cpvPrefix(key: string, level: string): string {
  const length = { diviziune: 2, grup: 3, clasa: 4, categorie: 5, cod: 8 }[level] ?? 8
  return key.slice(0, length)
}

// ───────────────────────────────────────────────────────────────── query ──

export type Measure = 'numar' | 'lei' | 'locuitor'
export type Bucket = 'year' | 'quarter' | 'month'

/** Months as `YYYY-MM`. */
export type Period = { readonly kind: 'recent' } | { readonly kind: 'year'; readonly year: number } | { readonly kind: 'months'; readonly from: string; readonly to: string }

export interface Filter {
  readonly level: string
  readonly values: readonly string[]
}

/** How the answer is laid out: ranked by an axis at a level, over time, or as the records themselves (no grouping). */
export type GroupBy = { readonly axis: AxisId; readonly level: string } | { readonly axis: 'timp'; readonly bucket: Bucket } | { readonly axis: 'inregistrari' }

export interface Query {
  readonly tip: PopulationId
  readonly period: Period
  readonly filters: Partial<Readonly<Record<AxisId, Filter>>>
  readonly titlu: string | null
  readonly valoare: { readonly min: number | null; readonly max: number | null } | null
  readonly dupa: GroupBy
  readonly masura: Measure
}

export const DEFAULT_QUERY: Query = {
  tip: 'directe',
  period: { kind: 'recent' },
  filters: {},
  titlu: null,
  valoare: null,
  dupa: { axis: 'cpv', level: 'diviziune' },
  masura: 'lei',
}

// ────────────────────────────────────────────────────────────────── URL ──

/** The URL's keys, Romanian like the front door's; a default is never written. */
export type AnalyticsSearch = Partial<Record<string, string>>

const GROUP_PARAMS: Readonly<Record<string, GroupBy>> = {
  inregistrari: { axis: 'inregistrari' },
  institutie: { axis: 'cumparator', level: 'cui' },
  firma: { axis: 'furnizor', level: 'cui' },
  categorie: { axis: 'cpv', level: 'diviziune' },
  grup: { axis: 'cpv', level: 'grup' },
  clasa: { axis: 'cpv', level: 'clasa' },
  categorie5: { axis: 'cpv', level: 'categorie' },
  cod: { axis: 'cpv', level: 'cod' },
  regiune: { axis: 'loc', level: 'regiune' },
  judet: { axis: 'loc', level: 'judet' },
  localitate: { axis: 'loc', level: 'localitate' },
  regiune_firma: { axis: 'loc_firma', level: 'regiune' },
  judet_firma: { axis: 'loc_firma', level: 'judet' },
  localitate_firma: { axis: 'loc_firma', level: 'localitate' },
  procedura: { axis: 'procedura', level: 'tip' },
  an: { axis: 'timp', bucket: 'year' },
  trimestru: { axis: 'timp', bucket: 'quarter' },
  luna: { axis: 'timp', bucket: 'month' },
}

export function groupParam(group: GroupBy): string {
  return Object.entries(GROUP_PARAMS).find(([, value]) => sameGroup(value, group))?.[0] ?? 'categorie'
}

export function sameGroup(a: GroupBy, b: GroupBy): boolean {
  if (a.axis === 'inregistrari' || b.axis === 'inregistrari') return a.axis === b.axis
  if (a.axis === 'timp' || b.axis === 'timp') return a.axis === b.axis && (a as { bucket: Bucket }).bucket === (b as { bucket: Bucket }).bucket
  return a.axis === b.axis && a.level === b.level
}

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/u

/** A URL value names one of a record's own keys, never `constructor` or another key its prototype holds. */
function ownKey(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

/** The first month any source holds (SEAP opened in 2007); a later bound is the cutoff's to set. */
export const FIRST_MONTH = '2007-01'

function periodOf(value: string | undefined): Period {
  if (!value) return { kind: 'recent' }
  if (/^\d{4}$/u.test(value) && value >= FIRST_MONTH.slice(0, 4) && value <= '2099') return { kind: 'year', year: Number(value) }
  const [from, to] = value.split('..')
  if (from && to && MONTH.test(from) && MONTH.test(to) && from >= FIRST_MONTH && from <= to) return { kind: 'months', from, to }
  return { kind: 'recent' }
}

export function periodParam(period: Period): string | undefined {
  if (period.kind === 'recent') return undefined
  if (period.kind === 'year') return String(period.year)
  return `${period.from}..${period.to}`
}

/** The query a URL holds; anything it cannot read falls back to the default, never to a wider answer than asked. */
export function queryOf(search: AnalyticsSearch): Query {
  const tip = search.tip && ownKey(POPULATIONS, search.tip) ? (search.tip as PopulationId) : DEFAULT_QUERY.tip
  const filters: Partial<Record<AxisId, Filter>> = {}
  for (const axisId of AXIS_ORDER) {
    const axis = AXES[axisId]
    if (!axis.populations.includes(tip)) continue
    // The finest level given wins: a county under a region names the narrower place.
    for (const level of [...axis.levels].reverse()) {
      const raw = search[level.param]
      if (!raw) continue
      const values = raw
        .split(',')
        .map((value) => normalizedValue(axisId, level, value))
        .filter(Boolean)
      if (axisId === 'cpv') {
        const cpvLevel = values[0] ? cpvLevelOf(values[0]) : null
        if (cpvLevel && values.slice(0, axis.maxValues).every((value) => cpvLevel.valid.test(value))) filters.cpv = { level: cpvLevel.id, values: values.slice(0, axis.maxValues) }
        break
      }
      const kept = values.filter((value) => level.valid.test(value)).slice(0, axis.maxValues)
      if (kept.length > 0) {
        filters[axisId] = { level: level.id, values: kept }
        break
      }
    }
  }
  const titlu = search.titlu && search.titlu.trim().length >= 3 ? search.titlu.trim().slice(0, 100) : null
  const [min, max] = (search.valoare ?? '').split('..').map((part) => (part.trim() === '' ? null : Number(part)))
  const valoare = min != null || max != null ? { min: Number.isFinite(min) ? (min ?? null) : null, max: Number.isFinite(max) ? (max ?? null) : null } : null
  const measure = (['numar', 'lei', 'locuitor'] as const).find((item) => item === search.masura) ?? POPULATIONS[tip].defaultMeasure
  // No `dupa` means the filters' own next question — the one `searchOf` leaves out.
  const dupa = (search.dupa && ownKey(GROUP_PARAMS, search.dupa) ? GROUP_PARAMS[search.dupa] : undefined) ?? defaultGroupOf({ tip, filters, titlu })
  return repaired({ tip, period: periodOf(search.perioada), filters, titlu, valoare: valoare && (valoare.min !== null || valoare.max !== null) ? valoare : null, dupa, masura: measure })
}

/** A value in the forms readers paste: a CUI with its „RO", a CPV code with its check digit („45000000-7"), a county in lower case. */
function normalizedValue(axis: AxisId, level: Level, raw: string): string {
  const value = raw.trim()
  if (axis === 'cumparator' || axis === 'furnizor') return value.replace(/^ro/iu, '').replace(/\s/gu, '')
  if (axis === 'cpv') return value.replace(/\s/gu, '').replace(/^(\d{8})-\d$/u, '$1')
  if (level.id === 'judet') return value.toUpperCase()
  return value
}

export interface UnreadParam {
  readonly param: string
  readonly value: string
}

const MEASURES: readonly string[] = ['numar', 'lei', 'locuitor']

/**
 * The address's keys the query could not use: a value that is not a CUI, a
 * code or a county; a filter the population does not take; a title under
 * three letters; a period, a group-by or a measure that does not exist. The
 * page says them — a dropped filter must never pass for the wider answer.
 */
export function unreadParams(search: AnalyticsSearch): readonly UnreadParam[] {
  const query = queryOf(search)
  const unread: UnreadParam[] = []
  const add = (param: string) => {
    const value = search[param]
    if (value !== undefined) unread.push({ param, value })
  }
  if (search.tip !== undefined && !ownKey(POPULATIONS, search.tip)) add('tip')
  if (search.perioada !== undefined && periodOf(search.perioada).kind === 'recent') add('perioada')
  if (search.cpv !== undefined && !query.filters.cpv) add('cpv')
  for (const axisId of AXIS_ORDER) {
    if (axisId === 'cpv') continue
    for (const level of AXES[axisId].levels) if (search[level.param] !== undefined && query.filters[axisId]?.level !== level.id) add(level.param)
  }
  if (search.titlu !== undefined && query.titlu === null) add('titlu')
  if (search.valoare !== undefined) {
    const ends = search.valoare.split('..')
    const unreadEnd = ends.length !== 2 || ends.some((end) => end.trim() !== '' && !Number.isFinite(Number(end)))
    if (unreadEnd || query.valoare === null) add('valoare')
  }
  if (search.dupa !== undefined && !ownKey(GROUP_PARAMS, search.dupa)) add('dupa')
  if (search.masura !== undefined && !MEASURES.includes(search.masura)) add('masura')
  return unread
}

/** The URL for a query: its keys in a fixed order (one cache entry per question), defaults left out. */
export function searchOf(query: Query): AnalyticsSearch {
  const search: Record<string, string> = {}
  if (query.tip !== DEFAULT_QUERY.tip) search.tip = query.tip
  const period = periodParam(query.period)
  if (period) search.perioada = period
  for (const axisId of AXIS_ORDER) {
    const filter = query.filters[axisId]
    const level = filter ? levelOf(axisId, filter.level) : null
    if (filter && level) search[level.param] = filter.values.join(',')
  }
  if (query.titlu) search.titlu = query.titlu
  if (query.valoare) search.valoare = `${query.valoare.min ?? ''}..${query.valoare.max ?? ''}`
  const group = groupParam(query.dupa)
  const defaultGroup = defaultGroupOf(query)
  if (!sameGroup(query.dupa, defaultGroup)) search.dupa = group
  if (query.masura !== POPULATIONS[query.tip].defaultMeasure) search.masura = query.masura
  return search
}

/** The search keys the page reads: every filter level's own, and the query's. */
export const SEARCH_KEYS: readonly string[] = ['tip', 'perioada', ...AXIS_ORDER.flatMap((axisId) => AXES[axisId].levels.map((level) => level.param)), 'titlu', 'valoare', 'dupa', 'masura'].filter(
  (key, index, keys) => keys.indexOf(key) === index,
)

/** The page's address as the router holds it: each key a string, or the number a digits-only value travels as. */
export type AnalyticsUrlSearch = Readonly<Partial<Record<string, string | number>>>

/**
 * The address the router writes. It writes a string that reads as JSON
 * quoted (`perioada=%222024%22`), so a value that is only digits (a year, a
 * CUI, a CPV code without a leading zero) goes as a number and reads back
 * as its digits: `perioada=2024`, `cumparator=4305857`.
 */
export function urlSearchOf(query: Query): AnalyticsUrlSearch {
  return Object.fromEntries(Object.entries(searchOf(query)).flatMap(([key, value]) => (value === undefined ? [] : [[key, /^[1-9]\d{0,14}$/u.test(value) ? Number(value) : value]])))
}

/**
 * A link's address from a question's words: the page's own address for
 * what it can read, and — kept as it came — any value it cannot (a foreign
 * fiscal code, a month before 2007), so the page says so instead of
 * answering a wider question in silence.
 */
export function linkSearchOf(search: AnalyticsSearch): AnalyticsUrlSearch {
  const unread = Object.fromEntries(unreadParams(search).map((item) => [item.param, item.value]))
  return { ...urlSearchOf(repaired(queryOf(search))), ...unread }
}

/** The address's values the page reads, as strings; any other key is left out. */
export function analyticsSearchOf(search: Readonly<Record<string, unknown>>): AnalyticsSearch {
  const strings: Record<string, string> = {}
  for (const key of SEARCH_KEYS) {
    const value = search[key]
    if (typeof value === 'string') strings[key] = value
    else if (typeof value === 'number' && Number.isFinite(value)) strings[key] = String(value)
  }
  return strings
}

// ────────────────────────────────────────────────────────── what works ──

/** The group-by a query opens on when it names none: a title's words open on the records they find; else the next axis after the finest filter. */
export function defaultGroupOf(query: Pick<Query, 'filters' | 'tip' | 'titlu'>): GroupBy {
  const { filters } = query
  if (query.titlu) return { axis: 'inregistrari' }
  if (filters.cumparator) return filters.furnizor ? { axis: 'cpv', level: nextCpvLevel(filters.cpv?.level) ?? 'diviziune' } : { axis: 'furnizor', level: 'cui' }
  if (filters.furnizor) return { axis: 'cumparator', level: 'cui' }
  if (filters.cpv) {
    const next = nextCpvLevel(filters.cpv.level)
    return next ? { axis: 'cpv', level: next } : { axis: 'furnizor', level: 'cui' }
  }
  if (filters.loc) return { axis: 'cumparator', level: 'cui' }
  if (filters.loc_firma) return { axis: 'furnizor', level: 'cui' }
  if (filters.procedura) return { axis: 'cumparator', level: 'cui' }
  return DEFAULT_QUERY.dupa
}

export function nextCpvLevel(level: string | undefined): string | null {
  const levels = AXES.cpv.levels.map((item) => item.id)
  if (!level) return levels[0]!
  const at = levels.indexOf(level)
  return at >= 0 && at < levels.length - 1 ? levels[at + 1]! : null
}

/** Why a group-by cannot be read for a query, or null when it can. */
export function groupProblem(query: Pick<Query, 'filters' | 'tip' | 'masura'>, group: GroupBy): 'fixed' | 'population' | null {
  if (group.axis === 'timp' || group.axis === 'inregistrari') return null
  const axis = AXES[group.axis]
  if (!axis.populations.includes(query.tip)) return 'population'
  const filter = query.filters[group.axis]
  if (!filter) return null
  // A fixed value cannot be grouped by (one bucket is the figures' answer); a finer level of the same axis can.
  const levels = axis.levels.map((level) => level.id)
  return levels.indexOf(group.level) > levels.indexOf(filter.level) ? null : 'fixed'
}

/** Per resident is read for buyer counties only: the population is the county's, and the institution's seat is where it is counted. */
export function perResidentAllowed(group: GroupBy): boolean {
  return group.axis === 'loc' && group.level === 'judet'
}

/**
 * The query made readable: filters the population cannot take dropped, a
 * group-by that cannot be read replaced by the next one that can, a measure
 * the population's money cannot carry replaced by the count.
 */
export function repaired(query: Query): Query {
  const population = POPULATIONS[query.tip]
  const filters: Partial<Record<AxisId, Filter>> = {}
  for (const axisId of AXIS_ORDER) {
    const filter = query.filters[axisId]
    if (filter && AXES[axisId].populations.includes(query.tip)) filters[axisId] = filter
  }
  let dupa = query.dupa
  if (groupProblem({ ...query, filters }, dupa)) dupa = defaultGroupOf({ tip: query.tip, filters, titlu: query.titlu })
  if (groupProblem({ ...query, filters }, dupa)) dupa = { axis: 'timp', bucket: 'year' }
  let masura = query.masura
  if (masura === 'lei' && population.money === 'none') masura = 'numar'
  if (masura === 'locuitor' && !perResidentAllowed(dupa)) masura = population.money === 'clean' ? 'lei' : 'numar'
  return { ...query, filters, dupa, masura }
}

/** A row's drill: its filter added, the group-by moved to the next natural axis. */
export function drilled(query: Query, group: GroupBy, key: string): Query {
  // A record is not drilled: its row opens its own page.
  if (group.axis === 'inregistrari') return query
  if (group.axis === 'timp') {
    // A year opens its months; a month or a quarter becomes the period.
    if (group.bucket === 'year') return repaired({ ...query, period: { kind: 'year', year: Number(key) }, dupa: { axis: 'timp', bucket: 'month' } })
    const range = group.bucket === 'month' ? { from: key, to: key } : quarterMonths(key)
    return repaired({ ...query, period: { kind: 'months', from: range.from ?? key, to: range.to ?? key }, dupa: defaultGroupOf(query) })
  }
  const value = group.axis === 'cpv' ? cpvPrefix(key, group.level) : key
  const filters = { ...query.filters, [group.axis]: { level: group.level, values: [value] } }
  const next = nextGroupAfter(group, { ...query, filters })
  return repaired({ ...query, filters, dupa: next })
}

function quarterMonths(key: string): { from?: string; to?: string } {
  const match = /^(\d{4})-Q([1-4])$/u.exec(key)
  if (!match) return {}
  const first = (Number(match[2]) - 1) * 3 + 1
  return { from: `${match[1]}-${String(first).padStart(2, '0')}`, to: `${match[1]}-${String(first + 2).padStart(2, '0')}` }
}

/** Where a click leads: an institution to its firms, a firm to its institutions, a category one level down (then its firms), a place one level down (then its institutions). */
export function nextGroupAfter(group: GroupBy, query: Query): GroupBy {
  if (group.axis === 'timp' || group.axis === 'inregistrari') return group
  const candidates: GroupBy[] = []
  if (group.axis === 'cumparator') candidates.push({ axis: 'furnizor', level: 'cui' }, { axis: 'cpv', level: 'diviziune' })
  if (group.axis === 'furnizor') candidates.push({ axis: 'cumparator', level: 'cui' }, { axis: 'cpv', level: 'diviziune' })
  if (group.axis === 'cpv') {
    const next = nextCpvLevel(group.level)
    if (next) candidates.push({ axis: 'cpv', level: next })
    candidates.push({ axis: 'furnizor', level: 'cui' }, { axis: 'cumparator', level: 'cui' })
  }
  if (group.axis === 'loc' || group.axis === 'loc_firma') {
    const levels = AXES[group.axis].levels.map((level) => level.id)
    const next = levels[levels.indexOf(group.level) + 1]
    if (next) candidates.push({ axis: group.axis, level: next })
    candidates.push(group.axis === 'loc' ? { axis: 'cumparator', level: 'cui' } : { axis: 'furnizor', level: 'cui' })
  }
  if (group.axis === 'procedura') candidates.push({ axis: 'cumparator', level: 'cui' }, { axis: 'furnizor', level: 'cui' })
  return candidates.find((candidate) => groupProblem(query, candidate) === null) ?? { axis: 'timp', bucket: 'year' }
}

/** A filter removed; the group-by kept when it still reads, else the next one that does. */
export function withoutFilter(query: Query, axis: AxisId): Query {
  const filters = { ...query.filters }
  delete filters[axis]
  return repaired({ ...query, filters })
}

/**
 * A title's words set or cleared. A group-by the reader did not choose
 * follows the question: the words open on the records they find, and
 * clearing them returns to the filters' own next question.
 */
export function withTitle(query: Query, titlu: string | null): Query {
  const next = { ...query, titlu }
  return repaired(sameGroup(query.dupa, defaultGroupOf(query)) ? { ...next, dupa: defaultGroupOf(next) } : next)
}

export function withFilter(query: Query, axis: AxisId, level: string, value: string): Query {
  return repaired({ ...query, filters: { ...query.filters, [axis]: { level, values: [value] } } })
}

// ─────────────────────────────────────────────────────────────── period ──

export interface ResolvedPeriod {
  readonly from: string
  readonly to: string
  /** The last month is the population's cutoff (still filling past it). */
  readonly throughCutoff: boolean
  /** The period asked for lies wholly after the data: these are the last twelve months instead. */
  readonly replaced: boolean
  /**
   * The same months a whole number of years before, for the figures' change:
   * January–May against January–May, never against a window that holds a
   * December.
   */
  readonly previous: { readonly from: string; readonly to: string }
}

/** A series bucket's first month: `2026`, `2026-Q2`, `2026-04`. */
export function bucketStart(bucket: string): string {
  if (/^\d{4}$/u.test(bucket)) return `${bucket}-01`
  const quarter = /^(\d{4})-Q([1-4])$/u.exec(bucket)
  if (quarter) return `${quarter[1]}-${String((Number(quarter[2]) - 1) * 3 + 1).padStart(2, '0')}`
  return bucket
}

export function addMonths(month: string, count: number): string {
  const [year, monthIndex] = month.split('-').map(Number) as [number, number]
  const total = year * 12 + (monthIndex - 1) + count
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number) as [number, number]
  const [ty, tm] = to.split('-').map(Number) as [number, number]
  return (ty - fy) * 12 + (tm - fm) + 1
}

/**
 * The months a period covers, from the population's cutoff: the last twelve
 * complete months; a year (the year in progress through its cutoff); an
 * interval, clamped to the cutoff (the lists run ahead of the analysis build).
 */
export function resolvePeriod(period: Period, cutoff: string): ResolvedPeriod {
  let from: string
  let to: string
  if (period.kind === 'recent') {
    to = cutoff
    from = addMonths(cutoff, -11)
  } else if (period.kind === 'year') {
    from = `${period.year}-01`
    to = `${period.year}-12` > cutoff ? cutoff : `${period.year}-12`
  } else {
    from = period.from
    to = period.to > cutoff ? cutoff : period.to
  }
  if (from > cutoff) return { ...resolvePeriod({ kind: 'recent' }, cutoff), replaced: true }
  if (to < from) to = from
  const shift = Math.ceil(monthsBetween(from, to) / 12) * 12
  return { from, to, throughCutoff: to === cutoff, replaced: false, previous: { from: addMonths(from, -shift), to: addMonths(to, -shift) } }
}

/** A series bucket's months: `2026` → January to December, `2026-Q2` → April to June, a month itself. */
export function bucketMonths(bucket: string): { readonly from: string; readonly to: string } {
  const from = bucketStart(bucket)
  if (/^\d{4}$/u.test(bucket)) return { from, to: `${bucket}-12` }
  if (/^\d{4}-Q[1-4]$/u.test(bucket)) return { from, to: addMonths(from, 2) }
  return { from, to: from }
}

/** Every bucket from one month to another (the API leaves out a bucket with nothing in it). */
export function bucketsBetween(from: string, to: string, bucket: Bucket): readonly string[] {
  const keys: string[] = []
  for (let month = from; month <= to; month = addMonths(month, 1)) {
    const key = bucket === 'year' ? month.slice(0, 4) : bucket === 'quarter' ? `${month.slice(0, 4)}-Q${Math.ceil(Number(month.slice(5, 7)) / 3)}` : month
    if (keys[keys.length - 1] !== key) keys.push(key)
  }
  return keys
}

/** The part of a bucket a window leaves out: 2025 in June 2025 – May 2026 starts in June; null when the window holds it whole. */
export function clippedBucket(bucket: string, window: { readonly from: string; readonly to: string }): { readonly from: string | null; readonly to: string | null } | null {
  const months = bucketMonths(bucket)
  const from = months.from < window.from ? window.from : null
  const to = months.to > window.to ? window.to : null
  return from || to ? { from, to } : null
}
