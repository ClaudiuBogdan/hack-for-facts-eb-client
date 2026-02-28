import { createFileRoute, redirect } from '@tanstack/react-router'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  CampaignPrincipalRouteSearchSchema,
  resolveCampaignPrincipalLocale,
} from '@/features/campaigns/local-budget-2026/schemas/campaign-principal-search-schema'
import { buildCampaignRouteHead } from '@/features/campaigns/local-budget-2026/seo/campaign-seo'
import { CAMPAIGN_BASE_PATH } from '@/features/campaigns/local-budget-2026/constants'
import type { CampaignPrincipalRouteSearch } from '@/features/campaigns/local-budget-2026/types'

export const Route = createFileRoute('/bugete-locale-2026/principal')({
  ssr: true,
  validateSearch: CampaignPrincipalRouteSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.entityCui) {
      return
    }

    throw redirect({
      to: `${CAMPAIGN_BASE_PATH}/cauta` as '/',
      search: search.lang === 'en' ? { lang: 'en' } : {},
      replace: true,
    })
  },
  headers: () =>
    createPublicPageCacheHeaders({
      browserMaxAgeSeconds: 0,
      sharedMaxAgeSeconds: 600,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: ({ match }) => {
    const locale = resolveCampaignPrincipalLocale(match.search as CampaignPrincipalRouteSearch)
    return buildCampaignRouteHead({
      pageKind: 'hub',
      locale,
    })
  },
})
