import {
  COMPANY_ANALYSIS_CAEN_BASES,
  COMPANY_ANALYSIS_FLAG_VALUES,
  COMPANY_ANALYSIS_METRICS,
  COMPANY_ANALYSIS_RELEASE_ID_RE,
  COMPANY_ANALYSIS_SIZE_BANDS,
  companyMetricUnit,
  type CompanyAnalysisCaenBasis,
  type CompanyAnalysisCohortMode,
  type CompanyAnalysisDimension,
  type CompanyAnalysisDirection,
  type CompanyAnalysisFlagValue,
  type CompanyAnalysisKeyFilterInput,
  type CompanyAnalysisMetric,
  type CompanyAnalysisRangeInput,
  type CompanyAnalysisRankBy,
  type CompanyAnalysisRecordSort,
  type CompanyAnalysisScope,
  type CompanyAnalysisSizeBand,
} from '@/schemas/company-analytics'

/**
 * `/companies/analytics` — the question its address holds. Every choice on
 * the page is a key here, so a question is a link and Back undoes a step:
 * the fiscal year, the measure, the panel and its grouping, the records'
 * order, the series' cohort, every filter and the pinned release.
 *
 * The keys are short Romanian words, as the procurement analysis writes
 * them; a default is not written. A value the page cannot read is kept in
 * `unread` — the page says it could not read it rather than answer a wider
 * question in silence.
 */

export type AnalyticsPanel = 'firme' | 'defalcare' | 'evolutie'

export interface CompanyAnalyticsState {
  /** Null: the release's default year (2024 when offered). */
  readonly year: number | null
  /** Null: the release's default measure. */
  readonly metric: CompanyAnalysisMetric | null
  readonly panel: AnalyticsPanel
  readonly dimension: CompanyAnalysisDimension
  /** Null: the release's default ranking. */
  readonly rankBy: CompanyAnalysisRankBy | null
  readonly sort: CompanyAnalysisRecordSort
  /** Null: the sort's own default (largest first; CUIs ascending). */
  readonly direction: CompanyAnalysisDirection | null
  /** Null: the API's default (the reference-year cohort when the scope filters the year's statements). */
  readonly cohort: CompanyAnalysisCohortMode | null
  /** The release every read is pinned to; null until the page resolves one. */
  readonly release: string | null
  readonly scope: CompanyAnalysisScope
  /** The page's keys whose values (or some of them) it could not read. */
  readonly unread: readonly string[]
}

export const DEFAULT_STATE: CompanyAnalyticsState = {
  year: null,
  metric: null,
  panel: 'firme',
  dimension: 'COUNTY',
  rankBy: null,
  sort: 'METRIC',
  direction: null,
  cohort: null,
  release: null,
  scope: {},
  unread: [],
}

// ─────────────────────────────────────────────────────────────── words ──

const UNKNOWN = 'necunoscut'

const PANEL_WORDS: Readonly<Record<AnalyticsPanel, string>> = { firme: 'firme', defalcare: 'defalcare', evolutie: 'evolutie' }

export const DIMENSION_WORDS: Readonly<Record<CompanyAnalysisDimension, string>> = {
  COUNTY: 'judet',
  UAT: 'uat',
  MAIN_CAEN: 'caen',
  LEGAL_FORM: 'forma',
  OBSERVED_STATUS: 'stare',
  VAT_PAYER: 'tva',
  FISCALLY_INACTIVE: 'inactiv',
  EMPLOYEE_SIZE: 'marime',
}

const RANK_WORDS: Readonly<Record<CompanyAnalysisRankBy, string>> = { METRIC_SUM: 'suma', COMPANIES: 'firme', FILERS: 'depuneri', CONTRIBUTORS: 'raportari' }
const COHORT_WORDS: Readonly<Record<CompanyAnalysisCohortMode, string>> = { REFERENCE_YEAR: 'an-referinta', EACH_YEAR: 'fiecare-an' }
const FLAG_WORDS: Readonly<Record<CompanyAnalysisFlagValue, string>> = { YES: 'da', NO: 'nu', UNKNOWN: UNKNOWN }
const BASIS_WORDS: Readonly<Record<CompanyAnalysisCaenBasis, string>> = { REVISION_KNOWN: 'cunoscuta', REVISION_UNKNOWN: 'necunoscuta', MISSING: 'lipsa' }
const SIZE_WORDS: Readonly<Record<CompanyAnalysisSizeBand, string>> = {
  UNAVAILABLE: 'indisponibil',
  NEGATIVE: 'negativ',
  ZERO: 'zero',
  FROM_1_TO_9: '1-9',
  FROM_10_TO_49: '10-49',
  FROM_50_TO_249: '50-249',
  FROM_250: '250plus',
}

/** A measure in the address: the data contract's own column name (`turnover`, `net_result`). */
export function metricWord(metric: CompanyAnalysisMetric): string {
  return metric.toLowerCase()
}

function invert<K extends string>(words: Readonly<Record<K, string>>): ReadonlyMap<string, K> {
  return new Map(Object.entries(words).map(([key, word]) => [word as string, key as K]))
}

const PANEL_BY_WORD = invert(PANEL_WORDS)
const DIMENSION_BY_WORD = invert(DIMENSION_WORDS)
const RANK_BY_WORD = invert(RANK_WORDS)
const COHORT_BY_WORD = invert(COHORT_WORDS)
const FLAG_BY_WORD = invert(FLAG_WORDS)
const BASIS_BY_WORD = invert(BASIS_WORDS)
const SIZE_BY_WORD = invert(SIZE_WORDS)
const METRIC_BY_WORD = new Map(COMPANY_ANALYSIS_METRICS.map((metric) => [metricWord(metric), metric]))

/** Every key the page reads: the rest of an address (`lang`, the site's own) is left as it came. */
export const SEARCH_KEYS = [
  'an',
  'indicator',
  'vedere',
  'dupa',
  'clasare',
  'ordine',
  'sens',
  'cohorta',
  'editie',
  'cui',
  'judet',
  'uat',
  'forma',
  'stare',
  'tva',
  'inactiv',
  'caen',
  'caen_baza',
  'depunere',
  'interval',
  'marime',
] as const
export type SearchKey = (typeof SEARCH_KEYS)[number]

/** The address's values as text: the router hands a digits-only value over as a number. */
export type CompanyAnalyticsSearch = Readonly<Partial<Record<SearchKey, string>>>
/** The address the router writes: strings, and the numbers digits-only values travel as. */
export type CompanyAnalyticsUrlSearch = Readonly<Partial<Record<SearchKey, string | number>>>

export function analyticsSearchOf(search: Readonly<Record<string, unknown>>): CompanyAnalyticsSearch {
  const strings: Partial<Record<SearchKey, string>> = {}
  for (const key of SEARCH_KEYS) {
    const value = search[key]
    if (typeof value === 'string') strings[key] = value
    else if (typeof value === 'number' && Number.isFinite(value)) strings[key] = String(value)
    else if (value !== undefined && value !== null) strings[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
  return strings
}

/** The address's keys that are not the page's — `lang`, the site's own — which every change of question keeps. */
export function siteSearchOf<S extends Readonly<Record<string, unknown>>>(search: S): Partial<S> {
  return Object.fromEntries(Object.entries(search).filter(([key]) => !(SEARCH_KEYS as readonly string[]).includes(key))) as Partial<S>
}

// ───────────────────────────────────────────────────────────── reading ──

const CUI_RE = /^[1-9]\d{0,9}$/u
const COUNTY_RE = /^[A-Z]{1,2}$/u
const SIRUTA_RE = /^\d{1,7}$/u
const LEGAL_FORM_RE = /^[A-Za-z0-9/._-]{1,16}$/u
const STATUS_RE = /^[A-Za-z0-9._-]{1,32}$/u
const CAEN_CODE_RE = /^[A-Za-z0-9.]{1,12}$/u
const CAEN_REVISION_RE = /^[A-Za-z0-9._-]{1,16}$/u
const MONEY_BOUND_RE = /^-?\d{1,16}(?:\.\d{1,2})?$/u
const HEADCOUNT_BOUND_RE = /^-?\d{1,18}$/u

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

interface Reader {
  readonly unread: Set<string>
}

/** A comma list's tokens, each read by `read`; a token it cannot read marks the key unread. */
function tokens<T>(reader: Reader, key: SearchKey, text: string | undefined, read: (token: string) => T | null): T[] {
  if (text === undefined) return []
  const out: T[] = []
  for (const raw of text.split(',')) {
    const token = raw.trim()
    if (token === '') continue
    const value = read(token)
    if (value === null) reader.unread.add(key)
    else out.push(value)
  }
  return out
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort(byText)
}

function inVocabulary<T extends string>(values: readonly T[], vocabulary: readonly T[]): T[] {
  return vocabulary.filter((value) => values.includes(value))
}

function keyFilter(reader: Reader, key: SearchKey, text: string | undefined, pattern: RegExp, normalize: (token: string) => string = (token) => token): CompanyAnalysisKeyFilterInput | undefined {
  let includeUnknown = false
  const values = tokens(reader, key, text, (token) => {
    if (token === UNKNOWN) {
      includeUnknown = true
      return ''
    }
    const value = normalize(token)
    return pattern.test(value) ? value : null
  }).filter((value) => value !== '')
  if (values.length === 0 && !includeUnknown) return undefined
  return { ...(values.length > 0 ? { in: sortedUnique(values) } : {}), ...(includeUnknown ? { includeUnknown: true } : {}) }
}

/** `turnover:1000000~5000000.50`, `employees:10~`, `net_loss:~0`. */
function rangeOf(token: string): CompanyAnalysisRangeInput | null {
  const separator = token.indexOf(':')
  if (separator <= 0) return null
  const metric = METRIC_BY_WORD.get(token.slice(0, separator))
  const bounds = token.slice(separator + 1).split('~')
  if (!metric || bounds.length !== 2) return null
  const pattern = companyMetricUnit(metric) === 'RON' ? MONEY_BOUND_RE : HEADCOUNT_BOUND_RE
  const [min = '', max = ''] = bounds
  if ((min !== '' && !pattern.test(min)) || (max !== '' && !pattern.test(max)) || (min === '' && max === '')) return null
  return { metric, ...(min !== '' ? { min } : {}), ...(max !== '' ? { max } : {}) }
}

/** `6201` (revision not published by ANAF: never guessed) or `rev2:6201`. */
function caenOf(token: string): { code: string; revision?: string } | null {
  const separator = token.indexOf(':')
  const revision = separator > 0 ? token.slice(0, separator) : null
  const code = separator > 0 ? token.slice(separator + 1) : token
  if (!CAEN_CODE_RE.test(code) || (revision !== null && !CAEN_REVISION_RE.test(revision))) return null
  return revision === null ? { code } : { code, revision }
}

export function caenToken(selector: { readonly code: string; readonly revision?: string | null }): string {
  return selector.revision ? `${selector.revision}:${selector.code}` : selector.code
}

function one<T>(reader: Reader, key: SearchKey, text: string | undefined, read: (text: string) => T | undefined): T | undefined {
  if (text === undefined || text === '') return undefined
  const value = read(text)
  if (value === undefined) reader.unread.add(key)
  return value
}

/** The question an address holds. */
export function stateOf(search: CompanyAnalyticsSearch): CompanyAnalyticsState {
  const reader: Reader = { unread: new Set() }
  const year = one(reader, 'an', search.an, (text) => (/^(19|20)\d{2}$/u.test(text) ? Number(text) : undefined))
  const metric = one(reader, 'indicator', search.indicator, (text) => METRIC_BY_WORD.get(text))
  const panel = one(reader, 'vedere', search.vedere, (text) => PANEL_BY_WORD.get(text))
  const dimension = one(reader, 'dupa', search.dupa, (text) => DIMENSION_BY_WORD.get(text))
  const rankBy = one(reader, 'clasare', search.clasare, (text) => RANK_BY_WORD.get(text))
  const sort = one(reader, 'ordine', search.ordine, (text) => (text === 'cui' ? ('CUI' as const) : undefined))
  const direction = one(reader, 'sens', search.sens, (text) => (text === 'asc' ? ('ASC' as const) : text === 'desc' ? ('DESC' as const) : undefined))
  const cohort = one(reader, 'cohorta', search.cohorta, (text) => COHORT_BY_WORD.get(text))
  const release = one(reader, 'editie', search.editie, (text) => (COMPANY_ANALYSIS_RELEASE_ID_RE.test(text) ? text : undefined))

  const scope: { -readonly [K in keyof CompanyAnalysisScope]: CompanyAnalysisScope[K] } = {}
  const cuis = sortedUnique(tokens(reader, 'cui', search.cui, (token) => (CUI_RE.test(token.replace(/^RO/iu, '')) ? token.replace(/^RO/iu, '') : null)))
  if (cuis.length > 0) scope.cuis = cuis
  const county = keyFilter(reader, 'judet', search.judet, COUNTY_RE, (token) => token.toUpperCase())
  if (county) scope.county = county
  const uat = keyFilter(reader, 'uat', search.uat, SIRUTA_RE)
  if (uat) scope.uat = uat
  const legalForms = sortedUnique(tokens(reader, 'forma', search.forma, (token) => (LEGAL_FORM_RE.test(token) ? token.toUpperCase() : null)))
  if (legalForms.length > 0) scope.legalForms = legalForms
  const status = keyFilter(reader, 'stare', search.stare, STATUS_RE)
  if (status) scope.observedStatus = status
  const vat = inVocabulary(tokens(reader, 'tva', search.tva, (token) => FLAG_BY_WORD.get(token) ?? null), COMPANY_ANALYSIS_FLAG_VALUES)
  if (vat.length > 0) scope.vatPayer = vat
  const inactive = inVocabulary(tokens(reader, 'inactiv', search.inactiv, (token) => FLAG_BY_WORD.get(token) ?? null), COMPANY_ANALYSIS_FLAG_VALUES)
  if (inactive.length > 0) scope.fiscallyInactive = inactive
  const caen = new Map(tokens(reader, 'caen', search.caen, caenOf).map((selector) => [caenToken(selector), selector]))
  if (caen.size > 0) scope.mainCaen = [...caen.entries()].sort(([a], [b]) => byText(a, b)).map(([, selector]) => selector)
  const bases = inVocabulary(tokens(reader, 'caen_baza', search.caen_baza, (token) => BASIS_BY_WORD.get(token) ?? null), COMPANY_ANALYSIS_CAEN_BASES)
  if (bases.length > 0) scope.mainCaenBasis = bases
  const filing = one(reader, 'depunere', search.depunere, (text) => (text === 'da' ? ('FILED' as const) : text === 'nu' ? ('NOT_FILED' as const) : undefined))
  if (filing) scope.filing = filing
  const ranges = new Map<CompanyAnalysisMetric, CompanyAnalysisRangeInput>()
  for (const range of tokens(reader, 'interval', search.interval, rangeOf)) {
    // One range per measure, as the API takes them: a second one for the same measure is not read.
    if (ranges.has(range.metric)) reader.unread.add('interval')
    else ranges.set(range.metric, range)
  }
  if (ranges.size > 0) scope.financialRanges = COMPANY_ANALYSIS_METRICS.flatMap((item) => (ranges.has(item) ? [ranges.get(item)!] : []))
  const sizes = inVocabulary(tokens(reader, 'marime', search.marime, (token) => SIZE_BY_WORD.get(token) ?? null), COMPANY_ANALYSIS_SIZE_BANDS)
  if (sizes.length > 0) scope.employeeSizeBands = sizes
  // A company without a statement has no reported value or size band: the API refuses the pair, and so does the page.
  if (scope.filing === 'NOT_FILED' && (scope.financialRanges || scope.employeeSizeBands)) {
    reader.unread.add('depunere')
    delete scope.filing
  }

  return {
    year: year ?? null,
    metric: metric ?? null,
    panel: panel ?? 'firme',
    dimension: dimension ?? 'COUNTY',
    rankBy: rankBy ?? null,
    sort: sort ?? 'METRIC',
    direction: direction ?? null,
    cohort: cohort ?? null,
    release: release ?? null,
    scope,
    unread: SEARCH_KEYS.filter((key) => reader.unread.has(key)),
  }
}

// ───────────────────────────────────────────────────────────── writing ──

function keyFilterText(filter: CompanyAnalysisKeyFilterInput | undefined): string | undefined {
  if (!filter) return undefined
  const values = [...(filter.in ?? []), ...(filter.includeUnknown ? [UNKNOWN] : [])]
  return values.length > 0 ? values.join(',') : undefined
}

function list(values: readonly string[] | undefined): string | undefined {
  return values && values.length > 0 ? values.join(',') : undefined
}

export function rangeToken(range: CompanyAnalysisRangeInput): string {
  return `${metricWord(range.metric)}:${range.min ?? ''}~${range.max ?? ''}`
}

/** The address of a question: every choice that is not its default, in the page's words. */
export function searchOf(state: CompanyAnalyticsState): CompanyAnalyticsSearch {
  const { scope } = state
  const entries: [SearchKey, string | undefined][] = [
    ['an', state.year === null ? undefined : String(state.year)],
    ['indicator', state.metric === null ? undefined : metricWord(state.metric)],
    ['vedere', state.panel === 'firme' ? undefined : PANEL_WORDS[state.panel]],
    ['dupa', state.dimension === 'COUNTY' ? undefined : DIMENSION_WORDS[state.dimension]],
    ['clasare', state.rankBy === null ? undefined : RANK_WORDS[state.rankBy]],
    ['ordine', state.sort === 'CUI' ? 'cui' : undefined],
    ['sens', state.direction === null ? undefined : state.direction.toLowerCase()],
    ['cohorta', state.cohort === null ? undefined : COHORT_WORDS[state.cohort]],
    ['editie', state.release ?? undefined],
    ['cui', list(scope.cuis)],
    ['judet', keyFilterText(scope.county)],
    ['uat', keyFilterText(scope.uat)],
    ['forma', list(scope.legalForms)],
    ['stare', keyFilterText(scope.observedStatus)],
    ['tva', list(scope.vatPayer?.map((flag) => FLAG_WORDS[flag]))],
    ['inactiv', list(scope.fiscallyInactive?.map((flag) => FLAG_WORDS[flag]))],
    ['caen', list(scope.mainCaen?.map(caenToken))],
    ['caen_baza', list(scope.mainCaenBasis?.map((basis) => BASIS_WORDS[basis]))],
    ['depunere', scope.filing === undefined ? undefined : scope.filing === 'FILED' ? 'da' : 'nu'],
    ['interval', list(scope.financialRanges?.map(rangeToken))],
    ['marime', list(scope.employeeSizeBands?.map((band) => SIZE_WORDS[band]))],
  ]
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined)) as CompanyAnalyticsSearch
}

/**
 * The address the router writes. A string that reads as JSON would be
 * written quoted (`an=%222024%22`): a digits-only value goes as a number,
 * and reads back as its digits.
 */
export function urlSearchOf(state: CompanyAnalyticsState): CompanyAnalyticsUrlSearch {
  return Object.fromEntries(Object.entries(searchOf(state)).map(([key, value]) => [key, /^[1-9]\d{0,14}$/u.test(value) ? Number(value) : value])) as CompanyAnalyticsUrlSearch
}

// ──────────────────────────────────────────────────────────── changes ──

/** The question with another scope: the list and the series start over (a key of their own), the rest stays. */
export function withScope(state: CompanyAnalyticsState, scope: CompanyAnalysisScope): CompanyAnalyticsState {
  return { ...state, scope: normalizedScope(scope), unread: [] }
}

/** The scope in the address's canonical order: the same question is one address, one cache key. */
export function normalizedScope(scope: CompanyAnalysisScope): CompanyAnalysisScope {
  const parsed = stateOf(searchOf({ ...DEFAULT_STATE, scope }))
  return parsed.scope
}

/** How many filters are on, a key filter's unknown group counting as one of its values. */
export function filterCount(scope: CompanyAnalysisScope): number {
  return Object.values(scope).filter((value) => value !== undefined).length
}

/** The records' reset key: a new release, scope, year or order starts the list over from its first page. */
export function recordsKeyOf(parts: {
  readonly release: string
  readonly scopeKey: unknown
  readonly year: number
  readonly sort: CompanyAnalysisRecordSort
  readonly sortMetric: CompanyAnalysisMetric | null
  readonly direction: CompanyAnalysisDirection
}): string {
  return JSON.stringify([parts.release, parts.scopeKey, parts.year, parts.sort, parts.sortMetric, parts.direction])
}
