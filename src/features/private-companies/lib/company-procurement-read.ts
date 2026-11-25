import type { CompanyDirectRow, CompanyProcurement } from '@/features/procurement/api/procurement-company-read'
import { caPartyLabel, type CaWinnerRow, type WinnerContractAwards } from '@/features/procurement/lib/contract-award-model'
import { parseRon } from '@/features/procurement/lib/formatting'
import type { CategoryRow, ProcurementGrainAnalytics, TopPartyRow } from '@/schemas/procurement'
import type { CompanyPaymentGrain } from '@/schemas/private-company'

/**
 * The company's SEAP record as a supplier, trimmed to what the profile draws
 * (PROC-001, root 25 November 2026). Two parts, each read on its own and
 * failing on its own:
 *
 * - **direct purchases** (the supplier analysis, served from procurement v3):
 *   who pays (the top institutions), for what (CPV divisions), how much of it
 *   carries a published value, and the release's newest purchases;
 * - **contract awards** (the winner reads): how many records, how many carry
 *   a value, the date the data runs to, and the newest awards. No ranking of
 *   buyers or categories exists for them: the band links to the winner's list.
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
  /** A direct purchase's release id, or a contract award's record id: each has its own page. */
  readonly id: string
  readonly grain: 'contract' | 'direct_acquisition'
  readonly title: string
  /** The buyer as served; a CUI only for an institution with a page to link to. */
  readonly authority: { readonly cui: string | null; readonly name: string | null }
  /** A comparable RON amount, or null when there is none to show as one (an attempt, a framework's ceiling). */
  readonly valueRon: number | null
  /** The purchase's finalization day, the award's day. */
  readonly date: string | null
  /** A framework agreement: its amount is the most it may spend, never shown as an award. */
  readonly framework?: boolean
}

export interface CompanyDirectRead {
  readonly stats: ProcurementGrainStats
  readonly topAuthorities: readonly ProcurementAuthorityRow[]
  readonly topCategories: readonly ProcurementCategoryRow[]
  readonly recent: readonly ProcurementRecordRow[]
}

export interface CompanyContractsRead {
  /** Contract-award records, every year published (a lot, a framework and its call-offs each count). */
  readonly count: number
  readonly withValue: number
  /** The data's own date: what the coverage line says. */
  readonly dataAsOf: string
  /** The first day published. */
  readonly floor: string
  readonly recent: readonly ProcurementRecordRow[]
}

export type CompanyReadPart<T> = { readonly status: 'ready'; readonly value: T } | { readonly status: 'failed' }

export interface CompanyProcurementRead {
  /** The months of the company's own first and newest direct purchases (`YYYY-MM`) — not the source's coverage. */
  readonly window: { readonly from: string | null; readonly to: string | null }
  readonly directAcquisitions: CompanyReadPart<CompanyDirectRead>
  /** `null`: the API lists no contract awards for this code (none, or a code it does not list them for). */
  readonly contracts: CompanyReadPart<CompanyContractsRead | null>
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

/** A release purchase as the band lists it: a purchase's counted value in lei, or none. */
function directRowOf(row: CompanyDirectRow): ProcurementRecordRow {
  return {
    id: row.id,
    grain: 'direct_acquisition',
    title: (row.title ?? '').trim(),
    authority: { cui: row.buyer.cui, name: row.buyer.name || null },
    valueRon: row.done && row.inLei !== false ? row.value : null,
    date: row.date,
  }
}

/** A contract award as the band lists it: the buyer as served, linked only when it is an institution with a page. */
function contractRowOf(row: CaWinnerRow): ProcurementRecordRow {
  const buyer = row.buyer
  // As every award list says a buyer: its name, a masked one with its code, a code alone as a code (`caPartyLabel`).
  const name = buyer ? caPartyLabel(buyer, 'buyer') : null
  const framework = row.ceiling || row.contractKind === 'framework_agreement'
  return {
    id: row.recordId,
    grain: 'contract',
    title: (row.title ?? '').trim(),
    authority: { cui: buyer?.authority && buyer.kind === 'company' ? buyer.code : null, name },
    // A framework's amount is its ceiling, never an award; a row under identity review is in no total, and shown without one.
    valueRon: framework || row.underReview ? null : row.amountLei,
    date: row.awardDay,
    ...(framework ? { framework: true } : {}),
  }
}

function contractsOf(awards: WinnerContractAwards): CompanyContractsRead {
  return {
    count: awards.recordCount,
    withValue: awards.valuedCount,
    dataAsOf: awards.dataAsOf,
    floor: awards.floor,
    recent: awards.rows.map(contractRowOf),
  }
}

/** An analysis that abstained and a release that listed nothing: no answer about the firm, never an answer that it has none. */
function directUnanswered(direct: CompanyProcurement['direct']): boolean {
  if (direct.status !== 'ready') return true
  const { analytics, newest } = direct.value
  return analytics.stats.meta.answerability === 'abstained' && analytics.stats.recordCount === null && newest.length === 0
}

export function toCompanyProcurementRead(slice: CompanyProcurement): CompanyProcurementRead {
  const direct = !directUnanswered(slice.direct) && slice.direct.status === 'ready' ? slice.direct.value : null
  const directRead: CompanyReadPart<CompanyDirectRead> = direct
    ? {
        status: 'ready',
        value: {
          stats: statsOf(direct.analytics),
          topAuthorities: authoritiesOf(direct.analytics.topAuthorities),
          topCategories: categoriesOf(direct.analytics.topCategories),
          recent: direct.newest.map(directRowOf),
        },
      }
    : { status: 'failed' }
  const contracts: CompanyReadPart<CompanyContractsRead | null> =
    slice.contracts.status === 'ready'
      ? { status: 'ready', value: slice.contracts.value.kind === 'found' ? contractsOf(slice.contracts.value.awards) : null }
      : { status: 'failed' }
  return {
    window: { from: direct?.analytics.stats.minMonth ?? null, to: direct?.analytics.stats.maxMonth ?? null },
    directAcquisitions: directRead,
    contracts,
  }
}

/**
 * The SEAP populations the band has a tab for, contracts first: one the
 * company has records in, or one whose read failed — said as such, never
 * dropped as if it had none.
 */
export function paymentGrainsOf(read: CompanyProcurementRead): readonly CompanyPaymentGrain[] {
  const { contracts, directAcquisitions: direct } = read
  // Anything the part served counts: a count, a ranked payer or category, a listed record — an unknown count is not none.
  const hasContracts = contracts.status === 'failed' || (contracts.value !== null && (contracts.value.count > 0 || contracts.value.recent.length > 0))
  const hasDirect =
    direct.status === 'failed' ||
    (direct.value.stats.count ?? 0) > 0 ||
    direct.value.topAuthorities.length > 0 ||
    direct.value.topCategories.length > 0 ||
    direct.value.recent.length > 0
  return [...(hasContracts ? (['contracte'] as const) : []), ...(hasDirect ? (['achizitii-directe'] as const) : [])]
}

/** The grain in the URL when the band has a tab for it, else the first it has. */
export function effectiveGrain(grains: readonly CompanyPaymentGrain[], requested: CompanyPaymentGrain | undefined): CompanyPaymentGrain | null {
  return requested && grains.includes(requested) ? requested : (grains[0] ?? null)
}
