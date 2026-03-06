import { createLazyFileRoute } from '@tanstack/react-router'
import { BugetEntityMapSelectorPage } from '@/features/campaigns/buget/components/hub/buget-entity-map-selector-page'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'

export const Route = createLazyFileRoute('/buget/cauta/harta/')({
  component: BugetMapSelectorRoutePage,
})

function BugetMapSelectorRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <BugetEntityMapSelectorPage locale={locale} languageQuery={search.lang} />
}
