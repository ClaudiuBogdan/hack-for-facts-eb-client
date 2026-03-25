import { createLazyFileRoute } from '@tanstack/react-router'
import { BugetEntityMapSelectorPage } from '@/features/campaigns/buget/components/hub/buget-entity-map-selector-page'
import {
  CampaignPageBackground,
} from '@/features/campaigns/buget/components/layout/campaign-page-frame'
import { CampaignProgressProvider } from '@/features/campaigns/buget/hooks/use-campaign-progress'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'

export const Route = createLazyFileRoute('/primarie/harta/')({
  component: PrimarieMapSelectorRoutePage,
})

function PrimarieMapSelectorRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return (
    <CampaignProgressProvider>
      <CampaignPageBackground>
        <BugetEntityMapSelectorPage
          locale={locale}
          languageQuery={search.lang}
          redirectUri={search.redirectUri}
        />
      </CampaignPageBackground>
    </CampaignProgressProvider>
  )
}
