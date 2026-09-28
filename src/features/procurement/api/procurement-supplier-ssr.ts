import type { PeriodChoice } from '../lib/profile-period'
import { isGraphQLInvalidInput } from '@/lib/graphql/graphql-client'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import type { RecentRecord } from '../lib/home-model'
import type { SupplierProfile } from '../lib/supplier-model'
import { SUPPLIER_LARGEST_RECORDS, fetchProcurementSupplier, fetchProcurementSupplierDirect } from './procurement-supplier-api'

/**
 * A firm's page's server reads, for the route loader only — as the buyer
 * page's (`procurement-buyer-ssr.ts`): each kept in the server process for as
 * long as a shared cache may keep the page, keyed by firm and period and
 * bounded, each under its own deadline rather than the request's signal (it
 * is shared across requests). A read past its deadline fails as a read; the
 * page reads it again in the browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 6_000
const KEEP_MS = 10 * 60 * 1000
const MAX_FIRMS = 500

// A partial profile (the registry, names, partners… unread) is served once and read again, never kept.
const profiles = createServerMemo<SupplierProfile>(KEEP_MS, { maxEntries: MAX_FIRMS, keep: (profile) => !profile.partial })
const directs = createServerMemo<readonly RecentRecord[]>(KEEP_MS, { maxEntries: MAX_FIRMS })

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface ProcurementSupplierServerRead {
  /** The period the reads were asked for, whatever failed: the browser seeds and reads under it. */
  readonly choice: PeriodChoice
  readonly profile?: SupplierProfile
  readonly direct?: readonly RecentRecord[]
  /** The API refused the identifier as an organisation's: the route answers 404. */
  readonly notFound?: true
}

/** The two reads side by side; a failed one is left out, and the other stands. */
export async function readProcurementSupplierForSsr(cui: string, choice: PeriodChoice): Promise<ProcurementSupplierServerRead> {
  const key = `${cui}:${choice}`
  const [profileRead, directRead] = await Promise.allSettled([
    profiles(key, () => fetchProcurementSupplier(cui, choice, deadline())),
    directs(key, () => fetchProcurementSupplierDirect(cui, choice, SUPPLIER_LARGEST_RECORDS, deadline())),
  ])
  if (profileRead.status === 'rejected' && isGraphQLInvalidInput(profileRead.reason)) return { choice, notFound: true }
  return {
    choice,
    ...(profileRead.status === 'fulfilled' ? { profile: profileRead.value } : {}),
    ...(directRead.status === 'fulfilled' ? { direct: directRead.value } : {}),
  }
}
