import { useCallback } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { BugetEntitySelectorGate } from '@/features/campaigns/buget/components/hub/buget-entity-selector-gate'
import { CampaignPageFrame } from '@/features/campaigns/buget/components/layout/campaign-page-frame'
import { useCampaignProgress } from '@/features/campaigns/buget/hooks/use-campaign-progress'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import type { CampaignLocale } from '@/features/campaigns/buget/types'
import { buildCampaignProvocariPath } from '@/features/challenges/constants'

export const Route = createLazyFileRoute('/primarie/')({
  component: PrimarieSelectorRoutePage,
})

function getProvocariSearch(languageQuery: CampaignLocale | undefined) {
  return {
    ...(languageQuery === 'en' ? { lang: 'en' as const } : {}),
  }
}

function PrimarieSelectorRouteContent({
  locale,
  languageQuery,
}: {
  readonly locale: CampaignLocale
  readonly languageQuery?: CampaignLocale
}) {
  const navigate = useNavigate({ from: '/primarie/' })
  const { setSelectedEntity } = useCampaignProgress()

  const handleEntitySelected = useCallback(
    (entity: { cui: string }) => {
      setSelectedEntity({ entityCui: entity.cui })
      void navigate({
        to: buildCampaignProvocariPath(entity.cui) as '/',
        search: getProvocariSearch(languageQuery),
        replace: true,
        resetScroll: false,
      })
    },
    [languageQuery, navigate, setSelectedEntity],
  )

  return (
    <BugetEntitySelectorGate
      locale={locale}
      languageQuery={languageQuery}
      onEntitySelected={handleEntitySelected}
    />
  )
}

function PrimarieSelectorRoutePage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return (
    <CampaignPageFrame>
      <PrimarieSelectorRouteContent
        locale={locale}
        languageQuery={search.lang}
      />
    </CampaignPageFrame>
  )
}
