import { createLazyFileRoute } from '@tanstack/react-router'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import { ChallengeStepPlayer } from '@/features/challenges/components/player/ChallengeStepPlayer'

export const Route = createLazyFileRoute(
  '/bugete-locale-2026/challenges/$moduleSlug/$challengeSlug/$stepSlug',
)({
  component: ChallengeStepPlayerRoute,
})

function ChallengeStepPlayerRoute() {
  const { moduleSlug, challengeSlug, stepSlug } = Route.useParams()
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return (
    <ChallengeStepPlayer
      locale={locale}
      moduleSlug={moduleSlug}
      challengeSlug={challengeSlug}
      stepSlug={stepSlug}
    />
  )
}
