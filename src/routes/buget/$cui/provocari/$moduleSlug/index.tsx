import { createFileRoute, notFound } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  CampaignRouteSearchSchema,
  resolveCampaignLocale,
} from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/buget/seo/campaign-seo'
import type { CampaignRouteSearch } from '@/features/campaigns/buget/types'
import { getChallengeModuleBySlug } from '@/features/challenges/utils/modules'

export const Route = createFileRoute(
  '/buget/$cui/provocari/$moduleSlug/',
)({
  ssr: true,
  validateSearch: CampaignRouteSearchSchema,
  loader: ({ params }) => {
    const module = getChallengeModuleBySlug(params.moduleSlug)
    if (!module) {
      throw notFound()
    }
  },
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ match }) => {
    const locale = resolveCampaignLocale(match.search as CampaignRouteSearch)
    return buildCampaignRouteHead({
      pageKind: 'challenges',
      locale,
      entityCui: match.params.cui,
      moduleSlug: match.params.moduleSlug,
    })
  },
})
