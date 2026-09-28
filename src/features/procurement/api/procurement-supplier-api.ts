import { fetchPrivateCompanyProfile } from '@/features/private-companies/api/private-company-api'
import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import {
  buyerBreakdownSchema,
  buyerLabelsSchema,
  buyerSeriesSchema,
  buyerStatsSchema,
  procurementBuyerQuery,
  type BuyerField,
  type RawBuyerBreakdown,
  type RawBuyerSeries,
  type RawBuyerStats,
} from './graphql/procurement-buyer-queries'
import { PROCUREMENT_HOME_DIRECT_QUERY, procurementHomeDirectResponseSchema } from './graphql/procurement-home-queries'
import {
  SUPPLIER_DAYS_PER_REQUEST,
  SUPPLIER_NAMES_QUERY,
  supplierDirectNameSchema,
  supplierDirectNamesQuery,
  type SupplierDay,
} from './graphql/procurement-supplier-queries'
import { ACCEPTED_VALUE_STATES, acceptedValue, partyOf } from './procurement-home-api'
import {
  SUPPLIER_LARGEST_RECORDS,
  SUPPLIER_ROWS_READ,
  chunks,
  firmName,
  readSupplierDays,
  readSupplierRows,
  supplierContractPicture,
  type SupplierRowsRead,
} from './procurement-supplier-contracts'
import { buyerName } from '../lib/buyer-model'
import { levelCpvLeaves, readerCategories, type CpvBucket } from '../lib/home-categories'
import { DIRECT_COMPARABLE_FROM, cutoffMonth, homeYear, tidyTitle, truncatePartYear, type RecentRecord, type YearPoint } from '../lib/home-model'
import type { CountyFigureRow, PartyYears } from '../lib/profile-model'
import { periodOf, throughMonth, type Cutoff, type Period } from '../lib/supplier-period'
import type { ClientRanking, ClientWeight, GrainFigures, SupplierProfile } from '../lib/supplier-model'

export { SUPPLIER_LARGEST_RECORDS, SUPPLIER_ROWS_READ, supplierContractPicture }

/**
 * One firm's page, read as the buyer page is: requests side by side (the API
 * resolves one request's fields one after another) and follow-ups on the
 * first answers.
 *
 * 1. Side by side: the keys (the year's clients), the figures (populations,
 *    buyers' counties, procedures, the months since 2019, the top clients
 *    since 2019), the CPV levels, the firm's contract rows (the largest
 *    hundred, with a total per year and per month of the year in progress)
 *    and the company registry's record. The year in progress first waits for
 *    SEAP's cutoff month (kept for every firm), which bounds its reads.
 * 2. On the clients: what the firm was to its largest direct-purchase clients
 *    (their own totals, and who led them).
 * 3. On the top clients since 2019: their years.
 * 4. On the rows: each row's buyer's awards of that day, which tell its
 *    co-winners (see `procurement-supplier-contracts.ts`) — and, when every
 *    row was read, the buyers' counties.
 * 5. On the clients, the top clients and the rows: the names.
 *
 * Measured on the dev API (2026-09-28, production build): a large firm's
 * uncached page takes ~1.0–2.2 s to first byte with three analysis requests;
 * split into six it was slower — the API queues one client's requests.
 *
 * A follow-up, the registry or the cutoff (for the year in progress) that
 * fails leaves the page `partial` (served once, never kept) rather than
 * failing it; a reader who left fails it, and no read — shared or not — holds
 * a reader past their signal.
 */

const DIRECT = { grain: 'direct_acquisition' } as const
const AWARDS = { grain: 'contract', recordKind: 'contract_award' } as const
/** The CPV levels read flat for the reader's categories, coarsest first: each alias ends with its level. */
const CPV_LEVELS = [
  ['Divisions', 'cpvDivision'],
  ['Groups', 'cpvGroup'],
  ['Classes', 'cpvClass'],
  ['Categories', 'cpvCategory'],
] as const
/** Top direct-purchase clients since 2019 in the years matrix. */
const SPAN_CLIENTS = 8
/** Direct-purchase clients whose own totals the page reads, for the firm's weight in them. */
const WEIGHED_CLIENTS = 5
/** Buyers placed per request: a county breakdown is nine fields, so fifty stay under the API's 500. */
const PLACES_PER_REQUEST = 50
/** The company registry's `CUI` takes at most ten digits; a longer identifier has no record to read. */
const REGISTRY_CUI = /^\d{1,10}$/

type Raw = Readonly<Record<string, unknown>>

// ─────────────────────────────────────────────────────────── helpers ──

function topBuckets(raw: RawBuyerBreakdown | undefined) {
  return (raw?.[0]?.buckets ?? []).flatMap((bucket) => (bucket.kind === 'top' && bucket.key ? [{ ...bucket, key: bucket.key }] : []))
}

function ranking(raw: RawBuyerBreakdown | undefined): ClientRanking {
  return {
    rankedBy: raw?.[0]?.rankedBy === 'value' ? 'value' : 'count',
    rows: topBuckets(raw).map((bucket) => ({ cui: bucket.key, count: bucket.recordCount ?? 0, value: bucket.valueSum, share: bucket.shareOfScope })),
  }
}

function figures(stats: RawBuyerStats | undefined): GrainFigures {
  const block = stats?.blocks[0]
  return { count: block?.recordCount ?? null, valued: block?.withValueCount ?? null, value: block?.valueAwardedSum ?? null }
}

function pointsOf(series: RawBuyerSeries | undefined): ReadonlyMap<string, number | null> {
  return new Map((series?.[0]?.points ?? []).map((point) => [point.bucket, point.value]))
}

function cpvBuckets(raw: RawBuyerBreakdown | undefined): readonly CpvBucket[] {
  return (raw?.[0]?.buckets ?? []).map((bucket) => ({ key: bucket.key, kind: bucket.kind, count: bucket.recordCount ?? 0, value: bucket.valueSum, valued: bucket.withValueCount ?? null }))
}

function countyRows(raw: RawBuyerBreakdown | undefined): CountyFigureRow[] {
  return topBuckets(raw).map((bucket) => ({ code: bucket.key, count: bucket.recordCount ?? 0, value: bucket.valueSum, share: bucket.shareOfScope }))
}

function analysis(operationName: string, fields: readonly BuyerField[], signal?: AbortSignal): Promise<Raw> {
  const variables: Record<string, unknown> = Object.fromEntries(fields.map((field) => [field.alias, field.scope]))
  return graphqlQuery<Raw>(procurementBuyerQuery(operationName, fields, false), variables, { operationName, signal })
}

/** A read the page can do without: null on a failure, rethrown when the reader left. */
async function settle<T>(read: () => Promise<T>, signal?: AbortSignal): Promise<T | null> {
  try {
    return await read()
  } catch (error) {
    if (signal?.aborted) throw error
    return null
  }
}

/** Waits for a read the reader's signal cannot cancel (a shared one, or one without a signal), but not past the reader leaving. */
function untilAborted<T>(read: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return read
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise<T>((resolve, reject) => {
    const leave = () => reject(signal.reason)
    signal.addEventListener('abort', leave, { once: true })
    read.then(
      (value) => {
        signal.removeEventListener('abort', leave)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', leave)
        reject(error)
      },
    )
  })
}

// ──────────────────────────────────────────────────────── the cutoff ──

/** SEAP loads daily at most; the national cutoff is read once per ten minutes, for every firm. */
const CUTOFF_KEEP_MS = 10 * 60 * 1000
/** A shared read has no reader's deadline: it gets its own. */
const CUTOFF_TIMEOUT_MS = 5_000
const cutoffReads = new Map<number, { readonly at: number; readonly read: Promise<Cutoff> }>()

/**
 * SEAP's cutoff month per population, from the national monthly counts: the
 * same for every firm, so kept (a failed or timed-out read is forgotten). Not
 * bound to one reader's signal — it is shared — but to a timeout of its own.
 */
export function readSupplierCutoff(latest: number, now: number = Date.now()): Promise<Cutoff> {
  const kept = cutoffReads.get(latest)
  if (kept && now - kept.at < CUTOFF_KEEP_MS) return kept.read
  const part = latest + 1
  const fields: BuyerField[] = [
    { alias: 'nationalDirectMonths', kind: 'series', scope: { ...DIRECT, from: `${latest}-01`, to: `${part}-12` }, args: 'bucket: month, measure: recordCount' },
    { alias: 'nationalAwardMonths', kind: 'series', scope: { ...AWARDS, from: `${latest}-01`, to: `${part}-12` }, args: 'bucket: month, measure: recordCount' },
  ]
  const read = analysis('ProcurementSupplierCutoff', fields, AbortSignal.timeout(CUTOFF_TIMEOUT_MS)).then((raw): Cutoff => {
    const months = (alias: string) => (buyerSeriesSchema.parse(raw[alias])[0]?.points ?? []).map((point) => ({ month: point.bucket, count: point.value ?? 0 }))
    return { direct: cutoffMonth(months('nationalDirectMonths'), latest), contract: cutoffMonth(months('nationalAwardMonths'), latest) }
  })
  read.catch(() => {
    if (cutoffReads.get(latest)?.read === read) cutoffReads.delete(latest)
  })
  cutoffReads.set(latest, { at: now, read })
  return read
}

const NO_CUTOFF: Cutoff = { direct: null, contract: null }

// ─────────────────────────────────────────────────────── the fields ──
// Grouped by what each answer starts: the year's clients (the weights, the
// names) go alone; the top clients since 2019 (their years) ride with the
// figures and the months; the CPV levels start nothing.

/** The year's clients: they start the weights and the names. */
export function supplierKeyFields(cui: string, period: Period): BuyerField[] {
  const own = { supplierCui: cui, ...period.scope }
  return [
    { alias: 'directClients', kind: 'breakdown', scope: { ...own, ...DIRECT }, args: 'dimension: authority, topN: 10, rankBy: value' },
    { alias: 'awardClients', kind: 'breakdown', scope: { ...own, ...AWARDS }, args: 'dimension: authority, topN: 10, rankBy: count' },
  ]
}

/** The top direct-purchase clients since 2019: they start the years matrix. */
export function supplierSpanFields(cui: string, latest: number): BuyerField[] {
  return [
    {
      alias: 'spanClients',
      kind: 'breakdown',
      scope: { supplierCui: cui, ...DIRECT, from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${latest}-12` },
      args: `dimension: authority, topN: ${SPAN_CLIENTS}, rankBy: value`,
    },
  ]
}

/** The period's populations, the buyers' counties, the procedures. */
export function supplierFigureFields(cui: string, period: Period): BuyerField[] {
  const own = { supplierCui: cui }
  const inPeriod = { ...own, ...period.scope }
  return [
    { alias: 'direct', kind: 'stats', scope: { ...inPeriod, ...DIRECT } },
    ...(period.before ? [{ alias: 'directPrev', kind: 'stats' as const, scope: { ...own, ...period.before, ...DIRECT } }] : []),
    { alias: 'awards', kind: 'stats', scope: { ...inPeriod, ...AWARDS } },
    { alias: 'directBuyers', kind: 'series', scope: { ...inPeriod, ...DIRECT }, args: 'bucket: year, measure: distinctAuthorities' },
    { alias: 'counties', kind: 'breakdown', scope: { ...inPeriod, ...DIRECT }, args: 'dimension: buyerCounty, topN: 42, rankBy: value' },
    { alias: 'contractCounties', kind: 'breakdown', scope: { ...inPeriod, ...AWARDS }, args: 'dimension: buyerCounty, topN: 42, rankBy: count' },
    { alias: 'procedures', kind: 'breakdown', scope: { ...inPeriod, ...AWARDS }, args: 'dimension: procedureType, topN: 8, rankBy: count' },
  ]
}

/**
 * The direct purchases per month since 2019 through the year in progress:
 * the years and the year in progress's months both come from them (the sums
 * are additive), two reads instead of four.
 */
export function supplierMonthFields(cui: string, latest: number): BuyerField[] {
  const scope = { supplierCui: cui, ...DIRECT, from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${latest + 1}-12` }
  return [
    { alias: 'directMonthsValue', kind: 'series', scope, args: 'bucket: month, measure: valueAwardedSum' },
    { alias: 'directMonthsCount', kind: 'series', scope, args: 'bucket: month, measure: recordCount' },
  ]
}

/** One population's CPV levels, read flat for the reader's categories (`direct…` or `awards…`). */
export function supplierCategoryFields(cui: string, period: Period, grain: 'direct' | 'awards'): BuyerField[] {
  const base = grain === 'direct' ? DIRECT : AWARDS
  return CPV_LEVELS.map(([level, dimension]) => ({
    alias: `${grain}${level}`,
    kind: 'breakdown',
    scope: { supplierCui: cui, ...period.scope, ...base },
    args: `dimension: ${dimension}, topN: 100, rankBy: value`,
  }))
}

function spanFields(cui: string, latest: number, clients: readonly string[]): BuyerField[] {
  return clients.map((client, index) => ({
    alias: `s${index}`,
    kind: 'series',
    scope: { supplierCui: cui, authorityCui: client, ...DIRECT, from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${latest}-12` },
    args: 'bucket: year, measure: valueAwardedSum',
  }))
}

function weightFields(period: Period, clients: readonly string[]): BuyerField[] {
  return clients.flatMap((client, index): BuyerField[] => [
    { alias: `w${index}`, kind: 'stats', scope: { authorityCui: client, ...period.scope, ...DIRECT } },
    { alias: `f${index}`, kind: 'breakdown', scope: { authorityCui: client, ...period.scope, ...DIRECT }, args: 'dimension: supplier, topN: 1, rankBy: value' },
  ])
}

function placeFields(buyers: readonly string[]): BuyerField[] {
  return buyers.map((buyer, index) => ({ alias: `c${index}`, kind: 'breakdown', scope: { authorityCui: buyer, ...AWARDS }, args: 'dimension: buyerCounty, topN: 1, rankBy: count' }))
}

/** The names on the firm's own direct purchases from institutions the spine cannot name, in requests of forty. */
async function readDirectNames(cui: string, buyers: readonly string[], signal?: AbortSignal): Promise<ReadonlyMap<string, string>> {
  const answers = await Promise.all(
    chunks(buyers, SUPPLIER_DAYS_PER_REQUEST).map(async (batch) => {
      const variables = Object.fromEntries(batch.map((buyer, index) => [`n${index}`, { supplierCui: { eq: cui }, authorityCui: { eq: buyer } }]))
      const raw = await graphqlQuery<Raw>(supplierDirectNamesQuery(batch.length), variables, { operationName: 'ProcurementSupplierDirectNames', signal })
      return batch.map((buyer, index) => [buyer, supplierDirectNameSchema.parse(raw[`n${index}`]).items[0]?.authority] as const)
    }),
  )
  return new Map(answers.flat().flatMap(([buyer, authority]) => (authority && (authority.displayName ?? authority.name) ? [[buyer, partyOf(authority).name] as const] : [])))
}

/** Where each buyer sits: the county on its own contract records, in requests of fifty. */
async function readPlaces(buyers: readonly string[], signal?: AbortSignal): Promise<ReadonlyMap<string, string>> {
  const answers = await Promise.all(
    chunks(buyers, PLACES_PER_REQUEST).map(async (batch) => {
      const raw = await analysis('ProcurementSupplierPlaces', placeFields(batch), signal)
      return batch.map((buyer, index) => [buyer, topBuckets(buyerBreakdownSchema.parse(raw[`c${index}`]))[0]?.key] as const)
    }),
  )
  return new Map(answers.flat().flatMap(([buyer, county]) => (county ? [[buyer, county] as const] : [])))
}

// ─────────────────────────────────────────────────────── the mapping ──

/** Everything a profile is read from; a follow-up that failed is null. */
export interface SupplierReads {
  /** The keys, the figures (with the months and the span) and the CPV levels, merged. */
  readonly raw: Raw
  readonly rows: SupplierRowsRead
  /** Each row's buyer's awards of that day (the consortium scan); null when the read failed. */
  readonly days: ReadonlyMap<string, SupplierDay> | null
  /** Null when the rows were not all read, or the read failed (`placesFailed`). */
  readonly places: ReadonlyMap<string, string> | null
  readonly placesFailed: boolean
  /** The spine's labels, positional over `cuis`, and the names on the firm's direct purchases for the rest. */
  readonly names: { readonly cuis: readonly string[]; readonly raw: Raw | null; readonly fallback: ReadonlyMap<string, string> }
  /** The top clients since 2019 and their years (`s0`, `s1`, …). */
  readonly span: { readonly clients: readonly string[]; readonly raw: Raw | null }
  readonly weights: { readonly clients: readonly string[]; readonly raw: Raw | null }
  /** The registry's record: `null` for a firm it does not hold, `undefined` when the read failed. */
  readonly registry: PrivateCompanyProfile | null | undefined
  readonly cutoff: Cutoff
  /** The cutoff could not be read: the year in progress is then neither bounded nor compared. */
  readonly cutoffFailed: boolean
}

/** A sum over the months present; null when none is. */
function sumOf(values: readonly (number | null | undefined)[]): number | null {
  const present = values.filter((value): value is number => value !== null && value !== undefined)
  return present.length > 0 ? present.reduce((sum, value) => sum + value, 0) : null
}

export function mapSupplierProfile(cui: string, period: Period, latest: number, reads: SupplierReads): SupplierProfile {
  const { raw, rows: read } = reads
  const part = latest + 1
  const stats = (alias: string) => buyerStatsSchema.parse(raw[alias])
  const series = (alias: string) => buyerSeriesSchema.parse(raw[alias])
  const breakdown = (alias: string) => buyerBreakdownSchema.parse(raw[alias])

  // Names: the spine's labels, positional; the rows' own names where the spine has none.
  const names = new Map<string, string>()
  if (reads.names.raw) {
    buyerLabelsSchema.parse(reads.names.raw.labels ?? []).forEach((label, index) => {
      const key = reads.names.cuis[index]
      if (key && label.status === 'named' && label.canonicalName) names.set(key, buyerName(label.canonicalName, null, false))
    })
  }
  for (const row of read.rows) {
    const buyer = row.authority.cui
    if (buyer && !names.has(buyer)) names.set(buyer, partyOf(row.authority).name)
  }
  for (const [buyer, known] of reads.names.fallback) if (!names.has(buyer)) names.set(buyer, known)
  // The registry's name, as the company page writes it; else the firm's own records', else the spine's label.
  const ownRow = read.rows[0]
  const name = reads.registry ? displayCompanyName(reads.registry.legalName) : ownRow ? firmName(ownRow.supplier).name : (names.get(cui) ?? cui)

  // The years and the year in progress, both from the months. The year in
  // progress ends where the page's reads of it end: the earlier cutoff.
  const partThrough = throughMonth(part, reads.cutoff)
  const monthValues = pointsOf(series('directMonthsValue'))
  const monthCounts = pointsOf(series('directMonthsCount'))
  const monthsOf = (year: number) => Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`)
  const directPoints: YearPoint[] = []
  for (let year = DIRECT_COMPARABLE_FROM; year <= part; year += 1) {
    const months = monthsOf(year)
    if (!months.some((month) => monthValues.has(month) || monthCounts.has(month))) continue
    directPoints.push({ year, value: sumOf(months.map((month) => monthValues.get(month))), count: sumOf(months.map((month) => monthCounts.get(month))) })
  }
  const partMonths = monthsOf(part).map((month) => ({ month, value: monthValues.get(month) ?? null, count: monthCounts.get(month) ?? null }))
  const directYears = truncatePartYear(directPoints, partMonths, part, partThrough)
  const contractYears: YearPoint[] = [...read.years.entries()].map(([year, count]) => ({ year, value: null, count }))
  if (partThrough) contractYears.push({ year: part, value: null, count: sumOf([...read.partMonths.entries()].filter(([month]) => month <= partThrough).map(([, rows]) => rows)) })

  const directClients = ranking(breakdown('directClients'))
  const weights = new Map<string, ClientWeight>()
  const weightRaw = reads.weights.raw
  if (weightRaw) {
    reads.weights.clients.forEach((client, index) => {
      const total = buyerStatsSchema.parse(weightRaw[`w${index}`]).blocks[0]?.valueAwardedSum ?? null
      const first = topBuckets(buyerBreakdownSchema.parse(weightRaw[`f${index}`]))[0]?.key === cui
      const own = directClients.rows.find((row) => row.cui === client)?.value ?? null
      weights.set(client, { share: total && own !== null ? own / total : null, first })
    })
  }
  const spanRaw = reads.span.raw
  const clientYears: PartyYears[] = spanRaw
    ? reads.span.clients.map((client, index) => {
        const valueOf = pointsOf(buyerSeriesSchema.parse(spanRaw[`s${index}`]))
        const years = Array.from({ length: latest - DIRECT_COMPARABLE_FROM + 1 }, (_, offset) => {
          const year = DIRECT_COMPARABLE_FROM + offset
          return { year, value: valueOf.get(String(year)) ?? null }
        })
        return { cui: client, years, total: years.reduce((sum, point) => sum + (point.value ?? 0), 0) }
      })
    : []

  const tree = (grain: 'direct' | 'awards') => {
    const { leaves, unknown } = levelCpvLeaves(CPV_LEVELS.map(([level]) => cpvBuckets(breakdown(`${grain}${level}`))))
    return readerCategories(leaves, unknown)
  }
  const contracts = supplierContractPicture(cui, name, read, reads.days, reads.places)
  // Where the clients are: the direct purchases' money; for a firm with none, its contracts — every one when all were read, else those it won alone.
  const directCounties = countyRows(breakdown('counties'))
  const procedures = breakdown('procedures')
  const firstYear = [...directYears, ...contractYears].filter((point) => (point.count ?? 0) > 0).reduce<number | null>((first, point) => (first === null || point.year < first ? point.year : first), null)

  return {
    cui,
    year: period.year,
    latest,
    through: period.through,
    name,
    registry: reads.registry ?? null,
    registryFailed: reads.registry === undefined,
    direct: { ...figures(stats('direct')), clients: pointsOf(series('directBuyers')).get(String(period.year)) ?? null },
    directPrev: raw.directPrev ? figures(stats('directPrev')) : null,
    awards: figures(stats('awards')),
    contracts,
    directYears,
    contractYears,
    partYear: directYears.some((point) => point.year === part) || contractYears.some((point) => point.year === part) ? part : null,
    cutoff: partThrough ? { direct: partThrough, contract: partThrough } : reads.cutoff,
    directClients,
    analysisClients: ranking(breakdown('awardClients')),
    weights,
    clientYears,
    categories: { direct: tree('direct'), contract: tree('awards') },
    counties: directCounties.length > 0 ? directCounties : (contracts.counties ?? countyRows(breakdown('contractCounties'))),
    countiesRankedBy: directCounties.length > 0 && breakdown('counties')[0]?.rankedBy === 'value' ? 'value' : 'count',
    countiesOf: directCounties.length > 0 ? 'direct' : 'contracts',
    procedures: topBuckets(procedures).map((bucket) => ({ key: bucket.key, count: bucket.recordCount ?? 0 })),
    proceduresUnlisted: (procedures[0]?.buckets ?? []).filter((bucket) => bucket.kind !== 'top' || bucket.key === null).reduce((sum, bucket) => sum + (bucket.recordCount ?? 0), 0),
    firstYear,
    names,
    partial:
      reads.registry === undefined ||
      !reads.names.raw ||
      !reads.span.raw ||
      !reads.weights.raw ||
      reads.days === null ||
      reads.placesFailed ||
      // The chart's year in progress and the data's date hang on it, whichever year the page shows.
      reads.cutoffFailed,
  }
}

// ─────────────────────────────────────────────────────────── the reads ──

/** The shared cutoff, as a result rather than a failure: a failed read is no cutoff, said. */
function readCutoffOutcome(latest: number): Promise<{ readonly cutoff: Cutoff; readonly failed: boolean }> {
  return readSupplierCutoff(latest).then(
    (cutoff) => ({ cutoff, failed: false }),
    () => ({ cutoff: NO_CUTOFF, failed: true }),
  )
}

/** The firm's page for a year: the reads side by side, the follow-ups on their keys. */
export async function fetchProcurementSupplier(cui: string, year: number, signal?: AbortSignal): Promise<SupplierProfile> {
  const latest = homeYear()
  const cutoffRead = untilAborted(readCutoffOutcome(latest), signal)
  // The year in progress waits for the cutoff, which bounds its reads; a complete year starts at once.
  const period = periodOf(year, latest, year > latest ? (await cutoffRead).cutoff : null)
  // Three analysis requests: more, smaller ones queue behind each other on the API and come back later (measured 2026-09-28).
  // The year's clients go alone, so the weights they start begin early; the slow span since 2019 rides with the figures.
  const keysRead = analysis('ProcurementSupplierKeys', supplierKeyFields(cui, period), signal)
  const figuresRead = analysis('ProcurementSupplierFigures', [...supplierFigureFields(cui, period), ...supplierMonthFields(cui, latest), ...supplierSpanFields(cui, latest)], signal)
  const categoriesRead = analysis('ProcurementSupplierCategories', [...supplierCategoryFields(cui, period, 'direct'), ...supplierCategoryFields(cui, period, 'awards')], signal)
  const rowsRead = readSupplierRows(cui, period, latest, signal)
  // `undefined` for a failed read: the page names the firm by its own records and says nothing of its status.
  const registryRead = REGISTRY_CUI.test(cui) ? untilAborted(fetchPrivateCompanyProfile(cui).catch(() => undefined), signal) : Promise.resolve(null)

  const weightsRead = keysRead.then(async (keys) => {
    const clients = ranking(buyerBreakdownSchema.parse(keys.directClients)).rows.slice(0, WEIGHED_CLIENTS).map((row) => row.cui)
    const raw = clients.length > 0 ? await settle(() => analysis('ProcurementSupplierWeights', weightFields(period, clients), signal), signal) : {}
    return { clients, raw }
  })
  const spanClients = figuresRead.then((figuresRaw) => topBuckets(buyerBreakdownSchema.parse(figuresRaw.spanClients)).map((bucket) => bucket.key))
  const spanRead = spanClients.then(async (clients) => {
    const raw = clients.length > 0 ? await settle(() => analysis('ProcurementSupplierSpanYears', spanFields(cui, latest, clients), signal), signal) : {}
    return { clients, raw }
  })
  const daysRead = rowsRead.then((read) => settle(() => readSupplierDays(read.rows, signal), signal))
  // The buyers' counties only when every row was read: a list cut at a hundred would place only its largest contracts.
  const placesRead = rowsRead.then(async (read) => {
    if (!read.counted || read.rows.length < read.total) return { places: null, failed: false }
    const buyers = [...new Set(read.rows.flatMap((row) => (row.authority.cui ? [row.authority.cui] : [])))]
    const places = await settle(() => readPlaces(buyers, signal), signal)
    return { places, failed: places === null }
  })
  const namesRead = Promise.all([keysRead, spanClients, rowsRead]).then(async ([keys, span, read]) => {
    const listed = [...ranking(buyerBreakdownSchema.parse(keys.directClients)).rows, ...ranking(buyerBreakdownSchema.parse(keys.awardClients)).rows].map((row) => row.cui)
    const rowBuyers = read.rows.flatMap((row) => (row.authority.cui ? [row.authority.cui] : []))
    const cuis = [...new Set([cui, ...listed, ...span, ...rowBuyers])]
    const raw = await settle(() => graphqlQuery<Raw>(SUPPLIER_NAMES_QUERY, { cuis }, { operationName: 'ProcurementSupplierNames', signal }), signal)
    // The spine holds a placeholder for some institutions; the firm's own direct purchases from them carry their name.
    const labelled = new Set(raw ? buyerLabelsSchema.parse(raw.labels ?? []).flatMap((label, index) => (label.status === 'named' && label.canonicalName ? [cuis[index]] : [])) : [])
    const directCuis = new Set([...ranking(buyerBreakdownSchema.parse(keys.directClients)).rows.map((row) => row.cui), ...span])
    const unnamed = [...directCuis].filter((client) => !labelled.has(client) && !rowBuyers.includes(client))
    const fallback = raw && unnamed.length > 0 ? await settle(() => readDirectNames(cui, unnamed, signal), signal) : null
    return { cuis, raw, fallback: fallback ?? new Map<string, string>() }
  })

  const [keys, figuresRaw, categoriesRaw, rows, days, placed, names, span, weights, registry, cutoff] = await Promise.all([
    keysRead,
    figuresRead,
    categoriesRead,
    rowsRead,
    daysRead,
    placesRead,
    namesRead,
    spanRead,
    weightsRead,
    registryRead,
    cutoffRead,
  ])
  return mapSupplierProfile(cui, period, latest, {
    raw: { ...keys, ...figuresRaw, ...categoriesRaw },
    rows,
    days,
    places: placed.places,
    placesFailed: placed.failed,
    names,
    span,
    weights,
    registry,
    cutoff: cutoff.cutoff,
    cutoffFailed: cutoff.failed,
  })
}

/**
 * The year's largest direct purchases, within the same period as the profile.
 * The year in progress needs the cutoff: without it the read fails (and is
 * read again) rather than keep a list that runs past it.
 */
export async function fetchProcurementSupplierDirect(cui: string, year: number, limit: number, signal?: AbortSignal): Promise<readonly RecentRecord[]> {
  const latest = homeYear()
  const period = periodOf(year, latest, year > latest ? await untilAborted(readSupplierCutoff(latest), signal) : null)
  const raw = await graphqlQuery<unknown>(
    PROCUREMENT_HOME_DIRECT_QUERY,
    // The direct-purchase filter's `publicationDate` binds to the finalization date on the server.
    { filter: { supplierCui: { eq: cui }, publicationDate: period.range, valueState: { in: ACCEPTED_VALUE_STATES } }, rows: limit },
    { operationName: 'ProcurementSupplierDirect', signal },
  )
  return procurementHomeDirectResponseSchema.parse(raw).procurementDirectAcquisitions.items.flatMap((item): RecentRecord[] => {
    const value = acceptedValue(item.value)
    return value === null
      ? []
      : [{ id: item.id, grain: 'direct', date: item.finalizationDate, title: tidyTitle(item.title), cpvCode: item.cpvCode, buyer: partyOf(item.authority), winners: [partyOf(item.supplier)], value }]
  })
}
