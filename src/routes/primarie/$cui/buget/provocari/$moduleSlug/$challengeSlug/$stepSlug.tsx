import { createFileRoute, notFound } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  CampaignRouteSearchSchema,
  resolveCampaignLocale,
} from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/buget/seo/campaign-seo'
import type { CampaignRouteSearch } from '@/features/campaigns/buget/types'
import { buildChallengeStepRouteLoaderData } from '@/features/challenges/utils/challenge-step-route-search'

export const Route = createFileRoute(
  '/primarie/$cui/buget/provocari/$moduleSlug/$challengeSlug/$stepSlug',
)({
  ssr: true,
  pendingMs: 0,
  pendingMinMs: 250,
  validateSearch: CampaignRouteSearchSchema,
  loaderDeps: ({ search }) =>
    buildChallengeStepRouteLoaderData({
      section: search.section,
      view: search.view,
    }),
  // The module definitions and the steps' section metadata load with the
  // loader, not in every page's code.
  loader: async ({ params, deps, location }) => {
    const [{ getChallengeModuleBySlug }, { preloadChallengeStepContent }] = await Promise.all([
      import('@/features/challenges/utils/modules'),
      import('@/features/challenges/utils/challenge-step-content-resolver'),
    ])
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

    await preloadChallengeStepContent({
      contentDir: step.contentDir,
      locale: resolveCampaignLocale(location.search as CampaignRouteSearch),
    })

    return deps
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
