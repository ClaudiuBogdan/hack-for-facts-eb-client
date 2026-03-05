import { createLazyFileRoute } from '@tanstack/react-router'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import { ChallengesHubPage } from '@/features/challenges/components/hub/ChallengesHubPage'

export const Route = createLazyFileRoute('/bugete-locale-2026/challenges/')({
  component: ChallengesIndexPage,
})

function ChallengesIndexPage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <ChallengesHubPage locale={locale} />
}
