import { createLazyFileRoute } from '@tanstack/react-router'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import { ChallengeModulePage } from '@/features/challenges/components/hub/ChallengeModulePage'

export const Route = createLazyFileRoute(
  '/primarie/$cui/buget/provocari/$moduleSlug/',
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
