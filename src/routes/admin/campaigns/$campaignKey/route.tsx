import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { FUNKY_CAMPAIGN_KEY } from '@/features/campaigns/buget/admin/constants'
import { createNoStoreHeaders } from '@/lib/http-cache'

export const Route = createFileRoute('/admin/campaigns/$campaignKey')({
  ssr: false,
  headers: () => createNoStoreHeaders(),
  beforeLoad: ({ params }) => {
    if (params.campaignKey !== FUNKY_CAMPAIGN_KEY) {
      throw notFound()
    }
  },
  head: ({ params }) => buildCampaignAdminHead(params.campaignKey),
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}

function buildCampaignAdminHead(campaignKey: string) {
  const site = getSiteUrl()
  const canonical = `${site}/admin/campaigns/${campaignKey}`
  const title = 'Campaign admin - Transparenta.eu'

  return {
    meta: [
      { title },
      { name: 'canonical', content: canonical },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }
}
