/**
 * Live reads for the procurement front door (`/procurement`). Procurement is
 * live-only: a failure surfaces to the caller, never a fixture.
 *
 * Four reads, each its own query so a failure stays in its band:
 * - the national picture (stats, rankings, counties, series, months), with
 *   party names in a second, bounded request;
 * - the category tree, for both populations;
 * - the year's largest contract awards, grouped by contract;
 * - the newest complete month's largest contract awards, or direct purchases.
 */
import type { z } from 'zod'
import { graphqlQuery } from '@/lib/graphql/graphql-client'
import {
  PROCUREMENT_PARTY_NAMES_QUERY,
  procurementPartyNamesResponseSchema,
} from './graphql/procurement-queries'
import {
  PROCUREMENT_HOME_CONTRACTS_QUERY,
  PROCUREMENT_HOME_DIRECT_QUERY,
  PROCUREMENT_HOME_NATIONAL_QUERY,
  procurementHomeCategoriesQuery,
  procurementHomeCategoriesResponseSchema,
  procurementHomeContractsResponseSchema,
  procurementHomeDirectResponseSchema,
  procurementHomeNationalResponseSchema,
  type homeBreakdownBlockSchema,
  type homeContractItemSchema,
  type homeSeriesBlockSchema,
  type RawProcurementHomeNational,
} from './graphql/procurement-home-queries'
import {
  CPV_DRILL,
  READER_CATEGORIES,
  completeContracts,
  cpvLeaves,
  cpvScope,
  groupContracts,
  readerCategories,
  type CategoryFigure,
  type ContractRow,
  type CpvBucket,
} from '../lib/home-categories'
import {
  DIRECT_COMPARABLE_FROM,
  cutoffMonth,
  tidyName,
  tidyTitle,
  truncatePartYear,
  type CountyFigure,
  type HomeParty,
  type MonthPoint,
  type NationalRead,
  type Ranking,
  type RecentRecord,
  type YearPoint,
} from '../lib/home-model'

type RawBreakdown = z.infer<typeof homeBreakdownBlockSchema>
type RawSeries = z.infer<typeof homeSeriesBlockSchema>

/** Contract awards only: framework agreements are ceilings, counted apart. */
const AWARDS = { grain: 'contract', recordKind: 'contract_award' } as const
const DIRECT = { grain: 'direct_acquisition' } as const

/** The value-model states whose money is comparable across records. */
export const ACCEPTED_VALUE_STATES = ['official_exact', 'official_ron_equivalent', 'cross_source_exact', 'official_document_recovered']

function first<T>(blocks: readonly T[] | undefined): T | undefined {
  return blocks?.[0]
}

function seriesValue(blocks: readonly RawSeries[], bucket: string): number | null {
  return first(blocks)?.points?.find((point) => point.bucket === bucket)?.value ?? null
}

function topKeys(blocks: readonly RawBreakdown[]): readonly string[] {
  return (first(blocks)?.buckets ?? []).flatMap((bucket) => (bucket.kind === 'top' && bucket.key ? [bucket.key] : []))
}

// ────────────────────────────────────────────────────────────── names ──

/**
 * Names for the CUIs the rankings return, from the identity spine, in one
 * request. Only a `named` label is used: a placeholder carries the CUI as its
 * name, and a row with no name shows its CUI.
 */
async function loadPartyNames(
  authorityCuis: readonly string[],
  supplierCuis: readonly string[],
  signal?: AbortSignal,
): Promise<ReadonlyMap<string, string>> {
  const authorities = [...new Set(authorityCuis)]
  const suppliers = [...new Set(supplierCuis)]
  const names = new Map<string, string>()
  if (authorities.length === 0 && suppliers.length === 0) return names
  const raw = await graphqlQuery<unknown>(
    PROCUREMENT_PARTY_NAMES_QUERY,
    {
      authorityCuis: authorities,
      supplierCuis: suppliers,
      includeAuthorities: authorities.length > 0,
      includeSuppliers: suppliers.length > 0,
    },
    { operationName: 'ProcurementPartyNames', signal },
  )
  const parsed = procurementPartyNamesResponseSchema.parse(raw)
  // Positional: the server answers each requested CUI in order.
  const keep = (kind: string, sent: readonly string[], labels: readonly { readonly canonicalName: string | null; readonly status: string }[] | undefined) =>
    labels?.forEach((label, index) => {
      const cui = sent[index]
      if (cui && label.status === 'named' && label.canonicalName) names.set(`${kind}:${cui}`, tidyName(label.canonicalName))
    })
  keep('authority', authorities, parsed.authorities)
  keep('supplier', suppliers, parsed.suppliers)
  return names
}

// ──────────────────────────────────────────────── the national picture ──

function ranking(blocks: readonly RawBreakdown[], label: (key: string) => string): Ranking {
  const block = first(blocks)
  return {
    rankedBy: block?.rankedBy === 'value' ? 'value' : 'count',
    rows: (block?.buckets ?? [])
      .filter((bucket) => bucket.kind === 'top' && bucket.key !== null)
      .map((bucket) => ({
        key: bucket.key ?? '',
        label: label(bucket.key ?? ''),
        count: bucket.recordCount ?? 0,
        value: bucket.valueSum,
        share: bucket.shareOfScope,
      })),
  }
}

function counties(blocks: readonly RawBreakdown[]): readonly CountyFigure[] {
  return (first(blocks)?.buckets ?? []).flatMap((bucket) =>
    bucket.kind === 'top' && bucket.key ? [{ code: bucket.key, value: bucket.valueSum, count: bucket.recordCount ?? 0 }] : [],
  )
}

function years(value: readonly RawSeries[], count: readonly RawSeries[]): readonly YearPoint[] {
  const counts = new Map((first(count)?.points ?? []).map((point) => [point.bucket, point.value]))
  return (first(value)?.points ?? [])
    .map((point) => ({ year: Number(point.bucket), value: point.value, count: counts.get(point.bucket) ?? null }))
    .filter((point) => Number.isInteger(point.year))
    .sort((a, b) => a.year - b.year)
}

function months(blocks: readonly RawSeries[]): readonly MonthPoint[] {
  return (first(blocks)?.points ?? [])
    .filter((point) => /^\d{4}-\d{2}$/.test(point.bucket))
    .map((point) => ({ month: point.bucket, count: point.value ?? 0 }))
    .sort((a, b) => a.month.localeCompare(b.month))
}

/** The supplier breakdown reconciles to the awards' money: every bucket plus what consortia hold. */
function consortium(blocks: readonly RawBreakdown[]): NationalRead['consortium'] {
  const block = first(blocks)
  const withheld = block?.valueWithheldAssociationSum
  if (!block || withheld === null || withheld === undefined) return null
  const total = withheld + (block.buckets ?? []).reduce((sum, bucket) => sum + (bucket.valueSum ?? 0), 0)
  return total > 0 ? { withheld, total } : null
}

export function mapProcurementHomeNational(raw: RawProcurementHomeNational, year: number, names: ReadonlyMap<string, string>): NationalRead {
  const bucket = String(year)
  const party = (kind: 'authority' | 'supplier') => (cui: string) => names.get(`${kind}:${cui}`) ?? cui
  const stats = (block: RawProcurementHomeNational['awards']) => first(block.blocks)
  const awards = stats(raw.awards)
  const direct = stats(raw.direct)
  const directCutoff = cutoffMonth(months(raw.directMonthCount), year)
  const monthValues = new Map((first(raw.directMonthValue)?.points ?? []).map((point) => [point.bucket, point.value]))
  const directMonths = months(raw.directMonthCount).map((point) => ({ month: point.month, count: point.count, value: monthValues.get(point.month) ?? null }))
  return {
    year,
    contract: {
      count: awards?.recordCount ?? null,
      valued: awards?.withValueCount ?? null,
      value: awards?.valueAwardedSum ?? null,
      buyers: seriesValue(raw.awardsBuyerCount, bucket),
      suppliers: seriesValue(raw.awardsSellerCount, bucket),
    },
    frameworks: stats(raw.frameworks)?.recordCount ?? null,
    direct: {
      count: direct?.recordCount ?? null,
      valued: direct?.withValueCount ?? null,
      value: direct?.valueAwardedSum ?? null,
      buyers: seriesValue(raw.directBuyerCount, bucket),
      suppliers: seriesValue(raw.directSellerCount, bucket),
    },
    buyers: { contract: ranking(raw.awardsBuyers, party('authority')), direct: ranking(raw.directBuyers, party('authority')) },
    directSellers: ranking(raw.directSellers, party('supplier')),
    procedures: ranking(raw.procedures, (key) => key),
    counties: { contract: counties(raw.awardsCounties), direct: counties(raw.directCounties) },
    directYears: truncatePartYear(years(raw.directYearValue, raw.directYearCount), directMonths, year + 1, directCutoff),
    cutoff: {
      contract: cutoffMonth(months(raw.awardsMonthCount), year),
      direct: directCutoff,
    },
    consortium: consortium(raw.awardsSellers),
  }
}

export async function fetchProcurementHomeNational(year: number, signal?: AbortSignal): Promise<NationalRead> {
  const raw = procurementHomeNationalResponseSchema.parse(
    await graphqlQuery<unknown>(
      PROCUREMENT_HOME_NATIONAL_QUERY,
      {
        awards: { ...AWARDS, year },
        frameworks: { grain: 'contract', recordKind: 'framework_agreement', year },
        direct: { ...DIRECT, year },
        directYears: { ...DIRECT, from: `${DIRECT_COMPARABLE_FROM}-01`, to: `${year + 1}-12` },
        awardsMonths: { ...AWARDS, from: `${year}-01`, to: `${year + 1}-12` },
        directMonths: { ...DIRECT, from: `${year}-01`, to: `${year + 1}-12` },
      },
      { operationName: 'ProcurementHomeNational', signal },
    ),
  )
  const names = await loadPartyNames(
    [...topKeys(raw.awardsBuyers), ...topKeys(raw.directBuyers)],
    topKeys(raw.directSellers),
    signal,
  )
  return mapProcurementHomeNational(raw, year, names)
}

// ─────────────────────────────────────────────────── the category tree ──

export interface HomeCategoriesRead {
  readonly contract: readonly CategoryFigure[]
  readonly direct: readonly CategoryFigure[]
  /** Contract money of the roads category that went to consortia. */
  readonly roadsConsortium: { readonly withheld: number; readonly total: number } | null
}

const ROADS = READER_CATEGORIES.find((category) => category.key === 'drumuri')

function cpvBuckets(blocks: readonly RawBreakdown[] | undefined): readonly CpvBucket[] {
  return (first(blocks)?.buckets ?? []).map((bucket) => ({ key: bucket.key, kind: bucket.kind, count: bucket.recordCount ?? 0, value: bucket.valueSum }))
}

export function mapProcurementHomeCategories(raw: Readonly<Record<string, readonly RawBreakdown[]>>): HomeCategoriesRead {
  const tree = (grain: 'awards' | 'direct') => {
    const refinements = new Map(CPV_DRILL.map((drill) => [drill.key, cpvBuckets(raw[`${grain}_${drill.key}`])]))
    const { leaves, unknown } = cpvLeaves(cpvBuckets(raw[`${grain}Divisions`]), refinements)
    return readerCategories(leaves, unknown)
  }
  let withheld = 0
  let total = 0
  ROADS?.prefixes.forEach((_, index) => {
    const block = first(raw[`roads${index}`])
    const held = block?.valueWithheldAssociationSum ?? 0
    withheld += held
    total += held + (block?.buckets ?? []).reduce((sum, bucket) => sum + (bucket.valueSum ?? 0), 0)
  })
  return { contract: tree('awards'), direct: tree('direct'), roadsConsortium: total > 0 ? { withheld, total } : null }
}

export async function fetchProcurementHomeCategories(year: number, signal?: AbortSignal): Promise<HomeCategoriesRead> {
  const scopes = { awards: { ...AWARDS, year }, direct: { ...DIRECT, year } }
  const variables: Record<string, unknown> = {}
  for (const grain of ['awards', 'direct'] as const) {
    variables[`${grain}Divisions`] = scopes[grain]
    for (const drill of CPV_DRILL) variables[`${grain}_${drill.key}`] = { ...scopes[grain], ...cpvScope(drill.parent) }
  }
  const roads = ROADS?.prefixes ?? []
  roads.forEach((prefix, index) => {
    variables[`roads${index}`] = { ...scopes.awards, ...cpvScope(prefix) }
  })
  const raw = procurementHomeCategoriesResponseSchema.parse(
    await graphqlQuery<unknown>(procurementHomeCategoriesQuery(roads.length), variables, { operationName: 'ProcurementHomeCategories', signal }),
  )
  return mapProcurementHomeCategories(raw)
}

// ─────────────────────────────────────────────────────────── records ──

export function partyOf(raw: { readonly cui: string | null; readonly name: string | null; readonly displayName: string | null }): HomeParty {
  const cui = raw.cui?.trim() || null
  return { cui, name: tidyName(raw.displayName ?? raw.name ?? cui ?? '—') }
}

export function acceptedValue(value: { readonly valueAccepted: boolean; readonly valueRonComparable: string | null }): number | null {
  if (!value.valueAccepted || value.valueRonComparable === null) return null
  const parsed = Number(value.valueRonComparable)
  return Number.isFinite(parsed) ? parsed : null
}

function contractRows(items: readonly z.infer<typeof homeContractItemSchema>[]): readonly ContractRow[] {
  return items.flatMap((item) => {
    const value = acceptedValue(item.value)
    return value === null
      ? []
      : [
          {
            id: item.id,
            contractNo: item.contractNo,
            date: item.contractDate,
            title: tidyTitle(item.title),
            cpvCode: item.cpvCode,
            buyer: partyOf(item.authority),
            supplier: partyOf(item.supplier),
            value,
          },
        ]
  })
}

/** A consortium is a row per member (and some awards come twice): rows read per contract shown, per page. */
const ROWS_PER_CONTRACT = 6
/** Pages read at most before settling for the contracts found whole. */
const MAX_CONTRACT_PAGES = 3

/**
 * The largest contract awards the filter selects, one row per contract with
 * every winner named. Rows come sorted by value, and a consortium's rows share
 * one value, so the contracts at a full page's last value may have members on
 * the next page: pages are read until `limit` contracts are whole. Past the
 * last page read it settles for fewer, and fails rather than claim none.
 */
export async function fetchGroupedContracts(filter: Record<string, unknown>, limit: number, operationName: string, signal?: AbortSignal): Promise<readonly RecentRecord[]> {
  const rowsPerPage = limit * ROWS_PER_CONTRACT
  const rows: ContractRow[] = []
  for (let page = 1; page <= MAX_CONTRACT_PAGES; page += 1) {
    const raw = procurementHomeContractsResponseSchema.parse(
      await graphqlQuery<unknown>(PROCUREMENT_HOME_CONTRACTS_QUERY, { filter, page, rows: rowsPerPage }, { operationName, signal }),
    )
    const items = raw.procurementContracts.items
    rows.push(...contractRows(items))
    const pageFull = items.length === rowsPerPage
    const last = items[items.length - 1]
    const lastValue = last ? acceptedValue(last.value) : null
    const whole = completeContracts(groupContracts(rows), pageFull, lastValue)
    if (whole.length >= limit || !pageFull) return whole.slice(0, limit)
    if (page === MAX_CONTRACT_PAGES && whole.length > 0) return whole
  }
  throw new Error(`${operationName}: no contract is whole after ${MAX_CONTRACT_PAGES} pages`)
}

/** The year's largest contract awards, one row per contract with every winner named. */
export async function fetchProcurementHomeBigContracts(year: number, limit: number, signal?: AbortSignal): Promise<readonly RecentRecord[]> {
  return fetchGroupedContracts(
    {
      contractDate: { gte: `${year}-01-01`, lte: `${year}-12-31` },
      recordKind: { in: ['contract_award'] },
      valueState: { in: ACCEPTED_VALUE_STATES },
    },
    limit,
    'ProcurementHomeContracts',
    signal,
  )
}

function monthBounds(month: string): { readonly gte: string; readonly lte: string } {
  const [year = 2000, index = 1] = month.split('-').map(Number)
  const last = new Date(Date.UTC(year, index, 0)).getUTCDate()
  return { gte: `${month}-01`, lte: `${month}-${String(last).padStart(2, '0')}` }
}

/** The largest contract awards signed in one month, grouped by contract. */
export async function fetchProcurementHomeRecentContracts(month: string, limit: number, signal?: AbortSignal): Promise<readonly RecentRecord[]> {
  return fetchGroupedContracts(
    { contractDate: monthBounds(month), recordKind: { in: ['contract_award'] }, valueState: { in: ACCEPTED_VALUE_STATES } },
    limit,
    'ProcurementHomeRecentContracts',
    signal,
  )
}

/**
 * The largest direct purchases finalized in one month. The server binds the
 * direct-purchase filter's `publicationDate` to the finalization date (the
 * publication date is empty at the source), so a row is selected and dated by
 * its finalization.
 */
export async function fetchProcurementHomeRecentDirect(month: string, limit: number, signal?: AbortSignal): Promise<readonly RecentRecord[]> {
  const raw = procurementHomeDirectResponseSchema.parse(
    await graphqlQuery<unknown>(
      PROCUREMENT_HOME_DIRECT_QUERY,
      { filter: { publicationDate: monthBounds(month), valueState: { in: ACCEPTED_VALUE_STATES } }, rows: limit },
      { operationName: 'ProcurementHomeRecentDirect', signal },
    ),
  )
  return raw.procurementDirectAcquisitions.items.flatMap((item): RecentRecord[] => {
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
}
