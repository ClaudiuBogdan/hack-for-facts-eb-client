import { createLazyFileRoute } from '@tanstack/react-router'
import { CampaignHubPage } from '@/features/campaigns/local-budget-2026/components/hub/CampaignHubPage'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'

export const Route = createLazyFileRoute('/bugete-locale-2026/hub')({
  component: CampaignHubRoutePage,
})

function CampaignHubRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <CampaignHubPage locale={locale} />
}
