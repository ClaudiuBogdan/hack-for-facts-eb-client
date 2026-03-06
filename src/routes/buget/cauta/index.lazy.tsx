import { useCallback } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { BugetEntitySelectorGate } from '@/features/campaigns/buget/components/hub/buget-entity-selector-gate'
import { useCampaignProgress } from '@/features/campaigns/buget/hooks/use-campaign-progress'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import type { CampaignLocale } from '@/features/campaigns/buget/types'
import { buildCampaignProvocariPath } from '@/features/challenges/constants'

export const Route = createLazyFileRoute('/buget/cauta/')({
  component: BugetSelectorRoutePage,
})

function getProvocariSearch(languageQuery: CampaignLocale | undefined) {
  return {
    ...(languageQuery === 'en' ? { lang: 'en' as const } : {}),
  }
}

function BugetSelectorRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)
  const navigate = useNavigate({ from: '/buget/cauta/' })
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
    <BugetEntitySelectorGate
      locale={locale}
      languageQuery={search.lang}
      onEntitySelected={handleEntitySelected}
    />
  )
}
