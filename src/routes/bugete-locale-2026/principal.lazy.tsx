import { useCallback } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { CampaignHubPage } from '@/features/campaigns/local-budget-2026/components/hub/CampaignHubPage'
import { resolveCampaignPrincipalLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-principal-search-schema'
import { CAMPAIGN_BASE_PATH } from '@/features/campaigns/local-budget-2026/constants'
import { Analytics } from '@/lib/analytics'

export const Route = createLazyFileRoute('/bugete-locale-2026/principal')({
  component: CampaignHubRoutePage,
})

function CampaignHubRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignPrincipalLocale(search)
  const navigate = useNavigate({ from: '/bugete-locale-2026/principal' })

  const navigateToSearchPage = useCallback(() => {
    void navigate({
      to: `${CAMPAIGN_BASE_PATH}/cauta` as '/',
      search: search.lang === 'en' ? { lang: 'en' as const } : {},
      replace: true,
      resetScroll: false,
    })
  }, [navigate, search.lang])

  return (
    <CampaignHubPage
      locale={locale}
      selectedEntityCui={search.entityCui}
      onChangeEntity={() => {
        Analytics.capture(Analytics.EVENTS.CampaignEntitySelectionChanged)
        navigateToSearchPage()
      }}
    />
  )
}
