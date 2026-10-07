import { queryOptions, useQuery } from '@tanstack/react-query'

import { privateCompanyProfileQueryOptions } from '@/features/private-companies/hooks/use-private-company-profile'
import { procurementBuyerQueryOptions, useProcurementBuyer } from '@/features/procurement/hooks/use-procurement-buyer'
import type { BuyerProfile } from '@/features/procurement/lib/buyer-model'
import { RECENT } from '@/features/procurement/lib/profile-period'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type { PublicEnterpriseRead } from '@/schemas/public-enterprise-profile'
import { fetchPublicEnterprise } from '../api/public-enterprise-api'

/**
 * The enterprise page's three reads, each its own query so a failure stays in
 * its part of the page: the enterprise (profile, indicators, authorities),
 * the company page's own read, and the procurement institution page's last
 * twelve months. The route loader reads them on the server and seeds them
 * here; the company and buyer queries share their pages' keys, so a visit to
 * either reads nothing again.
 */

/** The sources load monthly at most; an hour keeps a return visit from reading again. */
const STALE_TIME = 60 * 60 * 1000

export const publicEnterpriseKeys = {
  all: ['public-enterprise'] as const,
  profile: (cui: string) => ['public-enterprise', cui] as const,
}

export function publicEnterpriseQueryOptions(cui: string, initialData?: PublicEnterpriseRead) {
  return queryOptions({
    queryKey: publicEnterpriseKeys.profile(cui),
    queryFn: ({ signal }) => fetchPublicEnterprise(cui, { signal }),
    // A partial read (indicators or authorities unread) is stale at once: the next mount reads it again.
    staleTime: (query) => (query.state.data?.partial ? 0 : STALE_TIME),
    ...(initialData && initialData.cui === cui ? { initialData } : {}),
  })
}

export function usePublicEnterprise(cui: string, initialData?: PublicEnterpriseRead) {
  return useQuery(publicEnterpriseQueryOptions(cui, initialData))
}

/**
 * The company page's read, seeded with the server's answer: `null` (no
 * company record) is an answer too. Fresh for the hour, so a hydrated page
 * does not read it again on mount.
 */
export function enterpriseCompanyQueryOptions(cui: string, initialData?: PrivateCompanyProfile | null) {
  return {
    ...privateCompanyProfileQueryOptions(cui),
    staleTime: STALE_TIME,
    ...(initialData !== undefined && (initialData === null || initialData.cui === cui) ? { initialData } : {}),
  }
}

export function useEnterpriseCompany(cui: string, initialData?: PrivateCompanyProfile | null) {
  return useQuery(enterpriseCompanyQueryOptions(cui, initialData))
}

/** The procurement institution page's last twelve months, under its own key. */
export function enterpriseBuyerQueryOptions(cui: string) {
  return procurementBuyerQueryOptions(cui, RECENT)
}

export function useEnterpriseBuyer(cui: string, initialData?: BuyerProfile) {
  return useProcurementBuyer(cui, RECENT, initialData)
}
