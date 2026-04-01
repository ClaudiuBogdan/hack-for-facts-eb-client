import { createFileRoute, redirect } from '@tanstack/react-router'
import { CAMPAIGN_LANDING_PATH } from '@/features/campaigns/buget/constants'
import { CampaignRouteSearchSchema } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'

export const Route = createFileRoute('/bugete-locale-2026')({
  validateSearch: CampaignRouteSearchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: CAMPAIGN_LANDING_PATH,
      search,
      replace: true,
    })
  },
})
