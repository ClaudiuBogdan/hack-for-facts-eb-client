import { createLazyFileRoute } from '@tanstack/react-router'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import { ChallengeModulePage } from '@/features/challenges/components/hub/ChallengeModulePage'

export const Route = createLazyFileRoute(
  '/buget-primarie/$cui/provocari/$moduleSlug/',
)({
  component: ChallengeModulePageRoute,
})

function ChallengeModulePageRoute() {
  const { cui, moduleSlug } = Route.useParams()
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return (
    <ChallengeModulePage
      entityCui={cui}
      locale={locale}
      moduleSlug={moduleSlug}
    />
  )
}
