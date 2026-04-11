import { createFileRoute } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { campaignAdminUserInteractionsRouteSearchSchema } from '@/features/campaigns/buget/admin/schemas/search-schema'
import { createNoStoreHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/admin/campaigns/$campaignKey/user-interactions')({
  ssr: false,
  headers: () => createNoStoreHeaders(),
  validateSearch: campaignAdminUserInteractionsRouteSearchSchema,
  head: ({ params }) => buildCampaignAdminUserInteractionsHead(params.campaignKey),
})

function buildCampaignAdminUserInteractionsHead(campaignKey: string) {
  const site = getSiteUrl()
  const canonical = `${site}/admin/campaigns/${campaignKey}/user-interactions`
  const title = 'User interactions review - Transparenta.eu'

  return {
    meta: [
      { title },
      { name: 'canonical', content: canonical },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }
}
