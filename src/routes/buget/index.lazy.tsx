import { createLazyFileRoute } from '@tanstack/react-router'
import { BugetLandingPage } from '@/features/campaigns/buget/components/landing/buget-landing-page'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'

export const Route = createLazyFileRoute('/buget/')({
  component: BugetLandingRoutePage,
})

function BugetLandingRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <BugetLandingPage locale={locale} />
}
