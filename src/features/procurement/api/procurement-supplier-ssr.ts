import type { PeriodChoice } from '../lib/profile-period'
import { isGraphQLInvalidInput } from '@/lib/graphql/graphql-client'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import type { RecentRecord } from '../lib/home-model'
import type { SupplierProfile } from '../lib/supplier-model'
import { SUPPLIER_LARGEST_RECORDS, fetchProcurementSupplier, fetchProcurementSupplierDirect } from './procurement-supplier-api'

/**
 * A firm's page's server reads, for the route loader only — as the buyer
 * page's (`procurement-buyer-ssr.ts`): both carry direct purchases, so both
 * are read on every render (D6 (root, 19 November 2026): direct-purchase reads are never kept in the server process. The API is the one enforcer, and the only windows are the CDN's ten minutes and the open-tab bound (design §24.4).), each under its own deadline rather than the request's signal (it
 * is shared across requests). A read past its deadline fails as a read; the
 * page reads it again in the browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 6_000

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface ProcurementSupplierServerRead {
  /** The period the reads were asked for, whatever failed: the browser seeds and reads under it. */
  readonly choice: PeriodChoice
  readonly profile?: SupplierProfile
  readonly direct?: readonly RecentRecord[]
  /** The API refused the identifier as an organisation's: the route answers 404. */
  readonly notFound?: true
}

/** The API refused the supplier's code itself (`field: supplierCui`), not another part of the read (a sort it withholds). */
function refusesCode(error: unknown): boolean {
  return isGraphQLInvalidInput(error) && error.graphQLErrors.some((entry) => entry.extensions?.field === 'supplierCui')
}

/** The two reads side by side; a failed one is left out, and the other stands. */
export async function readProcurementSupplierForSsr(cui: string, choice: PeriodChoice): Promise<ProcurementSupplierServerRead> {
  const [profileRead, directRead] = await Promise.allSettled([
    fetchProcurementSupplier(cui, choice, deadline()),
    fetchProcurementSupplierDirect(cui, choice, SUPPLIER_LARGEST_RECORDS, deadline()),
  ])
  // The profile can fail first on another part (legacy procurement switched off): the direct read's refusal of the code itself is the same verdict.
  if ((profileRead.status === 'rejected' && isGraphQLInvalidInput(profileRead.reason)) || (directRead.status === 'rejected' && refusesCode(directRead.reason))) return { choice, notFound: true }
  return {
    choice,
    ...(profileRead.status === 'fulfilled' ? { profile: profileRead.value } : {}),
    ...(directRead.status === 'fulfilled' ? { direct: directRead.value } : {}),
  }
}
