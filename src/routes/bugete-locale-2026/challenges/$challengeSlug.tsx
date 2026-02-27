import { createFileRoute, notFound } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  CampaignRouteSearchSchema,
  resolveCampaignLocale,
} from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import { getCampaignChallengeBySlug } from '@/features/campaigns/local-budget-2026/hooks/use-campaign-content'
import { buildCampaignRouteHead } from '@/features/campaigns/local-budget-2026/seo/campaign-seo'
import type { CampaignRouteSearch } from '@/features/campaigns/local-budget-2026/types'

export const Route = createFileRoute('/bugete-locale-2026/challenges/$challengeSlug')({
  ssr: true,
  validateSearch: CampaignRouteSearchSchema,
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  loader: ({ params }) => {
    const challenge = getCampaignChallengeBySlug(params.challengeSlug)
    if (!challenge) {
      throw notFound()
    }

    return {
      challengeSlug: challenge.slug,
    }
  },
  head: ({ match, params }) => {
    const locale = resolveCampaignLocale(match.search as CampaignRouteSearch)
    return buildCampaignRouteHead({
      pageKind: 'challenge-detail',
      locale,
      challengeSlug: params.challengeSlug,
    })
  },
})
