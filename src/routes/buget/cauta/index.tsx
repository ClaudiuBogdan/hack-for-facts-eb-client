import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  CampaignRouteSearchSchema,
  resolveCampaignLocale,
} from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/buget/seo/campaign-seo'
import type { CampaignRouteSearch } from '@/features/campaigns/buget/types'

export const Route = createFileRoute('/buget/cauta/')({
  ssr: true,
  validateSearch: CampaignRouteSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ match }) => {
    const locale = resolveCampaignLocale(match.search as CampaignRouteSearch)
    return buildCampaignRouteHead({
      pageKind: 'principal-selector',
      locale,
    })
  },
})
