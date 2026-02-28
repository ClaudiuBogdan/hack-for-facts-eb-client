import { useCallback } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { CampaignEntitySelectorGate } from '@/features/campaigns/local-budget-2026/components/hub/campaign-entity-selector-gate'
import { CAMPAIGN_BASE_PATH } from '@/features/campaigns/local-budget-2026/constants'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import type { CampaignLocale } from '@/features/campaigns/local-budget-2026/types'

export const Route = createLazyFileRoute('/bugete-locale-2026/cauta/')({
  component: CampaignSelectorRoutePage,
})

function getPrincipalSearch(languageQuery: CampaignLocale | undefined, entityCui: string) {
  return {
    ...(languageQuery === 'en' ? { lang: 'en' as const } : {}),
    entityCui,
  }
}

function CampaignSelectorRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)
  const navigate = useNavigate({ from: '/bugete-locale-2026/cauta/' })

  const handleEntitySelected = useCallback(
    (entityCui: string) => {
      void navigate({
        to: `${CAMPAIGN_BASE_PATH}/principal` as '/',
        search: getPrincipalSearch(search.lang, entityCui),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, search.lang],
  )

  return (
    <CampaignEntitySelectorGate
      locale={locale}
      languageQuery={search.lang}
      onEntitySelected={handleEntitySelected}
    />
  )
}
