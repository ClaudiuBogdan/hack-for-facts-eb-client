import { createLazyFileRoute } from '@tanstack/react-router'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import { ChallengeModulePage } from '@/features/challenges/components/hub/ChallengeModulePage'

export const Route = createLazyFileRoute(
  '/bugete-locale-2026/challenges/$moduleSlug/',
)({
  component: ChallengeModulePageRoute,
})

function ChallengeModulePageRoute() {
  const { moduleSlug } = Route.useParams()
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <ChallengeModulePage locale={locale} moduleSlug={moduleSlug} />
}
