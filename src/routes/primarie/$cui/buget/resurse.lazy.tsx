import { createLazyFileRoute } from '@tanstack/react-router'
import { BugetResourcesPage } from '@/features/campaigns/buget/components/resources/buget-resources-page'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'

export const Route = createLazyFileRoute('/primarie/$cui/buget/resurse')({
  component: BugetResourcesRoutePage,
})

function BugetResourcesRoutePage() {
  const { cui } = Route.useParams()
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <BugetResourcesPage locale={locale} entityCui={cui} />
}
