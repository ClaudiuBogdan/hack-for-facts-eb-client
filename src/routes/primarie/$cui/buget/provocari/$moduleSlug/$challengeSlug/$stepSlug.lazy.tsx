import { createLazyFileRoute } from '@tanstack/react-router'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import { ChallengeStepPlayer } from '@/features/challenges/components/player/ChallengeStepPlayer'

export const Route = createLazyFileRoute(
  '/primarie/$cui/buget/provocari/$moduleSlug/$challengeSlug/$stepSlug',
)({
  component: ChallengeStepPlayerRoute,
})

function ChallengeStepPlayerRoute() {
  const { cui, moduleSlug, challengeSlug, stepSlug } = Route.useParams()
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return (
    <ChallengeStepPlayer
      entityCui={cui}
      locale={locale}
      moduleSlug={moduleSlug}
      challengeSlug={challengeSlug}
      stepSlug={stepSlug}
    />
  )
}
