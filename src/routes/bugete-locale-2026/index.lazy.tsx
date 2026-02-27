import { createLazyFileRoute } from '@tanstack/react-router'
import { CampaignLandingPage } from '@/features/campaigns/local-budget-2026/components/landing/CampaignLandingPage'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'

export const Route = createLazyFileRoute('/bugete-locale-2026/')({
  component: CampaignLandingRoutePage,
})

function CampaignLandingRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <CampaignLandingPage locale={locale} />
}
