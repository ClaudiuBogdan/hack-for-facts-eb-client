import { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { readCutoffOutcome } from './procurement-cutoff'
import {
  AXIS_ORDER,
  POPULATIONS,
  bucketsBetween,
  levelOf,
  monthsBetween,
  resolvePeriod,
  scopeValue,
  type Dimension,
  type Query,
  type ResolvedPeriod,
} from '../lib/analytics-model'
import { procurementAnalyticsKeys } from '../lib/analytics-keys'

/**
 * The analytics page's reads. A query compiles to independent reads, each
 * its own request so one refused root cannot erase the answer (the API nulls
 * a whole response for one invalid field), all side by side (the API
 * answers them in parallel, 120–460 ms each):
 *
 * - tier 0, the answer: the figures (the window and the one before it) and
 *   the ranked list or the series the group-by asks for;
 * - tier 1, the context: the firms' concentration, the years since 2019;
 * - tier 2, the names: the spine's labels and the CPV labels for the keys
 *   the answer holds; the counties from the reference read, the localities
 *   from the map's own file.
 *
 * Records are a separate read, on request (lists are the API's slowest reads).
 * The hooks that hold them are in `use-procurement-analytics.ts`.
 */

const decimal = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform((value) => (value === null || value === undefined ? null : Number(value)))

export type Scope = Readonly<Record<string, unknown>>

// ────────────────────────────────────────────────────────────── scopes ──

/** The API scope for a query over some months (none: every month the population has). */
export function scopeOf(query: Query, months: { readonly from: string; readonly to: string } | null): Scope {
  const population = POPULATIONS[query.tip]
  const scope: Record<string, unknown> = { grain: population.grain }
  if (population.recordKind) scope.recordKind = population.recordKind
  for (const axisId of AXIS_ORDER) {
    const filter = query.filters[axisId]
    const level = filter ? levelOf(axisId, filter.level) : null
    const value = filter?.values[0]
    if (!level || !value) continue
    scope[level.scopeKey] = scopeValue(axisId, level.id, value)
  }
  if (months) {
    scope.from = months.from
    scope.to = months.to
  }
  if (query.titlu) scope.q = query.titlu
  if (query.valoare?.min != null) scope.valueMin = query.valoare.min
  if (query.valoare?.max != null) scope.valueMax = query.valoare.max
  return scope
}

// ──────────────────────────────────────────────────────────────── cutoff ──

export interface AnalyticsCutoff {
  readonly direct: string
  readonly contract: string
  /** The cutoff could not be read: the last complete year's end stands in. */
  readonly failed: boolean
}

/** Each population's newest complete month, from the shared national read (never from a narrow selection). */
export async function readAnalyticsCutoff(latest: number): Promise<AnalyticsCutoff> {
  const outcome = await readCutoffOutcome(latest)
  // With no cutoff read, the last complete year's end: never a month the source has not filled.
  return { direct: outcome.cutoff.direct ?? `${latest}-12`, contract: outcome.cutoff.contract ?? `${latest}-12`, failed: outcome.failed }
}

// ─────────────────────────────────────────────────────────────── figures ──

const statsSchema = z.object({
  blocks: z.array(
    z.object({
      recordCount: decimal,
      withValueCount: decimal,
      valueAwardedSum: decimal,
      avgValueAwarded: decimal,
      meta: z
        .object({
          answerability: z.string().nullable(),
          provisional: z.boolean().nullable(),
          caveats: z.array(z.string()).nullable(),
          undatedInScope: z.object({ count: decimal, valueRon: decimal }).nullable(),
        })
        .nullable(),
    }),
  ),
})

export interface Figures {
  /** Null when the API abstains: unknown, not none. */
  readonly records: number | null
  readonly valued: number
  readonly money: number | null
  readonly average: number | null
  /** `served`, `degraded` (the API answers, with a disclosed gap) or `abstained`. */
  readonly answerability: string | null
  readonly provisional: boolean
  readonly caveats: readonly string[]
  readonly undated: number | null
  readonly undatedMoney: number | null
}

const STATS_FIELDS =
  'blocks { recordCount withValueCount valueAwardedSum avgValueAwarded meta { answerability provisional caveats undatedInScope { count valueRon } } }'

function figuresOf(raw: unknown): Figures | null {
  const block = statsSchema.parse(raw).blocks[0]
  if (!block) return null
  return {
    records: block.recordCount,
    valued: block.withValueCount ?? 0,
    money: block.valueAwardedSum,
    average: block.avgValueAwarded,
    answerability: block.meta?.answerability ?? null,
    provisional: block.meta?.provisional ?? false,
    caveats: block.meta?.caveats ?? [],
    undated: block.meta?.undatedInScope?.count ?? null,
    undatedMoney: block.meta?.undatedInScope?.valueRon ?? null,
  }
}

export async function readFigures(scope: Scope, previous: Scope | null, signal: AbortSignal) {
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsFigures($now: ProcurementAnalysisScopeInput${previous ? ', $before: ProcurementAnalysisScopeInput' : ''}) {
      now: procurementStats(scope: $now) { ${STATS_FIELDS} }
      ${previous ? `before: procurementStats(scope: $before) { ${STATS_FIELDS} }` : ''}
    }`,
    previous ? { now: scope, before: previous } : { now: scope },
    { operationName: 'AnalyticsFigures', signal },
  )
  return { now: figuresOf(raw.now), before: previous ? figuresOf(raw.before) : null }
}

const concentrationSchema = z.array(z.object({ supplierCount: z.number().nullable(), top1Share: decimal, top5Share: decimal }))

export interface Concentration {
  readonly firms: number | null
  readonly top1: number | null
  readonly top5: number | null
}

export async function readConcentration(scope: Scope, basis: 'count' | 'value', signal: AbortSignal): Promise<Concentration | null> {
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsConcentration($s: ProcurementAnalysisScopeInput) { c: procurementConcentration(scope: $s, basis: ${basis}) { supplierCount top1Share top5Share } }`,
    { s: scope },
    { operationName: 'AnalyticsConcentration', signal },
  )
  const block = concentrationSchema.parse(raw.c)[0]
  return block ? { firms: block.supplierCount, top1: block.top1Share, top5: block.top5Share } : null
}

// ──────────────────────────────────────────────────────── ranked answer ──

const breakdownSchema = z.array(
  z.object({
    rankedBy: z.string().nullable(),
    valueWithheldAssociationSum: decimal,
    buckets: z.array(z.object({ key: z.string().nullable(), kind: z.string(), recordCount: decimal, withValueCount: decimal, valueSum: decimal, shareOfScope: decimal })).nullable(),
  }),
)

export interface Bucket {
  readonly key: string | null
  readonly kind: 'top' | 'other' | 'unknown'
  readonly count: number
  readonly valued: number | null
  readonly money: number | null
  readonly share: number | null
}

export interface Ranking {
  readonly dimension: Dimension
  readonly rankedBy: 'count' | 'value'
  readonly buckets: readonly Bucket[]
  /** Contract money SEAP publishes per consortium, which no one member holds (supplier rankings only). */
  readonly withheld: number | null
}

function bucketsOf(raw: z.infer<typeof breakdownSchema>[number]): Bucket[] {
  return (raw.buckets ?? []).map((bucket) => ({
    key: bucket.key,
    kind: bucket.kind === 'top' ? 'top' : bucket.kind === 'other' ? 'other' : 'unknown',
    count: bucket.recordCount ?? 0,
    valued: bucket.withValueCount,
    money: bucket.valueSum,
    share: bucket.shareOfScope,
  }))
}

export async function readRanking(scope: Scope, dimension: Dimension, topN: number, rankBy: 'count' | 'value', signal: AbortSignal): Promise<Ranking> {
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsRanking($s: ProcurementAnalysisScopeInput) { r: procurementBreakdown(scope: $s, dimension: ${dimension}, topN: ${topN}, rankBy: ${rankBy}) { rankedBy valueWithheldAssociationSum buckets { key kind recordCount withValueCount valueSum shareOfScope } } }`,
    { s: scope },
    { operationName: 'AnalyticsRanking', signal },
  )
  const block = breakdownSchema.parse(raw.r)[0]
  return { dimension, rankedBy: block?.rankedBy === 'value' ? 'value' : 'count', buckets: block ? bucketsOf(block) : [], withheld: block?.valueWithheldAssociationSum ?? null }
}

const seriesSchema = z.array(z.object({ points: z.array(z.object({ bucket: z.string(), value: decimal })).nullable() }))

export interface Point {
  readonly bucket: string
  readonly count: number | null
  readonly money: number | null
}

/** A series of counts and money by bucket, every bucket of the scope's months: the API leaves out an empty one, which is a zero, not a gap. */
export async function readSeries(scope: Scope, bucket: 'year' | 'quarter' | 'month', withMoney: boolean, signal: AbortSignal): Promise<readonly Point[]> {
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsSeries($s: ProcurementAnalysisScopeInput) {
      n: procurementSeries(scope: $s, bucket: ${bucket}, measure: recordCount) { points { bucket value } }
      ${withMoney ? `v: procurementSeries(scope: $s, bucket: ${bucket}, measure: valueAwardedSum) { points { bucket value } }` : ''}
    }`,
    { s: scope },
    { operationName: 'AnalyticsSeries', signal },
  )
  const counts = new Map((seriesSchema.parse(raw.n)[0]?.points ?? []).map((point) => [point.bucket, point.value]))
  const money = new Map((withMoney ? (seriesSchema.parse(raw.v)[0]?.points ?? []) : []).map((point) => [point.bucket, point.value]))
  const keys = typeof scope.from === 'string' && typeof scope.to === 'string' ? bucketsBetween(scope.from, scope.to, bucket) : [...counts.keys()]
  return keys.map((key) => ({ bucket: key, count: counts.get(key) ?? 0, money: withMoney ? (money.get(key) ?? (counts.has(key) ? null : 0)) : null }))
}

// ───────────────────────────────────────────────────────────────── names ──

const namesSchema = z.object({
  labels: z.array(z.object({ cui: z.string().nullable(), canonicalName: z.string().nullable(), status: z.string() })).optional(),
  cpv: z.array(z.object({ cpvCode: z.string(), labelRo: z.string().nullable(), labelEn: z.string().nullable() })).optional(),
})

export interface Names {
  readonly orgs: ReadonlyMap<string, string>
  readonly cpv: ReadonlyMap<string, { readonly ro: string | null; readonly en: string | null }>
}

export async function readNames(cuis: readonly string[], codes: readonly string[], signal: AbortSignal): Promise<Names> {
  const raw = await graphqlQuery<unknown>(
    `query AnalyticsNames($cuis: [String!]!, $codes: [String!]!, $withOrgs: Boolean!, $withCpv: Boolean!) {
      labels: organizationLabels(cuis: $cuis) @include(if: $withOrgs) { cui canonicalName status }
      cpv: procurementCpvCodes(codes: $codes) @include(if: $withCpv) { cpvCode labelRo labelEn }
    }`,
    { cuis: cuis.slice(0, 250), codes: codes.slice(0, 200), withOrgs: cuis.length > 0, withCpv: codes.length > 0 },
    { operationName: 'AnalyticsNames', signal },
  )
  const parsed = namesSchema.parse(raw)
  const orgs = new Map<string, string>()
  for (const label of parsed.labels ?? []) if (label.cui && label.canonicalName && label.status === 'named') orgs.set(label.cui, label.canonicalName)
  const cpv = new Map<string, { ro: string | null; en: string | null }>()
  for (const code of parsed.cpv ?? []) cpv.set(code.cpvCode, { ro: code.labelRo, en: code.labelEn })
  return { orgs, cpv }
}

const divisionsSchema = z.object({ procurementCpvDivisions: z.array(z.object({ divisionCode: z.string(), labelRo: z.string().nullable(), labelEn: z.string() })) })

/** Every CPV division's name in both languages (the client's own list names nine). */
export async function readCpvDivisions(signal?: AbortSignal): Promise<ReadonlyMap<string, { readonly ro: string | null; readonly en: string | null }>> {
  const raw = await graphqlQuery<unknown>(`query AnalyticsCpvDivisions { procurementCpvDivisions { divisionCode labelRo labelEn } }`, {}, { operationName: 'AnalyticsCpvDivisions', signal })
  return new Map(divisionsSchema.parse(raw).procurementCpvDivisions.map((division) => [division.divisionCode, { ro: division.labelRo, en: division.labelEn }]))
}

const resolveSchema = z.object({ procurementResolve: z.array(z.object({ value: z.string(), label: z.string() })) })

/** Up to eight CPV codes whose name holds the words. */
export async function readCpvMatches(term: string, signal?: AbortSignal): Promise<readonly { readonly value: string; readonly label: string }[]> {
  const raw = await graphqlQuery<unknown>(`query AnalyticsCpvSearch($q: String!) { procurementResolve(dim: cpv, q: $q, limit: 8) { value label } }`, { q: term }, { operationName: 'AnalyticsCpvSearch', signal })
  return resolveSchema.parse(raw).procurementResolve
}

// ─────────────────────────────────────────────────────────────── records ──

export interface RecordRow {
  readonly id: string
  readonly href: string
  readonly title: string | null
  readonly authority: { readonly cui: string | null; readonly name: string | null }
  readonly supplier: { readonly cui: string | null; readonly name: string | null }
  readonly value: number | null
  readonly checked: boolean
  readonly date: string | null
  readonly contractNo: string | null
}

const partySchema = z.object({ cui: z.string().nullable(), name: z.string().nullable(), displayName: z.string().nullable() })
const recordSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  displayTitle: z.object({ text: z.string().nullable() }).nullable().optional(),
  authority: partySchema,
  supplier: partySchema,
  valueRon: z.string().nullable(),
  value: z.object({ valueAccepted: z.boolean(), valueRonComparable: z.string().nullable() }).nullable(),
  contractDate: z.string().nullable().optional(),
  finalizationDate: z.string().nullable().optional(),
  publicationDate: z.string().nullable().optional(),
  contractNo: z.string().nullable().optional(),
})
const listSchema = z.object({ total: z.number().nullable(), totalEstimated: z.boolean(), items: z.array(recordSchema) })

export interface Records {
  readonly rows: readonly RecordRow[]
  /** The list's own count (null past 10,000): never the analysis count. */
  readonly total: number | null
}

/** Why the API cannot list the records of a selection, or null. */
export function recordsProblem(query: Query, period: ResolvedPeriod | null): 'supplier-place' | 'procedure' | 'too-wide' | null {
  // The firm's place is filtered through the search index, which the API does not run (BAD_GATEWAY on dev). A
  // firm has one place, its registered office (each firm's count is the same with and without it, dev API, 1
  // October 2026): with a firm picked, the list asks for the firm alone.
  if (query.filters.loc_firma && !query.filters.furnizor) return 'supplier-place'
  // The contracts list has no procedure filter (`ProcurementContractsFilter`): without it the list would be wider than the answer.
  if (query.filters.procedura) return 'procedure'
  const party = Boolean(query.filters.cumparator || query.filters.furnizor)
  if (query.tip === 'directe' && !party && period && monthsBetween(period.from, period.to) > 12) return 'too-wide'
  return null
}

/**
 * Whether the records of a firm in a place may be read and shown. The list
 * asks for the firm alone (`listFilterOf`), which is the same selection
 * only when the firm is in the place; its count there says so, known and
 * not 0. Until then rows already read (the server's, the cache's) wait too.
 * Any other selection lists as it is.
 */
export function firmPlaceGate(
  query: Query,
  figures: { readonly data: { readonly now: { readonly records: number | null } | null } | undefined; readonly isError: boolean },
): 'list' | 'counting' | 'outside' | 'failed' | 'unknown' {
  if (!(query.filters.furnizor && query.filters.loc_firma)) return 'list'
  const counted = figures.data?.now?.records
  if (typeof counted === 'number') return counted > 0 ? 'list' : 'outside'
  if (figures.isError) return 'failed'
  // A count read but not given (abstained) says nothing of the place: the firm's records elsewhere must not pass for its.
  return figures.data === undefined ? 'counting' : 'unknown'
}

function lastDay(month: string): string {
  const [year, index] = month.split('-').map(Number) as [number, number]
  return `${month}-${String(new Date(Date.UTC(year, index, 0)).getUTCDate()).padStart(2, '0')}`
}

/** The list's filter for a query: the same filters, the same months (the list runs ahead of the analysis build, so it is clamped to the cutoff). */
function listFilterOf(query: Query, period: ResolvedPeriod): Record<string, unknown> {
  const filter: Record<string, unknown> = {}
  const population = POPULATIONS[query.tip]
  for (const axisId of AXIS_ORDER) {
    // The firm fixes its place, which the list cannot filter (`recordsProblem`).
    if (axisId === 'loc_firma' && query.filters.furnizor) continue
    const value = query.filters[axisId]?.values[0]
    const level = query.filters[axisId] ? levelOf(axisId, query.filters[axisId]!.level) : null
    if (!level || !value) continue
    filter[level.scopeKey] = { eq: scopeValue(axisId, level.id, value) }
  }
  const range = { gte: `${period.from}-01`, lte: lastDay(period.to) }
  if (query.tip === 'directe') {
    filter.publicationDate = range
    // The analysis leaves the cancelled out; so does the list.
    filter.status = { in: ['finalized', 'awarded', 'unknown'] }
  } else {
    filter.contractDate = range
    filter.recordKind = { in: [population.recordKind] }
  }
  if (query.titlu) filter.q = { contains: query.titlu }
  if (query.valoare) filter.valueRon = { ...(query.valoare.min != null ? { gte: query.valoare.min.toFixed(2) } : {}), ...(query.valoare.max != null ? { lte: query.valoare.max.toFixed(2) } : {}) }
  return filter
}

export async function readRecords(query: Query, period: ResolvedPeriod, sort: 'value_desc' | 'date_desc', page: number, signal: AbortSignal): Promise<Records> {
  const direct = query.tip === 'directe'
  const fields = direct
    ? 'id title authority { cui name displayName } supplier { cui name displayName } valueRon value { valueAccepted valueRonComparable } finalizationDate publicationDate'
    : 'id title displayTitle { text } authority { cui name displayName } supplier { cui name displayName } valueRon value { valueAccepted valueRonComparable } contractDate contractNo'
  const root = direct ? 'procurementDirectAcquisitions' : 'procurementContracts'
  const type = direct ? 'ProcurementDirectAcquisitionsFilter' : 'ProcurementContractsFilter'
  // Its own deadline: a list the API cannot answer in time fails here, as a read, with the reason said.
  const deadline = withDeadline(signal, 9_000)
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsRecords($f: ${type}) { l: ${root}(filter: $f, sort: ${sort}, page: ${page}, pageSize: 25) { total totalEstimated items { ${fields} } } }`,
    { f: listFilterOf(query, period) },
    { operationName: 'AnalyticsRecords', signal: deadline },
  )
  const list = listSchema.parse(raw.l)
  return {
    total: list.total,
    rows: list.items.map((item) => {
      const value = item.value?.valueAccepted ? Number(item.value.valueRonComparable ?? item.valueRon) : item.valueRon !== null ? Number(item.valueRon) : null
      return {
        id: item.id,
        href: direct ? `/procurement/direct-acquisitions/${item.id}` : `/procurement/contracts/${item.id}`,
        title: item.title ?? item.displayTitle?.text ?? null,
        authority: { cui: item.authority.cui, name: item.authority.displayName ?? item.authority.name },
        supplier: { cui: item.supplier.cui, name: item.supplier.displayName ?? item.supplier.name },
        value: Number.isFinite(value) ? value : null,
        checked: Boolean(item.value?.valueAccepted),
        date: item.contractDate ?? item.finalizationDate ?? item.publicationDate ?? null,
        contractNo: item.contractNo ?? null,
      }
    }),
  }
}

// ──────────────────────────────────────────────────────────────── the plan ──

export type RecordsSort = 'value_desc' | 'date_desc'

/** The order the records open in: the largest first where there is a value, else the newest. */
export function defaultRecordsSort(query: Pick<Query, 'tip'>): RecordsSort {
  return POPULATIONS[query.tip].money !== 'none' ? 'value_desc' : 'date_desc'
}

/** One read of the answer: its cache key, whether it runs, and the read itself. */
export interface PlannedRead<T> {
  readonly key: readonly unknown[]
  readonly enabled: boolean
  readonly read: (signal: AbortSignal) => Promise<T>
}

export interface AnswerPlan {
  readonly period: ResolvedPeriod | null
  readonly scopes: { readonly now: Scope | null; readonly before: Scope | null; readonly years: Scope | null }
  /** A firm's own selection has no firms to concentrate. */
  readonly supplierFixed: boolean
  readonly dimension: Dimension | null
  readonly figures: PlannedRead<{ readonly now: Figures | null; readonly before: Figures | null }>
  readonly concentration: PlannedRead<Concentration | null>
  readonly ranking: PlannedRead<Ranking>
  readonly series: PlannedRead<readonly Point[]>
  readonly years: PlannedRead<readonly Point[]>
}

/**
 * The reads a query makes once the cutoff is known, the same in the browser
 * and in the route's loader: the loader reads them on the server and the
 * page's queries start from what it read, under the same keys.
 */
export function planAnswer(query: Query, cutoffs: AnalyticsCutoff | null, options: { readonly topN: number; readonly years: boolean }): AnswerPlan {
  const population = POPULATIONS[query.tip]
  const cutoff = cutoffs ? cutoffs[population.cutoff] : null
  const period = cutoff ? resolvePeriod(query.period, cutoff) : null
  const now = period ? scopeOf(query, period) : null
  // The window before is compared only where the population compares: direct purchases, never before 2019.
  const comparable = period !== null && population.changes && period.previous.from >= `${population.comparableFrom}-01`
  const before = period && comparable ? scopeOf(query, period.previous) : null
  const yearsScope = cutoff ? scopeOf(query, { from: `${population.comparableFrom}-01`, to: cutoff }) : null
  const group = query.dupa
  const moneyAllowed = population.money !== 'none'
  const rankBy: 'count' | 'value' = query.masura === 'numar' || !moneyAllowed ? 'count' : 'value'
  const perResident = query.masura === 'locuitor'
  const dimension = group.axis === 'timp' || group.axis === 'inregistrari' ? null : (levelOf(group.axis, group.level)?.dimension ?? null)
  // Per resident ranks all 42 counties, then divides: the top 25 by lei is not the top 25 per resident.
  const topN = perResident ? 50 : dimension === 'buyerSiruta' || dimension === 'supplierSiruta' ? Math.min(options.topN, 100) : options.topN
  const supplierFixed = Boolean(query.filters.furnizor)
  const bucket = group.axis === 'timp' ? group.bucket : null
  return {
    period,
    scopes: { now, before, years: yearsScope },
    supplierFixed,
    dimension,
    figures: { key: procurementAnalyticsKeys.figures(now!, before), enabled: now !== null, read: (signal) => readFigures(now!, before, signal) },
    concentration: { key: procurementAnalyticsKeys.concentration(now!, rankBy), enabled: now !== null && !supplierFixed, read: (signal) => readConcentration(now!, rankBy, signal) },
    ranking: { key: procurementAnalyticsKeys.ranking(now!, dimension, topN, rankBy), enabled: now !== null && dimension !== null, read: (signal) => readRanking(now!, dimension!, topN, rankBy, signal) },
    series: { key: procurementAnalyticsKeys.series(now!, bucket, moneyAllowed), enabled: now !== null && bucket !== null, read: (signal) => readSeries(now!, bucket ?? 'month', moneyAllowed, signal) },
    years: { key: procurementAnalyticsKeys.years(yearsScope, moneyAllowed), enabled: yearsScope !== null && options.years, read: (signal) => readSeries(yearsScope!, 'year', moneyAllowed, signal) },
  }
}

/** A page of the records, planned as the answer's reads are. */
export function planRecords(query: Query, period: ResolvedPeriod | null, sort: RecordsSort, page: number): PlannedRead<Records> {
  return {
    key: procurementAnalyticsKeys.records(query, period, sort, page),
    enabled: period !== null && recordsProblem(query, period) === null,
    read: (signal) => readRecords(query, period!, sort, page, signal),
  }
}

/** The CUIs and CPV codes whose names the page shows: the filters' values and the ranked keys, sorted, each once. */
export function nameKeys(query: Query, rankings: readonly (Ranking | undefined)[]): { readonly orgs: readonly string[]; readonly cpv: readonly string[] } {
  const orgs: string[] = []
  const cpv: string[] = []
  if (query.filters.cumparator) orgs.push(...query.filters.cumparator.values)
  if (query.filters.furnizor) orgs.push(...query.filters.furnizor.values)
  if (query.filters.cpv) cpv.push(...query.filters.cpv.values.map((value) => value.padEnd(8, '0')))
  for (const ranking of rankings) {
    if (!ranking) continue
    for (const bucket of ranking.buckets) {
      if (!bucket.key || bucket.kind !== 'top') continue
      if (ranking.dimension === 'authority' || ranking.dimension === 'supplier') orgs.push(bucket.key)
      if (ranking.dimension.startsWith('cpv')) cpv.push(bucket.key)
    }
  }
  return { orgs: [...new Set(orgs)].sort(), cpv: [...new Set(cpv)].sort() }
}

/** The names read, planned: nothing to name reads nothing. */
export function planNames(keys: { readonly orgs: readonly string[]; readonly cpv: readonly string[] }): PlannedRead<Names> {
  return { key: procurementAnalyticsKeys.names(keys.orgs, keys.cpv), enabled: keys.orgs.length > 0 || keys.cpv.length > 0, read: (signal) => readNames(keys.orgs, keys.cpv, signal) }
}
