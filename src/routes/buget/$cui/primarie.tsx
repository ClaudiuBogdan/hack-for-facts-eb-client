import { createFileRoute } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/local-budget-2026/seo/campaign-seo'
import type { CampaignRouteSearch } from '@/features/campaigns/local-budget-2026/types'
import { ChallengeEntityAnalysisRouteSearchSchema } from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'

export const Route = createFileRoute('/buget/$cui/primarie')({
  ssr: false,
  validateSearch: ChallengeEntityAnalysisRouteSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ match }) => {
    const locale = resolveCampaignLocale(match.search as CampaignRouteSearch)
    return buildCampaignRouteHead({
      pageKind: 'primarie',
      locale,
      entityCui: match.params.cui,
    })
  },
})
