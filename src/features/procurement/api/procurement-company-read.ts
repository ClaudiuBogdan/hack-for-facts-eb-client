import { graphqlQuery } from '@/lib/graphql/graphql-client'
import { newestKey } from '@/lib/disclosure-key'
import type { ProcurementGrainAnalytics } from '@/schemas/procurement'
import { NO_NAMES, type DpOther } from '../lib/direct-purchase-model'
import { releaseBuyerOf } from '../lib/direct-purchase-release'
import { PROCUREMENT_DA_SUPPLIER_NEWEST_QUERY, procurementDaSupplierNewestSchema } from './graphql/procurement-da-release-queries'
import { fetchProcurementSupplierDirectAnalytics } from './procurement-api'
import { fetchWinnerContractAwards, type WinnerContractAwardsRead } from './procurement-contract-award-api'
import { releaseOtherOf } from './procurement-da-release-around'

/**
 * The company profile's procurement band (PROC-001, root 25 November 2026).
 * Two parts, each read on its own and failing on its own, never one failing
 * the other:
 *
 * - **direct purchases**: the supplier analysis on the `direct_acquisition`
 *   grain (served from procurement v3): counts, the paying institutions, the
 *   CPV divisions; and the release's newest purchases, each with its buyer as
 *   served;
 * - **contract awards**: the winner reads (contract awards by winner, every
 *   year published). A code the API does not list them for is `missing`.
 *
 * Legacy procurement is switched off: no legacy read is made.
 */

export type CompanyPart<T> = { readonly status: 'ready'; readonly value: T } | { readonly status: 'failed' }

/** A purchase in the firm's newest: as the release lists it, and its buyer as served. */
export interface CompanyDirectRow extends DpOther {
  readonly buyer: { readonly cui: string | null; readonly name: string }
}

export interface CompanyDirectPart {
  readonly analytics: ProcurementGrainAnalytics
  /** The release's newest purchases (accepted), by finalization. */
  readonly newest: readonly CompanyDirectRow[]
}

export interface CompanyProcurement {
  readonly direct: CompanyPart<CompanyDirectPart>
  readonly contracts: CompanyPart<WinnerContractAwardsRead>
}

/** How many of the newest the band lists. */
export const COMPANY_NEWEST = 5

async function part<T>(read: () => Promise<T>, signal?: AbortSignal): Promise<CompanyPart<T>> {
  try {
    return { status: 'ready', value: await read() }
  } catch (error) {
    // A reader who left fails it whole: nothing is said of a read it did not wait for.
    if (signal?.aborted) throw error
    return { status: 'failed' }
  }
}

/** The firm's newest purchases in the release, by finalization: purchases only, each with its buyer as served. */
export async function readCompanyNewestDirect(cui: string, signal?: AbortSignal, disclosureSeen: string | null = newestKey()): Promise<readonly CompanyDirectRow[]> {
  const raw = await graphqlQuery<unknown>(
    PROCUREMENT_DA_SUPPLIER_NEWEST_QUERY,
    { filter: { supplierFiscalCode: cui, outcomes: ['accepted'] }, pageSize: COMPANY_NEWEST },
    // No publication seen yet (a cold start): the firm's code is the page's own, read from no direct-purchase answer, so there is nothing to guard.
    { operationName: 'ProcurementDaSupplierNewest', signal, ...(disclosureSeen !== null ? { disclosureSeen } : {}) },
  )
  return procurementDaSupplierNewestSchema.parse(raw).newest.items.map((item) => {
    const buyer = releaseBuyerOf(item.buyer, NO_NAMES)
    return { ...releaseOtherOf(item), buyer: { cui: buyer.cui, name: buyer.name } }
  })
}

export async function fetchCompanyProcurement(cui: string, signal?: AbortSignal): Promise<CompanyProcurement> {
  // D6: every direct-purchase read here sends the firm's code; none is sent once a newer publication is seen.
  const seen = newestKey()
  const [direct, contracts] = await Promise.all([
    part(async () => {
      // Sent side by side: on a cold start (no publication seen) neither is guarded, or the first answer would fail the other.
      const [analytics, newest] = await Promise.all([fetchProcurementSupplierDirectAnalytics(cui, signal, seen ?? undefined), readCompanyNewestDirect(cui, signal, seen)])
      return { analytics, newest }
    }, signal),
    part(() => fetchWinnerContractAwards({ code: cui, year: null, sort: 'awardDayDesc', page: 1 }, signal), signal),
  ])
  // A reader who left meanwhile gets nothing, answered parts included.
  signal?.throwIfAborted()
  return { direct, contracts }
}
