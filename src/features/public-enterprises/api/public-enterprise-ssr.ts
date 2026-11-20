import { disclosureVersion } from '@/features/procurement/api/procurement-da-release-status'
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

const deadline = () => withDeadline(undefined, SSR_DEADLINE_MS)

export interface PublicEnterpriseServerRead {
  /** The disclosure publication a server render was read under (D6); null: unknown, kept nowhere. Absent: not a server render. */
  readonly disclosure?: string | null
  /** When the server read it (epoch ms): the open tab's fail-closed clock starts from it. */
  readonly disclosureReadAt?: number
  /** Absent when the read failed: the browser reads it. */
  readonly enterprise?: PublicEnterpriseRead
  /** `null`: no company record; absent: the read failed. */
  readonly company?: PrivateCompanyProfile | null
  readonly buyer?: BuyerProfile
  /** The direct-purchase disclosure publication was read: without it nothing is kept, the render included (D6). Absent: not read. */
  readonly disclosureKnown?: boolean
}

/** The three reads side by side; a failed one is left out, and the others stand. */
export async function readPublicEnterpriseForSsr(cui: string): Promise<PublicEnterpriseServerRead> {
  // The publication the render is read under, read first: the browser drops a seed of another (D6). Its time starts an open tab's fail-closed clock.
  const disclosureReadAt = Date.now()
  const disclosure = await disclosureVersion()
  const [enterprise, company, buyer] = await Promise.allSettled([
    enterprises(cui, () => fetchPublicEnterprise(cui, { signal: deadline() })),
    // D6: the company's public money carries its incoming direct purchases (the API withholds a supplier's), so it is read on every render, never kept.
    fetchPrivateCompanyProfile(cui, deadline()),
    // D6: the buyer profile ranks direct purchases' suppliers, so it is read on every render, never kept (root, 19 November 2026; design §24.4).
    fetchProcurementBuyer(cui, RECENT, deadline()),
  ])
  return {
    disclosureKnown: disclosure !== null,
    disclosure,
    disclosureReadAt,
    ...(enterprise.status === 'fulfilled' ? { enterprise: enterprise.value } : {}),
    ...(company.status === 'fulfilled' ? { company: company.value } : {}),
    ...(buyer.status === 'fulfilled' ? { buyer: buyer.value } : {}),
  }
}

/** Whether a render may be cached for everyone: every read answered in full. */
export function isCompleteServerRead(read: PublicEnterpriseServerRead): boolean {
  return read.disclosureKnown === true && read.enterprise !== undefined && !read.enterprise.partial && read.company !== undefined && read.buyer !== undefined && !read.buyer.partial
}
