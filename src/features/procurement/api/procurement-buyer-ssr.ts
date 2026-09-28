import type { PeriodChoice } from '../lib/profile-period'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import { BUYER_LARGEST_RECORDS } from '../hooks/use-procurement-buyer'
import type { BuyerProfile, BuyerRecords } from '../lib/buyer-model'
import { fetchProcurementBuyer, fetchProcurementBuyerRecords } from './procurement-buyer-api'

/**
 * A buyer page's server reads, for the route loader only.
 *
 * The profile takes four requests side by side and a follow-up on two of
 * them (~1.0–1.3 s against the API), the records one more beside them; SEAP
 * loads daily at most, so each is kept in the
 * server process for as long as a shared cache may keep the page. The memo is
 * keyed by buyer and period and bounded — there are tens of thousands of
 * buyers. Each read has its own deadline, not the request's signal: it is
 * shared across requests. A read past its deadline fails as a read; the page
 * reads it again in the browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 6_000
const KEEP_MS = 10 * 60 * 1000
const MAX_BUYERS = 500

// A partial profile (names or years unread) is served once and read again, never kept.
const profiles = createServerMemo<BuyerProfile>(KEEP_MS, { maxEntries: MAX_BUYERS, keep: (profile) => !profile.partial })
const records = createServerMemo<BuyerRecords>(KEEP_MS, { maxEntries: MAX_BUYERS })

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface ProcurementBuyerServerRead {
  /** The period the reads were asked for, whatever failed: the browser seeds and reads under it. */
  readonly choice: PeriodChoice
  readonly profile?: BuyerProfile
  readonly records?: BuyerRecords
}

/** The two reads side by side; a failed one is left out, and the other stands. */
export async function readProcurementBuyerForSsr(cui: string, choice: PeriodChoice): Promise<ProcurementBuyerServerRead> {
  const key = `${cui}:${choice}`
  const [profileRead, recordsRead] = await Promise.allSettled([
    profiles(key, () => fetchProcurementBuyer(cui, choice, deadline())),
    records(key, () => fetchProcurementBuyerRecords(cui, choice, BUYER_LARGEST_RECORDS, deadline())),
  ])
  return {
    choice,
    ...(profileRead.status === 'fulfilled' ? { profile: profileRead.value } : {}),
    ...(recordsRead.status === 'fulfilled' ? { records: recordsRead.value } : {}),
  }
}
