import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCampaignDefinition } from '@/features/campaigns/buget/hooks/use-campaign-content'

export const Route = createFileRoute('/buget/forum')({
  ssr: true,
  loader: () => {
    const campaign = getCampaignDefinition()

    throw redirect({
      href: campaign.forumUrl,
      statusCode: 307,
    })
  },
})
