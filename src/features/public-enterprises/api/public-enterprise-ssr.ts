import { fetchPrivateCompanyProfile } from '@/features/private-companies/api/private-company-api'
import { fetchProcurementBuyer } from '@/features/procurement/api/procurement-buyer-api'
import type { BuyerProfile } from '@/features/procurement/lib/buyer-model'
import { RECENT } from '@/features/procurement/lib/profile-period'
import { withDeadline } from '@/lib/ssr/deadline-signal'
import { createServerMemo } from '@/lib/ssr/server-memo'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type { PublicEnterpriseRead } from '@/schemas/public-enterprise-profile'
import { fetchPublicEnterprise } from './public-enterprise-api'

/**
 * The enterprise page's server reads, for the route loader only: the
 * enterprise, its company record and its last twelve months as a buyer, side
 * by side. Each is kept in the server process for as long as a shared cache
 * may keep the page (the sources load monthly, SEAP daily at most), keyed by
 * CUI and bounded. Each read has its own deadline, not the request's signal:
 * it is shared across requests. A read past its deadline fails as a read; the
 * page reads it again in the browser and the render goes out `no-store`.
 */

const SSR_DEADLINE_MS = 6_000
const KEEP_MS = 10 * 60 * 1000
const MAX_ENTERPRISES = 500

// A partial read is served once and read again, never kept.
const enterprises = createServerMemo<PublicEnterpriseRead>(KEEP_MS, { maxEntries: MAX_ENTERPRISES, keep: (read) => !read.partial })
const companies = createServerMemo<PrivateCompanyProfile | null>(KEEP_MS, { maxEntries: MAX_ENTERPRISES })
const buyers = createServerMemo<BuyerProfile>(KEEP_MS, { maxEntries: MAX_ENTERPRISES, keep: (profile) => !profile.partial })

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface PublicEnterpriseServerRead {
  /** Absent when the read failed: the browser reads it. */
  readonly enterprise?: PublicEnterpriseRead
  /** `null`: no company record; absent: the read failed. */
  readonly company?: PrivateCompanyProfile | null
  readonly buyer?: BuyerProfile
}

/** The three reads side by side; a failed one is left out, and the others stand. */
export async function readPublicEnterpriseForSsr(cui: string): Promise<PublicEnterpriseServerRead> {
  const [enterprise, company, buyer] = await Promise.allSettled([
    enterprises(cui, () => fetchPublicEnterprise(cui, { signal: deadline() })),
    companies(cui, () => fetchPrivateCompanyProfile(cui, deadline())),
    buyers(cui, () => fetchProcurementBuyer(cui, RECENT, deadline())),
  ])
  return {
    ...(enterprise.status === 'fulfilled' ? { enterprise: enterprise.value } : {}),
    ...(company.status === 'fulfilled' ? { company: company.value } : {}),
    ...(buyer.status === 'fulfilled' ? { buyer: buyer.value } : {}),
  }
}

/** Whether a render may be cached for everyone: every read answered in full. */
export function isCompleteServerRead(read: PublicEnterpriseServerRead): boolean {
  return read.enterprise !== undefined && !read.enterprise.partial && read.company !== undefined && read.buyer !== undefined && !read.buyer.partial
}
