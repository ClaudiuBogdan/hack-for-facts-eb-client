import { useQueries, useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import { z } from 'zod'
import { COMPANY_HUB_SNAPSHOT } from '@/features/private-companies/lib/hub-snapshot'
import { readCutoffOutcome } from '@/features/procurement/api/procurement-cutoff'
import { fetchProcurementGeographyOptions } from '@/features/procurement/api/procurement-reference-api'
import { homeYear } from '@/features/procurement/lib/home-model'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { useGeoJsonData } from '@/hooks/useGeoJson'
import {
  AXES,
  AXIS_ORDER,
  POPULATIONS,
  bucketsBetween,
  levelOf,
  monthsBetween,
  resolvePeriod,
  scopeValue,
  type AxisId,
  type Dimension,
  type GroupBy,
  type Query,
  type ResolvedPeriod,
} from './analytics.model'

/**
 * The analytics page's reads. A query compiles to independent reads, each
 * its own request so one refused root cannot erase the answer (the API nulls
 * a whole response for one invalid field), all side by side (the dev API
 * answers them in parallel, 120–460 ms each):
 *
 * - tier 0, the answer: the figures (the window and the one before it) and
 *   the ranked list or the series the group-by asks for;
 * - tier 1, the context: the firms' concentration, the selection's other
 *   axes (one facets read), the years since 2019;
 * - tier 2, the names: the spine's labels and the CPV labels for the keys
 *   the answer holds; the counties from the reference read, the localities
 *   from the map's own file.
 *
 * Records are a separate read, on request (lists are slow on the dev API).
 */

const decimal = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform((value) => (value === null || value === undefined ? null : Number(value)))

type Scope = Readonly<Record<string, unknown>>

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

/** Each population's newest complete month, from the shared national read (never from a narrow selection). */
export function useCutoff() {
  const latest = homeYear()
  return useQuery({
    queryKey: ['prototype', 'analytics', 'cutoff', latest],
    queryFn: async () => {
      const outcome = await readCutoffOutcome(latest)
      // With no cutoff read, the last complete year's end: never a month the source has not filled.
      return { direct: outcome.cutoff.direct ?? `${latest}-12`, contract: outcome.cutoff.contract ?? `${latest}-12`, failed: outcome.failed }
    },
    staleTime: 10 * 60 * 1000,
  })
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
  readonly records: number
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
    records: block.recordCount ?? 0,
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

async function readFigures(scope: Scope, previous: Scope | null, signal: AbortSignal) {
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

async function readConcentration(scope: Scope, basis: 'count' | 'value', signal: AbortSignal): Promise<Concentration | null> {
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

async function readRanking(scope: Scope, dimension: Dimension, topN: number, rankBy: 'count' | 'value', signal: AbortSignal): Promise<Ranking> {
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
async function readSeries(scope: Scope, bucket: 'year' | 'quarter' | 'month', withMoney: boolean, signal: AbortSignal): Promise<readonly Point[]> {
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

// ─────────────────────────────────────────────────────────── the facets ──

const facetsSchema = z.object({ blocks: z.array(z.object({ dimension: z.string(), buckets: breakdownSchema.element.shape.buckets })) })

export interface Facet {
  readonly axis: AxisId
  readonly level: string
  readonly dimension: Dimension
  readonly buckets: readonly Bucket[]
}

/** The selection's other axes, top three each (one read, at most three axes): where the reader can go next without a form. */
function facetAxesOf(query: Query, group: GroupBy): readonly { readonly axis: AxisId; readonly level: string }[] {
  const candidates: { readonly axis: AxisId; readonly level: string }[] = [
    { axis: 'cumparator', level: 'cui' },
    { axis: 'furnizor', level: 'cui' },
    { axis: 'cpv', level: query.filters.cpv ? (AXES.cpv.levels[AXES.cpv.levels.findIndex((level) => level.id === query.filters.cpv?.level) + 1]?.id ?? '') : 'diviziune' },
    { axis: 'loc', level: query.filters.loc ? (query.filters.loc.level === 'regiune' ? 'judet' : query.filters.loc.level === 'judet' ? 'localitate' : '') : 'judet' },
    { axis: 'procedura', level: 'tip' },
  ]
  return candidates
    .filter((candidate) => candidate.level !== '')
    .filter((candidate) => AXES[candidate.axis].populations.includes(query.tip))
    .filter((candidate) => !(group.axis === candidate.axis))
    .filter((candidate) => !query.filters[candidate.axis] || candidate.axis === 'cpv' || candidate.axis === 'loc')
    .slice(0, 3)
}

async function readFacets(scope: Scope, axes: readonly { readonly axis: AxisId; readonly level: string }[], rankBy: 'count' | 'value', signal: AbortSignal): Promise<readonly Facet[]> {
  const levels = axes.map((item) => ({ ...item, dimension: levelOf(item.axis, item.level)!.dimension }))
  if (levels.length === 0) return []
  const raw = await graphqlQuery<Record<string, unknown>>(
    `query AnalyticsFacets($s: ProcurementAnalysisScopeInput!) { f: procurementFacets(scope: $s, dimensions: [${levels.map((item) => item.dimension).join(', ')}], topN: 3, rankBy: ${rankBy}) { blocks { dimension buckets { key kind recordCount withValueCount valueSum shareOfScope } } } }`,
    { s: scope },
    { operationName: 'AnalyticsFacets', signal },
  )
  const parsed = facetsSchema.parse(raw.f)
  return levels.map((item) => {
    const block = parsed.blocks.find((candidate) => candidate.dimension === item.dimension)
    return { ...item, buckets: block ? bucketsOf({ rankedBy: null, valueWithheldAssociationSum: null, buckets: block.buckets }) : [] }
  })
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

async function readNames(cuis: readonly string[], codes: readonly string[], signal: AbortSignal): Promise<Names> {
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

/** The names of what the page shows — keys from the answer and the facets, plus the filters' own values. */
export function useNames(keys: { readonly orgs: readonly string[]; readonly cpv: readonly string[] }) {
  const orgs = [...new Set(keys.orgs)].sort()
  const cpv = [...new Set(keys.cpv)].sort()
  return useQuery({
    queryKey: ['prototype', 'analytics', 'names', orgs, cpv],
    queryFn: ({ signal }) => readNames(orgs, cpv, signal),
    enabled: orgs.length > 0 || cpv.length > 0,
    staleTime: 60 * 60 * 1000,
    placeholderData: (previous) => previous,
  })
}

const divisionsSchema = z.object({ procurementCpvDivisions: z.array(z.object({ divisionCode: z.string(), labelRo: z.string().nullable(), labelEn: z.string() })) })

/** Every CPV division's name (the client's own list names nine). */
export function useCpvDivisions() {
  return useQuery({
    queryKey: ['prototype', 'analytics', 'cpv-divisions'],
    queryFn: async ({ signal }) => {
      const raw = await graphqlQuery<unknown>(`query AnalyticsCpvDivisions { procurementCpvDivisions { divisionCode labelRo labelEn } }`, {}, { operationName: 'AnalyticsCpvDivisions', signal })
      return new Map(divisionsSchema.parse(raw).procurementCpvDivisions.map((division) => [division.divisionCode, division.labelRo ?? division.labelEn]))
    },
    staleTime: 24 * 60 * 60 * 1000,
  })
}

export function useCounties() {
  return useQuery({ queryKey: ['prototype', 'analytics', 'counties'], queryFn: () => fetchProcurementGeographyOptions(), staleTime: 24 * 60 * 60 * 1000 })
}

/**
 * Localities by SIRUTA from the map's own files (the API has no locality
 * names), only when a locality is on screen — a county's own code included:
 * the institutions registered at it (the county council) are the county's.
 */
export function useLocalities(enabled: boolean) {
  const geo = useGeoJsonData('UAT', { enabled })
  const counties = useGeoJsonData('County', { enabled })
  const features = (geo.data as { features?: readonly { properties?: Record<string, unknown> }[] } | undefined)?.features
  if (!features) return null
  const names = new Map<string, { name: string; kind: string | null; county: string | null; population: number | null }>()
  for (const feature of (counties.data as { features?: readonly { properties?: Record<string, unknown> }[] } | undefined)?.features ?? []) {
    const props = feature.properties ?? {}
    if (props.countyCode === undefined || props.countyCode === null) continue
    const county = String(props.name ?? '')
    names.set(String(props.countyCode), { name: t`Județul ${county}`, kind: 'judet', county: typeof props.mnemonic === 'string' ? props.mnemonic : null, population: null })
  }
  for (const feature of features) {
    const props = feature.properties ?? {}
    const code = props.natcode
    if (code === undefined || code === null) continue
    names.set(String(code), {
      name: String(props.name ?? code),
      kind: typeof props.natLevName === 'string' ? props.natLevName : null,
      county: typeof props.countyMn === 'string' ? props.countyMn : null,
      population: typeof props.insPop2021 === 'number' ? props.insPop2021 : null,
    })
  }
  return names
}

/** Residents on 1 January 2025 by county (INS POP105A, the companies hub's snapshot), for lei per resident. */
export const COUNTY_POPULATION: ReadonlyMap<string, number> = new Map(COMPANY_HUB_SNAPSHOT.counties.map((county) => [county.code, county.population]))
export function countyPopulationNote(): string {
  return t`INS POP105A, 1 ianuarie 2025`
}

// ────────────────────────────────────────────────────────── the answer ──

export interface Answer {
  readonly period: ResolvedPeriod | null
  /** Each population's cutoff; `failed` when it could not be read and the last complete year's end stands in. */
  readonly cutoff: { readonly direct: string; readonly contract: string; readonly failed: boolean } | null
  readonly figures: { readonly data: { readonly now: Figures | null; readonly before: Figures | null } | undefined; readonly isError: boolean; readonly retry: () => void }
  readonly concentration: { readonly data: Concentration | null | undefined; readonly isError: boolean }
  readonly ranking: { readonly data: Ranking | undefined; readonly isError: boolean; readonly isFetching: boolean; readonly retry: () => void }
  readonly series: { readonly data: readonly Point[] | undefined; readonly isError: boolean; readonly retry: () => void }
  readonly facets: { readonly data: readonly Facet[] | undefined; readonly isError: boolean }
  readonly years: { readonly data: readonly Point[] | undefined; readonly isError: boolean }
  /** The reads it made, for „Cum am calculat". */
  readonly scopes: { readonly now: Scope | null; readonly years: Scope | null }
}

const STALE = 10 * 60 * 1000

/** Everything the page reads for a query, each read on its own. */
export function useAnswer(query: Query, options: { readonly topN: number; readonly facets: boolean; readonly years: boolean; readonly ranking?: boolean }): Answer {
  const cutoffRead = useCutoff()
  const population = POPULATIONS[query.tip]
  const cutoff = cutoffRead.data ? cutoffRead.data[population.cutoff] : null
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
  const dimension = group.axis === 'timp' ? null : levelOf(group.axis, group.level)?.dimension ?? null
  // Per resident ranks all 42 counties, then divides: the top 25 by lei is not the top 25 per resident.
  const topN = perResident ? 50 : dimension === 'buyerSiruta' || dimension === 'supplierSiruta' ? Math.min(options.topN, 100) : options.topN
  const supplierFixed = Boolean(query.filters.furnizor)
  const facetAxes = facetAxesOf(query, group)

  const [figures, concentration, ranking, series, facets, years] = useQueries({
    queries: [
      { queryKey: ['prototype', 'analytics', 'figures', now, before], queryFn: ({ signal }: { signal: AbortSignal }) => readFigures(now!, before, signal), enabled: now !== null, staleTime: STALE },
      {
        queryKey: ['prototype', 'analytics', 'concentration', now, rankBy],
        queryFn: ({ signal }: { signal: AbortSignal }) => readConcentration(now!, rankBy, signal),
        enabled: now !== null && !supplierFixed,
        staleTime: STALE,
      },
      {
        queryKey: ['prototype', 'analytics', 'ranking', now, dimension, topN, rankBy],
        queryFn: ({ signal }: { signal: AbortSignal }) => readRanking(now!, dimension!, topN, rankBy, signal),
        enabled: now !== null && dimension !== null && options.ranking !== false,
        staleTime: STALE,
        placeholderData: (previous: Ranking | undefined) => (previous && previous.dimension === dimension ? previous : undefined),
      },
      {
        queryKey: ['prototype', 'analytics', 'series', now, group.axis === 'timp' ? group.bucket : null, moneyAllowed],
        queryFn: ({ signal }: { signal: AbortSignal }) => readSeries(now!, group.axis === 'timp' ? group.bucket : 'month', moneyAllowed, signal),
        enabled: now !== null && group.axis === 'timp',
        staleTime: STALE,
      },
      {
        queryKey: ['prototype', 'analytics', 'facets', now, facetAxes, rankBy],
        queryFn: ({ signal }: { signal: AbortSignal }) => readFacets(now!, facetAxes, rankBy, signal),
        enabled: now !== null && options.facets && facetAxes.length > 0,
        staleTime: STALE,
      },
      {
        queryKey: ['prototype', 'analytics', 'years', yearsScope, moneyAllowed],
        queryFn: ({ signal }: { signal: AbortSignal }) => readSeries(yearsScope!, 'year', moneyAllowed, signal),
        enabled: yearsScope !== null && options.years,
        staleTime: STALE,
      },
    ],
  })
  return {
    period,
    cutoff: cutoffRead.data ?? null,
    figures: { data: figures.data as Answer['figures']['data'], isError: figures.isError, retry: () => void figures.refetch() },
    concentration: { data: supplierFixed ? null : (concentration.data as Concentration | null | undefined), isError: concentration.isError },
    ranking: { data: ranking.data as Ranking | undefined, isError: ranking.isError, isFetching: ranking.isFetching, retry: () => void ranking.refetch() },
    series: { data: series.data as readonly Point[] | undefined, isError: series.isError, retry: () => void series.refetch() },
    facets: { data: facets.data as readonly Facet[] | undefined, isError: facets.isError },
    years: { data: years.data as readonly Point[] | undefined, isError: years.isError },
    scopes: { now, years: yearsScope },
  }
}

/**
 * One ranking on its own — the linked columns and the rail rank each axis
 * under every filter but its own, so a column still shows the alternatives
 * to what it has picked.
 */
export function useRanking(query: Query, group: { readonly axis: AxisId; readonly level: string }, topN: number, enabled = true) {
  const cutoffRead = useCutoff()
  const population = POPULATIONS[query.tip]
  const cutoff = cutoffRead.data ? cutoffRead.data[population.cutoff] : null
  const period = cutoff ? resolvePeriod(query.period, cutoff) : null
  const now = period ? scopeOf(query, period) : null
  const dimension = levelOf(group.axis, group.level)?.dimension ?? null
  const rankBy: 'count' | 'value' = query.masura === 'numar' || population.money === 'none' ? 'count' : 'value'
  return useQuery({
    queryKey: ['prototype', 'analytics', 'ranking', now, dimension, topN, rankBy],
    queryFn: ({ signal }) => readRanking(now!, dimension!, topN, rankBy, signal),
    enabled: enabled && now !== null && dimension !== null && AXES[group.axis].populations.includes(query.tip),
    staleTime: STALE,
    placeholderData: (previous) => previous,
  })
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

/** Why the records cannot be read for a selection on the dev API, or null. */
export function recordsProblem(query: Query, period: ResolvedPeriod | null): 'supplier-place' | 'procedure' | 'too-wide' | null {
  // The firm's place is filtered through the search index, which the dev API does not run.
  if (query.filters.loc_firma) return 'supplier-place'
  // The contracts list has no procedure filter (`ProcurementContractsFilter`): without it the list would be wider than the answer.
  if (query.filters.procedura) return 'procedure'
  const party = Boolean(query.filters.cumparator || query.filters.furnizor)
  if (query.tip === 'directe' && !party && period && monthsBetween(period.from, period.to) > 12) return 'too-wide'
  return null
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

async function readRecords(query: Query, period: ResolvedPeriod, sort: 'value_desc' | 'date_desc', page: number, signal: AbortSignal): Promise<Records> {
  const direct = query.tip === 'directe'
  const fields = direct
    ? 'id title authority { cui name displayName } supplier { cui name displayName } valueRon value { valueAccepted valueRonComparable } finalizationDate publicationDate'
    : 'id title displayTitle { text } authority { cui name displayName } supplier { cui name displayName } valueRon value { valueAccepted valueRonComparable } contractDate contractNo'
  const root = direct ? 'procurementDirectAcquisitions' : 'procurementContracts'
  const type = direct ? 'ProcurementDirectAcquisitionsFilter' : 'ProcurementContractsFilter'
  // Its own deadline: a list the dev API cannot answer fails here, as a read, with the reason said.
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

export function useRecords(query: Query, period: ResolvedPeriod | null, sort: 'value_desc' | 'date_desc', page: number, enabled: boolean) {
  return useQuery({
    queryKey: ['prototype', 'analytics', 'records', query.tip, query.filters, query.titlu, query.valoare, period, sort, page],
    queryFn: ({ signal }) => readRecords(query, period!, sort, page, signal),
    enabled: enabled && period !== null && recordsProblem(query, period) === null,
    staleTime: STALE,
    retry: false,
  })
}
