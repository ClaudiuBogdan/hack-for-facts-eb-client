import { createLazyFileRoute } from '@tanstack/react-router'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import { ChallengesHubPage } from '@/features/challenges/components/hub/ChallengesHubPage'

export const Route = createLazyFileRoute('/primarie/$cui/buget/')({
  component: ProvocariIndexPage,
})

function ProvocariIndexPage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <ChallengesHubPage entityCui={cui} locale={locale} />
}
