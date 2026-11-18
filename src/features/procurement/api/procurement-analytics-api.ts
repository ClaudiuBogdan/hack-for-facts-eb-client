import { daSupplierReads, disclosureVersion } from './procurement-da-release-status'
import { z } from 'zod'
import { GRAPHQL_INVALID_INPUT_CODE, GraphQLRequestError, graphqlQuery } from '@/lib/graphql/graphql-client'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { readProcurementCutoff } from './procurement-cutoff'
import {
  AXIS_ORDER,
  POPULATIONS,
  bucketsBetween,
  cpvPath,
  levelOf,
  resolvePeriod,
  scopeValue,
  type Dimension,
  type Query,
  type RecordsSort,
  type ResolvedPeriod,
} from '../lib/analytics-model'
import { procurementAnalyticsKeys } from '../lib/analytics-keys'
import { isNamedDaSupplier, isNamedDaSupplierBucket, isNaturalPersonKey, scrubDaSupplierBucket } from '../lib/withheld-party'

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
 * Records are a separate read, on request: the rows the figures count, over
 * the same scope. Every read is pinned to the analysis build the cutoff was
 * read from, so one page never mixes two generations; a build the API no
 * longer serves is refused, and the page starts over from a fresh cutoff.
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
  if (population.frameworkRole) scope.frameworkRole = population.frameworkRole
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
  /** The analysis builds the cutoff was read from, per population: each read is pinned to its population's. */
  readonly builds: { readonly direct: string; readonly contract: string }
  /** The pair, as one key: a new build of either starts the page over. */
  readonly build: string
  /**
   * The direct-purchase disclosure publication (release switch, data, D6 and
   * supplier privacy): a nightly publish can withhold a supplier without
   * moving the analysis build, so every direct-purchase answer is kept under
   * both. Null when it cannot be read.
   */
  readonly disclosure?: string | null
}

/**
 * Each population's newest complete month, from the shared national read
 * (never from a narrow selection), and the build it was read from. A read
 * that fails, fails: without a build the page reads nothing, rather than
 * figures and a list that could come from two generations.
 */
export async function readAnalyticsCutoff(latest: number): Promise<AnalyticsCutoff> {
  const [cutoff, disclosure] = await Promise.all([readProcurementCutoff(latest), disclosureVersion()])
  // A month the national counts cannot date yet: the last complete year's end, never a month the source has not filled.
  return { direct: cutoff.direct ?? `${latest}-12`, contract: cutoff.contract ?? `${latest}-12`, builds: cutoff.builds, build: cutoff.build, disclosure }
}

/**
 * The key a population's answers are kept under: its build, and for direct
 * purchases the disclosure publication too (D6 — a withheld supplier
 * disappears within one publish, which the build alone does not follow).
 */
function keptUnder(cutoffs: AnalyticsCutoff | null, population: { readonly cutoff: 'direct' | 'contract' }): string | null {
  const build = cutoffs?.builds[population.cutoff] ?? null
  if (build === null || population.cutoff !== 'direct') return build
  return `${build}|${cutoffs?.disclosure ?? 'unknown'}`
}

/** The API refused a pinned read: its build is no longer the one it serves (a publication since the page read its cutoff). */
export function isStaleBuild(error: unknown): boolean {
  return error instanceof GraphQLRequestError && error.graphQLErrors.some((entry) => entry.extensions?.code === GRAPHQL_INVALID_INPUT_CODE && entry.extensions?.field === 'build')
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

export async function readFigures(scope: Scope, previous: Scope | null, build: string | null, signal: AbortSignal) {
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsFigures($now: ProcurementAnalysisScopeInput${previous ? ', $before: ProcurementAnalysisScopeInput' : ''}, $build: String) {
      now: procurementStats(scope: $now, build: $build) { ${STATS_FIELDS} }
      ${previous ? `before: procurementStats(scope: $before, build: $build) { ${STATS_FIELDS} }` : ''}
    }`,
    previous ? { now: scope, before: previous, build } : { now: scope, build },
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

export async function readConcentration(scope: Scope, basis: 'count' | 'value', build: string | null, signal: AbortSignal): Promise<Concentration | null> {
  // Direct purchases' supplier concentration is refused while D6 is enforced and the release is off: none, not a failure.
  if (scope.grain === 'direct_acquisition' && !(await daSupplierReads()).figures) return null
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsConcentration($s: ProcurementAnalysisScopeInput, $build: String) { c: procurementConcentration(scope: $s, basis: ${basis}, build: $build) { supplierCount top1Share top5Share } }`,
    { s: scope, build },
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
    buckets: z.array(z.object({ key: z.string().nullable(), kind: z.string(), displayKind: z.string().nullable().optional(), recordCount: decimal, withValueCount: decimal, valueSum: decimal, shareOfScope: decimal })).nullable(),
  }),
)

export interface Bucket {
  readonly key: string | null
  readonly kind: 'top' | 'other' | 'unknown'
  /** D6 on a supplier bucket (`authority | company | natural_person`); absent elsewhere. */
  readonly displayKind?: string | null
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
  /** D6 enforced while the release is off: direct purchases' supplier ranking is not served (said, never blank). */
  readonly unavailable?: true
}

function bucketsOf(raw: z.infer<typeof breakdownSchema>[number]): Bucket[] {
  return (raw.buckets ?? []).map((bucket) => ({
    key: bucket.key,
    kind: bucket.kind === 'top' ? 'top' : bucket.kind === 'other' ? 'other' : 'unknown',
    displayKind: bucket.displayKind ?? null,
    count: bucket.recordCount ?? 0,
    valued: bucket.withValueCount,
    money: bucket.valueSum,
    share: bucket.shareOfScope,
  }))
}

export async function readRanking(scope: Scope, dimension: Dimension, topN: number, rankBy: 'count' | 'value', build: string | null, signal: AbortSignal): Promise<Ranking> {
  // Direct purchases' supplier ranking is refused while D6 is enforced and the release is off: said as unavailable.
  if (scope.grain === 'direct_acquisition' && dimension === 'supplier' && !(await daSupplierReads()).figures) {
    return { dimension, rankedBy: rankBy, buckets: [], withheld: null, unavailable: true }
  }
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsRanking($s: ProcurementAnalysisScopeInput, $build: String) { r: procurementBreakdown(scope: $s, dimension: ${dimension}, topN: ${topN}, rankBy: ${rankBy}, build: $build) { rankedBy valueWithheldAssociationSum buckets { key kind displayKind recordCount withValueCount valueSum shareOfScope } } }`,
    { s: scope, build },
    { operationName: 'AnalyticsRanking', signal },
  )
  const block = breakdownSchema.parse(raw.r)[0]
  // D6: an unclassified direct-purchase supplier's CUI never enters the ranking the page keeps and serialises.
  const scrub = scope.grain === 'direct_acquisition' && dimension === 'supplier'
  const buckets = block ? bucketsOf(block) : []
  return { dimension, rankedBy: block?.rankedBy === 'value' ? 'value' : 'count', buckets: scrub ? buckets.map(scrubDaSupplierBucket) : buckets, withheld: block?.valueWithheldAssociationSum ?? null }
}

const seriesSchema = z.array(z.object({ points: z.array(z.object({ bucket: z.string(), value: decimal })).nullable() }))

export interface Point {
  readonly bucket: string
  readonly count: number | null
  readonly money: number | null
}

/** A series of counts and money by bucket, every bucket of the scope's months: the API leaves out an empty one, which is a zero, not a gap. */
export async function readSeries(scope: Scope, bucket: 'year' | 'quarter' | 'month', withMoney: boolean, build: string | null, signal: AbortSignal): Promise<readonly Point[]> {
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsSeries($s: ProcurementAnalysisScopeInput, $build: String) {
      n: procurementSeries(scope: $s, bucket: ${bucket}, measure: recordCount, build: $build) { points { bucket value } }
      ${withMoney ? `v: procurementSeries(scope: $s, bucket: ${bucket}, measure: valueAwardedSum, build: $build) { points { bucket value } }` : ''}
    }`,
    { s: scope, build },
    { operationName: 'AnalyticsSeries', signal },
  )
  const counts = new Map((seriesSchema.parse(raw.n)[0]?.points ?? []).map((point) => [point.bucket, point.value]))
  const money = new Map((withMoney ? (seriesSchema.parse(raw.v)[0]?.points ?? []) : []).map((point) => [point.bucket, point.value]))
  const keys = typeof scope.from === 'string' && typeof scope.to === 'string' ? bucketsBetween(scope.from, scope.to, bucket) : [...counts.keys()]
  return keys.map((key) => ({ bucket: key, count: counts.get(key) ?? 0, money: withMoney ? (money.get(key) ?? (counts.has(key) ? null : 0)) : null }))
}

// ───────────────────────────────────────────────────────────────── names ──

const daSupplierNameSchema = z.object({ items: z.array(z.object({ supplier: z.object({ cui: z.string().nullable(), name: z.string().nullable(), displayName: z.string().nullable(), displayKind: z.string().nullable().optional() }) })) })

const namesSchema = z.object({
  labels: z.array(z.object({ cui: z.string().nullable(), canonicalName: z.string().nullable(), status: z.string() })).optional(),
  cpv: z.array(z.object({ cpvCode: z.string(), labelRo: z.string().nullable(), labelEn: z.string().nullable() })).optional(),
})

export interface Names {
  readonly orgs: ReadonlyMap<string, string>
  readonly cpv: ReadonlyMap<string, { readonly ro: string | null; readonly en: string | null }>
}

/** At most this many direct-purchase suppliers named by their own records (a filter holds one). */
const DA_SUPPLIER_NAMES = 4

/**
 * The names a page shows: institutions' and companies' from the registry
 * spine, CPV codes' labels — and a direct-purchase supplier given by the
 * address (`daSuppliers`) only from its own direct purchases, and only when
 * the API serves it there as a company (D6): the registry would name a
 * person the direct purchases withhold.
 */
export async function readNames(cuis: readonly string[], codes: readonly string[], signal: AbortSignal, daSuppliers: readonly string[] = []): Promise<Names> {
  const asked = daSuppliers.slice(0, DA_SUPPLIER_NAMES)
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsNames($cuis: [String!]!, $codes: [String!]!, $withOrgs: Boolean!, $withCpv: Boolean!${asked.map((_, index) => `, $da${index}: String!`).join('')}) {
      labels: organizationLabels(cuis: $cuis) @include(if: $withOrgs) { cui canonicalName status }
      cpv: procurementCpvCodes(codes: $codes) @include(if: $withCpv) { cpvCode labelRo labelEn }
      ${asked.map((_, index) => `da${index}: procurementDirectAcquisitions(filter: { supplierCui: { eq: $da${index} } }, page: 1, pageSize: 1) { items { supplier { cui name displayName displayKind } } }`).join('\n      ')}
    }`,
    { cuis: cuis.slice(0, 250), codes: codes.slice(0, 200), withOrgs: cuis.length > 0, withCpv: codes.length > 0, ...Object.fromEntries(asked.map((cui, index) => [`da${index}`, cui])) },
    { operationName: 'AnalyticsNames', signal },
  )
  const parsed = namesSchema.parse(raw)
  const orgs = new Map<string, string>()
  for (const label of parsed.labels ?? []) if (label.cui && label.canonicalName && label.status === 'named') orgs.set(label.cui, label.canonicalName)
  asked.forEach((cui, index) => {
    const supplier = daSupplierNameSchema.parse(raw[`da${index}`] ?? { items: [] }).items[0]?.supplier
    const name = supplier && isNamedDaSupplier(supplier) && supplier.cui === cui ? (supplier.displayName ?? supplier.name) : null
    if (name) orgs.set(cui, name)
  })
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
  /** The record's title, or its display title (a contract's, from the production database); null when neither is published. */
  readonly title: string | null
  readonly authority: { readonly cui: string | null; readonly name: string | null }
  /** `withheld`: D6 — a direct acquisition's supplier the API does not serve as a company (release 1): no name, no code. */
  readonly supplier: { readonly cui: string | null; readonly name: string | null; readonly withheld?: true }
  /** The money the figures count for this record; null when it adds none (no checked value, or a consortium's other members). */
  readonly value: number | null
  readonly date: string | null
}

const partySchema = z.object({ cui: z.string().nullable(), name: z.string().nullable(), displayName: z.string().nullable(), displayKind: z.string().nullable().optional() })
const recordsSchema = z.object({
  total: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string(),
      date: z.string().nullable(),
      title: z.string().nullable(),
      displayTitle: z.object({ text: z.string() }).nullable(),
      /** A direct acquisition's name while its title is withheld (release 1); null otherwise. */
      cpvLabel: z.string().nullable().optional(),
      authority: partySchema,
      supplier: partySchema,
      valueRon: z.string().nullable(),
    }),
  ),
  meta: z.object({ answerability: z.string() }),
})

export interface Records {
  readonly rows: readonly RecordRow[]
  /** The figures' own count of the same scope; null when they abstain. */
  readonly total: number | null
  /** The figures abstain for this scope: there is no list to show. */
  readonly abstained: boolean
}

/** A label that says something: a blank one is no label, so the next one stands in. */
function textOf(value: string | null | undefined): string | null {
  const text = value?.trim()
  return text ? text : null
}

export const RECORDS_PAGE = 25
/** The API pages a list up to its 10,000th row. */
export const RECORDS_WINDOW = 10_000

export { defaultRecordsSort, type RecordsSort } from '../lib/analytics-model'

/** A page of the records the figures count: the same scope, the same build, the rows one by one. */
export async function readRecords(scope: Scope, build: string | null, sort: RecordsSort, page: number, signal: AbortSignal): Promise<Records> {
  const direct = scope.grain === 'direct_acquisition'
  // Its own deadline: a list the API cannot answer in time fails here, as a read, with the reason said.
  const deadline = withDeadline(signal, 9_000)
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsRecords($s: ProcurementAnalysisScopeInput!, $build: String) { l: procurementRecords(scope: $s, build: $build, sort: ${sort}, page: ${page}, pageSize: ${RECORDS_PAGE}) { total items { id date title displayTitle { text } cpvLabel authority { cui name displayName displayKind } supplier { cui name displayName displayKind } valueRon } meta { answerability } } }`,
    { s: scope, build },
    { operationName: 'AnalyticsRecords', signal: deadline },
  )
  const list = recordsSchema.parse(raw.l)
  return {
    total: list.total === null ? null : Number(list.total),
    abstained: list.meta.answerability === 'abstained',
    rows: list.items.map((item) => ({
      id: item.id,
      href: direct ? `/procurement/direct-acquisitions/${item.id}` : `/procurement/contracts/${item.id}`,
      title: textOf(item.title) ?? textOf(item.displayTitle?.text) ?? textOf(item.cpvLabel) ?? null,
      authority: { cui: item.authority.cui, name: item.authority.displayName ?? item.authority.name },
      // D6, whatever the release flag says: a direct-purchase supplier is named only when the API serves it as a company.
      supplier: direct && !isNamedDaSupplier(item.supplier) ? { cui: null, name: null, withheld: true } : { cui: item.supplier.cui, name: item.supplier.displayName ?? item.supplier.name },
      value: item.valueRon === null ? null : Number(item.valueRon),
      date: item.date,
    })),
  }
}

// ──────────────────────────────────────────────────────────────── the plan ──

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
  const build = cutoffs?.builds[population.cutoff] ?? null
  const kept = keptUnder(cutoffs, population)
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
    figures: { key: procurementAnalyticsKeys.figures(now!, before, kept), enabled: now !== null, read: (signal) => readFigures(now!, before, build, signal) },
    concentration: { key: procurementAnalyticsKeys.concentration(now!, rankBy, kept), enabled: now !== null && !supplierFixed, read: (signal) => readConcentration(now!, rankBy, build, signal) },
    ranking: { key: procurementAnalyticsKeys.ranking(now!, dimension, topN, rankBy, kept), enabled: now !== null && dimension !== null, read: (signal) => readRanking(now!, dimension!, topN, rankBy, build, signal) },
    series: { key: procurementAnalyticsKeys.series(now!, bucket, moneyAllowed, kept), enabled: now !== null && bucket !== null, read: (signal) => readSeries(now!, bucket ?? 'month', moneyAllowed, build, signal) },
    years: { key: procurementAnalyticsKeys.years(yearsScope, moneyAllowed, kept), enabled: yearsScope !== null && options.years, read: (signal) => readSeries(yearsScope!, 'year', moneyAllowed, build, signal) },
  }
}

/** A page of the records, planned as the answer's reads are: the figures' own scope and build. */
export function planRecords(query: Query, cutoffs: AnalyticsCutoff | null, sort: RecordsSort, page: number): PlannedRead<Records> {
  const cutoff = cutoffs ? cutoffs[POPULATIONS[query.tip].cutoff] : null
  const period = cutoff ? resolvePeriod(query.period, cutoff) : null
  const scope = period ? scopeOf(query, period) : null
  const build = cutoffs?.builds[POPULATIONS[query.tip].cutoff] ?? null
  return {
    key: procurementAnalyticsKeys.records(scope, keptUnder(cutoffs, POPULATIONS[query.tip]), sort, page),
    enabled: scope !== null,
    read: (signal) => readRecords(scope!, build, sort, page, signal),
  }
}

/** The CUIs and CPV codes whose names the page shows: the filters' values and the ranked keys, sorted, each once. */
export interface NameKeys {
  readonly orgs: readonly string[]
  readonly cpv: readonly string[]
  /** Direct-purchase suppliers named only by their own direct purchases (D6). */
  readonly daSuppliers?: readonly string[]
}

export function nameKeys(query: Query, rankings: readonly (Ranking | undefined)[]): NameKeys {
  const direct = POPULATIONS[query.tip].grain === 'direct_acquisition'
  const orgs: string[] = []
  const cpv: string[] = []
  const daSuppliers: string[] = []
  if (query.filters.cumparator) orgs.push(...query.filters.cumparator.values)
  // D6: a supplier the address names is named, for direct purchases, only by its own direct purchases.
  if (query.filters.furnizor) (direct ? daSuppliers : orgs).push(...query.filters.furnizor.values)
  // The category and each step of its path, which the head shows over the headline.
  if (query.filters.cpv) cpv.push(...query.filters.cpv.values.flatMap((value) => cpvPath(value).map((step) => step.padEnd(8, '0'))))
  for (const ranking of rankings) {
    if (!ranking) continue
    for (const bucket of ranking.buckets) {
      if (!bucket.key || bucket.kind !== 'top') continue
      // D6: a direct-purchase supplier has a name to look up only when the API serves it as a company.
      if (ranking.dimension === 'authority' || (ranking.dimension === 'supplier' && (!direct || isNamedDaSupplierBucket(bucket)) && !isNaturalPersonKey(bucket.key))) orgs.push(bucket.key)
      if (ranking.dimension.startsWith('cpv')) cpv.push(bucket.key)
    }
  }
  return { orgs: [...new Set(orgs)].sort(), cpv: [...new Set(cpv)].sort(), daSuppliers: [...new Set(daSuppliers)].sort() }
}

/** The names read, planned: nothing to name reads nothing. */
export function planNames(keys: NameKeys): PlannedRead<Names> {
  const daSuppliers = keys.daSuppliers ?? []
  return {
    key: procurementAnalyticsKeys.names(keys.orgs, keys.cpv, daSuppliers),
    enabled: keys.orgs.length > 0 || keys.cpv.length > 0 || daSuppliers.length > 0,
    read: (signal) => readNames(keys.orgs, keys.cpv, signal, daSuppliers),
  }
}
