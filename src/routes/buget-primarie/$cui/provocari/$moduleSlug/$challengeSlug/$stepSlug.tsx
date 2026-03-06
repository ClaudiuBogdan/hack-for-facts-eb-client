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
  '/buget-primarie/$cui/provocari/$moduleSlug/$challengeSlug/$stepSlug',
)({
  ssr: true,
  validateSearch: CampaignRouteSearchSchema,
  loader: ({ params }) => {
    const module = getChallengeModuleBySlug(params.moduleSlug)
    if (!module) throw notFound()

    const challenge = module.challenges.find(
      (candidateChallenge) => candidateChallenge.slug === params.challengeSlug,
    )
    if (!challenge) throw notFound()

    const step = challenge.steps.find(
      (candidateStep) => candidateStep.slug === params.stepSlug,
    )
    if (!step) throw notFound()
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
      challengeSlug: match.params.challengeSlug,
      stepSlug: match.params.stepSlug,
    })
  },
})
