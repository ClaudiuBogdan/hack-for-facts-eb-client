import { describeMoney, parseRon } from '@/features/procurement/lib/formatting'
import type {
  CategoryRow,
  ProcurementGrainAnalytics,
  ProcurementRecordSummary,
  SupplierProcurementSlice,
  TopPartyRow,
} from '@/schemas/procurement'
import type { CompanyPaymentGrain } from '@/schemas/private-company'

/**
 * The company's SEAP record as a supplier, read from the procurement
 * supplier slice and trimmed to what the profile draws: who pays (the top
 * institutions), for what (CPV divisions), the newest records, and how much
 * of it carries a published value.
 *
 * The profile's own `publicMoney` already says how much and when; this read
 * adds the names behind it. It loads after the page, so everything drawn from
 * it has a pending and a failed state of its own.
 */

export type RankedBy = 'value' | 'count'

export interface ProcurementAuthorityRow {
  /** Null when the source published the institution without a CUI: no page to link to. */
  readonly cui: string | null
  /** Null when the source published the institution without a name. */
  readonly name: string | null
  readonly amountRon: number | null
  readonly count: number
}

export interface ProcurementCategoryRow {
  readonly code: string | null
  readonly labelRo: string | null
  readonly labelEn: string | null
  readonly count: number
  readonly share: number | null
}

export interface ProcurementGrainStats {
  /** Null when the source did not say: unknown, never zero. */
  readonly count: number | null
  readonly withValue: number | null
  readonly firstMonth: string | null
  readonly lastMonth: string | null
  /** What the ranking could order by: money when enough of it is published, else the number of records. */
  readonly authoritiesRankedBy: RankedBy
}

export interface ProcurementRecordRow {
  readonly id: string
  readonly grain: 'contract' | 'direct_acquisition'
  readonly title: string
  readonly authority: { readonly cui: string | null; readonly name: string | null }
  /** A comparable RON amount, or null when the record has none the data layer accepts. */
  readonly valueRon: number | null
  readonly date: string | null
}

export interface CompanyProcurementRead {
  /** The months of the company's own first and newest SEAP records (`YYYY-MM`) — not the source's coverage. */
  readonly window: { readonly from: string | null; readonly to: string | null }
  readonly contracts: ProcurementGrainStats
  readonly directAcquisitions: ProcurementGrainStats
  readonly topAuthorities: { readonly contract: readonly ProcurementAuthorityRow[]; readonly directAcquisition: readonly ProcurementAuthorityRow[] }
  readonly topCategories: { readonly contract: readonly ProcurementCategoryRow[]; readonly directAcquisition: readonly ProcurementCategoryRow[] }
  readonly recent: readonly ProcurementRecordRow[]
}

/** A count the source sent as a decimal string; null stays unknown. */
function countOf(value: string | null | undefined): number | null {
  const parsed = parseRon(value)
  return parsed === null ? null : Math.round(parsed)
}

/** A row's count, which the ranking always carries. */
function whole(value: string): number {
  return countOf(value) ?? 0
}

function statsOf(analytics: ProcurementGrainAnalytics): ProcurementGrainStats {
  const { stats, meta } = analytics
  return {
    count: countOf(stats.recordCount),
    withValue: countOf(stats.withValueCount),
    firstMonth: stats.minMonth,
    lastMonth: stats.maxMonth,
    authoritiesRankedBy: meta.authoritiesRankedBy === 'value' ? 'value' : 'count',
  }
}

/** The named institutions only: the `other` and `unknown` buckets are remainders, not payers. */
function authoritiesOf(rows: readonly TopPartyRow[]): readonly ProcurementAuthorityRow[] {
  return rows
    .filter((row) => row.bucketKind === 'top' && row.authority !== null)
    .map((row) => ({
      cui: row.authority?.cui ?? null,
      name: row.authority?.displayName ?? row.authority?.name ?? null,
      amountRon: parseRon(row.amountRonSum),
      count: whole(row.flowCount),
    }))
}

/** The named divisions and the records with no CPV code, which are a real share; never the `other` remainder. */
function categoriesOf(rows: readonly CategoryRow[]): readonly ProcurementCategoryRow[] {
  return rows
    .filter((row) => (row.bucketKind === 'top' || row.bucketKind === 'unknown') && whole(row.flowCount) > 0)
    .map((row) => ({
      code: row.cpvDivisionCode,
      labelRo: row.cpvDivisionLabelRo,
      labelEn: row.cpvDivisionLabelEn,
      count: whole(row.flowCount),
      share: parseRon(row.shareOfScope),
    }))
}

function recordOf(record: ProcurementRecordSummary): ProcurementRecordRow | null {
  if (record.grain === 'contract') {
    const money = describeMoney(record)
    return {
      id: record.id,
      grain: 'contract',
      title: (record.displayTitle?.text ?? record.title ?? '').trim(),
      authority: { cui: record.authority.cui, name: record.authority.displayName ?? record.authority.name },
      valueRon: money.kind === 'ron' ? money.ron : null,
      date: record.contractDate,
    }
  }
  if (record.grain === 'direct_acquisition') {
    const money = describeMoney(record)
    return {
      id: record.id,
      grain: 'direct_acquisition',
      title: (record.title ?? '').trim(),
      authority: { cui: record.authority.cui, name: record.authority.displayName ?? record.authority.name },
      valueRon: money.kind === 'ron' ? money.ron : null,
      date: record.finalizationDate ?? record.publicationDate,
    }
  }
  return null
}

export function toCompanyProcurementRead(slice: SupplierProcurementSlice): CompanyProcurementRead {
  const { contract, directAcquisition } = slice.analysisByGrain
  return {
    window: slice.summary.window,
    contracts: statsOf(contract),
    directAcquisitions: statsOf(directAcquisition),
    topAuthorities: { contract: authoritiesOf(contract.topAuthorities), directAcquisition: authoritiesOf(directAcquisition.topAuthorities) },
    topCategories: { contract: categoriesOf(contract.topCategories), directAcquisition: categoriesOf(directAcquisition.topCategories) },
    recent: slice.recentRecords.map(recordOf).filter((record): record is ProcurementRecordRow => record !== null),
  }
}

/** The SEAP populations the company has records in, contracts first: by their count, or by payers when the count is unknown. */
export function paymentGrainsOf(read: CompanyProcurementRead): readonly CompanyPaymentGrain[] {
  const has = (stats: ProcurementGrainStats, payers: readonly ProcurementAuthorityRow[]) => (stats.count ?? 0) > 0 || payers.length > 0
  return [
    ...(has(read.contracts, read.topAuthorities.contract) ? (['contracte'] as const) : []),
    ...(has(read.directAcquisitions, read.topAuthorities.directAcquisition) ? (['achizitii-directe'] as const) : []),
  ]
}

/** The grain in the URL when the company has records in it, else the first it has. */
export function effectiveGrain(grains: readonly CompanyPaymentGrain[], requested: CompanyPaymentGrain | undefined): CompanyPaymentGrain | null {
  return requested && grains.includes(requested) ? requested : (grains[0] ?? null)
}

export function grainStats(read: CompanyProcurementRead, grain: CompanyPaymentGrain): ProcurementGrainStats {
  return grain === 'contracte' ? read.contracts : read.directAcquisitions
}

export function grainAuthorities(read: CompanyProcurementRead, grain: CompanyPaymentGrain): readonly ProcurementAuthorityRow[] {
  return grain === 'contracte' ? read.topAuthorities.contract : read.topAuthorities.directAcquisition
}

export function grainCategories(read: CompanyProcurementRead, grain: CompanyPaymentGrain): readonly ProcurementCategoryRow[] {
  return grain === 'contracte' ? read.topCategories.contract : read.topCategories.directAcquisition
}
