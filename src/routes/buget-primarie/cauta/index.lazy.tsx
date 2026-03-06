import { useCallback } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { CampaignEntitySelectorGate } from '@/features/campaigns/local-budget-2026/components/hub/campaign-entity-selector-gate'
import { useCampaignProgress } from '@/features/campaigns/local-budget-2026/hooks/use-campaign-progress'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import type { CampaignLocale } from '@/features/campaigns/local-budget-2026/types'
import { buildCampaignProvocariPath } from '@/features/challenges/constants'

export const Route = createLazyFileRoute('/buget-primarie/cauta/')({
  component: CampaignSelectorRoutePage,
})

function getProvocariSearch(languageQuery: CampaignLocale | undefined) {
  return {
    ...(languageQuery === 'en' ? { lang: 'en' as const } : {}),
  }
}

function CampaignSelectorRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)
  const navigate = useNavigate({ from: '/buget-primarie/cauta/' })
  const { setSelectedEntity } = useCampaignProgress()

  const handleEntitySelected = useCallback(
    (entity: { cui: string }) => {
      setSelectedEntity({ entityCui: entity.cui })
      void navigate({
        to: buildCampaignProvocariPath(entity.cui) as '/',
        search: getProvocariSearch(search.lang),
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, search.lang, setSelectedEntity],
  )

  return (
    <CampaignEntitySelectorGate
      locale={locale}
      languageQuery={search.lang}
      onEntitySelected={handleEntitySelected}
    />
  )
}
