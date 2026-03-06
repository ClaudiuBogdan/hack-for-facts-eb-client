import { createLazyFileRoute } from '@tanstack/react-router'
import { CampaignEntityMapSelectorPage } from '@/features/campaigns/local-budget-2026/components/hub/campaign-entity-map-selector-page'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'

export const Route = createLazyFileRoute('/buget/cauta/harta/')({
  component: CampaignMapSelectorRoutePage,
})

function CampaignMapSelectorRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <CampaignEntityMapSelectorPage locale={locale} languageQuery={search.lang} />
}
