import { useCallback } from 'react'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { BugetEntitySelectorGate } from '@/features/campaigns/buget/components/hub/buget-entity-selector-gate'
import { CampaignPageFrame } from '@/features/campaigns/buget/components/layout/campaign-page-frame'
import { useCampaignProgress } from '@/features/campaigns/buget/hooks/use-campaign-progress'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import { resolveEntitySelectionNavigationTarget } from '@/features/campaigns/buget/utils/entity-selector-navigation'
import type { CampaignLocale } from '@/features/campaigns/buget/types'

export const Route = createLazyFileRoute('/primarie/')({
  component: PrimarieSelectorRoutePage,
})

function PrimarieSelectorRouteContent({
  locale,
  languageQuery,
  redirectUri,
}: {
  readonly locale: CampaignLocale
  readonly languageQuery?: CampaignLocale
  readonly redirectUri?: string
}) {
  const navigate = useNavigate({ from: '/primarie/' })
  const { setSelectedEntity } = useCampaignProgress()

  const handleEntitySelected = useCallback(
    (entity: { cui: string }) => {
      const navigationTarget = resolveEntitySelectionNavigationTarget({
        entityCui: entity.cui,
        languageQuery,
        redirectUri,
      })

      setSelectedEntity({ entityCui: entity.cui })
      void navigate({
        to: navigationTarget.to as '/',
        search: navigationTarget.search,
        replace: true,
        resetScroll: false,
      })
    },
    [languageQuery, navigate, redirectUri, setSelectedEntity],
  )

  return (
    <BugetEntitySelectorGate
      locale={locale}
      languageQuery={languageQuery}
      redirectUri={redirectUri}
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
        redirectUri={search.redirectUri}
      />
    </CampaignPageFrame>
  )
}
