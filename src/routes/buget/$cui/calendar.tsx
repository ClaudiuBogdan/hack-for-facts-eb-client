import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  CampaignCalendarRouteSearchSchema,
  resolveCampaignCalendarLocale,
} from '@/features/campaigns/buget/schemas/campaign-calendar-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/buget/seo/campaign-seo'
import type { CampaignCalendarRouteSearch } from '@/features/campaigns/buget/types'

export const Route = createFileRoute('/buget/$cui/calendar')({
  ssr: true,
  validateSearch: CampaignCalendarRouteSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ match }) => {
    const locale = resolveCampaignCalendarLocale(match.search as CampaignCalendarRouteSearch)
    return buildCampaignRouteHead({
      pageKind: 'calendar',
      locale,
      entityCui: match.params.cui,
    })
  },
})
