import type { PeriodChoice } from '../lib/profile-period'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { BUYER_LARGEST_RECORDS } from '../hooks/use-procurement-buyer'
import type { BuyerProfile, BuyerRecords } from '../lib/buyer-model'
import { fetchProcurementBuyer, fetchProcurementBuyerRecords } from './procurement-buyer-api'

/**
 * A buyer page's server reads, for the route loader only.
 *
 * The profile takes four requests side by side and a follow-up on two of
 * them (~1.0–1.3 s against the API), the records one more beside them. Both
 * carry direct purchases, so both are read on every render: D6 (root, 19 November 2026): direct-purchase reads are never kept in the server process. The API is the one enforcer, and the only windows are the CDN's ten minutes and the open-tab bound (design §24.4).
 * Each read has its own deadline, not the request's signal: it is
 * shared across requests. A read past its deadline fails as a read; the page
 * reads it again in the browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 6_000

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface ProcurementBuyerServerRead {
  /** The period the reads were asked for, whatever failed: the browser seeds and reads under it. */
  readonly choice: PeriodChoice
  readonly profile?: BuyerProfile
  readonly records?: BuyerRecords
}

/** The two reads side by side; a failed one is left out, and the other stands. */
export async function readProcurementBuyerForSsr(cui: string, choice: PeriodChoice): Promise<ProcurementBuyerServerRead> {
  const [profileRead, recordsRead] = await Promise.allSettled([
    fetchProcurementBuyer(cui, choice, deadline()),
    fetchProcurementBuyerRecords(cui, choice, BUYER_LARGEST_RECORDS, deadline()),
  ])
  return {
    choice,
    ...(profileRead.status === 'fulfilled' ? { profile: profileRead.value } : {}),
    ...(recordsRead.status === 'fulfilled' ? { records: recordsRead.value } : {}),
  }
}
