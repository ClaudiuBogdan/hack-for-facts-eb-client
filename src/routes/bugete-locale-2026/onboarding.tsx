import { createFileRoute } from '@tanstack/react-router'
import { createNoStoreHeaders } from '@/lib/http-cache'
import {
  CampaignRouteSearchSchema,
  resolveCampaignLocale,
} from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/local-budget-2026/seo/campaign-seo'
import type { CampaignRouteSearch } from '@/features/campaigns/local-budget-2026/types'

export const Route = createFileRoute('/bugete-locale-2026/onboarding')({
  ssr: true,
  validateSearch: CampaignRouteSearchSchema,
  headers: () => createNoStoreHeaders(),
  head: ({ match }) => {
    const locale = resolveCampaignLocale(match.search as CampaignRouteSearch)
    return buildCampaignRouteHead({
      pageKind: 'onboarding',
      locale,
    })
  },
})
