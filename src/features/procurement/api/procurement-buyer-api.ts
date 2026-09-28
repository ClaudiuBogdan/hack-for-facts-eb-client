import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  buyerBreakdownSchema,
  buyerEntitySchema,
  buyerLabelsSchema,
  buyerSeriesSchema,
  buyerStatsSchema,
  procurementBuyerExtrasQuery,
  procurementBuyerQuery,
  type BuyerField,
  type BuyerFieldGroup,
  type RawBuyerBreakdown,
  type RawBuyerSeries,
  type RawBuyerStats,
} from './graphql/procurement-buyer-queries'
import { PROCUREMENT_HOME_DIRECT_QUERY, procurementHomeDirectResponseSchema } from './graphql/procurement-home-queries'
import { readCutoffOutcome, readProcurementCutoff, untilAborted } from './procurement-cutoff'
import { ACCEPTED_VALUE_STATES, acceptedValue, fetchGroupedContracts, partyOf } from './procurement-home-api'
import {
  buyerName,
  tidyAddress,
  type BuyerIdentity,
  type BuyerProfile,
  type BuyerRecords,
  type CountyShare,
  type GrainFigures,
  type MonthFigure,
  type SupplierRanking,
  type SupplierYears,
} from '../lib/buyer-model'
import { levelCpvLeaves, readerCategories, type CpvBucket } from '../lib/home-categories'
import { DIRECT_COMPARABLE_FROM, homeYear, tidyTitle, truncatePartYear, type RecentRecord, type YearPoint } from '../lib/home-model'
import { periodOf, throughMonth, type Cutoff, type Period } from '../lib/profile-period'

/**
 * One buyer's page, read as:
 *
 * 1. The profile, three requests side by side (the API resolves one
 *    request's fields one after another): the keys (the year's suppliers,
 *    the top sellers since 2019, the buyer's county on its records), the
 *    figures (the year's populations and the year before, the years since
 *    2019, the months, supplier counties, procedures), and the CPV levels
 *    for the reader's categories — and beside them the budget platform's
 *    identity record, which fails soft (`partial`), and SEAP's cutoff, the
 *    shared read (`procurement-cutoff.ts`). The year in progress waits for
 *    the cutoff, which bounds its reads (through its month, compared with
 *    nothing); a complete year starts at once.
 * 2. The follow-up, started as soon as the keys and the identity land:
 *    supplier names (and the buyer's own label), each top seller's years, the
 *    county's direct purchases. It is read once more on a failure and then
 *    left out (`partial`, `namesUnread`): the page shows CUIs rather than
 *    nothing.
 * 3. The year's largest records, beside the rest.
 *
 * Measured on the dev API (2026-09-27): a large buyer's uncached profile took
 * ~2.4 s as one request with the front door's drilled CPV tree, and the
 * follow-up ~0.7 s after it (~3.1 s to first byte). Three requests side by
 * side, the CPV tree read flat per level, and the follow-up on the keys: ~1.0
 * –1.3 s.
 */

const DIRECT = { grain: 'direct_acquisition' } as const
const AWARDS = { grain: 'contract', recordKind: 'contract_award' } as const
const FRAMEWORKS = { grain: 'contract', recordKind: 'framework_agreement' } as const

/** The budget platform's `CUI` scalar takes at most ten digits; a longer identifier has no entity record to read. */
const ENTITY_CUI = /^\d{1,10}$/
/** The CPV levels read flat for the reader's categories, coarsest first: each alias ends with its level. */
const CPV_LEVELS = [
  ['Divisions', 'cpvDivision'],
  ['Groups', 'cpvGroup'],
  ['Classes', 'cpvClass'],
  ['Categories', 'cpvCategory'],
] as const

/** Top direct-purchase sellers since 2019 in the years matrix. */
const SPAN_SUPPLIERS = 8

// ──────────────────────────────────────────────────────────── mapping ──

function figures(stats: RawBuyerStats | undefined, suppliers: RawBuyerSeries | undefined): GrainFigures {
  const block = stats?.blocks[0]
  return {
    count: block?.recordCount ?? null,
    valued: block?.withValueCount ?? null,
    value: block?.valueAwardedSum ?? null,
    suppliers: suppliers?.[0]?.points?.[0]?.value ?? null,
  }
}

function pointsOf(series: RawBuyerSeries | undefined): ReadonlyMap<string, number | null> {
  return new Map((series?.[0]?.points ?? []).map((point) => [point.bucket, point.value]))
}

function yearPoints(values: RawBuyerSeries | undefined, counts: RawBuyerSeries | undefined, to: number): YearPoint[] {
  const valueOf = pointsOf(values)
  const countOf = pointsOf(counts)
  const points: YearPoint[] = []
  for (let year = DIRECT_COMPARABLE_FROM; year <= to; year += 1) {
    const key = String(year)
    if (!valueOf.has(key) && !countOf.has(key)) continue
    points.push({ year, value: valueOf.get(key) ?? null, count: countOf.get(key) ?? null })
  }
  return points
}

function monthFigures(values: RawBuyerSeries | undefined, counts: RawBuyerSeries | undefined, year: number): MonthFigure[] {
  const valueOf = pointsOf(values)
  const countOf = pointsOf(counts)
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${year}-${String(index + 1).padStart(2, '0')}`
    return { month, value: valueOf.get(month) ?? null, count: countOf.get(month) ?? null }
  })
}

function topBuckets(raw: RawBuyerBreakdown | undefined) {
  return (raw?.[0]?.buckets ?? []).flatMap((bucket) => (bucket.kind === 'top' && bucket.key ? [{ ...bucket, key: bucket.key }] : []))
}

function supplierRanking(raw: RawBuyerBreakdown | undefined): SupplierRanking {
  return {
    rankedBy: raw?.[0]?.rankedBy === 'value' ? 'value' : 'count',
    rows: topBuckets(raw).map((bucket) => ({ cui: bucket.key, count: bucket.recordCount ?? 0, value: bucket.valueSum, share: bucket.shareOfScope })),
  }
}

function cpvBuckets(raw: RawBuyerBreakdown | undefined): readonly CpvBucket[] {
  return (raw?.[0]?.buckets ?? []).map((bucket) => ({
    key: bucket.key,
    kind: bucket.kind,
    count: bucket.recordCount ?? 0,
    value: bucket.valueSum,
    valued: bucket.withValueCount ?? null,
  }))
}

export type RawBuyerProfile = Readonly<Record<string, unknown>>

/**
 * The profile's reads, one alias each; the fields are the document and the
 * variables at once. The year's reads are the period's: a complete year, or
 * the year in progress through its cutoff month.
 */
export function buyerProfileFields(cui: string, period: Period, latest: number): BuyerField[] {
  const part = latest + 1
  const own = { authorityCui: cui }
  const inPeriod = { ...own, ...period.scope }
  const span = { from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${part}-12` }
  const fields: BuyerField[] = [
    { alias: 'direct', kind: 'stats', scope: { ...inPeriod, ...DIRECT } },
    // The year before only where it compares: not before 2019 (legacy rows), nor for the year in progress.
    ...(period.before ? [{ alias: 'directPrev', kind: 'stats' as const, scope: { ...own, ...period.before, ...DIRECT } }] : []),
    { alias: 'awards', kind: 'stats', scope: { ...inPeriod, ...AWARDS } },
    { alias: 'frameworks', kind: 'stats', scope: { ...inPeriod, ...FRAMEWORKS } },
    { alias: 'directSellers', kind: 'series', scope: { ...inPeriod, ...DIRECT }, args: 'bucket: year, measure: distinctSuppliers' },
    { alias: 'awardSellers', kind: 'series', scope: { ...inPeriod, ...AWARDS }, args: 'bucket: year, measure: distinctSuppliers' },
    { alias: 'directYearsValue', kind: 'series', scope: { ...own, ...DIRECT, ...span }, args: 'bucket: year, measure: valueAwardedSum' },
    { alias: 'directYearsCount', kind: 'series', scope: { ...own, ...DIRECT, ...span }, args: 'bucket: year, measure: recordCount' },
    { alias: 'awardYearsCount', kind: 'series', scope: { ...own, ...AWARDS, ...span }, args: 'bucket: year, measure: recordCount' },
    // The chart's column for the year in progress, by month: cut at each population's own cutoff.
    { alias: 'directPartValue', kind: 'series', scope: { ...own, year: part, ...DIRECT }, args: 'bucket: month, measure: valueAwardedSum' },
    { alias: 'directPartCount', kind: 'series', scope: { ...own, year: part, ...DIRECT }, args: 'bucket: month, measure: recordCount' },
    { alias: 'awardPartCount', kind: 'series', scope: { ...own, year: part, ...AWARDS }, args: 'bucket: month, measure: recordCount' },
    { alias: 'directMonthsValue', kind: 'series', scope: { ...inPeriod, ...DIRECT }, args: 'bucket: month, measure: valueAwardedSum' },
    { alias: 'directMonthsCount', kind: 'series', scope: { ...inPeriod, ...DIRECT }, args: 'bucket: month, measure: recordCount' },
    { alias: 'directSuppliers', kind: 'breakdown', scope: { ...inPeriod, ...DIRECT }, args: 'dimension: supplier, topN: 10, rankBy: value' },
    { alias: 'awardSuppliers', kind: 'breakdown', scope: { ...inPeriod, ...AWARDS }, args: 'dimension: supplier, topN: 10, rankBy: count' },
    { alias: 'directCounties', kind: 'breakdown', scope: { ...inPeriod, ...DIRECT }, args: 'dimension: supplierCounty, topN: 42, rankBy: value' },
    { alias: 'procedures', kind: 'breakdown', scope: { ...inPeriod, ...AWARDS }, args: 'dimension: procedureType, topN: 8, rankBy: count' },
    { alias: 'buyerCounty', kind: 'breakdown', scope: { ...own, ...DIRECT }, args: 'dimension: buyerCounty, topN: 1, rankBy: count' },
    {
      alias: 'spanSuppliers',
      kind: 'breakdown',
      scope: { ...own, ...DIRECT, from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${latest}-12` },
      args: `dimension: supplier, topN: ${SPAN_SUPPLIERS}, rankBy: value`,
    },
  ]
  for (const [grain, base] of [
    ['direct', DIRECT],
    ['awards', AWARDS],
  ] as const) {
    // One flat read per CPV level, not the front door's drilled tree: eight reads instead of sixteen, finer everywhere. Each
    // level keeps what the next does not hold (`levelCpvLeaves`), so a large buyer's codes past the API's hundred stay with
    // their parent code: a little precision lost, no money.
    for (const [level, dimension] of CPV_LEVELS) {
      fields.push({ alias: `${grain}${level}`, kind: 'breakdown', scope: { ...inPeriod, ...base }, args: `dimension: ${dimension}, topN: 100, rankBy: value` })
    }
  }
  return fields.map((field) => ({ ...field, group: groupOf(field.alias) }))
}

const KEY_ALIASES = new Set(['directSuppliers', 'awardSuppliers', 'spanSuppliers', 'buyerCounty'])

function groupOf(alias: string): BuyerFieldGroup {
  if (KEY_ALIASES.has(alias)) return 'keys'
  if (CPV_LEVELS.some(([level]) => alias.endsWith(level))) return 'categories'
  return 'figures'
}

/** The profile's three requests, merged and mapped with SEAP's cutoff; names, the matrix and the county share are the follow-up's. */
export function mapBuyerProfile(
  raw: RawBuyerProfile,
  cui: string,
  period: Period,
  latest: number,
  cutoff: Cutoff,
): Omit<BuyerProfile, 'names' | 'supplierYears' | 'countyShare' | 'partial' | 'namesUnread'> {
  const { year } = period
  const part = latest + 1
  const stats = (alias: string) => buyerStatsSchema.parse(raw[alias])
  const series = (alias: string) => buyerSeriesSchema.parse(raw[alias])
  const breakdown = (alias: string) => buyerBreakdownSchema.parse(raw[alias])
  const entity = buyerEntitySchema.parse(raw.entity ?? null)

  // One date covers the page: the chart's year in progress stops where the page's reads do, at the earlier population's cutoff.
  const partThrough = throughMonth(part, cutoff)
  const directYears = truncatePartYear(
    yearPoints(series('directYearsValue'), series('directYearsCount'), part),
    monthFigures(series('directPartValue'), series('directPartCount'), part),
    part,
    partThrough,
  )
  const awardYears = truncatePartYear(
    yearPoints(undefined, series('awardYearsCount'), part),
    monthFigures(undefined, series('awardPartCount'), part),
    part,
    partThrough,
  )
  const tree = (grain: 'direct' | 'awards') => {
    const { leaves, unknown } = levelCpvLeaves(CPV_LEVELS.map(([level]) => cpvBuckets(breakdown(`${grain}${level}`))))
    return readerCategories(leaves, unknown)
  }

  const territory = entity?.territory ?? null
  const reference = entity?.reference ?? null
  const townHall = reference?.isTerritorialExecutive ?? false
  const population = entity?.annualPopulation?.population ?? null
  const identity: BuyerIdentity = {
    cui,
    name: buyerName(entity?.organization?.name ?? reference?.name ?? cui, territory, townHall),
    entityType: reference?.entityType ?? null,
    isTownHall: townHall,
    place: territory,
    population: townHall && population !== null && entity?.annualPopulation ? { year: entity.annualPopulation.year, value: population } : null,
    address: tidyAddress(reference?.address ?? null),
    hasBudget: entity?.budget?.presence ?? false,
  }
  const counties: CountyShare[] = topBuckets(breakdown('directCounties')).map((bucket) => ({
    code: bucket.key,
    count: bucket.recordCount ?? 0,
    value: bucket.valueSum,
    share: bucket.shareOfScope,
  }))

  return {
    identity,
    year,
    latest,
    through: period.through,
    county: territory?.countyCode ?? topBuckets(breakdown('buyerCounty'))[0]?.key ?? null,
    direct: figures(stats('direct'), series('directSellers')),
    directPrev: period.before ? figures(stats('directPrev'), undefined) : null,
    awards: figures(stats('awards'), series('awardSellers')),
    frameworks: stats('frameworks').blocks[0]?.recordCount ?? null,
    directYears,
    awardYears,
    partYear: directYears.some((point) => point.year === part) || awardYears.some((point) => point.year === part) ? part : null,
    cutoff: partThrough ? { direct: partThrough, contract: partThrough } : cutoff,
    directMonths: monthFigures(series('directMonthsValue'), series('directMonthsCount'), year),
    directSuppliers: supplierRanking(breakdown('directSuppliers')),
    awardSuppliers: supplierRanking(breakdown('awardSuppliers')),
    categories: { direct: tree('direct'), contract: tree('awards') },
    supplierCounties: counties,
    supplierCountiesRankedBy: breakdown('directCounties')[0]?.rankedBy === 'count' ? 'count' : 'value',
    procedures: topBuckets(breakdown('procedures')).map((bucket) => ({ key: bucket.key, count: bucket.recordCount ?? 0 })),
    proceduresUnlisted: (breakdown('procedures')[0]?.buckets ?? [])
      .filter((bucket) => bucket.kind !== 'top' || bucket.key === null)
      .reduce((sum, bucket) => sum + (bucket.recordCount ?? 0), 0),
  }
}

// ──────────────────────────────────────────────────────── the extras ──

interface BuyerExtras {
  readonly names: ReadonlyMap<string, string>
  readonly supplierYears: readonly SupplierYears[]
  /** The county's direct purchases in the year; the share needs the buyer's own, from the figures request. */
  readonly countyValue: number | null
}

export function buyerExtrasFields(cui: string, period: Period, latest: number, spanSuppliers: readonly string[], county: string | null): BuyerField[] {
  const fields: BuyerField[] = spanSuppliers.map((supplier, index) => ({
    alias: `s${index}`,
    kind: 'series',
    scope: { authorityCui: cui, supplierCui: supplier, ...DIRECT, from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${latest}-12` },
    args: 'bucket: year, measure: valueAwardedSum',
  }))
  // The county over the same period as the buyer: its share compares like with like.
  if (county) fields.push({ alias: 'county', kind: 'stats', scope: { buyerCounty: county, ...period.scope, ...DIRECT } })
  return fields
}

/** What the follow-up needs from the keys and the identity: the firms to name, the top sellers' CUIs, the buyer's county. */
export function buyerKeysOf(raw: RawBuyerProfile): { readonly cuis: readonly string[]; readonly spanSuppliers: readonly string[]; readonly county: string | null } {
  const breakdown = (alias: string) => buyerBreakdownSchema.parse(raw[alias])
  const spanSuppliers = topBuckets(breakdown('spanSuppliers')).map((bucket) => bucket.key)
  const listed = [...topBuckets(breakdown('directSuppliers')), ...topBuckets(breakdown('awardSuppliers'))].map((bucket) => bucket.key)
  const territory = buyerEntitySchema.parse(raw.entity ?? null)?.territory ?? null
  return {
    cuis: [...new Set([...listed, ...spanSuppliers])],
    spanSuppliers,
    county: territory?.countyCode ?? topBuckets(breakdown('buyerCounty'))[0]?.key ?? null,
  }
}

/** Names positionally (the spine answers each CUI in order, `unavailable` without one); only a `named` label is used. */
export function mapBuyerExtras(
  raw: RawBuyerProfile,
  cuis: readonly string[],
  spanSuppliers: readonly string[],
  latest: number,
  county: string | null,
): BuyerExtras {
  const names = new Map<string, string>()
  buyerLabelsSchema.parse(raw.labels ?? []).forEach((label, index) => {
    const cui = cuis[index]
    if (cui && label.status === 'named' && label.canonicalName) names.set(cui, buyerName(label.canonicalName, null, false))
  })
  const supplierYears = spanSuppliers.map((supplier, index): SupplierYears => {
    const valueOf = pointsOf(buyerSeriesSchema.parse(raw[`s${index}`]))
    const years = Array.from({ length: latest - DIRECT_COMPARABLE_FROM + 1 }, (_, offset) => {
      const year = DIRECT_COMPARABLE_FROM + offset
      return { year, value: valueOf.get(String(year)) ?? null }
    })
    return { cui: supplier, years, total: years.reduce((sum, point) => sum + (point.value ?? 0), 0) }
  })
  return {
    names,
    supplierYears,
    countyValue: county ? (buyerStatsSchema.parse(raw.county).blocks[0]?.valueAwardedSum ?? null) : null,
  }
}

// ─────────────────────────────────────────────────────────── the reads ──

const PROFILE_REQUESTS: readonly { readonly group: BuyerFieldGroup; readonly operationName: string }[] = [
  { group: 'keys', operationName: 'ProcurementBuyerKeys' },
  { group: 'figures', operationName: 'ProcurementBuyerFigures' },
  { group: 'categories', operationName: 'ProcurementBuyerCategories' },
]

/**
 * The budget platform's record of the buyer (type, place, population,
 * address, budget), in a request of its own: an error there must not take the
 * procurement page with it, so a failed read is no record — the page names
 * the buyer by its CUI and places it by its records' county. A reader who
 * left fails it.
 */
async function readBuyerIdentity(cui: string, year: number, signal?: AbortSignal): Promise<{ readonly raw: RawBuyerProfile; readonly failed: boolean }> {
  // A CUI the platform cannot hold has no record: not a failure.
  if (!ENTITY_CUI.test(cui)) return { raw: {}, failed: false }
  try {
    const raw = await graphqlQuery<RawBuyerProfile>(
      procurementBuyerQuery('ProcurementBuyerIdentity', [], true),
      { entityCui: cui, populationYear: year },
      { operationName: 'ProcurementBuyerIdentity', signal },
    )
    return { raw, failed: false }
  } catch (error) {
    if (signal?.aborted) throw error
    return { raw: {}, failed: true }
  }
}

/**
 * The buyer's page for a year. The profile is three requests side by side —
 * the API resolves one request's fields one after another — and the
 * follow-up starts as soon as the keys land, beside the figures and the CPV
 * tree. A follow-up that fails twice leaves the page `partial` (CUIs, no
 * matrix, no county share) rather than failing it, as does a cutoff that
 * cannot be read; a reader who left fails it.
 */
export async function fetchProcurementBuyer(cui: string, year: number, signal?: AbortSignal): Promise<BuyerProfile> {
  const latest = homeYear()
  const cutoffRead = untilAborted(readCutoffOutcome(latest), signal)
  // The year in progress waits for the cutoff, which bounds its reads; a complete year starts at once.
  const period = periodOf(year, latest, year > latest ? (await cutoffRead).cutoff : null)
  const fields = buyerProfileFields(cui, period, latest)
  const [keysRead, figuresRead, categoriesRead] = PROFILE_REQUESTS.map(({ group, operationName }) => {
    const own = fields.filter((field) => field.group === group)
    const variables: Record<string, unknown> = Object.fromEntries(own.map((field) => [field.alias, field.scope]))
    return graphqlQuery<RawBuyerProfile>(procurementBuyerQuery(operationName, own, false), variables, { operationName, signal })
  }) as [Promise<RawBuyerProfile>, Promise<RawBuyerProfile>, Promise<RawBuyerProfile>]
  // The population of a year in progress is the last complete year's.
  const identityRead = readBuyerIdentity(cui, Math.min(year, latest), signal)

  const extrasRead = Promise.all([keysRead, identityRead]).then(async ([keysRaw, identity]): Promise<BuyerExtras | null> => {
    const found = buyerKeysOf({ ...keysRaw, ...identity.raw })
    // The buyer's own label rides along: it names the page when the budget platform has no record of the buyer.
    const keys = { ...found, cuis: [cui, ...found.cuis.filter((key) => key !== cui)] }
    const extraFields = buyerExtrasFields(cui, period, latest, keys.spanSuppliers, keys.county)
    const readExtras = async () => {
      const variables: Record<string, unknown> = Object.fromEntries(extraFields.map((field) => [field.alias, field.scope]))
      variables.cuis = keys.cuis
      const raw = await graphqlQuery<RawBuyerProfile>(procurementBuyerExtrasQuery(extraFields), variables, { operationName: 'ProcurementBuyerExtras', signal })
      return mapBuyerExtras(raw, keys.cuis, keys.spanSuppliers, latest, keys.county)
    }
    try {
      return await readExtras().catch((error: unknown) => {
        // A reader who left gets no second read.
        if (signal?.aborted) throw error
        return readExtras()
      })
    } catch (error) {
      if (signal?.aborted) throw error
      return null
    }
  })

  const [keysRaw, figuresRaw, categoriesRaw, identity, extras, cutoff] = await Promise.all([keysRead, figuresRead, categoriesRead, identityRead, extrasRead, cutoffRead])
  const profile = mapBuyerProfile({ ...keysRaw, ...figuresRaw, ...categoriesRaw, ...identity.raw }, cui, period, latest, cutoff.cutoff)
  if (!extras) return { ...profile, names: new Map(), supplierYears: [], countyShare: null, partial: true, namesUnread: true }
  // No budget record: the identity spine's label names the buyer, and only then its CUI.
  const label = profile.identity.name === cui ? extras.names.get(cui) : undefined
  const { countyValue } = extras
  return {
    ...profile,
    identity: label ? { ...profile.identity, name: label } : profile.identity,
    names: extras.names,
    supplierYears: extras.supplierYears,
    countyShare:
      profile.county && countyValue !== null && countyValue > 0 && profile.direct.value !== null
        ? { county: profile.county, share: profile.direct.value / countyValue }
        : null,
    // The chart's year in progress and the data's date hang on the cutoff, whichever year the page shows.
    partial: identity.failed || cutoff.failed,
    namesUnread: false,
  }
}

/**
 * The year's largest contract awards (a consortium on one row) and largest
 * direct purchases, within the profile's period. The year in progress needs
 * the cutoff: without it the read fails (and is read again) rather than keep
 * a list that runs past it.
 */
export async function fetchProcurementBuyerRecords(cui: string, year: number, limit: number, signal?: AbortSignal): Promise<BuyerRecords> {
  const latest = homeYear()
  const { range } = periodOf(year, latest, year > latest ? await untilAborted(readProcurementCutoff(latest), signal) : null)
  const [contracts, directRaw] = await Promise.all([
    fetchGroupedContracts(
      { authorityCui: { eq: cui }, contractDate: range, recordKind: { in: ['contract_award'] }, valueState: { in: ACCEPTED_VALUE_STATES } },
      limit,
      'ProcurementBuyerContracts',
      signal,
    ),
    graphqlQuery<unknown>(
      PROCUREMENT_HOME_DIRECT_QUERY,
      // The direct-purchase filter's `publicationDate` binds to the finalization date on the server.
      { filter: { authorityCui: { eq: cui }, publicationDate: range, valueState: { in: ACCEPTED_VALUE_STATES } }, rows: limit },
      { operationName: 'ProcurementBuyerDirect', signal },
    ),
  ])
  const direct = procurementHomeDirectResponseSchema.parse(directRaw).procurementDirectAcquisitions.items.flatMap((item): RecentRecord[] => {
    const value = acceptedValue(item.value)
    return value === null
      ? []
      : [
          {
            id: item.id,
            grain: 'direct',
            date: item.finalizationDate,
            title: tidyTitle(item.title),
            cpvCode: item.cpvCode,
            buyer: partyOf(item.authority),
            winners: [partyOf(item.supplier)],
            value,
          },
        ]
  })
  return { contracts, direct }
}
