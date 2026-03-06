import { createFileRoute, notFound } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  CampaignRouteSearchSchema,
  resolveCampaignLocale,
} from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/local-budget-2026/seo/campaign-seo'
import type { CampaignRouteSearch } from '@/features/campaigns/local-budget-2026/types'
import { getChallengeModuleBySlug } from '@/features/challenges/utils/modules'

export const Route = createFileRoute(
  '/bugete-locale-2026/$cui/provocari/$moduleSlug/',
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
