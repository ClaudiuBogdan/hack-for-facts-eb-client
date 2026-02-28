import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  CampaignPrincipalRouteSearchSchema,
  resolveCampaignPrincipalLocale,
} from '@/features/campaigns/local-budget-2026/schemas/campaign-principal-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/local-budget-2026/seo/campaign-seo'
import type { CampaignPrincipalRouteSearch } from '@/features/campaigns/local-budget-2026/types'

export const Route = createFileRoute('/bugete-locale-2026/principal')({
  ssr: true,
  validateSearch: CampaignPrincipalRouteSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ match }) => {
    const locale = resolveCampaignPrincipalLocale(match.search as CampaignPrincipalRouteSearch)
    return buildCampaignRouteHead({
      pageKind: 'hub',
      locale,
    })
  },
})
